# backend/app/api/me.py

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.supabase_auth import get_supabase_user
from app.logger import logger
from app.services.brevo import add_or_update_brevo_contact
from app.services.pushover_service import get_pushover_service
from app.services.abrp_service import get_abrp_service
from app.storage.user import get_abrp_stats
from app.storage.poll_logs import count_polls_since, count_polls_in_period # NEW: Import count_polls_in_period
from app.storage.settings import get_setting_by_name
from app.storage.subscription import get_user_record, get_user_subscription # NEW: Import get_user_subscription
from app.storage.user import (
    create_onboarding_row,
    get_onboarding_status,
    get_user_accepted_terms,
    get_user_approved_status,
    get_user_by_id,
    get_user_online_status,
    is_subscriber,
    set_welcome_sent_if_needed,
    update_user,
)


router = APIRouter()


class MeResponse(BaseModel):
    """
    Response model for GET /me, now including 'is_subscribed'.
    """

    id: str
    email: str
    role: str
    is_approved: bool
    name: str
    accepted_terms: bool
    online_status: str  # "red", "yellow", "green", "grey"
    notify_offline: bool  # Kept for backward compatibility
    notification_preferences: dict  # Full notification preferences structure
    phone_number: Optional[str] = None
    phone_verified: Optional[bool] = False
    tier: str
    sms_credits: int = 0
    purchased_api_tokens: int = 0 # NEW: User's balance of purchased API tokens
    stripe_customer_id: Optional[str] = None
    is_subscribed: bool  # NEW: whether the user is subscribed to the newsletter
    is_on_trial: bool  # NEW: if the user is on a trial
    trial_ends_at: Optional[str]  # NEW: when the trial ends


class ApiUsageStatsResponse(BaseModel):
    current_calls: int
    max_calls: int
    max_linked_vehicles: int
    linked_vehicle_count: int
    tier: str


async def _get_setting_value(setting_name: str, default_value: int) -> int:
    try:
        s = await get_setting_by_name(setting_name)
        return int(s.get("value", default_value))
    except Exception:
        return default_value


@router.get("/me/api-usage", response_model=ApiUsageStatsResponse)
async def get_api_usage_stats(user=Depends(get_supabase_user)):
    """
    Retrieves API usage statistics for the current user based on their subscription tier.
    """
    user_id = user["sub"]
    record = await get_user_record(user_id)
    tier = record.get("tier", "free")
    linked_vehicle_count = record.get("linked_vehicle_count", 0)

    # Define tier configurations
    tier_configs = {
        "free": {
            "max_calls_setting": "rate_limit.free.max_calls",
            "max_calls_default": 2,
            "max_linked_vehicles_setting": None,
            "max_linked_vehicles_default": 0,
        },
        "basic": {
            "max_calls_setting": "rate_limit.basic.max_calls",
            "max_calls_default": 10,
            "max_linked_vehicles_setting": "rate_limit.basic.max_linked_vehicles",
            "max_linked_vehicles_default": 2,
        },
        "pro": {
            "max_calls_setting": "rate_limit.pro.max_calls",
            "max_calls_default": 100,
            "max_linked_vehicles_setting": "rate_limit.pro.max_linked_vehicles",
            "max_linked_vehicles_default": 5,
        },
    }

    # Get config for the user's tier, defaulting to 'free'
    config = tier_configs.get(tier, tier_configs["free"])

    # Load settings dynamically based on config
    max_calls = await _get_setting_value(
        config["max_calls_setting"], config["max_calls_default"]
    )
    max_linked_vehicles = (
        await _get_setting_value(
            config["max_linked_vehicles_setting"],
            config["max_linked_vehicles_default"],
        )
        if config["max_linked_vehicles_setting"]
        else config["max_linked_vehicles_default"]
    )

    # Determine the period for API call calculation based on user's tier/subscription
    #
    # PRO/BASIC User with active subscription:
    #   Use subscription's current_period_start and current_period_end.
    #   If subscription is ended (e.g., status is 'canceled' and period has passed),
    #   treat as FREE user.
    #
    # PRO User on trial:
    #   Use trial_ends_at as end date, and trial_ends_at - 30 days as start date.
    #   If trial_ends_at has passed, treat as FREE user.
    #
    # FREE User:
    #   Use a rolling 30-day window (now - 30 days to now).

    start_time: datetime
    end_time: datetime = datetime.now(timezone.utc) # Default end time is now

    # Fetch user's full record to get trial details
    local_user = await get_user_by_id(user_id)
    user_tier = local_user.tier if local_user else "free"

    # 1. Check for active subscription (PRO/BASIC)
    subscription = await get_user_subscription(user_id)
    if subscription and subscription.get("status") == "active":
        # Ensure current_period_start and end are datetime objects
        sub_start_str = subscription.get("current_period_start")
        sub_end_str = subscription.get("current_period_end")

        if sub_start_str and sub_end_str:
            try:
                sub_start = datetime.fromisoformat(sub_start_str.replace('Z', '+00:00'))
                sub_end = datetime.fromisoformat(sub_end_str.replace('Z', '+00:00'))

                if datetime.now(timezone.utc) <= sub_end: # Subscription is active and not yet ended
                    start_time = sub_start
                    end_time = sub_end
                    logger.info(f"[API Usage] User {user_id} (Tier: {user_tier}) using subscription period: {start_time} to {end_time}")
                else: # Subscription ended, treat as free
                    start_time = datetime.now(timezone.utc) - timedelta(days=30)
                    logger.info(f"[API Usage] User {user_id} (Tier: {user_tier}) subscription ended, falling back to FREE 30-day window: {start_time} to {end_time}")
            except ValueError as e:
                logger.error(f"[API Usage] Error parsing subscription dates for user {user_id}: {e}. Falling back to FREE 30-day window.")
                start_time = datetime.now(timezone.utc) - timedelta(days=30)
        else: # Missing subscription dates, treat as free
            logger.warning(f"[API Usage] User {user_id} (Tier: {user_tier}) has subscription but missing period dates. Falling back to FREE 30-day window.")
            start_time = datetime.now(timezone.utc) - timedelta(days=30)

    # 2. Check for PRO trial
    elif local_user and local_user.is_on_trial and local_user.trial_ends_at:
        try:
            trial_end = datetime.fromisoformat(local_user.trial_ends_at.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) <= trial_end: # Trial is active
                start_time = trial_end - timedelta(days=365) # 12-month trial period
                end_time = trial_end
                logger.info(f"[API Usage] User {user_id} (Tier: {user_tier}) on trial, using trial period: {start_time} to {end_time}")
            else: # Trial ended, treat as free
                start_time = datetime.now(timezone.utc) - timedelta(days=30)
                logger.info(f"[API Usage] User {user_id} (Tier: {user_tier}) trial ended, falling back to FREE 30-day window: {start_time} to {end_time}")
        except ValueError as e:
            logger.error(f"[API Usage] Error parsing trial_ends_at for user {user_id}: {e}. Falling back to FREE 30-day window.")
            start_time = datetime.now(timezone.utc) - timedelta(days=30)

    # 3. Default to FREE user (rolling 30 days)
    else:
        start_time = datetime.now(timezone.utc) - timedelta(days=30)
        logger.info(f"[API Usage] User {user_id} (Tier: {user_tier}) is FREE, using rolling 30-day window: {start_time} to {end_time}")

    current_calls = await count_polls_in_period(user_id, start_time, end_time)

    return ApiUsageStatsResponse(
        current_calls=current_calls,
        max_calls=max_calls,
        max_linked_vehicles=max_linked_vehicles,
        linked_vehicle_count=linked_vehicle_count,
        tier=user_tier, # Use the determined user_tier
    )


@router.get("/me", response_model=MeResponse)
async def get_me(user=Depends(get_supabase_user)):
    """
    Retrieves the current user's merged data, including subscription status.
    """

    user_id = user["sub"]
    try:
        # 1) Fetch approval and terms status
        approved = await get_user_approved_status(user_id)
        terms = await get_user_accepted_terms(user_id)

        # 2) Fetch local user row (basic user info)
        local_user = await get_user_by_id(user_id)

        # Auto-create user if they don't exist
        if not local_user:
            from app.storage.user import create_user
            email_temp = user.get("email", "unknown")
            name_temp = (user.get("user_metadata") or {}).get("name")
            local_user = await create_user(user_id, email_temp, name_temp)
            logger.info(f"[🆕] Auto-created user: {user_id}")

        # 2b) Check onboarding status for welcome email
        email = user.get("email")
        name = (user.get("user_metadata") or {}).get("name", "unknown")

        try:
            onboarding = await get_onboarding_status(user_id)
            if not onboarding:
                onboarding = await create_onboarding_row(user_id)

            if onboarding and onboarding.get("welcome_sent") is False:
                await add_or_update_brevo_contact(email=email, first_name=name)
                await set_welcome_sent_if_needed(user_id)
        except Exception as e:
            logger.warning(f"[⚠️] Could not process welcome email for {email}: {e}")

        # 3) Fetch online status
        online_status = await get_user_online_status(user_id)

        # 4) Determine 'name': prefer user_metadata.name, else local_user.name, else email, else "unknown"
        name = (user.get("user_metadata", {}) or {}).get("name")
        if not name and local_user:
            name = local_user.name
        if not name:
            name = user.get("email")
        name = (name or "").strip() or "unknown"

        # 5) Determine 'email'
        email = (user.get("email") or "").strip() or "unknown"

        # 6) Determine 'role' from user_metadata
        role = user.get("user_metadata", {}).get("role", "unknown")

        # 7) Determine notify_offline (fall back to False if local_user missing)
        notify_offline = (
            getattr(local_user, "notify_offline", False) if local_user else False
        )

        # 8) Determine is_subscribed using helper
        is_subscribed = await is_subscriber(user_id)

        # 9) Get notification preferences (fallback to empty dict)
        notification_preferences = (
            getattr(local_user, "notification_preferences", {}) if local_user else {}
        )

        # 10) Return the assembled response
        return MeResponse(
            id=user_id,
            email=email,
            role=role,
            is_approved=approved,
            name=name,
            accepted_terms=terms,
            online_status=online_status,
            notify_offline=notify_offline,
            notification_preferences=notification_preferences,
            phone_number=local_user.phone_number if local_user else None,
            phone_verified=local_user.phone_verified if local_user else False,
            tier=local_user.tier if local_user else "free",
            sms_credits=local_user.sms_credits if local_user else 0,
            purchased_api_tokens=local_user.purchased_api_tokens if local_user else 0, # NEW field
            stripe_customer_id=local_user.stripe_customer_id,
            is_subscribed=is_subscribed,  # NEW field
            is_on_trial=local_user.is_on_trial if local_user else False,  # NEW field
            trial_ends_at=local_user.trial_ends_at
            if local_user
            else None,  # NEW field
        )

    except Exception as e:
        logger.error(f"[❌ get_me] Unexpected error: {e}")
        # If an error occurs while fetching, re-raise as appropriate (or customize)
        raise


class UpdateNameRequest(BaseModel):
    name: str


@router.patch("/me/name")
async def update_name(payload: UpdateNameRequest, user=Depends(get_supabase_user)):
    """
    Update the current user's display name.
    Name is required and cannot be empty.
    """
    user_id = user["sub"]
    name = payload.name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    try:
        await update_user(user_id=user_id, name=name)
        logger.info(f"[✅] User {user_id} updated name to '{name}'")
        return {"success": True, "name": name}
    except Exception as e:
        logger.error(f"[❌] Failed to update name for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update name")


@router.post("/me/activate-pro-trial")
async def activate_pro_trial(user=Depends(get_supabase_user)):
    user_id = user["sub"]
    local_user = await get_user_by_id(user_id)

    if not local_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user already has a paid subscription or has already had a trial
    if (
        local_user.tier in ["pro", "basic"]
        or local_user.is_on_trial
        or local_user.trial_ends_at
    ):
        raise HTTPException(
            status_code=400, detail="User is not eligible for a Pro trial."
        )

    # Calculate trial end date (365 days / 12 months from now)
    trial_ends_at = datetime.now() + timedelta(days=365)

    # Update user in database
    await update_user(
        user_id=user_id,
        tier="pro",
        is_on_trial=True,
        trial_ends_at=trial_ends_at.isoformat(),  # Store as ISO format string
    )

    logger.info(f"[✅] User {user_id} activated Pro trial until {trial_ends_at}")
    return {
        "message": "Pro trial activated successfully",
        "trial_ends_at": trial_ends_at.isoformat(),
    }


# ============== Pushover Notification Settings ==============

class PushoverSettingsResponse(BaseModel):
    pushover_enabled: bool
    pushover_user_key: Optional[str] = None
    pushover_events: dict


class UpdatePushoverSettingsRequest(BaseModel):
    pushover_user_key: Optional[str] = None
    pushover_enabled: Optional[bool] = None
    pushover_events: Optional[dict] = None


class ValidatePushoverKeyRequest(BaseModel):
    user_key: str


@router.get("/me/pushover", response_model=PushoverSettingsResponse)
async def get_pushover_settings(user=Depends(get_supabase_user)):
    """Get current user's Pushover notification settings."""
    user_id = user["sub"]
    local_user = await get_user_by_id(user_id)

    if not local_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Mask the user key for security (show only last 4 chars)
    user_key = getattr(local_user, "pushover_user_key", None)
    masked_key = None
    if user_key:
        masked_key = f"{'*' * (len(user_key) - 4)}{user_key[-4:]}" if len(user_key) > 4 else "****"

    return PushoverSettingsResponse(
        pushover_enabled=getattr(local_user, "pushover_enabled", False) or False,
        pushover_user_key=masked_key,
        pushover_events=getattr(local_user, "pushover_events", {}) or {
            "charge_complete": True,
            "charge_started": False,
            "vehicle_offline": False,
            "vehicle_online": False,
        },
    )


@router.patch("/me/pushover")
async def update_pushover_settings(
    payload: UpdatePushoverSettingsRequest,
    user=Depends(get_supabase_user)
):
    """Update user's Pushover notification settings."""
    user_id = user["sub"]
    local_user = await get_user_by_id(user_id)

    if not local_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {}

    # If updating user key, validate it first
    if payload.pushover_user_key is not None:
        if payload.pushover_user_key == "":
            # Clear the key
            update_data["pushover_user_key"] = None
            update_data["pushover_enabled"] = False
        else:
            # Validate the key
            pushover = get_pushover_service()
            validation = await pushover.validate_user_key(payload.pushover_user_key)
            if not validation.get("valid"):
                raise HTTPException(
                    status_code=400,
                    detail=validation.get("message", "Invalid Pushover user key")
                )
            update_data["pushover_user_key"] = payload.pushover_user_key

    if payload.pushover_enabled is not None:
        # Can only enable if user has a valid key
        if payload.pushover_enabled:
            current_key = update_data.get("pushover_user_key") or getattr(local_user, "pushover_user_key", None)
            if not current_key:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot enable Pushover without a valid user key"
                )
        update_data["pushover_enabled"] = payload.pushover_enabled

    if payload.pushover_events is not None:
        update_data["pushover_events"] = payload.pushover_events

    if update_data:
        await update_user(user_id=user_id, **update_data)
        logger.info(f"[✅] User {user_id} updated Pushover settings")

    return {"success": True, "message": "Pushover settings updated"}


@router.post("/me/pushover/validate")
async def validate_pushover_key(
    payload: ValidatePushoverKeyRequest,
    user=Depends(get_supabase_user)
):
    """Validate a Pushover user key without saving it."""
    pushover = get_pushover_service()
    result = await pushover.validate_user_key(payload.user_key)

    if result.get("valid"):
        return {
            "valid": True,
            "devices": result.get("devices", []),
            "message": "User key is valid"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=result.get("message", "Invalid user key")
        )


@router.post("/me/pushover/test")
async def send_test_pushover_notification(user=Depends(get_supabase_user)):
    """Send a test Pushover notification to the current user."""
    user_id = user["sub"]
    local_user = await get_user_by_id(user_id)

    if not local_user:
        raise HTTPException(status_code=404, detail="User not found")

    user_key = getattr(local_user, "pushover_user_key", None)
    if not user_key:
        raise HTTPException(
            status_code=400,
            detail="No Pushover user key configured"
        )

    pushover = get_pushover_service()
    result = await pushover.send_notification(
        user_key=user_key,
        title="EVConduit Test",
        message="This is a test notification from EVConduit. Your Pushover integration is working correctly!",
        sound="pushover"
    )

    if result.get("success"):
        return {"success": True, "message": "Test notification sent"}
    else:
        raise HTTPException(
            status_code=500,
            detail=result.get("message", "Failed to send test notification")
        )


@router.post("/me/vehicles/refresh")
async def refresh_my_vehicles(user: dict = Depends(get_supabase_user)):
    """
    Force a refresh of all vehicle data by polling Enode directly.
    This bypasses webhook delivery and fetches fresh data immediately.
    Returns the updated vehicle data.
    """
    from app.services.vehicle_polling import poll_vehicle_for_user

    user_id = user["sub"]
    logger.info(f"[refresh_my_vehicles] Manual refresh requested for user_id={user_id}")

    try:
        updated_vehicles = await poll_vehicle_for_user(user_id)
        logger.info(f"[refresh_my_vehicles] Refreshed {len(updated_vehicles)} vehicles for user {user_id}")

        # Return simplified vehicle info
        vehicles_info = []
        for v in updated_vehicles:
            info = v.get("information", {})
            charge = v.get("chargeState", {})
            vehicles_info.append({
                "id": v.get("id"),
                "displayName": info.get("displayName") or f"{info.get('brand', '')} {info.get('model', '')}".strip(),
                "batteryLevel": charge.get("batteryLevel"),
                "isCharging": charge.get("isCharging"),
                "lastSeen": v.get("lastSeen"),
            })

        return {
            "success": True,
            "vehicles_updated": len(updated_vehicles),
            "vehicles": vehicles_info,
            "message": f"Refreshed {len(updated_vehicles)} vehicle(s) from Enode"
        }
    except Exception as e:
        logger.error(f"[refresh_my_vehicles] Error refreshing vehicles: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Error refreshing vehicle data: {str(e)}")


# ============== ABRP Settings ==============

class ABRPSettingsResponse(BaseModel):
    """Response model for ABRP settings"""
    abrp_enabled: bool
    abrp_token: Optional[str] = None  # Masked token
    last_push_at: Optional[str] = None
    push_success_count: int = 0
    push_fail_count: int = 0
    last_error: Optional[str] = None


class UpdateABRPSettingsRequest(BaseModel):
    """Request model for updating ABRP settings"""
    abrp_token: Optional[str] = None
    abrp_enabled: Optional[bool] = None


class ValidateABRPTokenRequest(BaseModel):
    """Request model for validating an ABRP token"""
    token: str


@router.get("/me/abrp", response_model=ABRPSettingsResponse)
async def get_abrp_settings(user=Depends(get_supabase_user)):
    """Get current user's ABRP settings."""
    user_id = user["sub"]

    stats = get_abrp_stats(user_id)
    if not stats:
        return ABRPSettingsResponse(
            abrp_enabled=False,
            abrp_token=None,
            last_push_at=None,
            push_success_count=0,
            push_fail_count=0,
            last_error=None,
        )

    return ABRPSettingsResponse(
        abrp_enabled=stats.get("abrp_enabled", False),
        abrp_token=stats.get("abrp_token"),  # Already masked by get_abrp_stats
        last_push_at=stats.get("last_push_at"),
        push_success_count=stats.get("push_success_count", 0),
        push_fail_count=stats.get("push_fail_count", 0),
        last_error=stats.get("last_error"),
    )


@router.patch("/me/abrp")
async def update_abrp_settings(
    payload: UpdateABRPSettingsRequest,
    user=Depends(get_supabase_user)
):
    """Update user's ABRP settings."""
    user_id = user["sub"]
    local_user = await get_user_by_id(user_id)

    if not local_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {}

    # If updating token, validate it first (unless clearing)
    if payload.abrp_token is not None:
        if payload.abrp_token == "":
            # Clear the token
            update_data["abrp_token"] = None
            update_data["abrp_enabled"] = False
        else:
            # Validate the token
            abrp = get_abrp_service()
            validation = await abrp.validate_token(payload.abrp_token)
            if not validation.get("valid"):
                raise HTTPException(
                    status_code=400,
                    detail=validation.get("message", "Invalid ABRP token")
                )
            update_data["abrp_token"] = payload.abrp_token

    if payload.abrp_enabled is not None:
        # Can only enable if user has a valid token
        if payload.abrp_enabled:
            current_token = update_data.get("abrp_token") or getattr(local_user, "abrp_token", None)
            if not current_token:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot enable ABRP without a valid token"
                )
        update_data["abrp_enabled"] = payload.abrp_enabled

    if update_data:
        await update_user(user_id=user_id, **update_data)
        logger.info(f"[✅] User {user_id} updated ABRP settings")

    return {"success": True, "message": "ABRP settings updated"}


@router.post("/me/abrp/validate")
async def validate_abrp_token(
    payload: ValidateABRPTokenRequest,
    user=Depends(get_supabase_user)
):
    """Validate an ABRP token without saving it."""
    abrp = get_abrp_service()
    result = await abrp.validate_token(payload.token)

    if result.get("valid"):
        return {
            "valid": True,
            "message": "Token is valid"
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=result.get("message", "Invalid token")
        )


@router.post("/me/abrp/test")
async def send_test_abrp_telemetry(user=Depends(get_supabase_user)):
    """Send test telemetry to ABRP using saved token."""
    user_id = user["sub"]
    local_user = await get_user_by_id(user_id)

    if not local_user:
        raise HTTPException(status_code=404, detail="User not found")

    abrp_token = getattr(local_user, "abrp_token", None)
    if not abrp_token:
        raise HTTPException(
            status_code=400,
            detail="No ABRP token configured"
        )

    abrp = get_abrp_service()
    result = await abrp.send_telemetry(
        user_token=abrp_token,
        soc=75,  # Test with realistic dummy values
        is_charging=False,
    )

    if result.get("success"):
        return {"success": True, "message": "Test telemetry sent to ABRP"}
    else:
        raise HTTPException(
            status_code=500,
            detail=result.get("message", "Failed to send test telemetry")
        )
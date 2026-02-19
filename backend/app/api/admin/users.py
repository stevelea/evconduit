# backend/app/api/admin/users.py
"""Admin endpoints for managing user accounts."""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
import httpx
import reverse_geocode
from app.auth.supabase_auth import get_supabase_user
from app.storage.user import get_all_users_with_enode_info, set_user_approval, delete_user, update_ha_url_check
from app.enode.user import delete_enode_user
from app.lib.supabase import get_supabase_admin_client
from app.storage.enode_account import get_enode_account_for_user, assign_user_to_account

logger = logging.getLogger(__name__)


def get_country_code_from_location(lat: float, lon: float) -> str | None:
    """Convert latitude/longitude to country code using reverse geocoding."""
    try:
        result = reverse_geocode.search([(lat, lon)])
        if result and len(result) > 0:
            return result[0].get("country_code")
    except Exception as e:
        logger.warning(f"Failed to reverse geocode ({lat}, {lon}): {e}")
    return None

router = APIRouter()

# TODO: Add docstrings to all functions in this file.

def require_admin(user=Depends(get_supabase_user)):
    logger.info("🔍 Admin check - Full user object:")
    # logger.info(user)

    role = user.get("user_metadata", {}).get("role")
    logger.info(f"🔐 Extracted role: {role}")

    if role != "admin":
        logger.warning(f"⛔ Access denied: user {user.get('sub') or user.get('id')} with role '{role}' tried to access admin route")
        raise HTTPException(status_code=403, detail="Admin access required")

    logger.info(f"✅ Admin access granted to user {user.get('sub') or user.get('id')}")
    return user

@router.get("/admin/users")
async def list_all_users(user=Depends(require_admin)):
    logger.info(f"👮 Admin {user.get('sub') or user.get('id')} requested merged user list (Supabase + Enode)")
    users = await get_all_users_with_enode_info()
    logger.info(f"✅ Returning {len(users)} users with merged data")
    return JSONResponse(content=users)


# -------------------------
# Pending Deletion Endpoints (must be before {user_id} routes)
# -------------------------

@router.get("/admin/users/pending-deletion")
async def list_pending_deletion_users(current_user=Depends(require_admin)):
    """Get list of users flagged for pending deletion (inactive accounts awaiting admin review)."""
    from datetime import datetime, timezone
    logger.info(f"👮 Admin {current_user.get('sub') or current_user.get('id')} requested pending deletion list")
    supabase = get_supabase_admin_client()

    try:
        result = supabase.table("users").select(
            "id, email, name, created_at, pending_deletion_at, linked_vehicle_count"
        ).eq("pending_deletion", True).order("pending_deletion_at", desc=True).execute()

        users = result.data or []

        # Calculate days since registration for each user
        now = datetime.now(timezone.utc)
        enriched_users = []
        for user in users:
            created_at_str = user.get("created_at")
            days_since_registration = None
            if created_at_str:
                try:
                    created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    days_since_registration = (now - created_at).days
                except (ValueError, TypeError):
                    pass

            enriched_users.append({
                **user,
                "days_since_registration": days_since_registration,
            })

        logger.info(f"✅ Found {len(enriched_users)} users pending deletion")
        return JSONResponse(content=enriched_users)

    except Exception as e:
        logger.error(f"❌ Error fetching pending deletion users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/users/{user_id}")
async def get_user_details(user_id: str, user=Depends(require_admin)):
    """Get detailed information about a specific user for admin purposes."""
    logger.info(f"👮 Admin {user.get('sub') or user.get('id')} requested details for user {user_id}")
    supabase = get_supabase_admin_client()

    try:
        # Fetch user data
        user_res = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")

        user_data = user_res.data

        # Fetch user's vehicles with cache data for location
        vehicles_res = supabase.table("vehicles").select("vehicle_id, vendor, updated_at, online, vehicle_cache").eq("user_id", user_id).execute()
        vehicles_raw = vehicles_res.data or []

        # Process vehicles to extract location and country code
        vehicles = []
        for v in vehicles_raw:
            vehicle_data = {
                "vehicle_id": v.get("vehicle_id"),
                "vendor": v.get("vendor"),
                "updated_at": v.get("updated_at"),
                "online": v.get("online"),
            }

            # Extract location from vehicle_cache if available
            cache_raw = v.get("vehicle_cache")
            cache = {}
            if isinstance(cache_raw, str):
                try:
                    cache = json.loads(cache_raw)
                except json.JSONDecodeError:
                    pass
            elif isinstance(cache_raw, dict):
                cache = cache_raw
            location = cache.get("location")
            if location and isinstance(location, dict):
                lat = location.get("latitude")
                lon = location.get("longitude")
                vehicle_data["location"] = {
                    "latitude": lat,
                    "longitude": lon,
                }
                # Get country code from coordinates
                if lat is not None and lon is not None:
                    country_code = get_country_code_from_location(lat, lon)
                    if country_code:
                        vehicle_data["country_code"] = country_code

            vehicles.append(vehicle_data)

        # Combine data
        result = {
            **user_data,
            "vehicles": vehicles,
            "vehicle_count": len(vehicles),
        }

        logger.info(f"✅ Returning details for user {user_id} with {len(vehicles)} vehicles")
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/users/{user_id}")
async def remove_user(user_id: str, user=Depends(require_admin)):
    logger.info(f"🗑️ Admin {user.get('sub') or user.get('id')} is attempting to delete user {user_id}")
    try:
        # 1. Delete from Enode (if linked)
        account = await get_enode_account_for_user(user_id)
        if account:
            status_code = await delete_enode_user(user_id, account)
            # 204 = deleted successfully, 404 = user not found in Enode (already deleted or never linked)
            if status_code not in (204, 404):
                logger.error(f"Failed to delete Enode user {user_id}, status_code: {status_code}")
                raise HTTPException(status_code=500, detail="Failed to delete user from Enode")
            logger.info(f"Enode deletion complete for {user_id} (status: {status_code})")
        else:
            logger.info(f"No Enode account for user {user_id}, skipping Enode deletion")

        # 2. Delete from database
        db_deleted = await delete_user(user_id)
        if not db_deleted:
            logger.error(f"Failed to delete user {user_id} from database")
            raise HTTPException(status_code=500, detail="Failed to delete user from database")

        logger.info(f"Successfully deleted user {user_id}")
        return Response(status_code=204)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Exception in remove_user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/admin/users/{user_id}/approve", tags=["user"])
async def update_user_approval(
    user_id: str,
    payload: dict,
    current_user=Depends(require_admin),
):
    is_approved = payload.get("is_approved")
    if is_approved is None:
        raise HTTPException(status_code=400, detail="Missing is_approved")

    try:
        await set_user_approval(user_id, is_approved)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"success": True}

@router.patch("/admin/users/{user_id}")
async def update_user_fields(
    user_id: str,
    payload: dict,
    current_user=Depends(require_admin),
):
    """Update any user fields as admin."""
    logger.info(f"👮 Admin {current_user.get('sub') or current_user.get('id')} updating user {user_id} with {payload}")
    supabase = get_supabase_admin_client()

    # Filter out None values and non-updatable fields
    allowed_fields = {
        "name", "email", "role", "is_approved", "tier", "subscription_status",
        "notify_offline", "is_on_trial", "trial_ends_at", "sms_credits",
        "purchased_api_tokens", "ha_webhook_id", "ha_external_url", "default_country_code"
    }
    update_data = {k: v for k, v in payload.items() if k in allowed_fields and v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    try:
        result = supabase.table("users").update(update_data).eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found or no changes made")
        logger.info(f"✅ Updated user {user_id}: {update_data}")
        return {"success": True, "updated": update_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/users/{user_id}/check-ha-webhook")
async def check_ha_webhook(user_id: str, current_user=Depends(require_admin)):
    """Test HA webhook URL reachability for a user."""
    logger.info(f"👮 Admin {current_user.get('sub') or current_user.get('id')} checking HA webhook for user {user_id}")
    supabase = get_supabase_admin_client()

    try:
        # Get user's HA webhook settings
        user_res = supabase.table("users").select("ha_webhook_id, ha_external_url").eq("id", user_id).maybe_single().execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")

        ha_webhook_id = user_res.data.get("ha_webhook_id")
        ha_external_url = user_res.data.get("ha_external_url")

        if not ha_webhook_id or not ha_external_url:
            update_ha_url_check(user_id, reachable=False)
            return {
                "reachable": False,
                "error": "HA webhook not configured for this user",
                "ha_webhook_id": ha_webhook_id,
                "ha_external_url": ha_external_url,
            }

        # Test the HA webhook URL with a POST request containing a test event
        url = f"{ha_external_url.rstrip('/')}/api/webhook/{ha_webhook_id}"
        logger.info(f"Testing HA webhook URL: {url}")

        # Send a test event that HA will receive but won't match typical automations
        test_payload = {
            "event": "connection_test",
            "source": "evconduit_admin",
            "test": True,
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, json=test_payload, timeout=10.0, follow_redirects=True)
                # Any HTTP response means the URL is reachable
                # HA may return 200, 400, or other codes depending on automation config
                reachable = True
                status_code = resp.status_code
                error = None
            except httpx.TimeoutException:
                reachable = False
                status_code = None
                error = "Connection timed out"
            except httpx.ConnectError as e:
                reachable = False
                status_code = None
                error = f"Connection error: {str(e)}"
            except Exception as e:
                reachable = False
                status_code = None
                error = str(e)

        # Update the database with check result
        update_ha_url_check(user_id, reachable=reachable)

        result = {
            "reachable": reachable,
            "url_tested": url,
            "ha_webhook_id": ha_webhook_id,
            "ha_external_url": ha_external_url,
        }
        if status_code is not None:
            result["status_code"] = status_code
        if error:
            result["error"] = error

        logger.info(f"✅ HA webhook check for user {user_id}: reachable={reachable}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error checking HA webhook for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/users/{user_id}/logs")
async def get_user_logs(user_id: str, limit: int = 50, current_user=Depends(require_admin)):
    """Get webhook logs and poll logs for a specific user."""
    logger.info(f"👮 Admin {current_user.get('sub') or current_user.get('id')} fetching logs for user {user_id}")
    supabase = get_supabase_admin_client()

    try:
        # Fetch webhook logs
        webhook_res = supabase.table("webhook_logs").select(
            "id, created_at, event_type, vehicle_id"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        webhook_logs = webhook_res.data or []

        # Fetch poll logs
        poll_res = supabase.table("poll_logs").select(
            "id, created_at, endpoint, vehicle_id"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        poll_logs = poll_res.data or []

        logger.info(f"✅ Found {len(webhook_logs)} webhook logs and {len(poll_logs)} poll logs for user {user_id}")
        return {
            "webhook_logs": webhook_logs,
            "poll_logs": poll_logs,
        }

    except Exception as e:
        logger.error(f"❌ Error fetching logs for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/users/{user_id}/confirm-deletion")
async def confirm_user_deletion(user_id: str, current_user=Depends(require_admin)):
    """
    Confirm deletion of a user flagged for pending deletion.
    This permanently deletes the user from both Enode and database.
    """
    logger.info(f"🗑️ Admin {current_user.get('sub') or current_user.get('id')} confirming deletion for user {user_id}")
    supabase = get_supabase_admin_client()

    try:
        # Verify user exists and is pending deletion
        user_res = supabase.table("users").select("id, email, pending_deletion").eq("id", user_id).maybe_single().execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")

        if not user_res.data.get("pending_deletion"):
            raise HTTPException(status_code=400, detail="User is not flagged for pending deletion")

        # Delete from Enode (if linked)
        account = await get_enode_account_for_user(user_id)
        if account:
            status_code = await delete_enode_user(user_id, account)
            if status_code not in (204, 404):
                logger.error(f"Failed to delete Enode user {user_id}, status_code: {status_code}")
                raise HTTPException(status_code=500, detail="Failed to delete user from Enode")
            logger.info(f"Enode deletion complete for {user_id} (status: {status_code})")
        else:
            logger.info(f"No Enode account for user {user_id}, skipping Enode deletion")

        # Delete from database
        db_deleted = await delete_user(user_id)
        if not db_deleted:
            logger.error(f"Failed to delete user {user_id} from database")
            raise HTTPException(status_code=500, detail="Failed to delete user from database")

        logger.info(f"Successfully confirmed deletion of user {user_id} ({user_res.data.get('email')})")
        return {"success": True, "message": f"User {user_id} has been permanently deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error confirming deletion for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/users/{user_id}/cancel-deletion")
async def cancel_user_deletion(user_id: str, current_user=Depends(require_admin)):
    """
    Cancel pending deletion for a user (keep the account).
    Clears the pending_deletion flag so the user is no longer flagged for deletion.
    """
    logger.info(f"👮 Admin {current_user.get('sub') or current_user.get('id')} cancelling deletion for user {user_id}")
    supabase = get_supabase_admin_client()

    try:
        # Verify user exists
        user_res = supabase.table("users").select("id, email, pending_deletion").eq("id", user_id).maybe_single().execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")

        if not user_res.data.get("pending_deletion"):
            raise HTTPException(status_code=400, detail="User is not flagged for pending deletion")

        # Clear the pending deletion flag
        supabase.table("users").update({
            "pending_deletion": False,
            "pending_deletion_at": None
        }).eq("id", user_id).execute()

        logger.info(f"✅ Cancelled pending deletion for user {user_id} ({user_res.data.get('email')})")
        return {"success": True, "message": f"Pending deletion cancelled for user {user_id}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error cancelling deletion for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/admin/users/{user_id}/enode-account")
async def reassign_user_enode_account(
    user_id: str,
    payload: dict,
    current_user=Depends(require_admin),
):
    """Reassign a user to a different Enode account."""
    account_id = payload.get("enode_account_id")
    if not account_id:
        raise HTTPException(status_code=400, detail="Missing enode_account_id")

    success = await assign_user_to_account(user_id, account_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reassign user")

    return {"success": True, "message": f"User {user_id} reassigned to account {account_id}"}

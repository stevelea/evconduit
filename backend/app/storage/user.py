# backend/app/storage/user.py

import os
from typing import Any
from supabase import create_client, Client
from app.lib.supabase import get_supabase_admin_client
from app.enode.user import get_all_users as get_enode_users
from app.storage.enode_account import get_all_enode_accounts
from app.models.user import User
from app.logger import logger
from datetime import datetime, timezone, timedelta

# -------------------------------------------------------------------
# Initialize Supabase admin client (service role key) from `app/lib/supabase.py`
# -------------------------------------------------------------------
supabase: Client = get_supabase_admin_client()

# -------------------------------------------------------------------
# Simple TTL cache for expensive operations
# -------------------------------------------------------------------
_cache: dict[str, dict[str, Any]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_cached(key: str) -> Any | None:
    """Get value from cache if not expired."""
    if key in _cache:
        entry = _cache[key]
        if datetime.utcnow() < entry["expires_at"]:
            logger.debug(f"[CACHE HIT] {key}")
            return entry["value"]
        del _cache[key]
    return None


def _set_cached(key: str, value: Any, ttl_seconds: int = CACHE_TTL_SECONDS) -> None:
    """Set value in cache with TTL."""
    _cache[key] = {
        "value": value,
        "expires_at": datetime.utcnow() + timedelta(seconds=ttl_seconds)
    }
    logger.debug(f"[CACHE SET] {key} (TTL: {ttl_seconds}s)")

# -------------------------------------------------------------------
# ORIGINAL FUNCTIONS (restored in full)
# -------------------------------------------------------------------

async def get_all_users_with_enode_info():
    """
    Fetches all users from Supabase and enriches them with Enode information, vehicles, and API usage stats.
    Uses caching for Enode data and SQL aggregation for poll counts to improve performance.
    """
    try:
        logger.info("🔎 Fetching Supabase users...")
        res = supabase.table("users").select("id, email, name, role, is_approved, tier, created_at, enode_account_id").limit(1000).execute()
        users = res.data or []
        logger.info(f"ℹ️ Found {len(users)} users in Supabase")

        # Fetch Enode users with caching (5 min TTL) - iterate across all accounts
        logger.info("🔄 Fetching Enode users...")
        enode_lookup = _get_cached("enode_users_lookup")
        if enode_lookup is None:
            enode_users = []
            accounts = await get_all_enode_accounts()
            for account in accounts:
                try:
                    after = None
                    while True:
                        enode_data = await get_enode_users(account=account, after=after)
                        enode_users.extend(enode_data.get("data", []))
                        after = enode_data.get("pagination", {}).get("after")
                        if not after:
                            break
                except Exception as acct_err:
                    logger.warning(f"⚠️ Failed to fetch Enode users for account {account.get('name')}: {acct_err}")
            enode_lookup = {u["id"]: u for u in enode_users}
            _set_cached("enode_users_lookup", enode_lookup)
            logger.info(f"ℹ️ Found {len(enode_users)} users in Enode across {len(accounts)} account(s) (fresh)")
        else:
            logger.info("ℹ️ Using cached Enode users data")

        # Fetch all vehicles from database
        logger.info("🚗 Fetching vehicles from database...")
        vehicles_res = supabase.table("vehicles").select("vehicle_id, user_id, vendor, country_code").execute()
        vehicles = vehicles_res.data or []
        # Group vehicles by user_id and track country codes
        vehicles_by_user = {}
        country_by_user = {}
        for v in vehicles:
            uid = v.get("user_id")
            if uid not in vehicles_by_user:
                vehicles_by_user[uid] = []
            vehicles_by_user[uid].append({
                "vehicle_id": v.get("vehicle_id"),
                "vendor": v.get("vendor"),
                "country_code": v.get("country_code")
            })
            # Store first country_code found for user
            if uid not in country_by_user and v.get("country_code"):
                country_by_user[uid] = v.get("country_code")
        logger.info(f"ℹ️ Found {len(vehicles)} vehicles in database")

        # Fetch poll counts using SQL aggregation (much faster than fetching all rows)
        logger.info("📊 Fetching API usage stats...")
        poll_counts = {}
        try:
            # Use RPC function for efficient GROUP BY aggregation
            poll_res = supabase.rpc("get_poll_counts_by_user", {"days_ago": 30}).execute()
            if poll_res.data:
                for row in poll_res.data:
                    poll_counts[row["user_id"]] = row["poll_count"]
                logger.info(f"ℹ️ Got poll counts for {len(poll_counts)} users via RPC")
        except Exception as rpc_err:
            # Fallback to old method if RPC not available
            logger.warning(f"⚠️ RPC fallback: {rpc_err}")
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            poll_res = supabase.table("poll_logs").select("user_id").gte("created_at", thirty_days_ago).execute()
            poll_logs = poll_res.data or []
            for log in poll_logs:
                uid = log.get("user_id")
                poll_counts[uid] = poll_counts.get(uid, 0) + 1

        # Build account name lookup
        account_name_map = {}
        for account in accounts:
            account_name_map[account["id"]] = account.get("name", "Unknown")

        enriched = []
        now = datetime.now(timezone.utc)
        for user in users:
            uid = user["id"]
            enode_match = enode_lookup.get(uid)
            user_vehicles = vehicles_by_user.get(uid, [])

            # Calculate days since account creation for users with no vehicles
            days_inactive = None
            if len(user_vehicles) == 0:
                created_at_str = user.get("created_at")
                if created_at_str:
                    try:
                        created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                        if created_at.tzinfo is None:
                            created_at = created_at.replace(tzinfo=timezone.utc)
                        days_inactive = (now - created_at).days
                    except (ValueError, TypeError):
                        pass

            enode_acct_id = user.get("enode_account_id")
            enriched.append({
                "id": uid,
                "full_name": user.get("name"),
                "email": user.get("email"),
                "is_admin": user.get("role") == "admin",
                "linked_to_enode": enode_match is not None,
                "linked_at": enode_match.get("createdAt") if enode_match else None,
                "is_approved": user.get("is_approved"),
                "tier": user.get("tier", "free"),
                "api_calls_30d": poll_counts.get(uid, 0),
                "vehicles": user_vehicles,
                "vehicle_count": len(user_vehicles),
                "country_code": country_by_user.get(uid),
                "days_inactive": days_inactive,
                "enode_account_id": enode_acct_id,
                "enode_account_name": account_name_map.get(enode_acct_id) if enode_acct_id else None,
            })

        return enriched
    except Exception as e:
        logger.error(f"[❌ get_all_users_with_enode_info] {e}")
        return []

async def set_user_approval(user_id: str, is_approved: bool) -> None:
    """
    Update the `is_approved` column for a given user.
    """
    try:
        result = supabase.table("users") \
            .update({"is_approved": is_approved}) \
            .eq("id", user_id) \
            .execute()

        if not result.data:
            raise Exception("No rows were updated")
        logger.info(f"✅ Updated is_approved={is_approved} for user_id={user_id}")
    except Exception as e:
        logger.error(f"[❌ set_user_approval] {e}")
        raise

async def get_user_approved_status(user_id: str) -> bool:
    """
    Return the `is_approved` status for a given user ID.
    """
    try:
        result = supabase.table("users").select("is_approved").eq("id", user_id).maybe_single().execute()
        if not result.data:
            return False
        return result.data.get("is_approved", False)
    except Exception as e:
        logger.error(f"[❌ get_user_approved_status] {e}")
        return False

async def get_user_accepted_terms(user_id: str) -> bool:
    """
    Return the `accepted_terms` status for a given user ID.
    """
    try:
        result = supabase.table("users").select("accepted_terms").eq("id", user_id).maybe_single().execute()
        if not result.data:
            return False
        return result.data.get("accepted_terms", False)
    except Exception as e:
        logger.error(f"[❌ get_user_accepted_terms] {e}")
        return False

async def get_user_by_id(user_id: str) -> User | None:
    """
    Fetch a single user by ID. Returns an instance of `User` model or None.
    """
    try:
        response = supabase.table("users") \
            .select("id, email, role, name, notify_offline, notification_preferences, phone_number, phone_verified, stripe_customer_id, tier, sms_credits, purchased_api_tokens, is_on_trial, trial_ends_at, pushover_user_key, pushover_enabled, pushover_events, abrp_token, abrp_enabled") \
            .eq("id", user_id) \
            .maybe_single() \
            .execute()

        logger.info(f"Response data: {response.data}")  # Debugging line

        row = response.data
        if not row:
            logger.info(f"[ℹ️] No user found with id={user_id}")
            return None

        user = User(**row)
        logger.info(f"✅ Retrieved user by ID: {user_id}")
        return user
    except Exception as e:
        logger.error(f"[❌ get_user_by_id] {e}")
        return None

async def update_user_stripe_id(user_id: str, stripe_customer_id: str) -> None:
    """
    Update the `stripe_customer_id` column for a given user.
    """
    try:
        result = supabase.table("users") \
            .update({"stripe_customer_id": stripe_customer_id}) \
            .eq("id", user_id) \
            .execute()

        if not result.data:
            raise Exception("No rows were updated for stripe_customer_id")
        logger.info(f"✅ Updated stripe_customer_id={stripe_customer_id} for user_id={user_id}")
    except Exception as e:
        logger.error(f"[❌ update_user_stripe_id] {e}")
        raise

async def is_subscriber(user_id: str) -> bool:
    """Return True if the user has `is_newsletter` flag set in interest."""
    try:
        result = (
            supabase.table("interest")
            .select("is_newsletter")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not result or not result.data or len(result.data) == 0:
            return False
        return bool(result.data[0].get("is_newsletter"))
    except Exception as e:
        logger.error(f"[❌ is_newsletter] {e}")
        return False

async def get_user_online_status(user_id: str) -> str:
    """
    Determine online/offline/partial status for a given user’s vehicles.
    Returns one of: “green”, “yellow”, “red”, or “grey”.
    """
    try:
        result = supabase.table("vehicles").select("online").eq("user_id", user_id).execute()
        vehicles = result.data or []

        if not vehicles:
            return "grey"

        statuses = [v.get("online") for v in vehicles]

        if all(statuses):
            return "green"
        elif any(statuses) and any(s is False for s in statuses):
            return "yellow"
        elif all(s is False for s in statuses):
            return "red"
        else:
            return "grey"
    except Exception as e:
        logger.error(f"[❌ get_user_online_status] {e}")
        return "grey"

async def update_user_terms(user_id: str, accepted_terms: bool):
    """
    Update the `accepted_terms` column for a given user.
    """
    try:
        result = supabase.table("users").update({"accepted_terms": accepted_terms}).eq("id", user_id).execute()
        logger.info(f"✅ Updated accepted_terms={accepted_terms} for user_id={user_id}")
        return result
    except Exception as e:
        logger.error(f"[❌ update_user_terms] {e}")
        raise

async def update_notify_offline(user_id: str, notify_offline: bool):
    """
    Update the `notify_offline` column for a given user.
    """
    try:
        result = supabase.table("users") \
            .update({"notify_offline": notify_offline}) \
            .eq("id", user_id) \
            .execute()
        logger.info(f"✅ Updated notify_offline={notify_offline} for user_id={user_id}")
        return result
    except Exception as e:
        logger.error(f"[❌ update_notify_offline] {e}")
        raise

# -------------------------------------------------------------------
# NEW FUNCTIONS: get_user_by_email & set_user_subscription
# -------------------------------------------------------------------

async def get_user_by_email(email: str) -> dict | None:
    """
    Fetch a single user by email from Supabase.
    Returns a dict with user fields, or None if not found.
    """
    try:
        response = supabase.table("users") \
            .select("id, email, name, role, is_approved, is_subscribed") \
            .eq("email", email) \
            .maybe_single() \
            .execute()

        if not response.data:
            logger.info(f"[ℹ️] No user found with email={email}")
            return None

        logger.info(f"✅ Retrieved user by email: {email}")
        return response.data
    except Exception as e:
        logger.error(f"[❌ get_user_by_email] {e}")
        return None

async def set_user_subscription(email: str, is_subscribed: bool) -> dict:
    """DEPRECATED: use :func:`app.storage.newsletter.set_subscriber` instead.

    Update the ``is_subscribed`` flag for a given user by email and return the
    updated user record. Raises on failure.
    """
    try:
        # 1) Perform the update
        _ = supabase.table("users") \
            .update({"is_subscribed": is_subscribed}) \
            .eq("email", email) \
            .execute()

        # 2) Fetch the updated row separately
        select_resp = supabase.table("users") \
            .select("id, email, name, role, is_approved, is_subscribed") \
            .eq("email", email) \
            .maybe_single() \
            .execute()

        if not select_resp.data:
            raise Exception("Failed to fetch updated user after setting subscription")

        updated_data = select_resp.data
        logger.info(f"✅ Set is_subscribed={is_subscribed} for user with email={email}")
        return updated_data

    except Exception as e:
        logger.error(f"[❌ set_user_subscription] {e}")
        raise
    
async def update_user_subscription(
    user_id: str,
    tier: str,
    status: str = "active",
) -> None:
    """
    Updates the user's subscription tier and status in Supabase.
    - tier: e.g., "free", "pro", "fleet"
    - status: "active", "canceled", "past_due", etc.
    """
    try:
        resp = (
            supabase.table("users")
            .update({"tier": tier, "subscription_status": status})
            .eq("id", user_id)
            .execute()
        )
        # Check that a row was updated
        if not resp.data:
            raise Exception(f"No rows updated for user {user_id}")
        logger.info(
            f"✅ Updated subscription for user {user_id}: tier={tier}, status={status}"
        )
    except Exception as e:
        logger.error(f"[❌ update_user_subscription] {e}")
        raise
    
async def add_user_sms_credits(user_id: str, credits: int) -> None:
    """
    Adds SMS credits to the user's balance in the `sms_credits` column.
    """
    from app.lib.supabase import get_supabase_admin_client
    supabase = get_supabase_admin_client()

    # Read current credits
    resp = supabase \
        .table("users") \
        .select("sms_credits") \
        .eq("id", user_id) \
        .maybe_single() \
        .execute()
    current = resp.data.get("sms_credits", 0) if resp.data else 0

    # Update with new credits
    supabase \
        .table("users") \
        .update({"sms_credits": current + credits}) \
        .eq("id", user_id) \
        .execute()

async def get_onboarding_status(user_id: str) -> dict | None:
    """Retrieves the onboarding progress status for a given user."""
    try:
        result = supabase.table("onboarding_progress") \
            .select("*") \
            .eq("user_id", user_id) \
            .maybe_single() \
            .execute()

        if result.data:
            return result.data
        return None
    except Exception as e:
        logger.error(f"[❌ get_onboarding_status] {e}")
        return None
    
async def set_welcome_sent_if_needed(user_id: str) -> None:
    """Sets the `welcome_sent` flag to True for a user's onboarding progress."""
    try:
        supabase.table("onboarding_progress") \
            .update({"welcome_sent": True}) \
            .eq("user_id", user_id) \
            .execute()
    except Exception as e:
        logger.error(f"[❌ set_welcome_sent_if_needed] {e}")

async def create_onboarding_row(user_id: str) -> dict | None:
    """
    Creates a default onboarding_progress row for the given user.
    Returns the inserted row as dict, or None on failure.
    """
    try:
        result = supabase.table("onboarding_progress").insert({
            "user_id": user_id
        }).execute()

        if result.data and len(result.data) > 0:
            return result.data[0]
        return None

    except Exception as e:
        logger.error(f"[❌ create_onboarding_row] {e}")
        return None

def set_ha_webhook_settings(user_id: str, webhook_id: str, external_url: str) -> bool:
    """Saves Home Assistant webhook settings for a user."""
    try:
        result = supabase.table("users") \
            .update({"ha_webhook_id": webhook_id, "ha_external_url": external_url}) \
            .eq("id", user_id) \
            .execute()
        # Supabase returns the updated row(s) in result.data on success
        return result.data is not None
    except Exception as e:
        logger.error(f"[❌ set_ha_webhook_settings] {e}")
        return False

def get_ha_webhook_settings(user_id: str) -> dict | None:
    """Retrieves Home Assistant webhook settings for a user."""
    try:
        result = supabase.table("users") \
            .select("ha_webhook_id, ha_external_url") \
            .eq("id", user_id) \
            .maybe_single() \
            .execute()

        if result.data:
            return {
                "ha_webhook_id": result.data.get("ha_webhook_id"),
                "ha_external_url": result.data.get("ha_external_url"),
            }
        return None
    except Exception as e:
        logger.error(f"[❌ get_ha_webhook_settings] {e}")
        return None


def get_ha_webhook_stats(user_id: str) -> dict | None:
    """Retrieves Home Assistant webhook stats for a user including push counts and reachability."""
    try:
        result = supabase.table("users") \
            .select("ha_webhook_id, ha_external_url, ha_push_success_count, ha_push_fail_count, ha_last_push_at, ha_last_check_at, ha_url_reachable, ha_last_error") \
            .eq("id", user_id) \
            .maybe_single() \
            .execute()

        if result.data:
            return {
                "ha_webhook_id": result.data.get("ha_webhook_id"),
                "ha_external_url": result.data.get("ha_external_url"),
                "push_success_count": result.data.get("ha_push_success_count") or 0,
                "push_fail_count": result.data.get("ha_push_fail_count") or 0,
                "last_push_at": result.data.get("ha_last_push_at"),
                "last_check_at": result.data.get("ha_last_check_at"),
                "url_reachable": result.data.get("ha_url_reachable"),
                "last_error": result.data.get("ha_last_error"),
            }
        return None
    except Exception as e:
        logger.error(f"[❌ get_ha_webhook_stats] {e}")
        return None
      
async def update_user_subscription(user_id: str, tier: str, status: str = "active"):
    """Update the user's tier (e.g. 'free', 'basic', 'pro') and status (e.g. 'active', 'canceled')."""
    try:
        result = supabase.table("users") \
            .update({"tier": tier, "subscription_status": status}) \
            .eq("id", user_id) \
            .execute()
        logger.info(f"[DB] Updated user {user_id} to tier {tier}, status {status}")
        return result
    except Exception as e:
        logger.error(f"[❌] Failed to update user {user_id} subscription: {e}")
        raise

async def remove_stripe_customer_id(user_id: str):
    """Set stripe_customer_id to NULL for a given user."""
    try:
        result = supabase.table("users") \
            .update({"stripe_customer_id": ""}) \
            .eq("id", user_id) \
            .execute()
        logger.info(f"[DB] Removed stripe_customer_id for user {user_id}")
        return result
    except Exception as e:
        logger.error(f"[❌] Failed to remove stripe_customer_id for user {user_id}: {e}")
        raise

async def get_user_id_by_stripe_customer_id(stripe_customer_id):
    """Retrieves a user ID based on their Stripe customer ID."""
    supabase = get_supabase_admin_client()
    result = supabase.table("users").select("id").eq("stripe_customer_id", stripe_customer_id).execute()
    if result and hasattr(result, "data") and result.data:
        return result.data[0]["id"]
    return None

async def update_user(user_id: str, **kwargs):
    """
    Updates one or more fields for a given user in the database.
    Example: await update_user(user_id="some_id", tier="pro", is_on_trial=True)
    """
    try:
        if not kwargs:
            logger.warning(f"[⚠️] update_user called for {user_id} with no fields to update.")
            return

        update_data = {k: v for k, v in kwargs.items() if v is not None}
        
        if not update_data:
            logger.warning(f"[⚠️] update_user called for {user_id} with only None values, no update performed.")
            return

        result = supabase.table("users") \
            .update(update_data) \
            .eq("id", user_id) \
            .execute()
        
        if not result.data:
            raise Exception(f"No rows were updated for user {user_id}")
        
        logger.info(f"[✅] Updated user {user_id} with: {update_data}")
        return result
    except Exception as e:
        logger.error(f"[❌ update_user] Failed to update user {user_id}: {e}", exc_info=True)
        raise

async def get_total_user_count() -> int:
    """
    Returns the total number of users in the database.
    """
    try:
        res = supabase.table("users").select("id", count="exact").execute()
        return res.count
    except Exception as e:
        logger.error(f"[❌ get_total_user_count] {e}")
        return 0


async def get_ha_user_count() -> int:
    """
    Returns the number of users actively using the Home Assistant integration.
    A user is considered an HA user if they have made API calls (poll_logs) in the last 30 days.
    """
    try:
        # Use the RPC function to get distinct users with poll activity
        res = supabase.rpc("get_poll_counts_by_user", {"days_ago": 30}).execute()
        return len(res.data) if res.data else 0
    except Exception as e:
        logger.error(f"[❌ get_ha_user_count] {e}")
        return 0


async def get_abrp_user_count() -> int:
    """
    Returns the number of users with ABRP integration enabled.
    """
    try:
        res = supabase.table("users").select("id", count="exact").eq("abrp_enabled", True).execute()
        return res.count
    except Exception as e:
        logger.error(f"[❌ get_abrp_user_count] {e}")
        return 0


async def get_users_by_country() -> list[dict]:
    """
    Returns users grouped by country with count.
    Uses country_code from the user's first vehicle.
    Returns list of {country_code, country, count} sorted by count descending.
    """
    try:
        # Get distinct user country codes from vehicles table
        # Each user is counted once based on their first vehicle's country_code
        res = supabase.table("vehicles").select("user_id, country_code").execute()
        vehicles = res.data or []

        # Track unique users per country (first vehicle's country wins)
        user_countries = {}
        for v in vehicles:
            user_id = v.get("user_id")
            country_code = v.get("country_code")
            if user_id and country_code and user_id not in user_countries:
                user_countries[user_id] = country_code

        # Count users per country
        from collections import defaultdict
        country_counts = defaultdict(int)
        for country_code in user_countries.values():
            country_counts[country_code] += 1

        # Country name lookup
        country_name_map = {
            "SE": "Sweden", "NO": "Norway", "DK": "Denmark", "FI": "Finland",
            "DE": "Germany", "NL": "Netherlands", "BE": "Belgium", "FR": "France",
            "GB": "United Kingdom", "US": "United States", "CA": "Canada",
            "AU": "Australia", "NZ": "New Zealand", "IT": "Italy", "ES": "Spain",
            "PT": "Portugal", "AT": "Austria", "CH": "Switzerland", "PL": "Poland",
            "CZ": "Czech Republic", "IE": "Ireland", "LU": "Luxembourg",
            "GR": "Greece", "IL": "Israel", "EG": "Egypt", "TH": "Thailand",
            "MY": "Malaysia", "SG": "Singapore", "ID": "Indonesia",
            "UY": "Uruguay", "CO": "Colombia",
        }

        # Convert to sorted list
        countries = [
            {
                "country_code": code,
                "country": country_name_map.get(code, code),
                "count": count
            }
            for code, count in country_counts.items()
        ]
        countries.sort(key=lambda x: x["count"], reverse=True)

        return countries
    except Exception as e:
        logger.error(f"[❌ get_users_by_country] {e}")
        return []

async def get_new_user_count(days: int) -> int:
    """
    Returns the number of new users created within the last 'days' days.
    """
    from datetime import datetime, timedelta # Import here to avoid circular dependency issues if datetime is used elsewhere
    try:
        # Calculate the datetime 'days' ago
        time_ago = datetime.utcnow() - timedelta(days=days)
        time_ago_iso = time_ago.isoformat() + "Z" # Supabase expects ISO format with Z for UTC

        res = supabase.table("users").select("id", count="exact").gte("created_at", time_ago_iso).execute()
        return res.count
    except Exception as e:
        logger.error(f"[❌ get_new_user_count] {e}")
        return 0

async def get_all_customers() -> list[dict]:
    """
    Fetches all users who are considered 'customers' (have a stripe_customer_id or an active subscription).
    """
    try:
        # This query fetches users who have a stripe_customer_id OR
        # whose 'tier' is not 'free' (implying a basic/pro subscription)
        # You might need to adjust the 'tier' logic based on your exact schema for active subscriptions.
        res = supabase.table("users").select("id, email, name, stripe_customer_id, tier, subscription_status") \
            .or_("stripe_customer_id.not.is.null,tier.neq.free") \
            .execute()
        return res.data if hasattr(res, "data") else []
    except Exception as e:
        logger.error(f"[❌ get_all_customers] {e}")
        return []

# NEW FUNCTIONS FOR TIERED RATE LIMITING
from app.storage.subscription import get_user_subscription

async def get_user_rate_limit_data(user_id: str) -> dict | None:
    """
    Fetches all data required for rate limiting checks in a single query.
    This now joins data from the user's active subscription.
    """
    try:
        # 1. Get basic user data, including trial info
        user_response = supabase.table("users")             .select("tier, linked_vehicle_count, purchased_api_tokens, is_on_trial, trial_ends_at")             .eq("id", user_id)             .maybe_single()             .execute()
        
        if not user_response.data:
            logger.warning(f"[⚠️] get_user_rate_limit_data: No user record found for rate limit check: {user_id}")
            return None
        
        user_data = user_response.data
        logger.debug(f"[DEBUG] get_user_rate_limit_data: user_data for {user_id}: {user_data}")

        # Determine tier_reset_date based on trial status or subscription
        tier_reset_date = None
        is_on_trial = user_data.get("is_on_trial")
        trial_ends_at_str = user_data.get("trial_ends_at")

        logger.debug(f"[DEBUG] get_user_rate_limit_data: is_on_trial={is_on_trial}, trial_ends_at_str={trial_ends_at_str}")

        if is_on_trial and trial_ends_at_str:
            try:
                # Ensure trial_ends_at is a datetime object
                if isinstance(trial_ends_at_str, str):
                    tier_reset_date = datetime.fromisoformat(trial_ends_at_str)
                    if tier_reset_date.tzinfo is None:
                        tier_reset_date = tier_reset_date.replace(tzinfo=timezone.utc)
                else:
                    tier_reset_date = trial_ends_at_str # Should already be datetime if not str
                logger.debug(f"[DEBUG] get_user_rate_limit_data: Using trial_ends_at as tier_reset_date: {tier_reset_date}")
            except ValueError as ve:
                logger.error(f"[❌] get_user_rate_limit_data: Invalid trial_ends_at format for user {user_id}: {trial_ends_at_str} - {ve}")
                tier_reset_date = None # Fallback if parsing fails
            except Exception as e:
                logger.error(f"[❌] get_user_rate_limit_data: Unexpected error parsing trial_ends_at for user {user_id}: {e}", exc_info=True)
                tier_reset_date = None
        
        if not tier_reset_date: # If not on trial or trial_ends_at is invalid, check subscription
            # 2. Get active subscription data to find the reset date
            subscription_data = await get_user_subscription(user_id)
            logger.debug(f"[DEBUG] get_user_rate_limit_data: subscription_data for {user_id}: {subscription_data}")
            tier_reset_date = subscription_data.get('current_period_end') if subscription_data else None
            if tier_reset_date:
                logger.debug(f"[DEBUG] get_user_rate_limit_data: Using subscription current_period_end as tier_reset_date: {tier_reset_date}")
            else:
                logger.debug(f"[DEBUG] get_user_rate_limit_data: No subscription data found for tier_reset_date for user {user_id}")

        # 3. Combine the data
        # Ensure tier_reset_date is always an ISO string when returned
        if isinstance(tier_reset_date, datetime):
            user_data['tier_reset_date'] = tier_reset_date.isoformat()
        else:
            user_data['tier_reset_date'] = tier_reset_date # Should be None or already a string
        
        return user_data
    except Exception as e:
        logger.error(f"[❌ get_user_rate_limit_data] {e}")
        return None

async def decrement_purchased_api_tokens(user_id: str) -> None:
    """
    Atomically decrements the user's purchased_api_tokens by 1.
    This uses an RPC call to a database function to prevent race conditions.
    """
    from app.lib.supabase import get_supabase_admin_async_client
    supabase_async = await get_supabase_admin_async_client()
    try:
        await supabase_async.rpc('decrement_user_tokens', {'p_user_id': user_id}).execute()
    except Exception as e:
        logger.error(f"[❌ decrement_purchased_api_tokens] Failed to decrement tokens for user {user_id}: {e}")
        # We might want to raise an exception here to fail the request if the decrement fails
        raise

async def add_purchased_api_tokens(user_id: str, quantity: int) -> None:
    """
    Atomically adds a specified quantity of tokens to the user's purchased_api_tokens balance.
    This uses an RPC call to a database function to prevent race conditions.
    """
    if quantity <= 0:
        return
    from app.lib.supabase import get_supabase_admin_async_client
    supabase_async = await get_supabase_admin_async_client()
    try:
        await supabase_async.rpc('add_user_tokens', {'p_user_id': user_id, 'p_quantity': quantity}).execute()
        logger.info(f"[✅] Added {quantity} tokens to user {user_id}")
    except Exception as e:
        logger.error(f"[❌ add_purchased_api_tokens] Failed to add {quantity} tokens for user {user_id}: {e}")
        raise



async def delete_user(user_id: str) -> bool:
    """
    Delete a user from auth.users (which cascades to public.users).
    Returns True if successful, False otherwise.
    """
    try:
        # Delete from auth.users using admin API - this cascades to public.users
        supabase.auth.admin.delete_user(user_id)
        logger.info(f"✅ Deleted user {user_id} from auth.users (cascades to public.users)")
        return True
    except Exception as e:
        error_msg = str(e)
        # If user not found, consider it success
        if "User not found" in error_msg or "404" in error_msg:
            logger.warning(f"⚠️ User {user_id} not found in auth.users, may already be deleted")
            return True
        logger.error(f"[❌ delete_user] {e}")
        return False

async def create_user(user_id: str, email: str, name: str = None) -> User | None:
    """
    Create a new user in the users table with default values.
    """
    try:
        user_data = {
            "id": user_id,
            "email": email,
            "name": name or email,
            "role": "user",
            "tier": "free",
            "notify_offline": False,
            "notification_preferences": {},
            "phone_number": None,
            "phone_verified": False,
            "sms_credits": 0,
            "purchased_api_tokens": 0,
            "stripe_customer_id": "",
            "is_on_trial": False,
            "trial_ends_at": None
        }

        response = supabase.table("users").insert(user_data).execute()

        if response.data:
            logger.info(f"✅ Created new user: {user_id} ({email})")
            return User(**response.data[0])
        else:
            logger.error(f"[❌] Failed to create user {user_id}")
            return None

    except Exception as e:
        logger.error(f"[❌ create_user] Error creating user {user_id}: {e}")
        return None


def update_ha_push_stats(user_id: str, success: bool, error: str | None = None) -> None:
    """
    Update HA webhook push statistics for a user.
    Increments success or fail count and updates last push timestamp.
    Optionally stores an error message (e.g., "vehicle_id_mismatch").
    """
    try:
        # First get current counts
        result = supabase.table("users") \
            .select("ha_push_success_count, ha_push_fail_count") \
            .eq("id", user_id) \
            .maybe_single() \
            .execute()

        if not result.data:
            logger.warning(f"[⚠️] update_ha_push_stats: User {user_id} not found")
            return

        current_success = result.data.get("ha_push_success_count") or 0
        current_fail = result.data.get("ha_push_fail_count") or 0

        # Update counts based on success/failure
        update_data = {
            "ha_last_push_at": datetime.now(timezone.utc).isoformat(),
        }
        if success:
            update_data["ha_push_success_count"] = current_success + 1
            update_data["ha_last_error"] = None  # Clear error on success
        else:
            update_data["ha_push_fail_count"] = current_fail + 1
            if error:
                update_data["ha_last_error"] = error

        supabase.table("users") \
            .update(update_data) \
            .eq("id", user_id) \
            .execute()

        logger.debug(f"[📊] Updated HA push stats for {user_id}: success={success}, error={error}")
    except Exception as e:
        logger.error(f"[❌ update_ha_push_stats] {e}")


def update_ha_url_check(user_id: str, reachable: bool) -> None:
    """
    Update HA URL reachability check result for a user.
    """
    try:
        update_data = {
            "ha_last_check_at": datetime.now(timezone.utc).isoformat(),
            "ha_url_reachable": reachable,
        }

        supabase.table("users") \
            .update(update_data) \
            .eq("id", user_id) \
            .execute()

        logger.info(f"[📊] Updated HA URL check for {user_id}: reachable={reachable}")
    except Exception as e:
        logger.error(f"[❌ update_ha_url_check] {e}")


def update_abrp_push_stats(user_id: str, success: bool, error: str | None = None) -> None:
    """
    Update ABRP telemetry push statistics for a user.
    Increments success or fail count and updates last push timestamp.
    Optionally stores an error message.
    """
    try:
        # First get current counts
        result = supabase.table("users") \
            .select("abrp_push_success_count, abrp_push_fail_count") \
            .eq("id", user_id) \
            .maybe_single() \
            .execute()

        if not result.data:
            logger.warning(f"[⚠️] update_abrp_push_stats: User {user_id} not found")
            return

        current_success = result.data.get("abrp_push_success_count") or 0
        current_fail = result.data.get("abrp_push_fail_count") or 0

        # Update counts based on success/failure
        update_data = {
            "abrp_last_push_at": datetime.now(timezone.utc).isoformat(),
        }
        if success:
            update_data["abrp_push_success_count"] = current_success + 1
            update_data["abrp_last_error"] = None  # Clear error on success
        else:
            update_data["abrp_push_fail_count"] = current_fail + 1
            if error:
                update_data["abrp_last_error"] = error

        supabase.table("users") \
            .update(update_data) \
            .eq("id", user_id) \
            .execute()

        logger.debug(f"[📊] Updated ABRP push stats for {user_id}: success={success}, error={error}")
    except Exception as e:
        logger.error(f"[❌ update_abrp_push_stats] {e}")


def get_abrp_stats(user_id: str) -> dict | None:
    """Retrieves ABRP push stats for a user including push counts and last error."""
    try:
        result = supabase.table("users") \
            .select("abrp_token, abrp_enabled, abrp_push_success_count, abrp_push_fail_count, abrp_last_push_at, abrp_last_error") \
            .eq("id", user_id) \
            .maybe_single() \
            .execute()

        if result.data:
            # Mask the token for security (show only last 4 chars)
            token = result.data.get("abrp_token")
            masked_token = None
            if token:
                masked_token = f"{'*' * (len(token) - 4)}{token[-4:]}" if len(token) > 4 else "****"

            return {
                "abrp_token": masked_token,
                "abrp_enabled": result.data.get("abrp_enabled") or False,
                "push_success_count": result.data.get("abrp_push_success_count") or 0,
                "push_fail_count": result.data.get("abrp_push_fail_count") or 0,
                "last_push_at": result.data.get("abrp_last_push_at"),
                "last_error": result.data.get("abrp_last_error"),
            }
        return None
    except Exception as e:
        logger.error(f"[❌ get_abrp_stats] {e}")
        return None

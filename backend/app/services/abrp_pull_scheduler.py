"""
ABRP Pull Polling Scheduler

Background task that periodically pulls vehicle telemetry from ABRP
for all users with abrp_pull_enabled = True. Saves updated vehicle
data to the vehicles table with source='abrp'.
"""
import asyncio
import copy
import logging
from datetime import datetime, timezone

import httpx

from app.lib.supabase import get_supabase_admin_client
from app.services.abrp_pull_service import get_abrp_pull_service
from app.storage.vehicle import save_abrp_vehicle, get_internal_vehicle_id
from app.storage.charging import save_charging_sample, check_and_create_charging_session
from app.storage.user import update_abrp_pull_stats, disable_abrp_pull, get_user_by_id, get_ha_webhook_settings, update_ha_push_stats

logger = logging.getLogger(__name__)

# Poll every 60 seconds (ABRP approved 30-60s interval)
DEFAULT_POLL_INTERVAL_SECONDS = 60

# Delay between individual user pulls to avoid hammering ABRP
REQUEST_DELAY_SECONDS = 1.0

# Auto-disable after this many consecutive failures
MAX_CONSECUTIVE_FAILS = 3

# Max concurrent ABRP user polls
MAX_CONCURRENT_ABRP_POLLS = 3


async def get_users_with_abrp_pull_enabled() -> list[dict]:
    """
    Get all users that have ABRP pull enabled with their credentials.
    Supports both token-based (new) and session-based (legacy) users.
    """
    supabase = get_supabase_admin_client()
    try:
        result = (
            supabase.table("users")
            .select("id, abrp_pull_user_token, abrp_pull_session_token, abrp_pull_api_key, abrp_pull_vehicle_ids")
            .eq("abrp_pull_enabled", True)
            .execute()
        )
        # Filter: must have either user_token OR (session_token + api_key + vehicle_ids)
        users = []
        for u in result.data or []:
            if u.get("abrp_pull_user_token"):
                users.append(u)
            elif u.get("abrp_pull_session_token") and u.get("abrp_pull_api_key") and u.get("abrp_pull_vehicle_ids"):
                users.append(u)
        return users
    except Exception as e:
        logger.error(f"[❌ ABRP Poll] Failed to get users with ABRP pull enabled: {e}")
        return []


async def pull_abrp_for_user(user: dict) -> int:
    """
    Pull telemetry from ABRP for a single user and save vehicles.
    Uses token-based API if user has a token, otherwise falls back to session-based.
    Returns the number of vehicles saved.
    """
    user_id = user["id"]
    user_token = user.get("abrp_pull_user_token")
    session_id = user.get("abrp_pull_session_token")
    api_key = user.get("abrp_pull_api_key")
    vehicle_ids_str = user.get("abrp_pull_vehicle_ids") or ""

    service = get_abrp_pull_service()

    # Prefer session-based API when available (returns richer telemetry data
    # including voltage, current, odometer, etc.), fall back to token-based
    if session_id and api_key and vehicle_ids_str:
        first_vid = vehicle_ids_str.split(",")[0].strip()
        result = await service.pull_telemetry(session_id, api_key, first_vid)
        # If session fails, fall back to token-based
        if not result.get("success") and user_token:
            logger.info(f"[🔄 ABRP Poll] User {user_id}: session-based failed, falling back to token")
            result = await service.pull_telemetry_token(user_token)
    elif user_token:
        result = await service.pull_telemetry_token(user_token)
    else:
        result = {"success": False, "message": "No ABRP credentials available"}

    if not result.get("success"):
        error_msg = result.get("message", "Unknown error")
        logger.warning(f"[⚠️ ABRP Poll] User {user_id}: {error_msg}")
        consecutive_fails = update_abrp_pull_stats(user_id, success=False, error=error_msg)

        if consecutive_fails >= MAX_CONSECUTIVE_FAILS:
            logger.warning(f"[🔒 ABRP Poll] User {user_id}: {consecutive_fails} consecutive failures, disabling ABRP pull")
            disable_abrp_pull(user_id)
            asyncio.create_task(_notify_abrp_credentials_expired(user_id, error_msg))

        return 0

    # Determine which vehicle IDs the user wants
    selected_ids = set(
        vid.strip() for vid in vehicle_ids_str.split(",") if vid.strip()
    )

    # Check if user has Enode vehicles — if not, we push ABRP data to HA
    has_enode_vehicles = await _user_has_enode_vehicles(user_id)

    saved_count = 0
    for v in result.get("vehicles", []):
        vid = str(v.get("vehicle_id", ""))
        if not v.get("tlm"):
            continue
        # If user specified specific IDs, only save those
        if selected_ids and vid not in selected_ids:
            continue

        vehicle_cache = service.normalize_to_vehicle(v, user_id)
        if vehicle_cache:
            saved = await save_abrp_vehicle(vehicle_cache, user_id, vid)
            if saved:
                saved_count += 1
                # Save charging sample for Insights (skip if Enode handles this car)
                if not has_enode_vehicles or not _abrp_vehicle_has_enode_counterpart(vehicle_cache, user_id):
                    internal_id = await get_internal_vehicle_id(user_id, vid)
                    if internal_id:
                        vehicle_cache["id"] = internal_id
                        await save_charging_sample(vehicle_cache, user_id)
                        await check_and_create_charging_session(internal_id, user_id)
                # Push ABRP data to HA only if user has no Enode vehicles
                # (if they have Enode, cross-populate enriches the Enode vehicle
                # which gets pushed to HA via the normal Enode webhook flow)
                if not has_enode_vehicles:
                    await _push_abrp_to_ha(vehicle_cache, user_id, vid)

    update_abrp_pull_stats(user_id, success=True)
    return saved_count


async def _user_has_enode_vehicles(user_id: str) -> bool:
    """Check if a user has any Enode-sourced vehicles."""
    supabase = get_supabase_admin_client()
    try:
        result = (
            supabase.table("vehicles")
            .select("id")
            .eq("user_id", user_id)
            .neq("source", "abrp")
            .limit(1)
            .execute()
        )
        return bool(result.data)
    except Exception as e:
        logger.error(f"[ABRP Poll] Failed to check Enode vehicles for user {user_id}: {e}")
        return False


def _abrp_vehicle_has_enode_counterpart(vehicle_cache: dict, user_id: str) -> bool:
    """Check if this ABRP vehicle has a matching Enode vehicle (same user + brand)."""
    brand = (vehicle_cache.get("information", {}).get("brand") or vehicle_cache.get("vendor") or "").upper()
    if not brand:
        return False
    supabase = get_supabase_admin_client()
    try:
        result = (
            supabase.table("vehicles")
            .select("id")
            .eq("user_id", user_id)
            .neq("source", "abrp")
            .ilike("vendor", brand)
            .limit(1)
            .execute()
        )
        return bool(result.data)
    except Exception as e:
        logger.error(f"[ABRP Poll] Failed to check Enode counterpart for user {user_id}: {e}")
        return False


async def _push_abrp_to_ha(vehicle_cache: dict, user_id: str, abrp_vehicle_id: str) -> None:
    """Push ABRP vehicle data to Home Assistant for users without Enode vehicles."""
    settings = get_ha_webhook_settings(user_id)
    if not settings or not settings.get("ha_webhook_id") or not settings.get("ha_external_url"):
        return

    # Look up internal DB vehicle ID for the ABRP vehicle
    supabase = get_supabase_admin_client()
    try:
        result = (
            supabase.table("vehicles")
            .select("id")
            .eq("user_id", user_id)
            .eq("vehicle_id", abrp_vehicle_id)
            .eq("source", "abrp")
            .maybe_single()
            .execute()
        )
        internal_id = result.data.get("id") if result.data else None
    except Exception:
        internal_id = None

    # Build event in the same format as Enode webhook events
    ha_event = copy.deepcopy(vehicle_cache)
    event = {"vehicle": ha_event}

    if internal_id:
        event["vehicleId"] = internal_id
        ha_event["id"] = internal_id

    # Ensure displayName is set
    info = ha_event.get("information", {})
    if not info.get("displayName"):
        brand = info.get("brand", "")
        model = info.get("model", "")
        fallback_name = f"{brand} {model}".strip()
        if fallback_name:
            ha_event.setdefault("information", {})["displayName"] = fallback_name

    url = f"{settings['ha_external_url'].rstrip('/')}/api/webhook/{settings['ha_webhook_id']}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=event, timeout=10.0)
            resp.raise_for_status()
            response_text = resp.text

            if "ignored - different vehicle" in response_text.lower():
                logger.warning(f"[ABRP→HA] Vehicle ID mismatch for user {user_id}")
                update_ha_push_stats(user_id, success=False, error="vehicle_id_mismatch")
            else:
                logger.info(f"[ABRP→HA] Pushed ABRP vehicle to HA for user {user_id}: HTTP {resp.status_code}")
                update_ha_push_stats(user_id, success=True)
    except Exception as e:
        logger.error(f"[ABRP→HA] Failed to push to HA for user {user_id}: {e}")
        update_ha_push_stats(user_id, success=False, error=str(e))


async def poll_all_abrp_users() -> dict:
    """
    Poll ABRP for all enabled users.
    Returns summary of polling results.
    """
    users = await get_users_with_abrp_pull_enabled()

    if not users:
        logger.debug("[ABRP Poll] No users with ABRP pull enabled")
        return {"users_polled": 0, "vehicles_updated": 0, "errors": 0}

    logger.info(f"[🔄 ABRP Poll] Starting poll for {len(users)} user(s)")

    results = {
        "users_polled": 0,
        "vehicles_updated": 0,
        "errors": 0,
    }

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_ABRP_POLLS)

    async def _poll_one(u: dict) -> tuple[int, str | None]:
        async with semaphore:
            try:
                saved = await pull_abrp_for_user(u)
                await asyncio.sleep(REQUEST_DELAY_SECONDS)
                return saved, None
            except Exception as e:
                return 0, str(e)

    poll_results = await asyncio.gather(*[_poll_one(u) for u in users])

    for user, (saved, error) in zip(users, poll_results):
        if error:
            logger.error(f"[❌ ABRP Poll] Error polling user {user['id']}: {error}")
            results["errors"] += 1
        else:
            results["users_polled"] += 1
            results["vehicles_updated"] += saved

    logger.info(f"[✅ ABRP Poll] Complete: {results}")
    return results


async def _notify_abrp_credentials_expired(user_id: str, last_error: str) -> None:
    """Send email notification when ABRP credentials expire and polling is auto-disabled."""
    try:
        user = await get_user_by_id(user_id)
        if not user:
            return

        email = user.get("email")
        name = user.get("name") or "there"
        if not email:
            logger.warning(f"[ABRP Notify] No email for user {user_id}, skipping notification")
            return

        from app.services.email.brevo_service import BrevoEmailService
        brevo = BrevoEmailService()

        subject = "EVConduit: Your ABRP connection needs attention"
        html_content = f"""
        <p>Hi {name},</p>
        <p>Your ABRP (A Better Route Planner) data pull has been automatically
        <strong>paused</strong> because it failed {MAX_CONSECUTIVE_FAILS} times in a row.</p>
        <p><strong>Last error:</strong> {last_error}</p>
        <p>This usually means your ABRP session token has expired.
        To resume automatic vehicle updates from ABRP:</p>
        <ol>
            <li>Log in to <a href="https://abetterrouteplanner.com">ABRP</a> in your browser</li>
            <li>Copy your new session token from browser dev tools</li>
            <li>Go to your <a href="https://evconduit.com/profile#abrp-pull">EVConduit profile</a>
            and update your ABRP Pull credentials</li>
            <li>Re-enable ABRP Pull</li>
        </ol>
        <p>— The EVConduit Team</p>
        """
        text_content = (
            f"Hi {name},\n\n"
            f"Your ABRP data pull has been paused after {MAX_CONSECUTIVE_FAILS} consecutive failures.\n"
            f"Last error: {last_error}\n\n"
            "This usually means your ABRP session token has expired.\n"
            "To fix: log in to ABRP, copy your new session token, and update it at "
            "https://evconduit.com/profile#abrp-pull\n\n"
            "— The EVConduit Team"
        )

        await brevo.send_transactional_email(
            recipient_email=email,
            recipient_name=name,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )
        logger.info(f"[📧 ABRP Notify] Sent credentials expired email to {email} for user {user_id}")
    except Exception as e:
        logger.error(f"[❌ ABRP Notify] Failed to send notification for user {user_id}: {e}")


class ABRPPullScheduler:
    """Background scheduler for periodic ABRP telemetry polling."""

    def __init__(self, interval_seconds: int = DEFAULT_POLL_INTERVAL_SECONDS):
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self):
        """Start the background polling task."""
        if self._running:
            logger.warning("[ABRPPoller] Already running, skipping start")
            return

        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info(f"[ABRPPoller] Started with {self.interval_seconds}s interval")

    async def stop(self):
        """Stop the background polling task."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("[ABRPPoller] Stopped")

    async def _poll_loop(self):
        """Main polling loop that runs periodically."""
        # Wait before first poll to let the app fully start
        await asyncio.sleep(150)  # 2.5 minutes after startup (stagger from vehicle poller)

        while self._running:
            try:
                logger.info(f"[ABRPPoller] Running poll at {datetime.now(timezone.utc).isoformat()}")
                await poll_all_abrp_users()
            except Exception as e:
                logger.error(f"[ABRPPoller] Poll failed: {e}", exc_info=True)

            await asyncio.sleep(self.interval_seconds)


# Global scheduler instance
abrp_pull_scheduler = ABRPPullScheduler()

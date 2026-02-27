"""
ABRP Pull Polling Scheduler

Background task that periodically pulls vehicle telemetry from ABRP
for all users with abrp_pull_enabled = True. Saves updated vehicle
data to the vehicles table with source='abrp'.
"""
import asyncio
import logging
from datetime import datetime, timezone

from app.lib.supabase import get_supabase_admin_client
from app.services.abrp_pull_service import get_abrp_pull_service
from app.storage.vehicle import save_abrp_vehicle
from app.storage.user import update_abrp_pull_stats, disable_abrp_pull, get_user_by_id

logger = logging.getLogger(__name__)

# Poll every 5 minutes
DEFAULT_POLL_INTERVAL_SECONDS = 5 * 60

# Delay between individual user pulls to avoid hammering ABRP
REQUEST_DELAY_SECONDS = 1.0

# Auto-disable after this many consecutive failures (3 polls × 5 min = 15 min)
MAX_CONSECUTIVE_FAILS = 3


async def get_users_with_abrp_pull_enabled() -> list[dict]:
    """
    Get all users that have ABRP pull enabled with their credentials.
    Returns list of dicts with id, session token, api key, and vehicle IDs.
    """
    supabase = get_supabase_admin_client()
    try:
        result = (
            supabase.table("users")
            .select("id, abrp_pull_session_token, abrp_pull_api_key, abrp_pull_vehicle_ids")
            .eq("abrp_pull_enabled", True)
            .not_.is_("abrp_pull_session_token", "null")
            .not_.is_("abrp_pull_api_key", "null")
            .not_.is_("abrp_pull_vehicle_ids", "null")
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"[❌ ABRP Poll] Failed to get users with ABRP pull enabled: {e}")
        return []


async def pull_abrp_for_user(user: dict) -> int:
    """
    Pull telemetry from ABRP for a single user and save vehicles.
    Returns the number of vehicles saved.
    """
    user_id = user["id"]
    session_id = user["abrp_pull_session_token"]
    api_key = user["abrp_pull_api_key"]
    vehicle_ids_str = user["abrp_pull_vehicle_ids"]

    service = get_abrp_pull_service()

    # Use the first vehicle ID as the wakeup ID
    first_vid = vehicle_ids_str.split(",")[0].strip()
    result = await service.pull_telemetry(session_id, api_key, first_vid)

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
                # NOTE: We do NOT push ABRP vehicles to Home Assistant.
                # HA webhook is configured with a specific Enode vehicle ID,
                # and pushing ABRP data (with a different vehicle ID) causes
                # HA configuration errors.

    update_abrp_pull_stats(user_id, success=True)
    return saved_count


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

    for user in users:
        try:
            saved = await pull_abrp_for_user(user)
            results["users_polled"] += 1
            results["vehicles_updated"] += saved
        except Exception as e:
            logger.error(f"[❌ ABRP Poll] Error polling user {user['id']}: {e}")
            results["errors"] += 1

        # Rate-limit between users
        if len(users) > 1:
            await asyncio.sleep(REQUEST_DELAY_SECONDS)

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

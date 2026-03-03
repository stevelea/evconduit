"""
Vehicle Polling Service

Provides background polling of vehicle data from Enode as a fallback
when webhooks are delayed or inactive. Also supports on-demand refresh.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.enode.user import get_user_vehicles_enode
from app.storage.vehicle import save_vehicle_data_with_client
from app.storage.charging import save_charging_sample, check_and_create_charging_session
from app.lib.supabase import get_supabase_admin_client
from app.storage.enode_account import get_enode_account_for_user

logger = logging.getLogger(__name__)

# Default polling interval: 5 minutes
DEFAULT_POLL_INTERVAL_SECONDS = 5 * 60

# Max concurrent user polls to keep event loop responsive
MAX_CONCURRENT_POLLS = 5


async def poll_vehicle_for_user(user_id: str) -> list[dict]:
    """
    Poll Enode for a single user's vehicles and return updated vehicles.
    Returns list of vehicles that had new data saved.
    """
    updated_vehicles = []

    try:
        account = await get_enode_account_for_user(user_id)
        if not account:
            logger.warning(f"[Poll] No Enode account for user {user_id}, skipping")
            return updated_vehicles

        vehicles = await get_user_vehicles_enode(user_id, account)
        logger.info(f"[🔄 Poll] User {user_id}: fetched {len(vehicles)} vehicles from Enode")

        for vehicle in vehicles:
            vehicle["userId"] = user_id
            vehicle_id = vehicle.get("id")

            # Save vehicle data (will skip if stale based on lastSeen comparison)
            was_saved = await save_vehicle_data_with_client(vehicle)

            if was_saved:
                logger.info(f"[✅ Poll] Vehicle {vehicle_id}: new data saved")
                updated_vehicles.append(vehicle)

                # Save charging sample for insights
                charge_state = vehicle.get("chargeState", {})
                if charge_state:
                    await save_charging_sample(vehicle, user_id, source_event_id=None)
                    await check_and_create_charging_session(vehicle_id, user_id)
            else:
                logger.debug(f"[⏭️ Poll] Vehicle {vehicle_id}: no new data (cache is current)")

    except Exception as e:
        logger.error(f"[❌ Poll] Failed to poll vehicles for user {user_id}: {e}")

    return updated_vehicles


async def poll_and_push_to_ha(user_id: str) -> int:
    """
    Poll Enode for a user's vehicles and push any updates to Home Assistant.
    Returns the number of vehicles that were updated and pushed.
    """
    from app.api.webhook import push_to_homeassistant, _safe_background_task

    updated_vehicles = await poll_vehicle_for_user(user_id)

    for vehicle in updated_vehicles:
        # Create a webhook-like event structure for HA push
        event = {
            "event": "user:vehicle:updated",
            "vehicle": vehicle,
            "user": {"id": user_id},
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "source": "polling"  # Mark as from polling, not webhook
        }
        # Fire-and-forget HA push
        asyncio.create_task(_safe_background_task(
            push_to_homeassistant(event, user_id),
            "HA push (poll)"
        ))

    return len(updated_vehicles)


async def get_users_with_ha_webhooks() -> list[str]:
    """Get all user IDs that have HA webhooks configured."""
    supabase = get_supabase_admin_client()
    try:
        result = supabase.table("users").select("id").not_.is_("ha_webhook_id", "null").execute()
        return [u["id"] for u in (result.data or [])]
    except Exception as e:
        logger.error(f"[❌] Failed to get users with HA webhooks: {e}")
        return []


async def get_users_with_stale_vehicles(stale_minutes: int = 30) -> list[str]:
    """Get user IDs whose vehicles haven't been updated recently (stale cache).
    This catches users who aren't getting webhook updates."""
    supabase = get_supabase_admin_client()
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)).isoformat()
        result = supabase.table("vehicles").select("user_id, updated_at").lt("updated_at", cutoff).execute()
        # Deduplicate user IDs
        return list(set(v["user_id"] for v in (result.data or []) if v.get("user_id")))
    except Exception as e:
        logger.error(f"[❌] Failed to get users with stale vehicles: {e}")
        return []


async def poll_all_users_with_ha() -> dict:
    """
    Poll users that need fresh vehicle data:
    1. All users with HA webhooks (for HA push)
    2. Users with stale vehicle data (no recent webhook updates)
    Returns summary of polling results.
    """
    ha_user_ids = await get_users_with_ha_webhooks()
    stale_user_ids = await get_users_with_stale_vehicles(stale_minutes=30)
    # Merge and deduplicate
    user_ids = list(set(ha_user_ids + stale_user_ids))
    logger.info(f"[🔄 Poll All] Starting poll for {len(user_ids)} users ({len(ha_user_ids)} HA, {len(stale_user_ids)} stale)")

    results = {
        "users_polled": 0,
        "vehicles_updated": 0,
        "errors": 0
    }

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_POLLS)

    async def _poll_one(uid: str) -> tuple[int, str | None]:
        async with semaphore:
            try:
                count = await poll_and_push_to_ha(uid)
                return count, None
            except Exception as e:
                return 0, str(e)

    poll_results = await asyncio.gather(*[_poll_one(uid) for uid in user_ids])

    for user_id, (count, error) in zip(user_ids, poll_results):
        if error:
            logger.error(f"[❌ Poll All] Error polling user {user_id}: {error}")
            results["errors"] += 1
        else:
            results["users_polled"] += 1
            results["vehicles_updated"] += count

    logger.info(f"[✅ Poll All] Complete: {results}")
    return results


class VehiclePollingScheduler:
    """Background scheduler for periodic vehicle polling."""

    def __init__(self, interval_seconds: int = DEFAULT_POLL_INTERVAL_SECONDS):
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self):
        """Start the background polling task."""
        if self._running:
            logger.warning("[VehiclePoller] Already running, skipping start")
            return

        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info(f"[VehiclePoller] Started with {self.interval_seconds}s interval")

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
        logger.info("[VehiclePoller] Stopped")

    async def _poll_loop(self):
        """Main polling loop that runs periodically."""
        # Wait before first poll to let the app fully start
        await asyncio.sleep(120)  # 2 minutes after startup

        while self._running:
            try:
                logger.info(f"[VehiclePoller] Running poll at {datetime.now(timezone.utc).isoformat()}")
                await poll_all_users_with_ha()
            except Exception as e:
                logger.error(f"[VehiclePoller] Poll failed: {e}", exc_info=True)

            # Wait for next interval
            await asyncio.sleep(self.interval_seconds)


# Global scheduler instance
vehicle_polling_scheduler = VehiclePollingScheduler()

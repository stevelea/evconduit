"""
Webhook Health Scheduler

Runs periodic background tasks to monitor webhook health and auto-recover
inactive webhook subscriptions.
"""
import asyncio
import logging
from datetime import datetime, timezone

from app.storage.webhook_monitor import monitor_webhook_health
from app.storage.webhook import sync_webhook_subscriptions_from_enode
from app.enode.webhook import subscribe_to_webhooks, fetch_enode_webhook_subscriptions, test_webhook
from app.lib.supabase import get_supabase_admin_client
from app.storage.enode_account import get_all_enode_accounts

logger = logging.getLogger(__name__)

# Default interval: 30 minutes
DEFAULT_MONITOR_INTERVAL_SECONDS = 30 * 60


class WebhookHealthScheduler:
    """Background scheduler for webhook health monitoring."""

    def __init__(self, interval_seconds: int = DEFAULT_MONITOR_INTERVAL_SECONDS):
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self):
        """Start the background monitoring task."""
        if self._running:
            logger.warning("[WebhookScheduler] Already running, skipping start")
            return

        self._running = True
        self._task = asyncio.create_task(self._monitor_loop())
        logger.info(f"[WebhookScheduler] Started with {self.interval_seconds}s interval")

    async def stop(self):
        """Stop the background monitoring task."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("[WebhookScheduler] Stopped")

    async def _monitor_loop(self):
        """Main monitoring loop that runs periodically."""
        # Wait a bit before first run to let the app fully start
        await asyncio.sleep(60)

        while self._running:
            try:
                logger.info(f"[WebhookScheduler] Running health check at {datetime.now(timezone.utc).isoformat()}")
                await self._run_health_check()
            except Exception as e:
                logger.error(f"[WebhookScheduler] Health check failed: {e}", exc_info=True)

            # Wait for next interval
            await asyncio.sleep(self.interval_seconds)

    async def _run_health_check(self):
        """Run a complete webhook health check with auto-recovery across all accounts."""
        supabase = get_supabase_admin_client()
        accounts = await get_all_enode_accounts()

        if not accounts:
            logger.warning("[WebhookScheduler] No Enode accounts configured!")
            return

        for account in accounts:
            account_name = account.get("name", account["id"])
            logger.info(f"[WebhookScheduler] Checking account '{account_name}'...")

            # Step 1: Sync subscriptions from Enode for this account
            try:
                await sync_webhook_subscriptions_from_enode(account)
            except Exception as e:
                logger.error(f"[WebhookScheduler] Failed to sync subscriptions for {account_name}: {e}")

        # Step 2: Check for active subscriptions across all accounts
        result = supabase.table("webhook_subscriptions").select("*").execute()
        subscriptions = result.data or []

        if not subscriptions:
            logger.warning("[WebhookScheduler] No webhook subscriptions found! Attempting to create for all accounts...")
            for account in accounts:
                await self._ensure_webhook_subscription(account)
            return

        active_subs = [s for s in subscriptions if s.get("is_active")]
        inactive_subs = [s for s in subscriptions if not s.get("is_active")]

        logger.info(f"[WebhookScheduler] Found {len(active_subs)} active, {len(inactive_subs)} inactive subscriptions")

        if inactive_subs:
            for sub in inactive_subs:
                webhook_id = sub.get('enode_webhook_id')
                acct_id = sub.get('enode_account_id')
                # Find the matching account for this webhook
                acct = next((a for a in accounts if a["id"] == acct_id), accounts[0] if accounts else None)
                if acct:
                    await self._reactivate_webhook(webhook_id, acct)

        if not active_subs:
            logger.error("[WebhookScheduler] No active webhook subscriptions! Attempting recovery...")
            for account in accounts:
                await self._ensure_webhook_subscription(account)
            return

        await self._check_event_freshness(active_subs)
        logger.info("[WebhookScheduler] Health check complete")

    async def _reactivate_webhook(self, webhook_id: str, account: dict):
        """Attempt to reactivate an inactive webhook by sending a test event."""
        if not webhook_id:
            return
        try:
            logger.info(f"[WebhookScheduler] Attempting to reactivate webhook {webhook_id}...")
            result = await test_webhook(webhook_id, account)
            logger.info(f"[WebhookScheduler] Webhook {webhook_id} test sent successfully: {result}")
            await sync_webhook_subscriptions_from_enode(account)
        except Exception as e:
            logger.error(f"[WebhookScheduler] Failed to reactivate webhook {webhook_id}: {e}")

    async def _ensure_webhook_subscription(self, account: dict):
        """Ensure at least one webhook subscription exists and is active for an account."""
        account_name = account.get("name", account["id"])
        try:
            logger.info(f"[WebhookScheduler] Fetching existing subscriptions for {account_name}...")
            existing = await fetch_enode_webhook_subscriptions(account)

            if existing:
                logger.info(f"[WebhookScheduler] Found {len(existing)} existing subscription(s) for {account_name}")
                await sync_webhook_subscriptions_from_enode(account)
            else:
                logger.info(f"[WebhookScheduler] No subscriptions found for {account_name}, creating new...")
                result = await subscribe_to_webhooks(account)
                logger.info(f"[WebhookScheduler] Created new webhook subscription for {account_name}: {result}")
                await sync_webhook_subscriptions_from_enode(account)

        except Exception as e:
            logger.error(f"[WebhookScheduler] Failed to ensure webhook for {account_name}: {e}", exc_info=True)

    async def _check_event_freshness(self, active_subs: list):
        """Check if we're receiving fresh events."""
        from datetime import timedelta

        now = datetime.now(timezone.utc)
        stale_threshold = timedelta(hours=2)  # Alert if no events for 2 hours

        for sub in active_subs:
            last_success = sub.get("last_success")
            if not last_success:
                logger.warning(f"[WebhookScheduler] Subscription {sub.get('enode_webhook_id')} has no last_success timestamp")
                continue

            try:
                last_success_dt = datetime.fromisoformat(last_success.replace("Z", "+00:00"))
                age = now - last_success_dt

                if age > stale_threshold:
                    logger.warning(
                        f"[WebhookScheduler] Subscription {sub.get('enode_webhook_id')} "
                        f"last received event {age} ago (threshold: {stale_threshold})"
                    )
                else:
                    logger.info(
                        f"[WebhookScheduler] Subscription {sub.get('enode_webhook_id')} "
                        f"is healthy, last event {age} ago"
                    )
            except Exception as e:
                logger.warning(f"[WebhookScheduler] Failed to parse last_success: {e}")


# Global scheduler instance
webhook_scheduler = WebhookHealthScheduler()

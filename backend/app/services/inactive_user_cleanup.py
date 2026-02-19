"""
Inactive User Cleanup Scheduler

Runs daily to:
1. Send 14-day warning emails to users who registered but never linked a vehicle
2. Send 28-day final reminder emails
3. Flag 30+ day inactive users for admin review (pending_deletion)

Users are never auto-deleted - admin must confirm deletion.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from app.lib.supabase import get_supabase_admin_client
from app.services.email.email_service import EmailService
from app.storage.email import has_email_been_sent

logger = logging.getLogger(__name__)

# Run daily at a low-traffic time
DEFAULT_INTERVAL_SECONDS = 24 * 60 * 60  # 24 hours

# Thresholds for inactive users (days since registration with no linked vehicle)
WARNING_THRESHOLD_DAYS = 14
REMINDER_THRESHOLD_DAYS = 28
DELETION_FLAG_THRESHOLD_DAYS = 30


class InactiveUserCleanupScheduler:
    """Background scheduler for inactive user cleanup tasks."""

    def __init__(self, interval_seconds: int = DEFAULT_INTERVAL_SECONDS):
        self.interval_seconds = interval_seconds
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self):
        """Start the background cleanup task."""
        if self._running:
            logger.warning("[InactiveCleanup] Already running, skipping start")
            return

        self._running = True
        self._task = asyncio.create_task(self._cleanup_loop())
        logger.info(f"[InactiveCleanup] Started with {self.interval_seconds}s interval")

    async def stop(self):
        """Stop the background cleanup task."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("[InactiveCleanup] Stopped")

    async def _cleanup_loop(self):
        """Main cleanup loop that runs daily."""
        # Wait a bit before first run to let the app fully start
        await asyncio.sleep(120)  # 2 minutes initial delay

        while self._running:
            try:
                logger.info(f"[InactiveCleanup] Running cleanup at {datetime.now(timezone.utc).isoformat()}")
                await self._run_cleanup_cycle()
            except Exception as e:
                logger.error(f"[InactiveCleanup] Cleanup cycle failed: {e}", exc_info=True)

            # Wait for next interval
            await asyncio.sleep(self.interval_seconds)

    async def _run_cleanup_cycle(self):
        """Run a complete cleanup cycle with all three steps."""
        # Step 1: Send 14-day warning emails
        logger.info("[InactiveCleanup] Step 1: Sending 14-day warning emails...")
        await self._send_warning_emails()

        # Step 2: Send 28-day reminder emails
        logger.info("[InactiveCleanup] Step 2: Sending 28-day reminder emails...")
        await self._send_reminder_emails()

        # Step 3: Flag 30+ day users for admin deletion
        logger.info("[InactiveCleanup] Step 3: Flagging 30+ day inactive users...")
        await self._flag_users_for_deletion()

        logger.info("[InactiveCleanup] Cleanup cycle complete")

    async def _get_inactive_users(self, min_days: int, max_days: int | None = None) -> list[dict]:
        """
        Query users who:
        - Have linked_vehicle_count = 0 (or NULL)
        - Were created between min_days and max_days ago
        - Are not already pending deletion
        """
        supabase = get_supabase_admin_client()

        now = datetime.now(timezone.utc)
        min_date = (now - timedelta(days=max_days if max_days else 9999)).isoformat()
        max_date = (now - timedelta(days=min_days)).isoformat()

        try:
            query = (
                supabase.table("users")
                .select("id, email, name, created_at, linked_vehicle_count, pending_deletion")
                .or_("linked_vehicle_count.eq.0,linked_vehicle_count.is.null")
                .eq("pending_deletion", False)
                .lte("created_at", max_date)
            )

            if max_days:
                query = query.gte("created_at", min_date)

            result = query.execute()
            users = result.data or []

            logger.info(f"[InactiveCleanup] Found {len(users)} inactive users (created {min_days}-{max_days or '+'} days ago)")
            return users

        except Exception as e:
            logger.error(f"[InactiveCleanup] Failed to query inactive users: {e}")
            return []

    async def _send_warning_emails(self):
        """Send 14-day warning emails to users who registered 14-28 days ago with no vehicle."""
        users = await self._get_inactive_users(
            min_days=WARNING_THRESHOLD_DAYS,
            max_days=REMINDER_THRESHOLD_DAYS
        )

        sent_count = 0
        skipped_count = 0

        for user in users:
            user_id = user["id"]
            template_name = "inactive_warning_14d"

            # Check if already sent (one-off protection)
            if await has_email_been_sent(user_id, template_name):
                skipped_count += 1
                continue

            try:
                email_service = EmailService(user_id)
                await email_service.send_email_from_template(
                    template_name=template_name,
                    template_data={
                        "name": user.get("name") or user.get("email", "").split("@")[0],
                        "created_at": user.get("created_at", "")[:10] if user.get("created_at") else "",
                    },
                    language_code="en"  # Default to English; could be extended to check user preference
                )
                sent_count += 1
                logger.info(f"[InactiveCleanup] Sent 14-day warning to {user.get('email')}")
            except Exception as e:
                logger.error(f"[InactiveCleanup] Failed to send warning email to {user_id}: {e}")

        logger.info(f"[InactiveCleanup] 14-day warnings: {sent_count} sent, {skipped_count} skipped (already sent)")

    async def _send_reminder_emails(self):
        """Send 28-day reminder emails to users who registered 28-30 days ago with no vehicle."""
        users = await self._get_inactive_users(
            min_days=REMINDER_THRESHOLD_DAYS,
            max_days=DELETION_FLAG_THRESHOLD_DAYS
        )

        sent_count = 0
        skipped_count = 0

        for user in users:
            user_id = user["id"]
            template_name = "inactive_reminder_28d"

            # Check if already sent (one-off protection)
            if await has_email_been_sent(user_id, template_name):
                skipped_count += 1
                continue

            try:
                email_service = EmailService(user_id)
                await email_service.send_email_from_template(
                    template_name=template_name,
                    template_data={
                        "name": user.get("name") or user.get("email", "").split("@")[0],
                        "created_at": user.get("created_at", "")[:10] if user.get("created_at") else "",
                    },
                    language_code="en"
                )
                sent_count += 1
                logger.info(f"[InactiveCleanup] Sent 28-day reminder to {user.get('email')}")
            except Exception as e:
                logger.error(f"[InactiveCleanup] Failed to send reminder email to {user_id}: {e}")

        logger.info(f"[InactiveCleanup] 28-day reminders: {sent_count} sent, {skipped_count} skipped (already sent)")

    async def _flag_users_for_deletion(self):
        """Flag users who registered 30+ days ago with no vehicle for admin review."""
        users = await self._get_inactive_users(min_days=DELETION_FLAG_THRESHOLD_DAYS)
        supabase = get_supabase_admin_client()

        flagged_count = 0

        for user in users:
            user_id = user["id"]

            # Skip if already flagged
            if user.get("pending_deletion"):
                continue

            try:
                supabase.table("users").update({
                    "pending_deletion": True,
                    "pending_deletion_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", user_id).execute()

                flagged_count += 1
                logger.info(f"[InactiveCleanup] Flagged user {user.get('email')} for pending deletion")
            except Exception as e:
                logger.error(f"[InactiveCleanup] Failed to flag user {user_id} for deletion: {e}")

        logger.info(f"[InactiveCleanup] Flagged {flagged_count} users for pending deletion")


# Global scheduler instance
inactive_user_cleanup_scheduler = InactiveUserCleanupScheduler()

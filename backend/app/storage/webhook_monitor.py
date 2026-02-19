from app.storage.settings import get_setting_by_name
from app.storage.status_logs import log_status
from app.storage.webhook import sync_webhook_subscriptions_from_enode
from app.lib.supabase import get_supabase_admin_client
from app.enode.webhook import test_webhook as enode_test_webhook
from app.storage.enode_account import get_enode_account_by_id, get_all_enode_accounts

from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)
supabase = get_supabase_admin_client()

async def monitor_webhook_health():
    """Monitors the health of Enode webhooks, syncing subscriptions and logging their status."""
    logger.info("[monitor] Starting webhook health monitor")

    # 1. Sync with Enode -> Supabase (across all accounts)
    logger.info("[monitor] Syncing webhook subscriptions from Enode...")
    await sync_webhook_subscriptions_from_enode()
    logger.info("[monitor] Sync complete")
    result = supabase.table("webhook_subscriptions").select("*").execute()
    subscriptions = result.data or []
    inactive = [s for s in subscriptions if not s.get("is_active")]

    if inactive:
        logger.warning(f"[monitor] {len(inactive)} inactive subscriptions detected after sync")
        await log_status("webhook_incoming", False, f"{len(inactive)} inactive after sync")
    else:
        logger.info("[monitor] All subscriptions are active after sync")
        await log_status("webhook_incoming", True, "All active after sync")

    # 2. Read settings
    enabled_setting = await get_setting_by_name("webhook.monitor.enabled")
    if not enabled_setting or enabled_setting.get("value") != "true":
        logger.info("[monitor] Monitoring is disabled via setting -> Exiting")
        return

    try:
        max_minutes_setting = await get_setting_by_name("webhook.monitor.max_failed_minutes")
        max_minutes = int(max_minutes_setting.get("value", "720"))
    except Exception as e:
        logger.warning(f"[monitor] Failed to read max_failed_minutes -> Defaulting to 720: {e}")
        max_minutes = 720

    auto_reactivate_setting = await get_setting_by_name("webhook.monitor.auto_reactivate")
    auto_test = auto_reactivate_setting and auto_reactivate_setting.get("value") == "true"

    logger.info(f"[monitor] max_failed_minutes: {max_minutes}")
    logger.info(f"[monitor] auto_reactivate: {auto_test}")

    # 3. Read current subscriptions
    result = supabase.table("webhook_subscriptions").select("*").execute()
    subscriptions = result.data or []

    logger.info(f"[monitor] Checking {len(subscriptions)} webhook(s)...")

    now = datetime.now(timezone.utc)
    threshold = now - timedelta(minutes=max_minutes)
    inactive_count = 0

    for sub in subscriptions:
        sub_id = sub.get("enode_webhook_id")
        last_success = sub.get("last_success")
        is_active = sub.get("is_active", False)

        if not last_success:
            continue

        try:
            last_success_dt = datetime.fromisoformat(last_success.replace("Z", "+00:00"))
        except Exception as e:
            logger.warning(f"[monitor] Failed to parse last_success for {sub_id}: {e}")
            continue

        if not is_active or last_success_dt < threshold:
            logger.warning(f"[monitor] Webhook {sub_id} is inactive or last_success too old")
            inactive_count += 1

            if auto_test:
                logger.info(f"[monitor] Sending test webhook to {sub_id}...")
                # Resolve account for this webhook
                acct_id = sub.get("enode_account_id")
                if acct_id:
                    account = await get_enode_account_by_id(acct_id)
                    if account:
                        try:
                            await enode_test_webhook(sub_id, account)
                        except Exception as e:
                            logger.error(f"[monitor] Failed to test webhook {sub_id}: {e}")
        else:
            logger.info(f"[monitor] Webhook {sub_id} is healthy")

    logger.info(f"[monitor] Done. Inactive or outdated: {inactive_count}/{len(subscriptions)}")

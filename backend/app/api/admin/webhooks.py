# backend/app/api/admin/webhooks.py
"""Admin endpoints for managing webhooks."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from app.auth.supabase_auth import get_supabase_user
from app.storage.webhook import (
    get_all_webhook_subscriptions,
    get_webhook_logs,
    mark_webhook_as_inactive,
    save_webhook_subscription,
    sync_webhook_subscriptions_from_enode,
)
from app.enode.webhook import subscribe_to_webhooks, delete_webhook
from app.storage.webhook_monitor import monitor_webhook_health
from app.storage.enode_account import get_all_enode_accounts, get_enode_account_by_id

logger = logging.getLogger(__name__)

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

@router.get("/webhook/subscriptions")
async def list_enode_webhooks(user=Depends(require_admin)):
    try:
        logger.info("[sync] Syncing subscriptions from Enode -> Supabase...")
        await sync_webhook_subscriptions_from_enode()  # Syncs across all accounts
        result = await get_all_webhook_subscriptions()
        logger.info(f"Returning {len(result)} subscriptions")
        return result
    except Exception as e:
        logger.error(f"[list_enode_webhooks] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/webhook/logs")
def fetch_webhook_logs(
    event: str | None = Query(None),
    user_q: str | None = Query(None),
    vehicle_q: str | None = Query(None),
    limit: int = Query(50, ge=1, le=1000),
    user=Depends(require_admin),
):
    try:
        logger.info(f"[🔍] Fetching webhook logs with filters: event={event}, user={user_q}, vehicle={vehicle_q}, limit={limit}")
        logs = get_webhook_logs(
            limit=limit,
            event_filter=event,
            user_filter=user_q,
            vehicle_filter=vehicle_q,
        )
        logger.debug("[🐞 DEBUG] Webhook logs sample:", logs[:1])
        return logs
    except Exception as e:
        logger.error(f"[❌ fetch_webhook_logs] {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve webhook logs")

@router.post("/webhook/subscriptions")
async def create_enode_webhook(request: Request, user=Depends(require_admin)):
    try:
        body = await request.json() if request.headers.get("content-type") == "application/json" else {}
        account_id = body.get("enode_account_id") if body else None

        if account_id:
            account = await get_enode_account_by_id(account_id)
            if not account:
                raise HTTPException(status_code=404, detail="Enode account not found")
            accounts_to_subscribe = [account]
        else:
            accounts_to_subscribe = await get_all_enode_accounts()

        results = []
        for account in accounts_to_subscribe:
            response = await subscribe_to_webhooks(account)
            await save_webhook_subscription(response)
            results.append(response)
        return results if len(results) > 1 else results[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[create_enode_webhook] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/webhook/subscriptions/{webhook_id}")
async def delete_enode_webhook(webhook_id: str, user=Depends(require_admin)):
    try:
        await mark_webhook_as_inactive(webhook_id)
        # Find the account for this webhook from the DB
        from app.lib.supabase import get_supabase_admin_client
        sb = get_supabase_admin_client()
        sub_res = sb.table("webhook_subscriptions").select("enode_account_id").eq("enode_webhook_id", webhook_id).maybe_single().execute()
        account_id = sub_res.data.get("enode_account_id") if sub_res.data else None
        if account_id:
            account = await get_enode_account_by_id(account_id)
            if account:
                await delete_webhook(webhook_id, account)
        return {"deleted": True}
    except Exception as e:
        logger.error(f"[delete_enode_webhook] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/webhook/monitor")
async def run_webhook_monitor(user=Depends(require_admin)):
    """
    Run webhook health monitoring manually (sync + check + auto test).
    """
    await monitor_webhook_health()
    return {"status": "completed"}


@router.get("/admin/webhook/scheduler/status")
async def get_scheduler_status(user=Depends(require_admin)):
    """
    Get the status of the automatic webhook health scheduler.
    """
    from app.services.webhook_scheduler import webhook_scheduler
    return {
        "running": webhook_scheduler._running,
        "interval_seconds": webhook_scheduler.interval_seconds,
        "interval_minutes": webhook_scheduler.interval_seconds // 60,
    }


@router.post("/admin/webhook/scheduler/run-now")
async def run_scheduler_now(user=Depends(require_admin)):
    """
    Manually trigger the webhook health scheduler to run immediately.
    This runs the full health check with auto-recovery.
    """
    from app.services.webhook_scheduler import webhook_scheduler
    try:
        await webhook_scheduler._run_health_check()
        return {"status": "completed", "message": "Health check completed successfully"}
    except Exception as e:
        logger.error(f"[❌ run_scheduler_now] {e}")
        raise HTTPException(status_code=500, detail=str(e))

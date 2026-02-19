# 📄 backend/app/storage/webhook.py

from datetime import datetime
from typing import Optional
import logging
from app.enode.webhook import fetch_enode_webhook_subscriptions
from app.lib.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)
supabase = get_supabase_admin_client()

async def sync_webhook_subscriptions_from_enode(account: dict | None = None):
    """
    Fetch current webhook subscriptions from Enode and upsert them to Supabase.
    If account is provided, sync for that specific account.
    If account is None, sync across all accounts.
    """
    if account is None:
        # Sync across all accounts
        from app.storage.enode_account import get_all_enode_accounts
        accounts = await get_all_enode_accounts()
        for acct in accounts:
            await sync_webhook_subscriptions_from_enode(acct)
        return

    account_name = account.get("name", account["id"])
    logger.info(f"[sync] Fetching subscriptions from Enode for account '{account_name}'")
    enode_subs = await fetch_enode_webhook_subscriptions(account)
    logger.info(f"[sync] Found {len(enode_subs)} subscriptions for account '{account_name}'")

    for item in enode_subs:
        try:
            is_active = item.get("isActive", False)

            response = supabase.table("webhook_subscriptions").upsert({
                "enode_webhook_id": item["id"],
                "url": item["url"],
                "events": item.get("events", []),
                "is_active": is_active,
                "api_version": item.get("apiVersion"),
                "last_success": item.get("lastSuccess"),
                "created_at": item.get("createdAt"),
                "enode_account_id": account["id"],
            }, on_conflict="enode_webhook_id").execute()

            if not response.data:
                logger.warning(f"No data returned on upsert for {item['id']}")
            else:
                logger.info(f"Upserted subscription {item['id']} with is_active={is_active}")

        except Exception as e:
            logger.error(f"Exception while upserting {item['id']}: {e}")

async def get_all_webhook_subscriptions():
    """Retrieves all webhook subscriptions from the database, ordered by creation date."""
    try:
        result = supabase.table("webhook_subscriptions") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(100) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"[❌ get_all_webhook_subscriptions] {e}")
        return []

def get_webhook_logs(
    limit: int = 50,
    event_filter: Optional[str] = None,
    user_filter: Optional[str] = None,
    vehicle_filter: Optional[str] = None,
) -> list[dict]:
    """
    Return a list of recent webhook logs from the view, with optional filtering.
    """

    try:
        query = supabase \
            .table("webhook_logs_view") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(limit)

        if event_filter:
            logger.info(f"[🔎 webhook_logs] Filtering by event: {event_filter}")
            query = query.eq("event", event_filter)

        if user_filter:
            cleaned = user_filter.strip()
            if cleaned:
                logger.info(f"[🔎 webhook_logs] Filtering by user_id_text like: {cleaned}")
                query = query.ilike("user_id_text", f"%{cleaned}%")

        if vehicle_filter:
            cleaned = vehicle_filter.strip()
            if cleaned:
                logger.info(f"[🔎 webhook_logs] Filtering by vehicle_id_text like: {cleaned}")
                query = query.ilike("vehicle_id_text", f"%{cleaned}%")

        res = query.execute()
        logger.info(f"[✅ webhook_logs] Returned {len(res.data or [])} logs")
        return res.data or []
    except Exception as e:
        logger.error(f"[❌ get_webhook_logs] {e}")
        return []

   
async def save_webhook_subscription(enode_response: dict):
    """
    Save new webhook subscription returned from Enode to Supabase.
    """
    
    data = {
        "enode_webhook_id": enode_response["id"],
        "url": enode_response["url"],
        "events": enode_response["events"],
        "secret": None,  # Not stored for security reasons
        "api_version": enode_response.get("apiVersion"),
        "is_active": enode_response.get("isActive", True),
        "last_success": enode_response.get("lastSuccess"),
        "created_at": enode_response.get("createdAt"),
    }

    res = supabase.table("webhook_subscriptions") \
        .upsert(data, on_conflict=["enode_webhook_id"]) \
        .execute()

    if res.data:
        logger.info(f"[✅ save_webhook_subscription] Upserted {enode_response['id']}")
    else:
        logger.warning(f"[⚠️ save_webhook_subscription] No data returned for {enode_response['id']}")
    return res

async def mark_webhook_as_inactive(enode_webhook_id: str):
    """
    Mark webhook as inactive before deleting from Enode.
    """
    
    res = supabase.table("webhook_subscriptions") \
        .update({
            "is_active": False,
            "ended_at": "now()"
        }) \
        .eq("enode_webhook_id", enode_webhook_id) \
        .execute()

    if res.data:
        logger.info(f"[✅ mark_webhook_as_inactive] Marked {enode_webhook_id} as inactive")
    else:
        logger.warning(f"[⚠️ mark_webhook_as_inactive] No data updated for {enode_webhook_id}")
    return res

def save_webhook_event(payload: dict | list):
    """
    Save a webhook event with metadata like user_id, vehicle_id, and event type.
    Enhanced with debug logging.
    """
    timestamp = datetime.utcnow().isoformat()

    try:
        parsed = payload[0] if isinstance(payload, list) else payload
        user_id = parsed.get("user", {}).get("id")
        vehicle_id = parsed.get("vehicle", {}).get("id")
        event = parsed.get("event")
        version = parsed.get("version")
        logger.info(f"[📝 Saving webhook event] Event: {event}, User: {user_id}, Vehicle: {vehicle_id}, Version: {version}")
    except Exception as e:
        logger.warning(f"[⚠️ Metadata parse error] Failed to extract metadata from webhook payload: {e}")
        user_id = vehicle_id = event = version = None

    try:
        response = supabase.table("webhook_logs").insert({
            "created_at": timestamp,
            "payload": payload,
            "user_id": user_id,
            "vehicle_id": vehicle_id,
            "event": event,
            "event_type": event,  # keep both for now
            "version": version
        }).execute()
        logger.info(f"✅ Webhook event saved at {timestamp}")
    except Exception as db_error:
        logger.error(f"[❌ DB error] Failed to insert webhook event: {db_error}")
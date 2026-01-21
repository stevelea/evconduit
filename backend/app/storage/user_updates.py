# backend/app/storage/user_updates.py
"""Storage layer for user updates/news items."""

import logging
from app.lib.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)
supabase = get_supabase_admin_client()


async def get_active_updates():
    """Retrieves all active user updates, ordered by priority and date."""
    try:
        res = (
            supabase.table("user_updates")
            .select("*")
            .eq("is_active", True)
            .order("priority", desc=True)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"[user_updates] get_active_updates error: {e}")
        return []


async def get_all_updates():
    """Retrieves all user updates (for admin), ordered by priority and date."""
    try:
        res = (
            supabase.table("user_updates")
            .select("*")
            .order("priority", desc=True)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"[user_updates] get_all_updates error: {e}")
        return []


async def get_update_by_id(update_id: str):
    """Retrieves a single update by ID."""
    try:
        res = (
            supabase.table("user_updates")
            .select("*")
            .eq("id", update_id)
            .maybe_single()
            .execute()
        )
        return res.data
    except Exception as e:
        logger.error(f"[user_updates] get_update_by_id error: {e}")
        return None


async def create_update(data: dict):
    """Creates a new user update."""
    try:
        res = supabase.table("user_updates").insert(data).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"[user_updates] create_update error: {e}")
        return None


async def update_update(update_id: str, data: dict):
    """Updates an existing user update."""
    try:
        res = (
            supabase.table("user_updates")
            .update(data)
            .eq("id", update_id)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"[user_updates] update_update error: {e}")
        return None


async def delete_update(update_id: str):
    """Deletes a user update."""
    try:
        res = (
            supabase.table("user_updates")
            .delete()
            .eq("id", update_id)
            .execute()
        )
        return True
    except Exception as e:
        logger.error(f"[user_updates] delete_update error: {e}")
        return False

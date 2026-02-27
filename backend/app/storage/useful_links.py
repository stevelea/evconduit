import logging
from app.lib.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)

supabase = get_supabase_admin_client()


def list_active_useful_links() -> list[dict]:
    """List all active useful links, ordered by sort_order."""
    response = (
        supabase.table("useful_links")
        .select("id, label, url, icon, is_external, sort_order")
        .eq("is_active", True)
        .order("sort_order")
        .execute()
    )
    return response.data or []


def list_all_useful_links() -> list[dict]:
    """List all useful links for admin view, ordered by sort_order."""
    response = (
        supabase.table("useful_links")
        .select("id, label, url, icon, is_external, is_active, sort_order, created_at")
        .order("sort_order")
        .execute()
    )
    return response.data or []


def create_useful_link(fields: dict) -> dict:
    """Create a new useful link."""
    allowed = {"label", "url", "icon", "is_external", "is_active", "sort_order"}
    payload = {k: v for k, v in fields.items() if k in allowed}
    response = supabase.table("useful_links").insert(payload).execute()
    return response.data[0] if response.data else {}


def update_useful_link(link_id: str, fields: dict) -> dict:
    """Update an existing useful link."""
    allowed = {"label", "url", "icon", "is_external", "is_active", "sort_order"}
    payload = {k: v for k, v in fields.items() if k in allowed}
    if not payload:
        return {}
    response = (
        supabase.table("useful_links")
        .update(payload)
        .eq("id", link_id)
        .execute()
    )
    return response.data[0] if response.data else {}


def delete_useful_link(link_id: str) -> None:
    """Hard delete a useful link."""
    supabase.table("useful_links").delete().eq("id", link_id).execute()

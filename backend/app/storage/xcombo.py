import logging
from app.lib.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)

supabase = get_supabase_admin_client()


def submit_xcombo_scene(scene_id: str, name: str, xcombo_code: str | None, description: str | None, category: str | None, submitted_by: str | None) -> dict:
    """Submit a new XCombo scene for moderation."""
    payload = {
        "scene_id": scene_id,
        "name": name,
        "xcombo_code": xcombo_code,
        "description": description,
        "category": category,
        "submitted_by": submitted_by,
        "status": "approved",
    }
    response = supabase.table("xcombo_scenes").insert(payload).execute()
    return response.data[0] if response.data else {}


def list_approved_xcombo_scenes() -> list[dict]:
    """List all approved XCombo scenes, newest first."""
    response = (
        supabase.table("xcombo_scenes")
        .select("scene_id, xcombo_code, name, description, category, submitted_by, created_at")
        .eq("status", "approved")
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def list_all_xcombo_scenes() -> list[dict]:
    """List all XCombo scenes for admin view, newest first."""
    response = (
        supabase.table("xcombo_scenes")
        .select("id, scene_id, xcombo_code, name, description, category, submitted_by, status, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def update_xcombo_scene_status(scene_id: str, status: str) -> dict:
    """Update the status of an XCombo scene (approve/reject)."""
    response = (
        supabase.table("xcombo_scenes")
        .update({"status": status})
        .eq("id", scene_id)
        .execute()
    )
    return response.data[0] if response.data else {}


def update_xcombo_scene(scene_id: str, fields: dict) -> dict:
    """Update editable fields of an XCombo scene."""
    allowed = {"name", "xcombo_code", "description", "category", "submitted_by"}
    payload = {k: v for k, v in fields.items() if k in allowed}
    if not payload:
        return {}
    response = (
        supabase.table("xcombo_scenes")
        .update(payload)
        .eq("id", scene_id)
        .execute()
    )
    return response.data[0] if response.data else {}


def delete_xcombo_scene(scene_id: str) -> None:
    """Delete an XCombo scene."""
    supabase.table("xcombo_scenes").delete().eq("id", scene_id).execute()

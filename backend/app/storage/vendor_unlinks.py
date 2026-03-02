import logging
from app.lib.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)


def log_vendor_unlink(user_id: str, user_email: str, vendor: str, deleted_vehicle_count: int):
    """Persist a vendor unlink event to the database."""
    supabase = get_supabase_admin_client()
    try:
        supabase.table("vendor_unlinks").insert({
            "user_id": user_id,
            "user_email": user_email,
            "vendor": vendor,
            "deleted_vehicle_count": deleted_vehicle_count,
        }).execute()
        logger.info(f"📝 Logged vendor unlink: user={user_id}, vendor={vendor}, deleted={deleted_vehicle_count}")
    except Exception as e:
        logger.error(f"❌ Failed to log vendor unlink: {e}")


def get_vendor_unlinks(limit: int = 100) -> list[dict]:
    """Retrieve recent vendor unlink events, ordered by date descending."""
    supabase = get_supabase_admin_client()
    try:
        result = supabase.table("vendor_unlinks") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"❌ Failed to fetch vendor unlinks: {e}")
        return []

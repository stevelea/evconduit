"""
Admin Notification Service - Sends notifications to admin users based on their preferences
"""
import logging
from typing import Optional

from app.lib.supabase import get_supabase_admin_client
from app.services.pushover_service import get_pushover_service

logger = logging.getLogger(__name__)


async def get_admin_users_with_pushover() -> list[dict]:
    """
    Get all admin users who have Pushover enabled.
    Returns list of dicts with id, email, pushover_user_key.
    """
    supabase = get_supabase_admin_client()
    try:
        res = supabase.table("users") \
            .select("id, email, pushover_user_key, pushover_enabled") \
            .eq("role", "admin") \
            .eq("pushover_enabled", True) \
            .not_.is_("pushover_user_key", "null") \
            .execute()
        return res.data or []
    except Exception as e:
        logger.error(f"[❌] Failed to get admin users with Pushover: {e}")
        return []


async def notify_admins(
    title: str,
    message: str,
    priority: int = 0,
    sound: Optional[str] = None,
    url: Optional[str] = None,
    url_title: Optional[str] = None,
) -> int:
    """
    Send a notification to all admin users who have Pushover enabled.

    Args:
        title: Notification title
        message: Notification body
        priority: -2 (silent) to 2 (emergency), default 0
        sound: Notification sound
        url: Optional URL to include
        url_title: Label for the URL

    Returns:
        Number of admins successfully notified
    """
    admins = await get_admin_users_with_pushover()

    if not admins:
        logger.info("[📱 Admin] No admins with Pushover enabled")
        return 0

    pushover = get_pushover_service()
    if not pushover.enabled:
        logger.warning("[📱 Admin] Pushover service not configured")
        return 0

    success_count = 0

    for admin in admins:
        user_key = admin.get("pushover_user_key")
        if not user_key:
            continue

        try:
            result = await pushover.send_notification(
                user_key=user_key,
                title=title,
                message=message,
                priority=priority,
                sound=sound,
                url=url,
                url_title=url_title,
            )

            if result.get("success"):
                success_count += 1
                logger.info(f"[📱 Admin] Notified admin {admin.get('email')}")
            else:
                logger.warning(f"[📱 Admin] Failed to notify {admin.get('email')}: {result.get('message')}")

        except Exception as e:
            logger.error(f"[❌ Admin] Error notifying {admin.get('email')}: {e}")

    return success_count


async def notify_admins_new_vehicle(
    vendor: str,
    user_email: str,
    vehicle_id: str,
) -> int:
    """
    Notify admins about a new vehicle being linked.

    Returns:
        Number of admins notified
    """
    return await notify_admins(
        title="New Vehicle Linked",
        message=f"Vendor: {vendor}\nUser: {user_email}\nVehicle: {vehicle_id[:8]}...",
        sound="bike",
        priority=0,
    )


async def notify_admins_new_user(
    user_email: str,
) -> int:
    """
    Notify admins about a new user registration.

    Returns:
        Number of admins notified
    """
    return await notify_admins(
        title="New User Registered",
        message=f"Email: {user_email}",
        sound="pushover",
        priority=-1,
    )

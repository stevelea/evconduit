# backend/app/api/admin/users.py
"""Admin endpoints for managing user accounts."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from app.auth.supabase_auth import get_supabase_user
from app.storage.user import get_all_users_with_enode_info, set_user_approval, delete_user
from app.enode.user import delete_enode_user
from app.lib.supabase import get_supabase_admin_client

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

@router.get("/admin/users")
async def list_all_users(user=Depends(require_admin)):
    logger.info(f"👮 Admin {user.get('sub') or user.get('id')} requested merged user list (Supabase + Enode)")
    users = await get_all_users_with_enode_info()
    logger.info(f"✅ Returning {len(users)} users with merged data")
    return JSONResponse(content=users)

@router.get("/admin/users/{user_id}")
async def get_user_details(user_id: str, user=Depends(require_admin)):
    """Get detailed information about a specific user for admin purposes."""
    logger.info(f"👮 Admin {user.get('sub') or user.get('id')} requested details for user {user_id}")
    supabase = get_supabase_admin_client()

    try:
        # Fetch user data
        user_res = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")

        user_data = user_res.data

        # Fetch user's vehicles
        vehicles_res = supabase.table("vehicles").select("vehicle_id, vendor, updated_at, online").eq("user_id", user_id).execute()
        vehicles = vehicles_res.data or []

        # Combine data
        result = {
            **user_data,
            "vehicles": vehicles,
            "vehicle_count": len(vehicles),
        }

        logger.info(f"✅ Returning details for user {user_id} with {len(vehicles)} vehicles")
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/users/{user_id}")
async def remove_user(user_id: str, user=Depends(require_admin)):
    logger.info(f"🗑️ Admin {user.get('sub') or user.get('id')} is attempting to delete user {user_id}")
    try:
        # 1. Delete from Enode (if linked)
        status_code = await delete_enode_user(user_id)
        # 204 = deleted successfully, 404 = user not found in Enode (already deleted or never linked)
        if status_code not in (204, 404):
            logger.error(f"❌ Failed to delete Enode user {user_id}, status_code: {status_code}")
            raise HTTPException(status_code=500, detail="Failed to delete user from Enode")
        logger.info(f"✅ Enode deletion complete for {user_id} (status: {status_code})")

        # 2. Delete from database
        db_deleted = await delete_user(user_id)
        if not db_deleted:
            logger.error(f"❌ Failed to delete user {user_id} from database")
            raise HTTPException(status_code=500, detail="Failed to delete user from database")

        logger.info(f"✅ Successfully deleted user {user_id}")
        return Response(status_code=204)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Exception in remove_user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/admin/users/{user_id}/approve", tags=["user"])
async def update_user_approval(
    user_id: str,
    payload: dict,
    current_user=Depends(require_admin),
):
    is_approved = payload.get("is_approved")
    if is_approved is None:
        raise HTTPException(status_code=400, detail="Missing is_approved")

    try:
        await set_user_approval(user_id, is_approved)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"success": True}

@router.patch("/admin/users/{user_id}")
async def update_user_fields(
    user_id: str,
    payload: dict,
    current_user=Depends(require_admin),
):
    """Update any user fields as admin."""
    logger.info(f"👮 Admin {current_user.get('sub') or current_user.get('id')} updating user {user_id} with {payload}")
    supabase = get_supabase_admin_client()

    # Filter out None values and non-updatable fields
    allowed_fields = {
        "name", "email", "role", "is_approved", "tier", "subscription_status",
        "notify_offline", "is_on_trial", "trial_ends_at", "sms_credits",
        "purchased_api_tokens", "ha_webhook_id", "ha_external_url"
    }
    update_data = {k: v for k, v in payload.items() if k in allowed_fields and v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    try:
        result = supabase.table("users").update(update_data).eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found or no changes made")
        logger.info(f"✅ Updated user {user_id}: {update_data}")
        return {"success": True, "updated": update_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

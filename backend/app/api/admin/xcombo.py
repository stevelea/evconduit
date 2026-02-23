import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from app.auth.supabase_auth import get_supabase_user
from app.storage.xcombo import list_all_xcombo_scenes, update_xcombo_scene_status, update_xcombo_scene, delete_xcombo_scene

logger = logging.getLogger(__name__)

router = APIRouter()


def require_admin(user=Depends(get_supabase_user)):
    role = user.get("user_metadata", {}).get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/xcombo/scenes")
async def list_scenes(user=Depends(require_admin)):
    """List all XCombo scenes (all statuses) for admin review."""
    return list_all_xcombo_scenes()


@router.patch("/admin/xcombo/scenes/{scene_id}/status")
async def update_scene_status(scene_id: str, request: Request, user=Depends(require_admin)):
    """Update the status of an XCombo scene (approve/reject)."""
    data = await request.json()
    status = data.get("status")

    if status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status")

    result = update_xcombo_scene_status(scene_id, status)
    if not result:
        raise HTTPException(status_code=404, detail="Scene not found")

    logger.info(f"XCombo scene {scene_id} updated to {status} by admin {user.get('sub')}")
    return result


@router.patch("/admin/xcombo/scenes/{scene_id}")
async def update_scene(scene_id: str, request: Request, user=Depends(require_admin)):
    """Update editable fields of an XCombo scene."""
    data = await request.json()
    result = update_xcombo_scene(scene_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Scene not found")
    logger.info(f"XCombo scene {scene_id} updated by admin {user.get('sub')}: {list(data.keys())}")
    return result


@router.delete("/admin/xcombo/scenes/{scene_id}")
async def delete_scene(scene_id: str, user=Depends(require_admin)):
    """Delete an XCombo scene."""
    delete_xcombo_scene(scene_id)
    logger.info(f"XCombo scene {scene_id} deleted by admin {user.get('sub')}")
    return {"message": "Scene deleted"}

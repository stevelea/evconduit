# backend/app/api/user_updates.py
"""API endpoints for user updates/news displayed on dashboard."""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.supabase_auth import get_supabase_user
from app.storage import user_updates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user-updates", tags=["user-updates"])


class UserUpdateCreate(BaseModel):
    title: str
    content: str
    is_active: bool = True
    priority: int = 0


class UserUpdateUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None


class UserUpdateResponse(BaseModel):
    id: str
    title: str
    content: str
    is_active: bool
    priority: int
    created_at: str
    updated_at: str


def require_admin(user=Depends(get_supabase_user)):
    """Dependency that requires admin role."""
    role = user.get("user_metadata", {}).get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("", response_model=List[UserUpdateResponse])
async def get_updates(user=Depends(get_supabase_user)):
    """Get all active user updates for the dashboard."""
    updates = await user_updates.get_active_updates()
    return updates


@router.get("/admin", response_model=List[UserUpdateResponse])
async def get_all_updates_admin(user=Depends(require_admin)):
    """Admin: Get all user updates including inactive ones."""
    updates = await user_updates.get_all_updates()
    return updates


@router.post("/admin", response_model=UserUpdateResponse)
async def create_update(data: UserUpdateCreate, user=Depends(require_admin)):
    """Admin: Create a new user update."""
    update = await user_updates.create_update(data.model_dump())
    if not update:
        raise HTTPException(status_code=500, detail="Failed to create update")
    logger.info(f"[user_updates] Created update: {update['id']}")
    return update


@router.put("/admin/{update_id}", response_model=UserUpdateResponse)
async def update_existing(
    update_id: str, data: UserUpdateUpdate, user=Depends(require_admin)
):
    """Admin: Update an existing user update."""
    existing = await user_updates.get_update_by_id(update_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Update not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await user_updates.update_update(update_id, update_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to update")
    logger.info(f"[user_updates] Updated: {update_id}")
    return result


@router.delete("/admin/{update_id}")
async def delete_existing(update_id: str, user=Depends(require_admin)):
    """Admin: Delete a user update."""
    existing = await user_updates.get_update_by_id(update_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Update not found")

    success = await user_updates.delete_update(update_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete")
    logger.info(f"[user_updates] Deleted: {update_id}")
    return {"success": True}

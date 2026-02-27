import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from app.auth.supabase_auth import get_supabase_user
from app.storage.useful_links import (
    list_all_useful_links,
    create_useful_link,
    update_useful_link,
    delete_useful_link,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def require_admin(user=Depends(get_supabase_user)):
    role = user.get("user_metadata", {}).get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/useful-links")
async def list_links(user=Depends(require_admin)):
    """List all useful links for admin management."""
    return list_all_useful_links()


@router.post("/admin/useful-links")
async def create_link(request: Request, user=Depends(require_admin)):
    """Create a new useful link."""
    data = await request.json()
    if not data.get("label") or not data.get("url"):
        raise HTTPException(status_code=400, detail="label and url are required")
    result = create_useful_link(data)
    logger.info(f"Useful link created by admin {user.get('sub')}: {data.get('label')}")
    return result


@router.patch("/admin/useful-links/{link_id}")
async def patch_link(link_id: str, request: Request, user=Depends(require_admin)):
    """Update a useful link."""
    data = await request.json()
    result = update_useful_link(link_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Link not found")
    logger.info(f"Useful link {link_id} updated by admin {user.get('sub')}: {list(data.keys())}")
    return result


@router.delete("/admin/useful-links/{link_id}")
async def remove_link(link_id: str, user=Depends(require_admin)):
    """Delete a useful link."""
    delete_useful_link(link_id)
    logger.info(f"Useful link {link_id} deleted by admin {user.get('sub')}")
    return {"message": "Link deleted"}

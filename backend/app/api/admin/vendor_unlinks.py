import logging
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from app.api.admin.users import require_admin
from app.storage.vendor_unlinks import get_vendor_unlinks

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/admin/vendor-unlinks")
async def list_vendor_unlinks(limit: int = 100, user=Depends(require_admin)):
    """Get recent vendor unlink events for admin dashboard."""
    unlinks = get_vendor_unlinks(limit=limit)
    return JSONResponse(content=unlinks)

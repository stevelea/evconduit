# backend/app/api/admin/metrics.py
"""
Admin endpoint for real-time system metrics.
"""

from fastapi import APIRouter, Depends
from app.auth.supabase_auth import get_supabase_user
from app.services.metrics import get_metrics

router = APIRouter()


def require_admin(user=Depends(get_supabase_user)):
    """Dependency to require admin role."""
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin access required")
    role = user.get("user_metadata", {}).get("role")
    if role != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/metrics")
async def get_system_metrics(user=Depends(require_admin)):
    """
    Returns real-time system metrics for the admin dashboard.
    Metrics are collected in-memory with no database overhead.

    Returns:
        - current: Metrics for the current 5-minute window
        - previous: Metrics from the previous 5-minute window (for comparison)
    """
    return get_metrics()

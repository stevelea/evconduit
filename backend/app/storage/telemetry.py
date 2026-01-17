# backend/app/storage/telemetry.py

from typing import Optional
from app.lib.supabase import get_supabase_admin_client

supabase = get_supabase_admin_client()

async def log_api_telemetry(
    endpoint: str,
    user_id: Optional[str],
    vehicle_id: Optional[str],
    status: int,
    error_message: Optional[str],
    duration_ms: int,
    timestamp: str,
    request_size: Optional[int] = None,
    response_size: Optional[int] = None,
    request_payload: Optional[dict | str] = None,
    response_payload: Optional[str] = None,
    cost_tokens: int = 0,
) -> None:
    """
    Telemetry disabled until table schema is fixed.
    """
    pass  # Do nothing
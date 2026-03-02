# backend/app/models/user.py

from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    """Represents a user in the system, including their subscription and notification preferences."""
    id: str
    email: str
    role: str
    name: Optional[str] = None
    notify_offline: Optional[bool] = False
    notification_preferences: Optional[dict] = None
    phone_number: Optional[str] = None
    phone_verified: Optional[bool] = False
    tier: str
    sms_credits: int = 0
    purchased_api_tokens: int = 0 # NEW: User's balance of purchased API tokens
    stripe_customer_id: Optional[str] = None
    is_on_trial: bool = False
    trial_ends_at: Optional[str] = None # Using str for datetime for now, will convert to datetime object when reading from DB
    # Pushover notification settings
    pushover_user_key: Optional[str] = None
    pushover_enabled: bool = False
    pushover_events: Optional[dict] = None
    # ABRP (A Better Route Planner) push settings
    abrp_token: Optional[str] = None
    abrp_enabled: bool = False
    # ABRP pull settings (read telemetry FROM ABRP)
    abrp_pull_user_token: Optional[str] = None
    abrp_pull_session_token: Optional[str] = None
    abrp_pull_api_key: Optional[str] = None
    abrp_pull_vehicle_ids: Optional[str] = None
    abrp_pull_enabled: bool = False

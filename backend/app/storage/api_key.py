"""
backend/app/storage/api_key.py

Storage functions for API key management in EVLink backend.
"""
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import uuid4

from app.lib.api_key_utils import generate_api_key, hash_api_key
from app.lib.supabase import get_supabase_admin_client
from app.models.user import User
from app.storage.user import get_user_by_id
import logging

# Module logger
logger = logging.getLogger(__name__)

supabase = get_supabase_admin_client()

# Cache for API key lookups (reduces DB queries for frequent HA polling)
_api_key_cache: dict[str, dict[str, Any]] = {}
API_KEY_CACHE_TTL = 60  # 1 minute TTL


def _get_cached_user(key_hash: str) -> User | None:
    """Get cached user for API key hash."""
    if key_hash in _api_key_cache:
        entry = _api_key_cache[key_hash]
        if datetime.utcnow() < entry["expires_at"]:
            return entry["user"]
        del _api_key_cache[key_hash]
    return None


def _set_cached_user(key_hash: str, user: User) -> None:
    """Cache user for API key hash."""
    _api_key_cache[key_hash] = {
        "user": user,
        "expires_at": datetime.utcnow() + timedelta(seconds=API_KEY_CACHE_TTL)
    }

def create_api_key(user_id: str) -> str:
    """
    Creates a new API key for a user, deactivates old ones (if any),
    and returns the new plaintext key.
    """
    try:
        new_key = generate_api_key()
        hashed_key = hash_api_key(new_key)
        key_id = str(uuid4())

        logger.info("[create_api_key] Deactivating old keys for user_id=%s", user_id)
        try:
            supabase.table("api_keys") \
                .update({"active": False}) \
                .eq("user_id", user_id) \
                .execute()
        except Exception as update_err:
            logger.warning("[create_api_key] Failed to deactivate old keys: %s", update_err)

        payload = {
            "id": key_id,
            "user_id": user_id,
            "key_hash": hashed_key,
            "active": True
        }

        logger.info("[create_api_key] Inserting new API key with ID=%s", key_id)
        response = supabase.table("api_keys").insert(payload).execute()

        if not response or not getattr(response, 'data', None):
            logger.warning("[create_api_key] Inserted key but no data returned for user_id=%s", user_id)
        else:
            logger.info("[create_api_key] API key created for user_id=%s", user_id)

        return new_key

    except Exception as e:
        logger.error("[create_api_key] Failed for user_id=%s: %s", user_id, e, exc_info=True)
        return ""


def get_api_key_info(user_id: str) -> Optional[dict]:
    """
    Returns metadata for the currently active API key.
    """
    try:
        logger.info("[get_api_key_info] Fetching active key for user_id=%s", user_id)
        response = supabase.table("api_keys") \
            .select("id, created_at, active") \
            .eq("user_id", user_id) \
            .eq("active", True) \
            .maybe_single() \
            .execute()

        if not response:
            logger.warning("[get_api_key_info] No response for user_id=%s", user_id)
            return None
        if response.data:
            logger.info("[get_api_key_info] Found active key for user_id=%s", user_id)
            return response.data
        logger.info("[get_api_key_info] No active key found for user_id=%s", user_id)
        return None
    except Exception as e:
        logger.error("[get_api_key_info] Exception for user_id=%s: %s", user_id, e, exc_info=True)
        return None

async def get_user_by_api_key(api_key: str) -> User | None:
    """
    Returns a User if the provided API key is valid and active.
    Uses caching to reduce DB queries for frequent HA polling.
    """
    try:
        hashed = hash_api_key(api_key)

        # Check cache first
        cached_user = _get_cached_user(hashed)
        if cached_user is not None:
            logger.debug("[get_user_by_api_key] Cache hit for API key")
            return cached_user

        logger.info("[get_user_by_api_key] Lookup for API key hash=%s", hashed)
        response = supabase.table("api_keys") \
            .select("user_id") \
            .eq("key_hash", hashed) \
            .eq("active", True) \
            .maybe_single() \
            .execute()

        if not response:
            logger.warning("[get_user_by_api_key] No response for API key lookup")
            return None

        row = getattr(response, 'data', None)
        if not row:
            logger.warning("[get_user_by_api_key] Invalid or inactive API key")
            return None

        user = await get_user_by_id(row["user_id"])
        if user:
            _set_cached_user(hashed, user)
        return user
    except Exception as e:
        logger.error("[get_user_by_api_key] Exception during lookup: %s", e, exc_info=True)
        return None

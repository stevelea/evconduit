import time
import logging
import httpx

logger = logging.getLogger(__name__)

# Per-account token cache: {account_id: {"access_token": str, "expires_at": float}}
_token_cache: dict[str, dict] = {}


async def get_access_token(account: dict) -> str:
    """Retrieves and caches the Enode API access token for a specific account.

    Args:
        account: dict with keys 'id', 'client_id', 'client_secret', 'auth_url'
    """
    account_id = account["id"]

    cached = _token_cache.get(account_id)
    if cached and cached.get("access_token") and cached["expires_at"] > time.time():
        return cached["access_token"]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            account["auth_url"],
            data={"grant_type": "client_credentials"},
            auth=(account["client_id"], account["client_secret"]),
        )
        response.raise_for_status()
        token_data = response.json()

        _token_cache[account_id] = {
            "access_token": token_data["access_token"],
            "expires_at": time.time() + token_data.get("expires_in", 3600) - 60,
        }
        logger.info(f"[auth] Refreshed token for account {account.get('name', account_id)}")
        return token_data["access_token"]


def invalidate_token_cache(account_id: str) -> None:
    """Invalidate the cached token for an account (e.g., after credential rotation)."""
    if account_id in _token_cache:
        del _token_cache[account_id]
        logger.info(f"[auth] Invalidated token cache for account {account_id}")

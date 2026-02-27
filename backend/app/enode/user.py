import httpx
import logging
from app.enode.auth import get_access_token

logger = logging.getLogger(__name__)


async def ensure_enode_user_exists(user_id: str, account: dict) -> bool:
    """Ensures the user exists in Enode. Creates them if they don't exist.

    Returns True if user exists or was created successfully.
    """
    token = await get_access_token(account)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    base_url = account["base_url"]

    # First, check if user exists by trying to get their info
    check_url = f"{base_url}/users/{user_id}"
    async with httpx.AsyncClient() as client:
        check_res = await client.get(check_url, headers=headers)

        if check_res.status_code == 200:
            logger.info(f"Enode user {user_id} already exists")
            return True

        if check_res.status_code != 404:
            logger.error(f"Unexpected status checking Enode user {user_id}: {check_res.status_code}")
            return False

    # User doesn't exist, create them
    create_url = f"{base_url}/users"
    payload = {"id": user_id}

    async with httpx.AsyncClient() as client:
        create_res = await client.post(create_url, headers=headers, json=payload)

        if create_res.status_code in (200, 201):
            logger.info(f"Created Enode user {user_id}")
            return True

        # 409 Conflict means user already exists (race condition)
        if create_res.status_code == 409:
            logger.info(f"Enode user {user_id} already exists (409)")
            return True

        logger.error(f"Failed to create Enode user {user_id}: {create_res.status_code} - {create_res.text}")
        return False


async def get_user_vehicles_enode(user_id: str, account: dict) -> list:
    token = await get_access_token(account)
    url = f"{account['base_url']}/users/{user_id}/vehicles"
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, headers=headers)
        res.raise_for_status()
        return res.json().get("data", [])

async def get_all_users(account: dict, page_size: int = 50, after: str | None = None):
    token = await get_access_token(account)
    headers = {"Authorization": f"Bearer {token}"}
    params = {"pageSize": str(page_size)}
    if after:
        params["after"] = after
    url = f"{account['base_url']}/users"
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers, params=params)
        res.raise_for_status()
        return res.json()

async def delete_enode_user(user_id: str, account: dict):
    token = await get_access_token(account)
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{account['base_url']}/users/{user_id}"
    async with httpx.AsyncClient() as client:
        res = await client.delete(url, headers=headers)
        return res.status_code

async def unlink_vendor(user_id: str, vendor: str, account: dict) -> tuple[bool, str | None]:
    """Unlinks a specific vendor from a user in Enode."""
    token = await get_access_token(account)
    url = f"{account['base_url']}/users/{user_id}/vendors/{vendor}"
    headers = {
        "Authorization": f"Bearer {token}",
    }

    async with httpx.AsyncClient() as client:
        res = await client.delete(url, headers=headers)

    if res.status_code == 204:
        return True, None

    return False, res.text

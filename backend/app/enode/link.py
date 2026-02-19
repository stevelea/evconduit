import httpx
import logging
from app.config import USE_MOCK
from app.enode.auth import get_access_token

logger = logging.getLogger(__name__)

async def get_link_result(link_token: str, account: dict) -> dict:
    """Retrieves the result of an Enode linking session using the provided link token."""
    if USE_MOCK:
        logger.debug("[MOCK] get_link_result active")
        return {
            "userId": "testuser",
            "vendor": "XPENG"
        }

    token = await get_access_token(account)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {"linkToken": link_token}
    url = f"{account['base_url']}/links/token"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()

async def create_link_session(user_id: str, account: dict, vendor: str = ""):
    """Creates a new Enode linking session for a given user and optional vendor.

    Note: Enode automatically creates users when the link endpoint is called,
    so we no longer need to explicitly create the user first.
    """
    if USE_MOCK:
        logger.info(f"[MOCK] create_link_session for user {user_id}, vendor {vendor}")
        return {
            "linkUrl": "https://mock-enode-link.example.com/mock-link-session",
            "linkToken": f"mock_token_{user_id}_{vendor}"
        }

    token = await get_access_token(account)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "vendorType": "vehicle",
        "language": "en-US",
        "scopes": [
            "vehicle:read:data",
            "vehicle:read:location",
            "vehicle:control:charging"
        ],
        "colorScheme": "system",
        "redirectUri": account.get("redirect_uri", "")
    }
    if vendor:
        payload["vendor"] = vendor

    url = f"{account['base_url']}/users/{user_id}/link"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code >= 400:
            logger.error(f"Enode link session error {response.status_code}: {response.text}")
        response.raise_for_status()
        return response.json()

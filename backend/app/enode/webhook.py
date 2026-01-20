import httpx
import logging
from app.config import ENODE_BASE_URL, WEBHOOK_URL, ENODE_WEBHOOK_SECRET
from app.enode.auth import get_access_token

logger = logging.getLogger(__name__)

async def fetch_enode_webhook_subscriptions():
    """Fetches a list of all webhook subscriptions from Enode."""
    token = await get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{ENODE_BASE_URL}/webhooks"
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        res.raise_for_status()
        response_json = res.json()
        logger.info(f"[📡 ENODE] Raw webhook response: {response_json}")
        return response_json.get("data", [])

async def subscribe_to_webhooks():
    """Subscribes to Enode webhooks for specific events."""
    token = await get_access_token()
    if not WEBHOOK_URL:
        raise ValueError("WEBHOOK_URL is not set in .env")
    if not ENODE_WEBHOOK_SECRET:
        raise ValueError("ENODE_WEBHOOK_SECRET is not set in .env")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "url": WEBHOOK_URL,
        "secret": ENODE_WEBHOOK_SECRET,
        "events": [
            "user:vehicle:discovered",
            "user:vehicle:updated"
        ]
    }
    sanitized_payload = {**payload, "secret": "REDACTED"}
    logger.info("[📡 ENODE] Subscribing to webhooks with payload: %s", sanitized_payload)
    
    url = f"{ENODE_BASE_URL}/webhooks"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        logger.info("[📡 ENODE] Webhook subscription status: %s", response.status_code)
        logger.info("[📡 ENODE] Webhook subscription response: %s", response.text)
        response.raise_for_status()
        return response.json()


async def delete_webhook(webhook_id: str):
    """Deletes an Enode webhook subscription by its ID."""
    token = await get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{ENODE_BASE_URL}/webhooks/{webhook_id}"
    async with httpx.AsyncClient() as client:
        response = await client.delete(url, headers=headers)
        if response.status_code == 204:
            return {"deleted": True}
        response.raise_for_status()


async def test_webhook(webhook_id: str):
    """
    Sends a test event to the webhook endpoint.
    This also reactivates inactive webhooks according to Enode docs.
    """
    token = await get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{ENODE_BASE_URL}/webhooks/{webhook_id}/test"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers)
        logger.info(f"[📡 ENODE] Test webhook {webhook_id}: status={response.status_code}")
        response.raise_for_status()
        return response.json()

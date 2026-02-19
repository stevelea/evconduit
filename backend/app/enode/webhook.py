import httpx
import logging
from app.enode.auth import get_access_token

logger = logging.getLogger(__name__)

async def fetch_enode_webhook_subscriptions(account: dict):
    """Fetches a list of all webhook subscriptions from Enode."""
    token = await get_access_token(account)
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{account['base_url']}/webhooks"
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        res.raise_for_status()
        response_json = res.json()
        logger.info(f"[ENODE] Raw webhook response: {response_json}")
        return response_json.get("data", [])

async def subscribe_to_webhooks(account: dict):
    """Subscribes to Enode webhooks for specific events."""
    token = await get_access_token(account)
    webhook_url = account.get("webhook_url")
    webhook_secret = account.get("webhook_secret")

    if not webhook_url:
        raise ValueError("webhook_url is not set on the Enode account")
    if not webhook_secret:
        raise ValueError("webhook_secret is not set on the Enode account")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "url": webhook_url,
        "secret": webhook_secret,
        "events": [
            "user:vehicle:discovered",
            "user:vehicle:updated"
        ]
    }
    sanitized_payload = {**payload, "secret": "REDACTED"}
    logger.info("[ENODE] Subscribing to webhooks with payload: %s", sanitized_payload)

    url = f"{account['base_url']}/webhooks"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        logger.info("[ENODE] Webhook subscription status: %s", response.status_code)
        logger.info("[ENODE] Webhook subscription response: %s", response.text)
        response.raise_for_status()
        return response.json()


async def delete_webhook(webhook_id: str, account: dict):
    """Deletes an Enode webhook subscription by its ID."""
    token = await get_access_token(account)
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{account['base_url']}/webhooks/{webhook_id}"
    async with httpx.AsyncClient() as client:
        response = await client.delete(url, headers=headers)
        if response.status_code == 204:
            return {"deleted": True}
        response.raise_for_status()


async def test_webhook(webhook_id: str, account: dict):
    """
    Sends a test event to the webhook endpoint.
    This also reactivates inactive webhooks according to Enode docs.
    """
    token = await get_access_token(account)
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{account['base_url']}/webhooks/{webhook_id}/test"
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers)
        logger.info(f"[ENODE] Test webhook {webhook_id}: status={response.status_code}")
        response.raise_for_status()
        return response.json()

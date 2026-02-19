import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)


def verify_signature_with_secret(payload: bytes, signature: str, secret: str) -> bool:
    """Verifies the HMAC-SHA1 signature of an incoming Enode webhook against a specific secret."""
    expected_signature = (
        "sha1="
        + hmac.new(
            secret.encode("utf-8"),
            payload,
            hashlib.sha1,
        ).hexdigest()
    )
    return hmac.compare_digest(expected_signature, signature)


async def verify_signature_multi(payload: bytes, signature: str) -> str | None:
    """
    Verifies the HMAC-SHA1 signature against all active Enode account secrets.
    Returns the matched enode_account_id, or None if no match.
    """
    from app.storage.enode_account import get_all_active_accounts

    accounts = await get_all_active_accounts()
    for account in accounts:
        secret = account.get("webhook_secret")
        if not secret:
            continue
        if verify_signature_with_secret(payload, signature, secret):
            logger.info(f"[verify] Webhook signature matched account {account['id']}")
            return account["id"]

    logger.warning("[verify] Webhook signature did not match any active account")
    return None

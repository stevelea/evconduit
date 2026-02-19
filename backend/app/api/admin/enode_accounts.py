# backend/app/api/admin/enode_accounts.py
"""Admin endpoints for managing Enode accounts."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from app.auth.supabase_auth import get_supabase_user
from app.storage.enode_account import (
    get_all_enode_accounts,
    get_enode_account_by_id,
    create_enode_account,
    update_enode_account,
    delete_enode_account,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def require_admin(user=Depends(get_supabase_user)):
    role = user.get("user_metadata", {}).get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/enode-accounts")
async def list_enode_accounts(user=Depends(require_admin)):
    """List all Enode accounts with vehicle counts and capacity."""
    accounts = await get_all_enode_accounts()
    # Mask secrets in response
    for account in accounts:
        _mask_secrets(account)
    return accounts


@router.post("/admin/enode-accounts")
async def create_account(request: Request, user=Depends(require_admin)):
    """Create a new Enode account."""
    body = await request.json()
    required_fields = ["name", "client_id", "client_secret", "base_url", "auth_url"]
    for field in required_fields:
        if not body.get(field):
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    data = {
        "name": body["name"],
        "client_id": body["client_id"],
        "client_secret": body["client_secret"],
        "webhook_secret": body.get("webhook_secret"),
        "base_url": body["base_url"],
        "auth_url": body["auth_url"],
        "webhook_url": body.get("webhook_url"),
        "redirect_uri": body.get("redirect_uri"),
        "max_vehicles": body.get("max_vehicles", 4),
        "is_active": body.get("is_active", True),
        "notes": body.get("notes"),
    }

    account = await create_enode_account(data)
    if not account:
        raise HTTPException(status_code=500, detail="Failed to create account")

    _mask_secrets(account)
    return account


@router.get("/admin/enode-accounts/{account_id}")
async def get_account(account_id: str, user=Depends(require_admin)):
    """Get a single Enode account by ID (secrets masked)."""
    account = await get_enode_account_by_id(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    _mask_secrets(account)
    return account


@router.patch("/admin/enode-accounts/{account_id}")
async def update_account(account_id: str, request: Request, user=Depends(require_admin)):
    """Update an Enode account's settings."""
    body = await request.json()

    # Only allow updating specific fields
    allowed = {
        "name", "client_id", "client_secret", "webhook_secret",
        "base_url", "auth_url", "webhook_url", "redirect_uri",
        "max_vehicles", "is_active", "notes",
    }
    update_data = {k: v for k, v in body.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    account = await update_enode_account(account_id, update_data)
    if not account:
        raise HTTPException(status_code=500, detail="Failed to update account")

    # Invalidate token cache if credentials changed
    if "client_id" in update_data or "client_secret" in update_data:
        from app.enode.auth import invalidate_token_cache
        invalidate_token_cache(account_id)

    _mask_secrets(account)
    return account


@router.delete("/admin/enode-accounts/{account_id}")
async def remove_account(account_id: str, user=Depends(require_admin)):
    """Delete an Enode account (only if no users assigned)."""
    success = await delete_enode_account(account_id)
    if not success:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete account: users are still assigned or account not found"
        )
    return {"deleted": True}


@router.post("/admin/enode-accounts/{account_id}/test")
async def test_account_credentials(account_id: str, user=Depends(require_admin)):
    """Test Enode account credentials by requesting a token."""
    account = await get_enode_account_by_id(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        from app.enode.auth import get_access_token
        token = await get_access_token(account)
        return {"success": True, "message": "Credentials are valid"}
    except Exception as e:
        logger.error(f"[test_account_credentials] Failed for {account_id}: {repr(e)}", exc_info=True)
        return {"success": False, "message": str(e) or repr(e)}



@router.post("/admin/enode-accounts/{account_id}/info")
async def get_account_info(account_id: str, user=Depends(require_admin)):
    """Query the Enode API for live stats about this account."""
    account = await get_enode_account_by_id(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    try:
        from app.enode.user import get_all_users
        from app.enode.vehicle import get_all_vehicles
        from app.enode.webhook import fetch_enode_webhook_subscriptions

        # Count users (paginate through all)
        user_count = 0
        after = None
        while True:
            result = await get_all_users(account, page_size=50, after=after)
            data = result.get("data", [])
            user_count += len(data)
            pagination = result.get("pagination", {})
            after = pagination.get("after")
            if not after:
                break

        # Count vehicles (paginate through all)
        vehicle_count = 0
        after = None
        while True:
            result = await get_all_vehicles(account, page_size=50, after=after)
            data = result.get("data", [])
            vehicle_count += len(data)
            pagination = result.get("pagination", {})
            after = pagination.get("after")
            if not after:
                break

        # Get webhook subscriptions
        webhooks = await fetch_enode_webhook_subscriptions(account)

        return {
            "success": True,
            "user_count": user_count,
            "vehicle_count": vehicle_count,
            "webhook_count": len(webhooks),
            "webhooks": [
                {"id": w.get("id"), "url": w.get("url"), "events": w.get("events", [])}
                for w in webhooks
            ],
        }
    except Exception as e:
        logger.error(f"[get_account_info] Failed for {account_id}: {repr(e)}", exc_info=True)
        return {"success": False, "message": str(e) or repr(e)}


def _mask_secrets(account: dict):
    """Mask sensitive fields in an account dict."""
    for field in ("client_secret", "webhook_secret"):
        val = account.get(field)
        if val and len(val) > 4:
            account[field] = val[:4] + "*" * (len(val) - 4)

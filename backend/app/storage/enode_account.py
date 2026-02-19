# backend/app/storage/enode_account.py
"""Storage functions for managing Enode accounts."""

import logging
from typing import Any
from app.lib.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)

supabase = get_supabase_admin_client()


async def get_all_enode_accounts() -> list[dict]:
    """List all Enode accounts with current vehicle counts."""
    try:
        result = supabase.table("enode_accounts").select("*").order("created_at").execute()
        accounts = result.data or []

        # Count vehicles per account (via users -> vehicles)
        for account in accounts:
            account_id = account["id"]
            count_res = (
                supabase.table("users")
                .select("id", count="exact")
                .eq("enode_account_id", account_id)
                .execute()
            )
            user_ids_res = (
                supabase.table("users")
                .select("id")
                .eq("enode_account_id", account_id)
                .execute()
            )
            user_ids = [u["id"] for u in (user_ids_res.data or [])]

            vehicle_count = 0
            if user_ids:
                v_res = (
                    supabase.table("vehicles")
                    .select("id", count="exact")
                    .in_("user_id", user_ids)
                    .execute()
                )
                vehicle_count = v_res.count or 0

            account["user_count"] = count_res.count or 0
            account["vehicle_count"] = vehicle_count

        return accounts
    except Exception as e:
        logger.error(f"[get_all_enode_accounts] {e}")
        return []


async def get_enode_account_by_id(account_id: str) -> dict | None:
    """Get a single Enode account by ID."""
    try:
        result = (
            supabase.table("enode_accounts")
            .select("*")
            .eq("id", account_id)
            .maybe_single()
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error(f"[get_enode_account_by_id] {e}")
        return None


async def get_enode_account_for_user(user_id: str) -> dict | None:
    """Get the Enode account assigned to a user."""
    try:
        user_res = (
            supabase.table("users")
            .select("enode_account_id")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
        if not user_res.data or not user_res.data.get("enode_account_id"):
            return None

        account_id = user_res.data["enode_account_id"]
        return await get_enode_account_by_id(account_id)
    except Exception as e:
        logger.error(f"[get_enode_account_for_user] {e}")
        return None


async def get_enode_account_for_vehicle(vehicle_id: str) -> dict | None:
    """Get the Enode account for a vehicle (via its owner user)."""
    try:
        vehicle_res = (
            supabase.table("vehicles")
            .select("user_id")
            .eq("vehicle_id", vehicle_id)
            .maybe_single()
            .execute()
        )
        if not vehicle_res.data or not vehicle_res.data.get("user_id"):
            return None

        return await get_enode_account_for_user(vehicle_res.data["user_id"])
    except Exception as e:
        logger.error(f"[get_enode_account_for_vehicle] {e}")
        return None


async def get_all_active_accounts() -> list[dict]:
    """Get all active Enode accounts (for webhook verification)."""
    try:
        result = (
            supabase.table("enode_accounts")
            .select("id, webhook_secret")
            .eq("is_active", True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"[get_all_active_accounts] {e}")
        return []


async def get_best_account_for_new_user() -> dict | None:
    """
    Find the active account with the most remaining vehicle capacity.
    Counts actual linked vehicles (not users) against max_vehicles.
    Returns the full account dict, or None if no capacity available.
    """
    try:
        accounts = await get_all_enode_accounts()
        active_accounts = [a for a in accounts if a.get("is_active")]

        if not active_accounts:
            logger.warning("[get_best_account_for_new_user] No active Enode accounts found")
            return None

        # Find account with most remaining capacity
        best = None
        best_remaining = -1

        for account in active_accounts:
            remaining = account["max_vehicles"] - account.get("vehicle_count", 0)
            if remaining > best_remaining:
                best_remaining = remaining
                best = account

        if best_remaining <= 0:
            logger.warning("[get_best_account_for_new_user] All accounts at capacity")
            return None

        logger.info(
            f"[get_best_account_for_new_user] Selected account '{best['name']}' "
            f"with {best_remaining} remaining capacity"
        )
        return best
    except Exception as e:
        logger.error(f"[get_best_account_for_new_user] {e}")
        return None


async def assign_user_to_account(user_id: str, account_id: str) -> bool:
    """Assign a user to an Enode account."""
    try:
        result = (
            supabase.table("users")
            .update({"enode_account_id": account_id})
            .eq("id", user_id)
            .execute()
        )
        if result.data:
            logger.info(f"[assign_user_to_account] User {user_id} assigned to account {account_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"[assign_user_to_account] {e}")
        return False


async def create_enode_account(data: dict) -> dict | None:
    """Create a new Enode account."""
    try:
        result = supabase.table("enode_accounts").insert(data).execute()
        if result.data:
            logger.info(f"[create_enode_account] Created account: {data.get('name')}")
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"[create_enode_account] {e}")
        return None


async def update_enode_account(account_id: str, data: dict) -> dict | None:
    """Update an existing Enode account."""
    try:
        result = (
            supabase.table("enode_accounts")
            .update(data)
            .eq("id", account_id)
            .execute()
        )
        if result.data:
            logger.info(f"[update_enode_account] Updated account {account_id}")
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"[update_enode_account] {e}")
        return None


async def delete_enode_account(account_id: str) -> bool:
    """Delete an Enode account (only if no users assigned)."""
    try:
        # Check for assigned users
        user_count = (
            supabase.table("users")
            .select("id", count="exact")
            .eq("enode_account_id", account_id)
            .execute()
        )
        if user_count.count and user_count.count > 0:
            logger.warning(f"[delete_enode_account] Cannot delete account {account_id}: {user_count.count} users assigned")
            return False

        supabase.table("enode_accounts").delete().eq("id", account_id).execute()
        logger.info(f"[delete_enode_account] Deleted account {account_id}")
        return True
    except Exception as e:
        logger.error(f"[delete_enode_account] {e}")
        return False

# backend/app/api/admin/vehicles.py
"""Admin endpoints for managing vehicles."""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.auth.supabase_auth import get_supabase_user
from app.enode.vehicle import get_all_vehicles, get_vehicle_details
from app.lib.supabase import get_supabase_admin_client
from app.storage.vehicle import save_vehicle_data_with_client

logger = logging.getLogger(__name__)

router = APIRouter()

# TODO: Add docstrings to all functions in this file.

def require_admin(user=Depends(get_supabase_user)):
    logger.info("🔍 Admin check - Full user object:")
    # logger.info(user)

    role = user.get("user_metadata", {}).get("role")
    logger.info(f"🔐 Extracted role: {role}")

    if role != "admin":
        logger.warning(f"⛔ Access denied: user {user.get('sub') or user.get('id')} with role '{role}' tried to access admin route")
        raise HTTPException(status_code=403, detail="Admin access required")

    logger.info(f"✅ Admin access granted to user {user.get('sub') or user.get('id')}")
    return user

@router.get("/admin/vehicles")
async def list_all_vehicles(user=Depends(require_admin)):
    logger.info(f"👮 Admin {user.get('sub') or user.get('id')} requested list of all vehicles")
    try:
        data = await get_all_vehicles()
        vehicles = data.get("data", [])
        logger.info(f"✅ Fetched {len(vehicles)} vehicle(s) from Enode")

        # Enrich vehicles with user info (name, email) and country_code from database
        supabase = get_supabase_admin_client()
        user_ids = list(set(v.get("userId") for v in vehicles if v.get("userId")))

        user_map = {}
        if user_ids:
            users_res = supabase.table("users").select("id, name, email").in_("id", user_ids).execute()
            for u in (users_res.data or []):
                user_map[u["id"]] = {"name": u.get("name"), "email": u.get("email")}

        # Fetch country codes from our vehicles table
        vehicle_ids = [v.get("id") for v in vehicles if v.get("id")]
        country_map = {}
        if vehicle_ids:
            vehicles_res = supabase.table("vehicles").select("vehicle_id, country_code").in_("vehicle_id", vehicle_ids).execute()
            for veh in (vehicles_res.data or []):
                if veh.get("country_code"):
                    country_map[veh["vehicle_id"]] = veh["country_code"]

        for v in vehicles:
            user_id = v.get("userId")
            if user_id and user_id in user_map:
                v["userName"] = user_map[user_id].get("name")
                v["userEmail"] = user_map[user_id].get("email")
            else:
                v["userName"] = None
                v["userEmail"] = None
            # Add country code
            v["countryCode"] = country_map.get(v.get("id"))

        return vehicles
    except Exception as e:
        logger.error(f"[❌ Enode API] Failed to fetch vehicles: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch vehicles from Enode")


@router.get("/admin/vehicles/debug")
async def debug_vehicle_cache(user=Depends(require_admin)):
    """
    Debug endpoint to inspect vehicle cache data stored in the database.
    Shows what location data (if any) is stored for each vehicle.
    """
    logger.info(f"👮 Admin {user.get('sub') or user.get('id')} requested vehicle cache debug")
    supabase = get_supabase_admin_client()

    try:
        response = supabase.table("vehicles").select("vehicle_id, user_id, vendor, vehicle_cache, updated_at").execute()
        vehicles = response.data or []

        result = []
        for v in vehicles:
            cache = {}
            try:
                cache = json.loads(v.get("vehicle_cache", "{}"))
            except (json.JSONDecodeError, TypeError):
                cache = {}

            location = cache.get("location")
            result.append({
                "vehicle_id": v.get("vehicle_id"),
                "user_id": v.get("user_id"),
                "vendor": v.get("vendor"),
                "updated_at": v.get("updated_at"),
                "has_location": location is not None,
                "location": location,
                "location_keys": list(location.keys()) if location and isinstance(location, dict) else [],
                "cache_keys": list(cache.keys()) if cache else []
            })

        return result
    except Exception as e:
        logger.error(f"[❌ Debug] Failed to fetch vehicle cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch vehicle cache: {str(e)}")


@router.post("/admin/vehicles/{vehicle_id}/refresh")
async def refresh_vehicle_from_enode(vehicle_id: str, user=Depends(require_admin)):
    """
    Fetches fresh vehicle data from Enode (including location) and updates the database.
    Use this to ensure location data is properly synced.
    """
    logger.info(f"👮 Admin {user.get('sub') or user.get('id')} requested refresh for vehicle {vehicle_id}")

    try:
        # Fetch full vehicle details from Enode
        vehicle_data = await get_vehicle_details(vehicle_id)
        logger.info(f"[📥 Enode Response] Vehicle {vehicle_id} data keys: {list(vehicle_data.keys())}")

        location = vehicle_data.get("location")
        if location:
            logger.info(f"[📍 Location found] lat={location.get('latitude')}, lon={location.get('longitude')}")
        else:
            logger.warning(f"[⚠️ No location] Enode response for {vehicle_id} has no location data")

        # Save to database
        await save_vehicle_data_with_client(vehicle_data)

        return {
            "status": "success",
            "vehicle_id": vehicle_id,
            "has_location": location is not None,
            "location": location,
            "all_keys": list(vehicle_data.keys())
        }
    except Exception as e:
        logger.error(f"[❌ Refresh] Failed to refresh vehicle {vehicle_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to refresh vehicle from Enode: {str(e)}")


@router.delete("/admin/vehicles/{vehicle_id}")
async def delete_vehicle_from_database(vehicle_id: str, user=Depends(require_admin)):
    """
    Force-delete a vehicle from the database.
    Use this to clean up orphaned vehicles that no longer exist in Enode.
    Also updates the user's linked_vehicle_count.
    """
    logger.info(f"👮 Admin {user.get('sub') or user.get('id')} requested deletion of vehicle {vehicle_id}")
    supabase = get_supabase_admin_client()

    try:
        # First get the vehicle to find the user_id
        vehicle_res = supabase.table("vehicles").select("user_id").eq("vehicle_id", vehicle_id).maybe_single().execute()

        if not vehicle_res.data:
            raise HTTPException(status_code=404, detail="Vehicle not found in database")

        user_id = vehicle_res.data.get("user_id")

        # Delete the vehicle
        delete_res = supabase.table("vehicles").delete().eq("vehicle_id", vehicle_id).execute()
        logger.info(f"✅ Deleted vehicle {vehicle_id} from database")

        # Update user's linked_vehicle_count
        if user_id:
            # Count remaining vehicles for this user
            count_res = supabase.table("vehicles").select("id", count="exact").eq("user_id", user_id).execute()
            new_count = count_res.count or 0

            supabase.table("users").update({"linked_vehicle_count": new_count}).eq("id", user_id).execute()
            logger.info(f"✅ Updated linked_vehicle_count for user {user_id} to {new_count}")

        return {
            "status": "success",
            "vehicle_id": vehicle_id,
            "user_id": user_id,
            "message": "Vehicle deleted from database"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[❌ Delete] Failed to delete vehicle {vehicle_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete vehicle: {str(e)}")

# 📄 backend/app/storage/vehicle.py

from datetime import datetime, timedelta
import json
import logging
from collections import defaultdict
from typing import Any
import reverse_geocode
from app.lib.supabase import get_supabase_admin_client
from app.logic.vehicle import handle_offline_notification_if_needed
from app.services.admin_notifications import notify_admins_new_vehicle

logger = logging.getLogger(__name__)

# Simple TTL cache for expensive operations
_cache: dict[str, dict[str, Any]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_country_code_from_location(lat: float, lon: float) -> str | None:
    """
    Get ISO 3166-1 alpha-2 country code from latitude/longitude.
    Returns None if geocoding fails.
    """
    try:
        results = reverse_geocode.search([(lat, lon)])
        if results:
            return results[0].get("country_code")
    except Exception as e:
        logger.warning(f"[⚠️ Reverse geocode failed] lat={lat}, lon={lon}: {e}")
    return None


def _get_cached(key: str) -> Any | None:
    """Get value from cache if not expired."""
    if key in _cache:
        entry = _cache[key]
        if datetime.utcnow() < entry["expires_at"]:
            logger.debug(f"[CACHE HIT] {key}")
            return entry["value"]
        del _cache[key]
    return None


def _set_cached(key: str, value: Any, ttl_seconds: int = CACHE_TTL_SECONDS) -> None:
    """Set value in cache with TTL."""
    _cache[key] = {
        "value": value,
        "expires_at": datetime.utcnow() + timedelta(seconds=ttl_seconds)
    }
    logger.debug(f"[CACHE SET] {key} (TTL: {ttl_seconds}s)")

def get_all_cached_vehicles(user_id: str) -> list[dict]:
    """
    Return all cached vehicles for a specific user.
    """
    supabase = get_supabase_admin_client()
    logger.info(f"[🔎 get_all_cached_vehicles] Fetching vehicles for user_id: {user_id}")
    try:
        response = supabase \
            .table("vehicles") \
            .select("id, vehicle_cache, updated_at") \
            .eq("user_id", user_id) \
            .execute()
        return response.data or []
    except Exception as e:
        logger.error(f"[❌ get_all_cached_vehicles] Exception: {e}")
        return []

async def save_vehicle_data_with_client(vehicle: dict):
    from app.storage.subscription import update_linked_vehicle_count
    """
    Save vehicle cache entry, matching by VIN if available to handle relinks.
    When a user relinks their car, Enode may assign a new vehicle_id.
    By matching on VIN, we update the existing record instead of creating duplicates.
    """
    supabase = get_supabase_admin_client()
    try:
        vehicle_id = vehicle.get("id") or vehicle.get("vehicle_id")
        user_id    = vehicle.get("userId") or vehicle.get("user_id")
        vendor     = vehicle.get("vendor")
        online     = vehicle.get("isReachable", False)
        data_str   = json.dumps(vehicle)
        updated_at = datetime.utcnow().isoformat()

        # Extract VIN for matching
        vin = vehicle.get("information", {}).get("vin")

        if not vehicle_id or not user_id:
            raise ValueError("Missing vehicle_id or user_id in vehicle object")

        # Check cache for previous online status (avoid DB query on every webhook)
        cache_key = f"vehicle_online_{vehicle_id}"
        online_old = _get_cached(cache_key)

        # Check if vehicle exists - first by vehicle_id, then by VIN
        is_new_vehicle = False
        existing_db_id = None
        old_vehicle_id = None

        existing_last_seen = None
        if online_old is None:
            try:
                # First check by vehicle_id
                existing = supabase.table("vehicles").select("id, online, vehicle_id, vehicle_cache").eq("vehicle_id", vehicle_id).maybe_single().execute()
                if existing and existing.data:
                    online_old = existing.data.get("online")
                    existing_db_id = existing.data.get("id")
                    # Extract existing lastSeen for staleness check
                    existing_cache = existing.data.get("vehicle_cache")
                    if existing_cache:
                        try:
                            existing_cache_data = json.loads(existing_cache) if isinstance(existing_cache, str) else existing_cache
                            existing_last_seen = existing_cache_data.get("lastSeen")
                        except (json.JSONDecodeError, TypeError):
                            pass
                elif vin:
                    # Vehicle ID not found - check if same VIN exists for this user (relink case)
                    # Uses indexed vin column for fast lookup
                    existing_by_vin = supabase.table("vehicles").select("id, online, vehicle_id, vehicle_cache").eq("user_id", user_id).eq("vin", vin).maybe_single().execute()
                    if existing_by_vin and existing_by_vin.data:
                        existing_db_id = existing_by_vin.data.get("id")
                        old_vehicle_id = existing_by_vin.data.get("vehicle_id")
                        online_old = existing_by_vin.data.get("online")
                        # Extract existing lastSeen for staleness check
                        existing_cache = existing_by_vin.data.get("vehicle_cache")
                        if existing_cache:
                            try:
                                existing_cache_data = json.loads(existing_cache) if isinstance(existing_cache, str) else existing_cache
                                existing_last_seen = existing_cache_data.get("lastSeen")
                            except (json.JSONDecodeError, TypeError):
                                pass
                        logger.info(f"[🔄 VIN Match] Found existing vehicle by VIN {vin}: updating {old_vehicle_id} -> {vehicle_id}")
                    else:
                        is_new_vehicle = True
                else:
                    is_new_vehicle = True
            except Exception:
                # If DB check fails, assume it's not new to avoid false notifications
                is_new_vehicle = False

        # Check if incoming data is stale (older than existing data)
        incoming_last_seen = vehicle.get("lastSeen")
        if existing_last_seen and incoming_last_seen:
            if incoming_last_seen < existing_last_seen:
                logger.info(f"[⏭️ Skip stale] Vehicle {vehicle_id}: incoming lastSeen {incoming_last_seen} < existing {existing_last_seen}")
                return False  # Skip saving stale data

        # Extract location for country code caching
        location = vehicle.get("location", {})
        lat = location.get("latitude") if location else None
        lon = location.get("longitude") if location else None

        # Check if we need to determine country_code (only if we have location and not already cached)
        country_code = None
        try:
            # First check if vehicle already has country_code cached
            if existing_db_id:
                existing = supabase.table("vehicles").select("country_code").eq("id", existing_db_id).maybe_single().execute()
            else:
                existing = supabase.table("vehicles").select("country_code").eq("vehicle_id", vehicle_id).maybe_single().execute()
            existing_country = existing.data.get("country_code") if existing and existing.data else None

            if not existing_country:
                if lat is not None and lon is not None:
                    # Reverse geocode to get country code from GPS
                    country_code = _get_country_code_from_location(lat, lon)
                    if country_code:
                        logger.info(f"[🌍 Country cached] Vehicle {vehicle_id}: {country_code} (from GPS)")
                else:
                    # No GPS data - try to use user's default_country_code
                    user_res = supabase.table("users").select("default_country_code").eq("id", user_id).maybe_single().execute()
                    if user_res.data and user_res.data.get("default_country_code"):
                        country_code = user_res.data["default_country_code"]
                        logger.info(f"[🌍 Country cached] Vehicle {vehicle_id}: {country_code} (from user default)")
        except Exception as e:
            # Column might not exist yet - ignore
            logger.debug(f"[🌍] Could not check/set country_code: {e}")

        payload = {
            "vehicle_id":   vehicle_id,
            "user_id":      user_id,
            "vendor":       vendor,
            "online":       online,
            "vehicle_cache": data_str,
            "updated_at":   updated_at
        }

        # Include VIN for indexed lookups
        if vin:
            payload["vin"] = vin

        # Only include country_code if we determined a new one
        if country_code:
            payload["country_code"] = country_code

        # If we found existing vehicle by VIN (with different vehicle_id), update by db id
        # This handles the relink case where Enode assigns a new vehicle_id
        if existing_db_id and old_vehicle_id:
            # Update existing record with new vehicle_id
            res = supabase.table("vehicles").update(payload).eq("id", existing_db_id).execute()
            logger.info(f"[🔄 Relink] Updated vehicle {existing_db_id}: {old_vehicle_id} -> {vehicle_id}")
        else:
            # Normal upsert by vehicle_id
            res = supabase.table("vehicles").upsert(payload, on_conflict=["vehicle_id"]).execute()

        if not getattr(res, "data", None):
            logger.warning(f"⚠️ save_vehicle_data_with_client: No data returned, possible failure")
            return False

        logger.info(f"✅ Vehicle {vehicle_id} saved for user {user_id}")

        # Cross-populate data between Enode and ABRP if both exist for same car
        brand = vehicle.get("information", {}).get("brand") or vendor or ""
        if brand:
            await cross_populate_vehicle_data(user_id, "enode", brand.upper())

        # Cache the current online status for next webhook (TTL: 1 hour)
        _set_cached(cache_key, online, ttl_seconds=3600)

        # Handle offline notification only if status changed
        if not is_new_vehicle and online_old != online:
            await handle_offline_notification_if_needed(
                vehicle_id=vehicle_id,
                user_id=user_id,
                online_old=online_old,
                online_new=online,
            )

        # Only update linked_vehicle_count for NEW vehicles (not on every update)
        if is_new_vehicle:
            user_vehicles_res = supabase.table("vehicles").select("id", count="exact").eq("user_id", user_id).execute()
            new_linked_count = user_vehicles_res.count if user_vehicles_res.count else 0
            logger.debug(f"[DEBUG] New vehicle detected. linked_vehicle_count for user {user_id}: {new_linked_count}")
            await update_linked_vehicle_count(user_id, new_linked_count)

            # Send Pushover notification to admins about new vehicle
            try:
                user_res = supabase.table("users").select("email").eq("id", user_id).maybe_single().execute()
                user_email = user_res.data.get("email", "Unknown") if user_res.data else "Unknown"
                await notify_admins_new_vehicle(vendor=vendor, user_email=user_email, vehicle_id=vehicle_id)
            except Exception as notify_err:
                logger.warning(f"Failed to notify admins about new vehicle: {notify_err}")

        return True  # Data saved successfully

    except Exception as e:
        logger.error(f"[❌ save_vehicle_data_with_client] Exception: {e}")
        return False


async def save_abrp_vehicle(vehicle_cache: dict, user_id: str, abrp_vehicle_id: str) -> bool:
    """
    Upsert an ABRP-sourced vehicle into the vehicles table.
    Matches on (user_id, vehicle_id) where vehicle_id is the ABRP vehicle ID.
    """
    supabase = get_supabase_admin_client()
    try:
        data_str = json.dumps(vehicle_cache)
        updated_at = datetime.utcnow().isoformat()

        # Extract brand info for vendor field
        vendor = vehicle_cache.get("vendor", "abrp")

        payload = {
            "vehicle_id": abrp_vehicle_id,
            "user_id": user_id,
            "vendor": vendor,
            "online": True,
            "vehicle_cache": data_str,
            "updated_at": updated_at,
            "source": "abrp",
        }

        res = supabase.table("vehicles").upsert(
            payload, on_conflict=["vehicle_id"]
        ).execute()

        if not getattr(res, "data", None):
            logger.warning(f"⚠️ save_abrp_vehicle: No data returned")
            return False

        logger.info(f"✅ ABRP vehicle {abrp_vehicle_id} saved for user {user_id}")

        # Cross-populate data between ABRP and Enode if both exist for same car
        brand = vehicle_cache.get("information", {}).get("brand") or vendor or ""
        if brand:
            await cross_populate_vehicle_data(user_id, "abrp", brand.upper())

        return True
    except Exception as e:
        logger.error(f"[❌ save_abrp_vehicle] {e}")
        return False


async def cross_populate_vehicle_data(user_id: str, saved_source: str, saved_brand: str) -> None:
    """
    After saving a vehicle, find the counterpart from the other source (Enode ↔ ABRP)
    for the same physical car and merge missing data in both directions.

    Matching: same user_id + same brand (case-insensitive).
    - ABRP → Enode: abrp_extra, odometer (if missing), batteryCapacity, range
    - Enode → ABRP: VIN, chargeLimit, maxCurrent, powerDeliveryState, capabilities
    """
    supabase = get_supabase_admin_client()
    try:
        # Fetch all vehicles for this user to find cross-source match
        res = supabase.table("vehicles").select(
            "id, vehicle_id, source, vendor, vin, vehicle_cache"
        ).eq("user_id", user_id).execute()

        vehicles = res.data or []
        if len(vehicles) < 2:
            return  # Need at least 2 vehicles to cross-populate

        # Group by normalised brand
        enode_vehicles = []
        abrp_vehicles = []
        for v in vehicles:
            source = v.get("source") or "enode"
            cache = v.get("vehicle_cache")
            if isinstance(cache, str):
                try:
                    cache = json.loads(cache)
                except (json.JSONDecodeError, TypeError):
                    continue
            if not cache:
                continue
            v["_cache"] = cache
            brand = (cache.get("information", {}).get("brand") or v.get("vendor") or "").upper()
            v["_brand"] = brand
            if source == "abrp":
                abrp_vehicles.append(v)
            else:
                enode_vehicles.append(v)

        if not enode_vehicles or not abrp_vehicles:
            return  # No cross-source pair

        # Match by brand (case-insensitive)
        for enode_v in enode_vehicles:
            for abrp_v in abrp_vehicles:
                if enode_v["_brand"] != abrp_v["_brand"]:
                    continue

                enode_cache = enode_v["_cache"]
                abrp_cache = abrp_v["_cache"]
                enode_updated = False
                abrp_updated = False

                # ── ABRP → Enode: augment Enode with ABRP-only data ──
                abrp_extra = abrp_cache.get("abrp_extra")
                if abrp_extra:
                    enode_cache["abrp_extra"] = abrp_extra
                    enode_updated = True

                # Odometer: prefer ABRP if Enode has no valid distance
                enode_odo = enode_cache.get("odometer") or {}
                abrp_odo = abrp_cache.get("odometer") or {}
                if not enode_odo.get("distance") and abrp_odo.get("distance"):
                    enode_cache["odometer"] = abrp_odo
                    enode_updated = True

                # batteryCapacity / range from ABRP if Enode missing
                enode_cs = enode_cache.get("chargeState", {})
                abrp_cs = abrp_cache.get("chargeState", {})
                if enode_cs.get("batteryCapacity") is None and abrp_cs.get("batteryCapacity") is not None:
                    enode_cs["batteryCapacity"] = abrp_cs["batteryCapacity"]
                    enode_cache["chargeState"] = enode_cs
                    enode_updated = True
                if enode_cs.get("range") is None and abrp_cs.get("range") is not None:
                    enode_cs["range"] = abrp_cs["range"]
                    enode_cache["chargeState"] = enode_cs
                    enode_updated = True

                # ── Enode → ABRP: augment ABRP with Enode-only data ──
                enode_vin = enode_cache.get("information", {}).get("vin")
                abrp_vin = abrp_cache.get("information", {}).get("vin")
                if enode_vin and not abrp_vin:
                    # Store VIN in cache JSON for display, but don't set the indexed
                    # vin column since Enode already owns it (unique constraint)
                    abrp_cache.setdefault("information", {})["vin"] = enode_vin
                    abrp_updated = True

                # chargeLimit, maxCurrent, range, batteryCapacity, etc.
                for field in ("chargeLimit", "maxCurrent", "powerDeliveryState", "isPluggedIn", "isFullyCharged", "range", "batteryCapacity", "chargeTimeRemaining"):
                    if enode_cs.get(field) is not None and abrp_cs.get(field) is None:
                        abrp_cs[field] = enode_cs[field]
                        abrp_cache["chargeState"] = abrp_cs
                        abrp_updated = True

                # Odometer: copy Enode → ABRP if ABRP is missing
                abrp_odo_rev = abrp_cache.get("odometer") or {}
                enode_odo_rev = enode_cache.get("odometer") or {}
                if not abrp_odo_rev.get("distance") and enode_odo_rev.get("distance"):
                    abrp_cache["odometer"] = enode_odo_rev
                    abrp_updated = True

                # Capabilities
                if enode_cache.get("capabilities") and not abrp_cache.get("capabilities"):
                    abrp_cache["capabilities"] = enode_cache["capabilities"]
                    abrp_updated = True

                # Save updated caches
                if enode_updated:
                    supabase.table("vehicles").update({
                        "vehicle_cache": json.dumps(enode_cache),
                    }).eq("id", enode_v["id"]).execute()
                    logger.info(f"[🔀 Cross-populate] ABRP → Enode for {enode_v['_brand']} user {user_id}")

                if abrp_updated:
                    update_payload = {"vehicle_cache": json.dumps(abrp_cache)}
                    supabase.table("vehicles").update(update_payload).eq("id", abrp_v["id"]).execute()
                    logger.info(f"[🔀 Cross-populate] Enode → ABRP for {abrp_v['_brand']} user {user_id}")

    except Exception as e:
        logger.error(f"[❌ cross_populate_vehicle_data] {e}")


async def get_vehicle_by_id(vehicle_id: str):
    """Retrieves a vehicle record by its internal database ID."""
    supabase = get_supabase_admin_client()
    response = supabase.table("vehicles") \
        .select("*") \
        .eq("id", vehicle_id) \
        .maybe_single() \
        .execute()

    if not response or not response.data:
        return None

    return response.data

async def get_vehicle_by_vehicle_id(vehicle_id: str):
    """Retrieves a vehicle record by its Enode vehicle ID."""
    supabase = get_supabase_admin_client()
    response = supabase.table("vehicles") \
        .select("*") \
        .eq("vehicle_id", vehicle_id) \
        .maybe_single() \
        .execute()

    if not response or not response.data:
        return None

    return response.data

async def get_total_vehicle_count() -> int:
    """
    Returns the total number of vehicles in the database.
    """
    supabase = get_supabase_admin_client()
    try:
        res = supabase.table("vehicles").select("id", count="exact").execute()
        return res.count
    except Exception as e:
        logger.error(f"[❌ get_total_vehicle_count] {e}")
        return 0

async def get_abrp_pull_vehicle_count() -> int:
    """Returns the number of vehicles sourced from ABRP Pull."""
    supabase = get_supabase_admin_client()
    try:
        res = supabase.table("vehicles").select("id", count="exact").eq("source", "abrp").execute()
        return res.count
    except Exception as e:
        logger.error(f"[❌ get_abrp_pull_vehicle_count] {e}")
        return 0


async def get_new_vehicle_count(days: int) -> int:
    """
    Returns the number of new vehicles created within the last 'days' days.
    """
    supabase = get_supabase_admin_client()
    try:
        time_ago = datetime.utcnow() - timedelta(days=days)
        time_ago_iso = time_ago.isoformat() + "Z"

        res = supabase.table("vehicles").select("id", count="exact").gte("created_at", time_ago_iso).execute()
        return res.count
    except Exception as e:
        logger.error(f"[❌ get_new_vehicle_count] {e}")
        return 0


async def delete_vehicles_by_vendor(user_id: str, vendor: str) -> int:
    """
    Deletes all vehicles for a user from a specific vendor.
    Returns the number of deleted vehicles.
    """
    from app.storage.subscription import update_linked_vehicle_count
    supabase = get_supabase_admin_client()
    try:
        # Get count before deleting
        count_res = supabase.table("vehicles").select("id", count="exact").eq("user_id", user_id).eq("vendor", vendor).execute()
        deleted_count = count_res.count or 0

        if deleted_count > 0:
            # Delete vehicles
            supabase.table("vehicles").delete().eq("user_id", user_id).eq("vendor", vendor).execute()
            logger.info(f"🗑️ Deleted {deleted_count} vehicles for user {user_id} vendor {vendor}")

            # Update linked vehicle count
            remaining_res = supabase.table("vehicles").select("id", count="exact").eq("user_id", user_id).execute()
            remaining_count = remaining_res.count or 0
            await update_linked_vehicle_count(user_id, remaining_count)

        return deleted_count
    except Exception as e:
        logger.error(f"[❌ delete_vehicles_by_vendor] {e}")
        return 0


async def get_vehicles_by_country() -> list[dict]:
    """
    Returns vehicles grouped by country with count.
    Uses cached country_code from database when available, falling back to
    reverse geocoding only for vehicles without cached country.
    Returns list of {country_code, country, count} sorted by count descending.
    Results are cached for 5 minutes since this data changes infrequently.
    """
    cache_key = "vehicles_by_country"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    supabase = get_supabase_admin_client()
    try:
        # Fetch vehicles with cached country_code and vehicle_cache for fallback
        res = supabase.table("vehicles").select("country_code, vehicle_cache").execute()
        vehicles = res.data or []

        country_counts = defaultdict(int)
        country_names = {}
        coords_to_geocode = []

        for v in vehicles:
            # First, try to use cached country_code
            cached_country = v.get("country_code")
            if cached_country:
                country_counts[cached_country] += 1
                continue

            # Fall back to reverse geocoding for vehicles without cached country
            cache = v.get("vehicle_cache")
            if isinstance(cache, str):
                try:
                    cache = json.loads(cache)
                except:
                    # No valid cache, count as unknown
                    country_counts["XX"] += 1
                    continue
            if cache:
                location = cache.get("location", {})
                lat = location.get("latitude")
                lon = location.get("longitude")
                if lat is not None and lon is not None:
                    coords_to_geocode.append((lat, lon))
                else:
                    # No location data, count as unknown
                    country_counts["XX"] += 1
            else:
                # No cache at all, count as unknown
                country_counts["XX"] += 1

        # Batch reverse geocode only vehicles without cached country
        if coords_to_geocode:
            results = reverse_geocode.search(coords_to_geocode)
            for result in results:
                code = result.get("country_code", "Unknown")
                country_counts[code] += 1
                if code not in country_names:
                    country_names[code] = result.get("country", "Unknown")

        if not country_counts:
            return []

        # Build country name lookup for cached countries
        # (reverse_geocode gives us names, but for cached ones we need to look up)
        country_name_map = {
            "SE": "Sweden", "NO": "Norway", "DK": "Denmark", "FI": "Finland",
            "DE": "Germany", "NL": "Netherlands", "BE": "Belgium", "FR": "France",
            "GB": "United Kingdom", "US": "United States", "CA": "Canada",
            "AU": "Australia", "NZ": "New Zealand", "IT": "Italy", "ES": "Spain",
            "PT": "Portugal", "AT": "Austria", "CH": "Switzerland", "PL": "Poland",
            "CZ": "Czech Republic", "IE": "Ireland", "LU": "Luxembourg",
            "XX": "Unknown",  # Vehicles without location data
        }

        # Convert to sorted list
        countries = [
            {
                "country_code": code,
                "country": country_names.get(code) or country_name_map.get(code, code),
                "count": count
            }
            for code, count in country_counts.items()
        ]
        countries.sort(key=lambda x: x["count"], reverse=True)

        # Cache the result
        _set_cached(cache_key, countries)

        return countries

    except Exception as e:
        logger.error(f"[❌ get_vehicles_by_country] {e}")
        return []


async def get_vehicles_by_model() -> list[dict]:
    """
    Returns vehicles grouped by brand + model with count.
    Parses vehicle_cache JSON to extract information.brand and information.model.
    Results are cached for 5 minutes.
    """
    cache_key = "vehicles_by_model"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached

    supabase = get_supabase_admin_client()
    try:
        res = supabase.table("vehicles").select("vehicle_cache").execute()
        vehicles = res.data or []

        model_counts = defaultdict(int)

        for v in vehicles:
            cache = v.get("vehicle_cache")
            if isinstance(cache, str):
                try:
                    cache = json.loads(cache)
                except Exception:
                    continue
            if not cache:
                continue

            info = cache.get("information", {})
            brand = info.get("brand", "Unknown")
            model = info.get("model", "Unknown")
            key = f"{brand} {model}".strip()
            if key:
                model_counts[key] += 1

        models = [
            {"model": model, "count": count}
            for model, count in model_counts.items()
        ]
        models.sort(key=lambda x: x["count"], reverse=True)

        _set_cached(cache_key, models)
        return models

    except Exception as e:
        logger.error(f"[❌ get_vehicles_by_model] {e}")
        return []
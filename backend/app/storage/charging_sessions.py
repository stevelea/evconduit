# backend/app/storage/charging_sessions.py
"""
Storage functions for charging session retrieval and user data updates.
Provides access to charging sessions and samples for the charging API.
"""

import logging
import math
from datetime import datetime, timezone
from typing import Any, Optional

from app.lib.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)

# Country code to currency mapping
COUNTRY_CURRENCIES = {
    "AE": "AED",  # United Arab Emirates
    "AT": "EUR",  # Austria
    "AU": "AUD",  # Australia
    "BE": "EUR",  # Belgium
    "CA": "CAD",  # Canada
    "CH": "CHF",  # Switzerland
    "CZ": "CZK",  # Czech Republic
    "DE": "EUR",  # Germany
    "DK": "DKK",  # Denmark
    "ES": "EUR",  # Spain
    "FI": "EUR",  # Finland
    "FR": "EUR",  # France
    "GB": "GBP",  # United Kingdom
    "IE": "EUR",  # Ireland
    "IT": "EUR",  # Italy
    "NL": "EUR",  # Netherlands
    "NO": "NOK",  # Norway
    "NZ": "NZD",  # New Zealand
    "PL": "PLN",  # Poland
    "PT": "EUR",  # Portugal
    "SE": "SEK",  # Sweden
    "UK": "GBP",  # United Kingdom (alt)
    "US": "USD",  # United States
}


def get_currency_for_country(country_code: Optional[str]) -> str:
    """Get the default currency for a country code."""
    if not country_code:
        return "EUR"  # Default to EUR
    return COUNTRY_CURRENCIES.get(country_code.upper(), "EUR")


async def get_cost_summary(user_id: str) -> dict:
    """
    Get total charging costs grouped by time period.
    Groups costs by currency since users may charge in different countries.
    Returns totals for last 7 days, 30 days, 12 months, and all time.
    """
    supabase = get_supabase_admin_client()
    try:
        # Fetch all sessions with cost data for this user
        res = supabase.table("charging_sessions") \
            .select("total_cost, currency, end_time") \
            .eq("user_id", user_id) \
            .not_.is_("total_cost", "null") \
            .order("end_time", desc=True) \
            .execute()

        sessions = res.data or []

        now = datetime.now(timezone.utc)
        periods = {
            "last_7_days": now - __import__("datetime").timedelta(days=7),
            "last_30_days": now - __import__("datetime").timedelta(days=30),
            "last_12_months": now - __import__("datetime").timedelta(days=365),
            "all_time": None,
        }

        # Accumulate costs per currency per period
        result = {}
        for period_key in periods:
            result[period_key] = {}

        for s in sessions:
            cost = s.get("total_cost")
            currency = s.get("currency") or "EUR"
            end_time_str = s.get("end_time")
            if not cost or not end_time_str:
                continue

            # Parse end_time
            try:
                if end_time_str.endswith("Z"):
                    end_time = datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))
                elif "+" in end_time_str or end_time_str.endswith(("00:00",)):
                    end_time = datetime.fromisoformat(end_time_str)
                else:
                    end_time = datetime.fromisoformat(end_time_str).replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                continue

            for period_key, cutoff in periods.items():
                if cutoff is None or end_time >= cutoff:
                    if currency not in result[period_key]:
                        result[period_key][currency] = 0.0
                    result[period_key][currency] += float(cost)

        # Round values
        for period_key in result:
            for currency in result[period_key]:
                result[period_key][currency] = round(result[period_key][currency], 2)

        return result
    except Exception as e:
        logger.error(f"[get_cost_summary] Error: {e}")
        return {
            "last_7_days": {},
            "last_30_days": {},
            "last_12_months": {},
            "all_time": {},
        }


async def get_vehicle_data_for_enrichment(vehicle_id: str) -> Optional[dict[str, Any]]:
    """Get vehicle country code and odometer from vehicle cache."""
    supabase = get_supabase_admin_client()
    try:
        response = supabase.table("vehicles").select("country_code, vehicle_cache").eq(
            "vehicle_id", vehicle_id
        ).limit(1).execute()
        if response and response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"[get_vehicle_data_for_enrichment] Error: {e}")
        return None


async def enrich_session_with_vehicle_data(session: dict[str, Any]) -> dict[str, Any]:
    """Enrich a session with vehicle country code, default currency, and odometer."""
    vehicle_id = session.get("vehicle_id")
    if vehicle_id:
        vehicle_data = await get_vehicle_data_for_enrichment(vehicle_id)
        if vehicle_data:
            country_code = vehicle_data.get("country_code")
            session["country_code"] = country_code
            default_currency = get_currency_for_country(country_code)
            session["default_currency"] = default_currency
            # Set currency based on country if not already set by user
            if not session.get("currency"):
                session["currency"] = default_currency

            # Extract odometer from vehicle cache
            vehicle_cache = vehicle_data.get("vehicle_cache") or {}
            if isinstance(vehicle_cache, str):
                import json
                try:
                    vehicle_cache = json.loads(vehicle_cache)
                except (json.JSONDecodeError, TypeError):
                    vehicle_cache = {}
            odometer_data = vehicle_cache.get("odometer") or {}
            odometer_km = odometer_data.get("distance")
            if odometer_km:
                session["vehicle_odometer_km"] = odometer_km
    return session


async def get_sessions_since(
    user_id: str,
    since: Optional[str] = None,
    limit: int = 50,
) -> tuple[list[dict[str, Any]], bool]:
    """
    Get charging sessions for a user since a given timestamp, ordered oldest first.
    Used by Home Assistant integration for incremental sync.

    Args:
        user_id: The user's ID
        since: ISO timestamp; only sessions with start_time > since are returned
        limit: Maximum number of sessions to return (max 200)

    Returns:
        Tuple of (list of session dicts, has_more bool)
    """
    supabase = get_supabase_admin_client()
    limit = min(limit, 200)

    try:
        query = supabase.table("charging_sessions").select(
            "session_id, start_time, end_time, energy_added_kwh, "
            "total_cost, cost_per_kwh, currency, station_name, "
            "battery_level_start, battery_level_end, "
            "start_location"
        ).eq("user_id", user_id)

        if since:
            query = query.gt("start_time", since)

        # Fetch limit+1 to detect has_more
        query = query.order("start_time", desc=False).limit(limit + 1)

        response = query.execute()
        sessions = response.data or []

        has_more = len(sessions) > limit
        if has_more:
            sessions = sessions[:limit]

        # Parse location coordinates from PostGIS format
        for s in sessions:
            coords = parse_location_point(s.pop("start_location", None))
            if coords:
                s["location_lat"] = coords[0]
                s["location_lon"] = coords[1]
            else:
                s["location_lat"] = None
                s["location_lon"] = None

        logger.debug(
            "[get_sessions_since] Found %d sessions for user %s (since=%s, has_more=%s)",
            len(sessions), user_id, since, has_more,
        )
        return sessions, has_more

    except Exception as e:
        logger.error("[get_sessions_since] Error: %s", e, exc_info=True)
        return [], False


async def get_user_charging_sessions(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    vehicle_id: Optional[str] = None
) -> tuple[list[dict[str, Any]], int]:
    """
    Get paginated list of charging sessions for a user.

    Args:
        user_id: The user's ID
        limit: Maximum number of sessions to return
        offset: Number of sessions to skip (for pagination)
        vehicle_id: Optional filter by specific vehicle

    Returns:
        Tuple of (list of sessions, total count)
    """
    supabase = get_supabase_admin_client()

    try:
        # Build base query
        query = supabase.table("charging_sessions").select(
            "*",
            count="exact"
        ).eq("user_id", user_id)

        # Add vehicle filter if provided
        if vehicle_id:
            query = query.eq("vehicle_id", vehicle_id)

        # Order by start time descending and apply pagination
        query = query.order("start_time", desc=True).range(offset, offset + limit - 1)

        response = query.execute()

        sessions = response.data or []
        total = response.count or 0

        # Enrich sessions with vehicle data
        enriched_sessions = []
        for session in sessions:
            enriched = await enrich_session_with_vehicle_data(session)
            enriched_sessions.append(enriched)

        logger.debug(f"[get_user_charging_sessions] Found {len(enriched_sessions)} sessions for user {user_id}")
        return enriched_sessions, total

    except Exception as e:
        logger.error(f"[get_user_charging_sessions] Error: {e}", exc_info=True)
        return [], 0


async def get_session_by_id(session_id: str, user_id: str) -> Optional[dict[str, Any]]:
    """
    Get a single charging session by ID, verifying user ownership.

    Args:
        session_id: The session's UUID
        user_id: The user's ID (for ownership verification)

    Returns:
        Session data dict or None if not found/not owned
    """
    supabase = get_supabase_admin_client()

    try:
        response = supabase.table("charging_sessions").select("*").eq(
            "session_id", session_id
        ).eq("user_id", user_id).maybe_single().execute()

        if response.data:
            return await enrich_session_with_vehicle_data(response.data)
        return None

    except Exception as e:
        logger.error(f"[get_session_by_id] Error: {e}", exc_info=True)
        return None


async def get_session_samples(
    vehicle_id: str,
    start_time: str,
    end_time: str,
    user_id: str
) -> list[dict[str, Any]]:
    """
    Get charging samples for a specific time range (for charts).

    Args:
        vehicle_id: The vehicle's UUID
        start_time: ISO format start timestamp
        end_time: ISO format end timestamp
        user_id: The user's ID (for ownership verification)

    Returns:
        List of sample data points sorted by time ascending
    """
    supabase = get_supabase_admin_client()

    try:
        response = supabase.table("charging_samples").select(
            "sample_time, battery_level, charge_rate_kw, is_charging"
        ).eq("vehicle_id", vehicle_id).eq("user_id", user_id).gte(
            "sample_time", start_time
        ).lte("sample_time", end_time).order("sample_time").execute()

        samples = response.data or []
        logger.debug(f"[get_session_samples] Found {len(samples)} samples for vehicle {vehicle_id}")
        return samples

    except Exception as e:
        logger.error(f"[get_session_samples] Error: {e}", exc_info=True)
        return []


async def update_session_user_data(
    session_id: str,
    user_id: str,
    cost_per_kwh: Optional[float] = None,
    total_cost: Optional[float] = None,
    currency: str = "EUR",
    user_odometer_km: Optional[float] = None
) -> Optional[dict[str, Any]]:
    """
    Update user-entered data for a charging session.

    If cost_per_kwh is provided but total_cost is not, calculates total_cost
    based on energy_added_kwh. Vice versa for total_cost -> cost_per_kwh.

    Args:
        session_id: The session's UUID
        user_id: The user's ID (for ownership verification)
        cost_per_kwh: Optional cost per kWh
        total_cost: Optional total cost
        currency: Currency code (default SEK)
        user_odometer_km: Optional odometer reading

    Returns:
        Updated session data or None if not found/not owned
    """
    supabase = get_supabase_admin_client()

    try:
        # First verify ownership and get session data
        existing = await get_session_by_id(session_id, user_id)
        if not existing:
            logger.warning(f"[update_session_user_data] Session {session_id} not found for user {user_id}")
            return None

        energy_added = existing.get("energy_added_kwh")

        # Auto-calculate missing cost field
        if cost_per_kwh is not None and total_cost is None and energy_added:
            total_cost = round(cost_per_kwh * energy_added, 2)
        elif total_cost is not None and cost_per_kwh is None and energy_added:
            cost_per_kwh = round(total_cost / energy_added, 4)

        # Build update payload — clear auto-applied state on manual save
        update_data: dict[str, Any] = {
            "currency": currency,
            "cost_auto_applied": False,
            "cost_breakdown": None,
        }

        if cost_per_kwh is not None:
            update_data["cost_per_kwh"] = cost_per_kwh
        if total_cost is not None:
            update_data["total_cost"] = total_cost
        if user_odometer_km is not None:
            update_data["user_odometer_km"] = user_odometer_km

        response = supabase.table("charging_sessions").update(update_data).eq(
            "session_id", session_id
        ).eq("user_id", user_id).execute()

        if response.data:
            logger.info(f"[update_session_user_data] Updated session {session_id}")
            return response.data[0]

        return None

    except Exception as e:
        logger.error(f"[update_session_user_data] Error: {e}", exc_info=True)
        return None


async def get_previous_session_odometer(
    user_id: str,
    vehicle_id: str,
    before_time: str
) -> Optional[float]:
    """
    Get the odometer reading from the previous session for consumption calculation.
    """
    supabase = get_supabase_admin_client()

    try:
        response = supabase.table("charging_sessions").select(
            "user_odometer_km"
        ).eq("user_id", user_id).eq("vehicle_id", vehicle_id).lt(
            "start_time", before_time
        ).order("start_time", desc=True).limit(1).maybe_single().execute()

        if response.data and response.data.get("user_odometer_km"):
            return response.data["user_odometer_km"]
        return None

    except Exception as e:
        logger.error(f"[get_previous_session_odometer] Error: {e}")
        return None


async def get_consumption_data(
    user_id: str,
    vehicle_id: str,
    current_odometer: float,
    before_time: str
) -> Optional[dict[str, Any]]:
    """
    Get consumption data by looking back to find the last session with a DIFFERENT odometer.
    This handles multiple charging sessions at the same location (e.g., solar charging at home).

    Returns dict with:
        - previous_odometer: The last different odometer reading
        - total_energy_kwh: Sum of energy from all sessions since that reading
        - session_count: Number of sessions included in the energy sum
    """
    supabase = get_supabase_admin_client()

    try:
        # Get all previous sessions with odometer readings, ordered by time desc
        response = supabase.table("charging_sessions").select(
            "user_odometer_km, energy_added_kwh, start_time"
        ).eq("user_id", user_id).eq("vehicle_id", vehicle_id).lt(
            "start_time", before_time
        ).not_.is_("user_odometer_km", "null").order(
            "start_time", desc=True
        ).limit(50).execute()

        if not response.data:
            return None

        # Find the first session with a different (lower) odometer
        total_energy = 0.0
        session_count = 0
        previous_odometer = None

        for session in response.data:
            odometer = session.get("user_odometer_km")
            energy = session.get("energy_added_kwh") or 0

            if odometer is None:
                continue

            # If this session has a different (lower) odometer, we found our reference point
            if odometer < current_odometer:
                previous_odometer = odometer
                break

            # Same odometer - this is a charging session at the same location
            # Add its energy to the total (we'll use this for consumption calc)
            total_energy += energy
            session_count += 1

        if previous_odometer is None:
            return None

        return {
            "previous_odometer": previous_odometer,
            "total_energy_kwh": total_energy,
            "session_count": session_count
        }

    except Exception as e:
        logger.error(f"[get_consumption_data] Error: {e}")
        return None


async def update_latest_session_odometer(
    user_id: str,
    vehicle_id: str,
    odometer_km: float
) -> Optional[dict[str, Any]]:
    """
    Update the odometer on the most recent charging session for a vehicle.
    Used by Home Assistant integration to push odometer readings.

    Args:
        user_id: The user's ID (for ownership verification)
        vehicle_id: The vehicle's ID
        odometer_km: The odometer reading in kilometers

    Returns:
        Updated session data or None if no session found
    """
    supabase = get_supabase_admin_client()

    try:
        # Find the most recent session for this vehicle
        response = supabase.table("charging_sessions").select(
            "session_id"
        ).eq("user_id", user_id).eq("vehicle_id", vehicle_id).order(
            "end_time", desc=True
        ).limit(1).execute()

        if not response.data or len(response.data) == 0:
            logger.warning(f"[update_latest_session_odometer] No sessions found for vehicle {vehicle_id}")
            return None

        session_id = response.data[0]["session_id"]

        # Update the odometer
        update_response = supabase.table("charging_sessions").update({
            "user_odometer_km": odometer_km
        }).eq("session_id", session_id).eq("user_id", user_id).execute()

        if update_response.data:
            logger.info(f"[update_latest_session_odometer] Updated session {session_id} with odometer {odometer_km} km")
            return update_response.data[0]

        return None

    except Exception as e:
        logger.error(f"[update_latest_session_odometer] Error: {e}", exc_info=True)
        return None


def is_at_home(
    lat: float, lon: float,
    home_lat: float, home_lon: float,
    radius_meters: int = 500
) -> bool:
    """Check if coordinates are within radius of home using haversine distance."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat)
    phi2 = math.radians(home_lat)
    dphi = math.radians(home_lat - lat)
    dlambda = math.radians(home_lon - lon)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c

    return distance <= radius_meters


def parse_location_point(location_str: Optional[str]) -> Optional[tuple[float, float]]:
    """Parse location to (lat, lon) tuple. Supports POINT(lon lat) text and WKB hex formats."""
    if not location_str:
        return None

    # Handle POINT(lon lat) text format
    if location_str.startswith("POINT("):
        try:
            coords = location_str.replace("POINT(", "").replace(")", "").strip().split()
            lon = float(coords[0])
            lat = float(coords[1])
            return (lat, lon)
        except (ValueError, IndexError):
            return None

    # Handle WKB hex format (e.g. from PostGIS geometry columns)
    try:
        import struct
        import binascii
        raw = binascii.unhexlify(location_str)
        byte_order = '<' if raw[0] == 1 else '>'
        wkb_type = struct.unpack(f'{byte_order}I', raw[1:5])[0]
        has_srid = bool(wkb_type & 0x20000000)
        offset = 9 if has_srid else 5
        lon = struct.unpack(f'{byte_order}d', raw[offset:offset+8])[0]
        lat = struct.unpack(f'{byte_order}d', raw[offset+8:offset+16])[0]
        return (lat, lon)
    except Exception:
        return None


async def calculate_cost_breakdown(
    user_id: str,
    start_time: str,
    end_time: str,
    energy_added_kwh: float,
) -> Optional[dict[str, Any]]:
    """
    Calculate cost breakdown for a charging session using electricity rate history.

    If only one rate covers the session, does a simple calculation.
    If multiple rates, splits energy proportionally based on time intervals.

    Returns dict with breakdown, total_cost, weighted_avg_rate, currency or None.
    """
    from app.storage.electricity_rate import get_rate_log_for_period

    rate_entries = await get_rate_log_for_period(user_id, start_time, end_time)

    if not rate_entries:
        return None

    currency = rate_entries[0].get("currency", "EUR")

    # Parse session start/end times
    try:
        session_start = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        session_end = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None

    total_duration = (session_end - session_start).total_seconds()
    if total_duration <= 0:
        return None

    # Build time intervals with rates
    intervals = []
    for i, entry in enumerate(rate_entries):
        rate = float(entry["rate"])
        entry_currency = entry.get("currency", currency)

        try:
            recorded_at = datetime.fromisoformat(entry["recorded_at"].replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue

        # Interval start: max of (rate recorded_at, session_start)
        interval_start = max(recorded_at, session_start)

        # Interval end: min of (next rate recorded_at, session_end)
        if i + 1 < len(rate_entries):
            try:
                next_time = datetime.fromisoformat(rate_entries[i + 1]["recorded_at"].replace("Z", "+00:00"))
                interval_end = min(next_time, session_end)
            except (ValueError, TypeError):
                interval_end = session_end
        else:
            interval_end = session_end

        if interval_end <= interval_start:
            continue

        intervals.append({
            "start": interval_start,
            "end": interval_end,
            "rate": rate,
            "currency": entry_currency,
        })

    if not intervals:
        return None

    # Calculate energy per interval proportionally by time
    breakdown = []
    total_cost = 0.0
    weighted_rate_sum = 0.0

    for interval in intervals:
        duration_secs = (interval["end"] - interval["start"]).total_seconds()
        proportion = duration_secs / total_duration
        interval_energy = round(energy_added_kwh * proportion, 3)
        interval_cost = round(interval_energy * interval["rate"], 2)

        breakdown.append({
            "start": interval["start"].isoformat(),
            "end": interval["end"].isoformat(),
            "rate": interval["rate"],
            "currency": interval["currency"],
            "energy_kwh": interval_energy,
            "cost": interval_cost,
        })

        total_cost += interval_cost
        weighted_rate_sum += interval["rate"] * proportion

    return {
        "breakdown": breakdown,
        "total_cost": round(total_cost, 2),
        "weighted_avg_rate": round(weighted_rate_sum, 4),
        "currency": currency,
    }


async def get_all_sessions_for_export(
    user_id: str,
    vehicle_id: Optional[str] = None
) -> list[dict[str, Any]]:
    """
    Get all charging sessions for CSV export (no pagination limit).

    Args:
        user_id: The user's ID
        vehicle_id: Optional filter by specific vehicle

    Returns:
        List of all sessions
    """
    supabase = get_supabase_admin_client()

    try:
        query = supabase.table("charging_sessions").select("*").eq("user_id", user_id)

        if vehicle_id:
            query = query.eq("vehicle_id", vehicle_id)

        query = query.order("start_time", desc=True)

        response = query.execute()

        sessions = response.data or []
        logger.info(f"[get_all_sessions_for_export] Exporting {len(sessions)} sessions for user {user_id}")
        return sessions

    except Exception as e:
        logger.error(f"[get_all_sessions_for_export] Error: {e}", exc_info=True)
        return []


async def backfill_home_station_name(
    user_id: str,
    home_lat: float,
    home_lon: float,
    radius_meters: int = 500,
) -> int:
    """
    Mark existing sessions near the user's home as 'Home'.
    Called when a user sets or updates their home location.
    Returns number of sessions updated.
    """
    supabase = get_supabase_admin_client()
    updated = 0

    try:
        # Get all sessions with location but no station_name (or non-Home station_name)
        response = supabase.table("charging_sessions") \
            .select("session_id, start_location, station_name") \
            .eq("user_id", user_id) \
            .not_.is_("start_location", "null") \
            .order("start_time", desc=True) \
            .execute()

        sessions = response.data or []

        for session in sessions:
            coords = parse_location_point(session.get("start_location"))
            if not coords:
                continue

            session_at_home = is_at_home(coords[0], coords[1], home_lat, home_lon, radius_meters)
            current_name = session.get("station_name")

            if session_at_home and current_name != "Home":
                # Mark as Home (clear any previous station info)
                supabase.table("charging_sessions").update({
                    "station_name": "Home",
                    "station_operator": None,
                    "station_address": None,
                    "station_usage_cost": None,
                }).eq("session_id", session["session_id"]).execute()
                updated += 1
            elif not session_at_home and current_name == "Home":
                # Was previously marked Home but no longer in radius — clear it
                supabase.table("charging_sessions").update({
                    "station_name": None,
                }).eq("session_id", session["session_id"]).execute()
                updated += 1

        logger.info(f"[backfill_home_station_name] Updated {updated} sessions for user {user_id}")
        return updated

    except Exception as e:
        logger.error(f"[backfill_home_station_name] Error: {e}", exc_info=True)
        return 0

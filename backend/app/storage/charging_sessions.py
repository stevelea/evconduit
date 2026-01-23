# backend/app/storage/charging_sessions.py
"""
Storage functions for charging session retrieval and user data updates.
Provides access to charging sessions and samples for the charging API.
"""

import logging
from datetime import datetime
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


async def get_vehicle_country_code(vehicle_id: str) -> Optional[str]:
    """Get the country code for a vehicle."""
    supabase = get_supabase_admin_client()
    try:
        response = supabase.table("vehicles").select("country_code").eq(
            "vehicle_id", vehicle_id
        ).limit(1).execute()
        if response and response.data and len(response.data) > 0:
            return response.data[0].get("country_code")
        return None
    except Exception as e:
        logger.error(f"[get_vehicle_country_code] Error: {e}")
        return None


async def enrich_session_with_vehicle_data(session: dict[str, Any]) -> dict[str, Any]:
    """Enrich a session with vehicle country code and default currency."""
    vehicle_id = session.get("vehicle_id")
    if vehicle_id:
        country_code = await get_vehicle_country_code(vehicle_id)
        session["country_code"] = country_code
        # Set default currency based on country if not already set
        if not session.get("currency"):
            session["currency"] = get_currency_for_country(country_code)
        session["default_currency"] = get_currency_for_country(country_code)
    return session


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
    currency: str = "SEK",
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

        # Build update payload
        update_data: dict[str, Any] = {"currency": currency}

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

# backend/app/api/charging.py
"""
API endpoints for charging session management.
Provides access to session history, details, samples for charts, and CSV export.
"""

import csv
import io
import httpx
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth.supabase_auth import get_supabase_user
from app.logger import logger
from app.storage.charging_sessions import (
    get_all_sessions_for_export,
    get_consumption_data,
    get_previous_session_odometer,
    get_session_by_id,
    get_session_samples,
    get_user_charging_sessions,
    update_session_user_data,
)
from app.storage.user import get_user_by_id

router = APIRouter(tags=["Charging"])

import os

# OpenChargeMap API (free API key recommended for production - get at openchargemap.org/site/develop/api)
OPENCHARGEMAP_API_URL = "https://api.openchargemap.io/v3/poi"
OPENCHARGEMAP_API_KEY = os.getenv("OPENCHARGEMAP_API_KEY", "")

# Cache for OpenChargeMap lookups (keyed by rounded lat/lon to ~100m precision)
# Format: {(lat_rounded, lon_rounded): (ChargingLocation, timestamp)}
_ocm_cache: dict[tuple[float, float], tuple[Optional["ChargingLocation"], float]] = {}
OCM_CACHE_TTL = 3600 * 24  # 24 hours cache TTL


# ============== Pydantic Models ==============

class ChargingLocation(BaseModel):
    """Detected charging station location from OpenChargeMap."""
    name: Optional[str] = None
    address: Optional[str] = None
    operator: Optional[str] = None
    distance_meters: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ChargingSessionSummary(BaseModel):
    session_id: str
    vehicle_id: str
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    start_time: str
    end_time: str
    start_battery_level: Optional[float] = None
    end_battery_level: Optional[float] = None
    energy_added_kwh: Optional[float] = None
    duration_minutes: Optional[float] = None
    max_charge_rate_kw: Optional[float] = None
    average_charge_rate_kw: Optional[float] = None
    cost_per_kwh: Optional[float] = None
    total_cost: Optional[float] = None
    currency: Optional[str] = None
    default_currency: Optional[str] = None
    user_odometer_km: Optional[float] = None
    country_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    charging_location: Optional[ChargingLocation] = None
    # Consumption (calculated from odometer readings between sessions)
    consumption_kwh_per_100km: Optional[float] = None
    distance_since_last_session_km: Optional[float] = None


class ChargingSample(BaseModel):
    sample_time: str
    battery_level: Optional[float] = None
    charge_rate_kw: Optional[float] = None


class SessionListResponse(BaseModel):
    sessions: list[ChargingSessionSummary]
    total: int
    limit: int
    offset: int


class SessionDetailResponse(BaseModel):
    session: ChargingSessionSummary
    samples: list[ChargingSample]


class UpdateSessionRequest(BaseModel):
    cost_per_kwh: Optional[float] = None
    total_cost: Optional[float] = None
    currency: str = "SEK"
    user_odometer_km: Optional[float] = None


# ============== Helper Functions ==============

async def verify_pro_user(user_id: str) -> bool:
    """Verify the user has Pro tier access."""
    user = await get_user_by_id(user_id)
    if not user:
        return False
    return user.tier == "pro"


def parse_postgis_point(wkb_hex: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    """
    Parse PostGIS WKB hex string to latitude and longitude.
    Returns (latitude, longitude) or (None, None) if parsing fails.
    """
    if not wkb_hex:
        return None, None

    try:
        # PostGIS WKB format: first bytes are type and SRID, coordinates follow
        # For POINT with SRID 4326, format is:
        # 0101000020E6100000 + 8 bytes lon + 8 bytes lat (little-endian doubles)
        import struct

        # Remove the header (first 18 hex chars = 9 bytes for EWKB point with SRID)
        if wkb_hex.startswith("0101000020E6100000"):
            coord_hex = wkb_hex[18:]
            # Each coordinate is 8 bytes = 16 hex chars
            lon_hex = coord_hex[:16]
            lat_hex = coord_hex[16:32]

            lon = struct.unpack('<d', bytes.fromhex(lon_hex))[0]
            lat = struct.unpack('<d', bytes.fromhex(lat_hex))[0]

            return lat, lon
    except Exception as e:
        logger.debug(f"[parse_postgis_point] Failed to parse: {e}")

    return None, None


def _get_cache_key(lat: float, lon: float) -> tuple[float, float]:
    """Round coordinates to ~100m precision for cache key."""
    # Round to 3 decimal places (~111m precision at equator)
    return (round(lat, 3), round(lon, 3))


async def lookup_charging_location(lat: float, lon: float) -> Optional[ChargingLocation]:
    """
    Look up nearby charging stations using OpenChargeMap API.
    Returns the closest station within 500m, or None if not found.
    Results are cached for 24 hours to reduce API calls.
    """
    import time

    cache_key = _get_cache_key(lat, lon)
    now = time.time()

    # Check cache
    if cache_key in _ocm_cache:
        cached_result, cached_time = _ocm_cache[cache_key]
        if now - cached_time < OCM_CACHE_TTL:
            logger.debug(f"[lookup_charging_location] Cache hit for {cache_key}")
            return cached_result

    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "distance": 0.5,  # 500 meters in km
            "distanceunit": "km",
            "maxresults": 1,
            "compact": "true",
            "verbose": "false",
        }
        # Add API key if configured
        if OPENCHARGEMAP_API_KEY:
            params["key"] = OPENCHARGEMAP_API_KEY

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(OPENCHARGEMAP_API_URL, params=params)

            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    station = data[0]
                    address_info = station.get("AddressInfo", {})
                    operator_info = station.get("OperatorInfo", {})

                    result = ChargingLocation(
                        name=address_info.get("Title"),
                        address=address_info.get("AddressLine1"),
                        operator=operator_info.get("Title") if operator_info else None,
                        distance_meters=address_info.get("Distance", 0) * 1000,  # km to m
                        latitude=address_info.get("Latitude"),
                        longitude=address_info.get("Longitude"),
                    )
                    _ocm_cache[cache_key] = (result, now)
                    logger.debug(f"[lookup_charging_location] Found and cached: {result.name}")
                    return result

        # Cache the "not found" result too
        _ocm_cache[cache_key] = (None, now)

    except Exception as e:
        logger.debug(f"[lookup_charging_location] Failed: {e}")

    return None


def session_to_summary(session: dict) -> ChargingSessionSummary:
    """Convert a database session record to a summary model."""
    # Parse location from PostGIS geometry
    lat, lon = parse_postgis_point(session.get("start_location"))

    return ChargingSessionSummary(
        session_id=session.get("session_id"),
        vehicle_id=session.get("vehicle_id"),
        brand=session.get("brand"),
        model=session.get("model"),
        year=session.get("year"),
        start_time=session.get("start_time"),
        end_time=session.get("end_time"),
        start_battery_level=session.get("start_battery_level"),
        end_battery_level=session.get("end_battery_level"),
        energy_added_kwh=session.get("energy_added_kwh"),
        duration_minutes=session.get("duration_minutes"),
        max_charge_rate_kw=session.get("max_charge_rate_kw"),
        average_charge_rate_kw=session.get("average_charge_rate_kw"),
        cost_per_kwh=session.get("cost_per_kwh"),
        total_cost=session.get("total_cost"),
        currency=session.get("currency"),
        default_currency=session.get("default_currency"),
        user_odometer_km=session.get("user_odometer_km"),
        country_code=session.get("country_code"),
        latitude=lat,
        longitude=lon,
        charging_location=None,  # Populated separately for detail view
    )


async def session_to_summary_with_location(session: dict, user_id: str = None) -> ChargingSessionSummary:
    """Convert a database session record to a summary model with charging location lookup and consumption."""
    summary = session_to_summary(session)

    # Look up charging location if we have coordinates
    if summary.latitude and summary.longitude:
        summary.charging_location = await lookup_charging_location(
            summary.latitude, summary.longitude
        )

    # Calculate consumption if we have odometer readings
    # This handles multiple sessions at the same odometer (e.g., solar charging at home)
    if user_id and session.get("user_odometer_km") and session.get("energy_added_kwh"):
        current_odometer = session["user_odometer_km"]
        current_energy = session["energy_added_kwh"]

        consumption_data = await get_consumption_data(
            user_id=user_id,
            vehicle_id=session.get("vehicle_id"),
            current_odometer=current_odometer,
            before_time=session.get("start_time")
        )

        if consumption_data:
            prev_odometer = consumption_data["previous_odometer"]
            # Total energy = current session + any sessions at same odometer
            total_energy = current_energy + consumption_data["total_energy_kwh"]
            distance = current_odometer - prev_odometer

            if distance > 0:
                consumption = (total_energy / distance) * 100
                # Sanity check: typical EV consumption is 10-30 kWh/100km
                if 5 <= consumption <= 50:
                    summary.consumption_kwh_per_100km = round(consumption, 1)
                    summary.distance_since_last_session_km = round(distance, 1)

    return summary


# ============== Endpoints ==============

@router.get("/charging/sessions", response_model=SessionListResponse)
async def list_charging_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    vehicle_id: Optional[str] = Query(default=None),
    user=Depends(get_supabase_user)
):
    """
    Get paginated list of user's charging sessions.
    Requires Pro tier.
    """
    user_id = user["sub"]

    # Verify Pro tier
    if not await verify_pro_user(user_id):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    sessions, total = await get_user_charging_sessions(
        user_id=user_id,
        limit=limit,
        offset=offset,
        vehicle_id=vehicle_id
    )

    return SessionListResponse(
        sessions=[session_to_summary(s) for s in sessions],
        total=total,
        limit=limit,
        offset=offset
    )


@router.get("/charging/sessions/{session_id}", response_model=ChargingSessionSummary)
async def get_session_detail(
    session_id: str,
    user=Depends(get_supabase_user)
):
    """
    Get details for a specific charging session.
    Includes charging location lookup from OpenChargeMap.
    Requires Pro tier.
    """
    user_id = user["sub"]

    # Verify Pro tier
    if not await verify_pro_user(user_id):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    session = await get_session_by_id(session_id, user_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Include charging location lookup and consumption for detail view
    return await session_to_summary_with_location(session, user_id=user_id)


@router.get("/charging/sessions/{session_id}/samples", response_model=list[ChargingSample])
async def get_session_chart_samples(
    session_id: str,
    user=Depends(get_supabase_user)
):
    """
    Get charging samples for a session (for rendering charts).
    Returns battery level and charge rate data points over time.
    Requires Pro tier.
    """
    user_id = user["sub"]

    # Verify Pro tier
    if not await verify_pro_user(user_id):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    # Get session to verify ownership and get time range
    session = await get_session_by_id(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get samples for the session time range
    samples = await get_session_samples(
        vehicle_id=session.get("vehicle_id"),
        start_time=session.get("start_time"),
        end_time=session.get("end_time"),
        user_id=user_id
    )

    return [
        ChargingSample(
            sample_time=s.get("sample_time"),
            battery_level=s.get("battery_level"),
            charge_rate_kw=s.get("charge_rate_kw")
        )
        for s in samples
    ]


@router.patch("/charging/sessions/{session_id}", response_model=ChargingSessionSummary)
async def update_session(
    session_id: str,
    payload: UpdateSessionRequest,
    user=Depends(get_supabase_user)
):
    """
    Update user-entered data for a charging session (cost and odometer).
    If cost_per_kwh is provided without total_cost, total is calculated automatically.
    Requires Pro tier.
    """
    user_id = user["sub"]

    # Verify Pro tier
    if not await verify_pro_user(user_id):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    updated = await update_session_user_data(
        session_id=session_id,
        user_id=user_id,
        cost_per_kwh=payload.cost_per_kwh,
        total_cost=payload.total_cost,
        currency=payload.currency,
        user_odometer_km=payload.user_odometer_km
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")

    return session_to_summary(updated)


@router.get("/charging/sessions/export/csv")
async def export_sessions_csv(
    vehicle_id: Optional[str] = Query(default=None),
    user=Depends(get_supabase_user)
):
    """
    Export all charging sessions as CSV.
    Requires Pro tier.
    """
    user_id = user["sub"]

    # Verify Pro tier
    if not await verify_pro_user(user_id):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    sessions = await get_all_sessions_for_export(user_id, vehicle_id)

    if not sessions:
        raise HTTPException(status_code=404, detail="No sessions found")

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        "Session ID",
        "Vehicle ID",
        "Brand",
        "Model",
        "Year",
        "Start Time",
        "End Time",
        "Start Battery %",
        "End Battery %",
        "Energy Added (kWh)",
        "Duration (min)",
        "Max Charge Rate (kW)",
        "Avg Charge Rate (kW)",
        "Cost per kWh",
        "Total Cost",
        "Currency",
        "Odometer (km)"
    ])

    # Write data rows
    for s in sessions:
        writer.writerow([
            s.get("session_id", ""),
            s.get("vehicle_id", ""),
            s.get("brand", ""),
            s.get("model", ""),
            s.get("year", ""),
            s.get("start_time", ""),
            s.get("end_time", ""),
            s.get("start_battery_level", ""),
            s.get("end_battery_level", ""),
            s.get("energy_added_kwh", ""),
            s.get("duration_minutes", ""),
            s.get("max_charge_rate_kw", ""),
            s.get("average_charge_rate_kw", ""),
            s.get("cost_per_kwh", ""),
            s.get("total_cost", ""),
            s.get("currency", ""),
            s.get("user_odometer_km", "")
        ])

    output.seek(0)

    # Generate filename with timestamp
    filename = f"charging_sessions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    logger.info(f"[export_sessions_csv] Exporting {len(sessions)} sessions for user {user_id}")

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# backend/app/api/charging.py
"""
API endpoints for charging session management.
Provides access to session history, details, samples for charts, and CSV export.
"""

import csv
import io
import json
import httpx
import anthropic
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.auth.supabase_auth import get_supabase_user
from app.config import ANTHROPIC_API_KEY
from app.logger import logger
from app.storage.charging_sessions import (
    get_all_sessions_for_export,
    get_consumption_data,
    get_cost_summary,
    get_previous_session_odometer,
    get_session_by_id,
    get_session_samples,
    get_user_charging_sessions,
    update_session_user_data,
)
from app.storage.user import get_user_by_id

router = APIRouter(tags=["Charging"])

import os
import time as _time

# OpenChargeMap API (free API key recommended for production - get at openchargemap.org/site/develop/api)
OPENCHARGEMAP_API_URL = "https://api.openchargemap.io/v3/poi"
OPENCHARGEMAP_COMMENT_URL = "https://api.openchargemap.io/v3/comment/"
OPENCHARGEMAP_AUTH_URL = "https://api.openchargemap.io/v3/profile/authenticate"
OPENCHARGEMAP_API_KEY = os.getenv("OPENCHARGEMAP_API_KEY", "")
OPENCHARGEMAP_EMAIL = os.getenv("OPENCHARGEMAP_EMAIL", "")
OPENCHARGEMAP_PASSWORD = os.getenv("OPENCHARGEMAP_PASSWORD", "")

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
    usage_cost: Optional[str] = None
    ocm_poi_id: Optional[int] = None


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
    vehicle_odometer_km: Optional[float] = None
    user_odometer_km: Optional[float] = None
    country_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    charging_location: Optional[ChargingLocation] = None
    # Persisted station info from OpenChargeMap (set at finalization)
    station_name: Optional[str] = None
    station_operator: Optional[str] = None
    station_address: Optional[str] = None
    station_usage_cost: Optional[str] = None
    # OpenChargeMap check-in
    ocm_poi_id: Optional[int] = None
    ocm_checkin_sent: bool = False
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
    currency: Optional[str] = None
    user_odometer_km: Optional[float] = None


class CreateSessionRequest(BaseModel):
    vehicle_id: str
    start_time: str  # ISO 8601
    end_time: str  # ISO 8601
    start_battery_level: Optional[float] = None
    end_battery_level: Optional[float] = None
    energy_added_kwh: Optional[float] = None
    cost_per_kwh: Optional[float] = None
    total_cost: Optional[float] = None
    currency: Optional[str] = None
    station_name: Optional[str] = None
    station_operator: Optional[str] = None
    station_address: Optional[str] = None


class ParseReceiptRequest(BaseModel):
    receipt_text: str = Field(max_length=5000)


class ParseReceiptResponse(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    start_battery_level: Optional[float] = None
    end_battery_level: Optional[float] = None
    energy_added_kwh: Optional[float] = None
    cost_per_kwh: Optional[float] = None
    total_cost: Optional[float] = None
    currency: Optional[str] = None
    station_name: Optional[str] = None
    station_operator: Optional[str] = None
    station_address: Optional[str] = None


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

                    # Build full address from available parts
                    address_parts = [
                        p for p in [
                            address_info.get("AddressLine1"),
                            address_info.get("Town"),
                            address_info.get("StateOrProvince"),
                            address_info.get("Postcode"),
                        ] if p
                    ]
                    full_address = ", ".join(address_parts) if address_parts else None

                    result = ChargingLocation(
                        name=address_info.get("Title"),
                        address=full_address,
                        operator=operator_info.get("Title") if operator_info else None,
                        distance_meters=address_info.get("Distance", 0) * 1000,  # km to m
                        latitude=address_info.get("Latitude"),
                        longitude=address_info.get("Longitude"),
                        usage_cost=station.get("UsageCost"),
                        ocm_poi_id=station.get("ID"),
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
        vehicle_odometer_km=session.get("vehicle_odometer_km"),
        user_odometer_km=session.get("user_odometer_km"),
        country_code=session.get("country_code"),
        latitude=lat,
        longitude=lon,
        charging_location=None,  # Populated separately for detail view
        station_name=session.get("station_name"),
        station_operator=session.get("station_operator"),
        station_address=session.get("station_address"),
        station_usage_cost=session.get("station_usage_cost"),
        ocm_poi_id=session.get("ocm_poi_id"),
        ocm_checkin_sent=session.get("ocm_checkin_sent", False),
    )


async def session_to_summary_with_location(session: dict, user_id: str = None) -> ChargingSessionSummary:
    """Convert a database session record to a summary model with charging location lookup and consumption."""
    summary = session_to_summary(session)

    # Use persisted station data if available, otherwise fall back to live lookup
    if summary.station_name:
        summary.charging_location = ChargingLocation(
            name=summary.station_name,
            address=summary.station_address,
            operator=summary.station_operator,
        )
    elif summary.latitude and summary.longitude:
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

    # Calculate consumption for each session using consecutive odometer readings
    # Sessions are ordered desc (newest first), so sessions[i+1] is the previous session
    summaries = [session_to_summary(s) for s in sessions]
    for i, summary in enumerate(summaries):
        if not summary.user_odometer_km or not summary.energy_added_kwh:
            continue
        # Find the previous session's odometer (next in list since desc order)
        prev_odometer = None
        for j in range(i + 1, len(summaries)):
            if summaries[j].user_odometer_km and summaries[j].user_odometer_km < summary.user_odometer_km:
                prev_odometer = summaries[j].user_odometer_km
                # Sum energy from sessions at same odometer between prev and current
                total_energy = summary.energy_added_kwh
                for k in range(i + 1, j):
                    if summaries[k].energy_added_kwh:
                        total_energy += summaries[k].energy_added_kwh
                distance = summary.user_odometer_km - prev_odometer
                if distance > 0:
                    consumption = (total_energy / distance) * 100
                    if 5 <= consumption <= 50:
                        summary.consumption_kwh_per_100km = round(consumption, 1)
                        summary.distance_since_last_session_km = round(distance, 1)
                break

    return SessionListResponse(
        sessions=summaries,
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


@router.get("/charging/sessions/{session_id}/odometer-lookup")
async def lookup_session_odometer(
    session_id: str,
    user=Depends(get_supabase_user)
):
    """
    Look up the vehicle odometer reading from charging samples at the time of this session.
    Returns the odometer_km if found in samples, or from vehicle cache as fallback.
    """
    user_id = user["sub"]

    session = await get_session_by_id(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    from app.storage.supabase_client import get_supabase_admin_client

    supabase = get_supabase_admin_client()
    vehicle_id = session.get("vehicle_id")
    start_time = session.get("start_time")
    end_time = session.get("end_time")

    # Try to find odometer from charging samples during the session
    try:
        response = (
            supabase.table("charging_samples")
            .select("odometer_km, sample_time")
            .eq("vehicle_id", vehicle_id)
            .eq("user_id", user_id)
            .gte("sample_time", start_time)
            .lte("sample_time", end_time)
            .not_.is_("odometer_km", "null")
            .order("sample_time", desc=True)
            .limit(1)
            .execute()
        )
        if response.data and response.data[0].get("odometer_km"):
            return {
                "odometer_km": round(response.data[0]["odometer_km"]),
                "source": "session_sample",
            }
    except Exception as e:
        logger.warning(f"[lookup_session_odometer] Sample query failed: {e}")

    # Fallback: check samples near the session time (within 1 hour before/after)
    try:
        from datetime import timedelta
        start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
        window_start = (start_dt - timedelta(hours=1)).isoformat()
        window_end = (end_dt + timedelta(hours=1)).isoformat()

        response = (
            supabase.table("charging_samples")
            .select("odometer_km, sample_time")
            .eq("vehicle_id", vehicle_id)
            .eq("user_id", user_id)
            .gte("sample_time", window_start)
            .lte("sample_time", window_end)
            .not_.is_("odometer_km", "null")
            .order("sample_time", desc=True)
            .limit(1)
            .execute()
        )
        if response.data and response.data[0].get("odometer_km"):
            return {
                "odometer_km": round(response.data[0]["odometer_km"]),
                "source": "nearby_sample",
            }
    except Exception as e:
        logger.warning(f"[lookup_session_odometer] Nearby sample query failed: {e}")

    return {"odometer_km": None, "source": None}


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

    # Determine currency: use payload currency, or fall back to session's default
    currency = payload.currency
    if not currency:
        session = await get_session_by_id(session_id, user_id)
        if session:
            currency = session.get("default_currency") or session.get("currency") or "EUR"
        else:
            currency = "EUR"

    updated = await update_session_user_data(
        session_id=session_id,
        user_id=user_id,
        cost_per_kwh=payload.cost_per_kwh,
        total_cost=payload.total_cost,
        currency=currency,
        user_odometer_km=payload.user_odometer_km
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")

    return session_to_summary(updated)


@router.post("/charging/sessions", response_model=ChargingSessionSummary)
async def create_manual_session(
    payload: CreateSessionRequest,
    user=Depends(get_supabase_user),
):
    """
    Manually create a charging session.
    Requires Pro tier.
    """
    user_id = user["sub"]

    if not await verify_pro_user(user_id):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    # Verify the vehicle belongs to the user
    from app.lib.supabase import get_supabase_admin_client

    supabase = get_supabase_admin_client()
    vehicle_result = (
        supabase.table("vehicles")
        .select("*")
        .eq("vehicle_id", payload.vehicle_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not vehicle_result.data:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    vehicle = vehicle_result.data[0]

    # Extract vehicle info from vehicle_cache
    vehicle_cache = vehicle.get("vehicle_cache") or {}
    if isinstance(vehicle_cache, str):
        vehicle_cache = json.loads(vehicle_cache)

    info = vehicle_cache.get("information", {})
    brand = info.get("brand") or vehicle.get("brand")
    model = info.get("model") or vehicle.get("model")
    year = info.get("year") or vehicle.get("year")

    # Generate session ID
    session_id = str(uuid4())

    # Calculate duration
    try:
        start_dt = datetime.fromisoformat(payload.start_time.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(payload.end_time.replace("Z", "+00:00"))
        duration_minutes = (end_dt - start_dt).total_seconds() / 60.0
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid start_time or end_time format")

    # Calculate energy_added_kwh from battery levels if not provided
    energy_added_kwh = payload.energy_added_kwh
    if energy_added_kwh is None and payload.start_battery_level is not None and payload.end_battery_level is not None:
        # Try to get battery capacity from vehicle cache
        battery_capacity = vehicle_cache.get("chargeState", {}).get("batteryCapacity")
        if battery_capacity:
            energy_added_kwh = round(
                (payload.end_battery_level - payload.start_battery_level) / 100.0 * battery_capacity,
                2,
            )

    # Try to find nearest odometer reading from charging_samples around the session time
    odometer_km = None
    try:
        odo_result = (
            supabase.table("charging_samples")
            .select("odometer_km")
            .eq("vehicle_id", payload.vehicle_id)
            .gte("sample_time", payload.start_time)
            .lte("sample_time", payload.end_time)
            .not_.is_("odometer_km", "null")
            .order("sample_time", desc=True)
            .limit(1)
            .execute()
        )
        if odo_result.data and odo_result.data[0].get("odometer_km"):
            odometer_km = round(odo_result.data[0]["odometer_km"])
            logger.info(f"[create_manual_session] Found odometer {odometer_km} km from samples")
    except Exception as e:
        logger.debug(f"[create_manual_session] Could not look up odometer: {e}")

    # Build insert payload
    session_data = {
        "session_id": session_id,
        "user_id": user_id,
        "vehicle_id": payload.vehicle_id,
        "brand": brand,
        "model": model,
        "year": year,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "start_battery_level": payload.start_battery_level,
        "end_battery_level": payload.end_battery_level,
        "energy_added_kwh": energy_added_kwh,
        "duration_minutes": round(duration_minutes, 1),
        "cost_per_kwh": payload.cost_per_kwh,
        "total_cost": payload.total_cost,
        "currency": payload.currency,
        "station_name": payload.station_name,
        "station_operator": payload.station_operator,
        "station_address": payload.station_address,
        "user_odometer_km": odometer_km,
    }

    # Remove None values to let DB defaults apply
    session_data = {k: v for k, v in session_data.items() if v is not None}

    result = supabase.table("charging_sessions").insert(session_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create session")

    logger.info(f"[create_manual_session] Created session {session_id} for user {user_id}")

    return session_to_summary(result.data[0])


@router.post("/charging/sessions/parse-receipt", response_model=ParseReceiptResponse)
async def parse_charging_receipt(
    payload: ParseReceiptRequest,
    user=Depends(get_supabase_user),
):
    """
    Parse a charging receipt text using AI to extract session data.
    Requires Pro tier.
    """
    user_id = user["sub"]

    if not await verify_pro_user(user_id):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")

    system_prompt = (
        "You are a charging receipt parser. Extract charging session data from the pasted text.\n"
        "Return a JSON object with ONLY the fields you can confidently extract. Use null for fields you cannot determine.\n\n"
        "Fields to extract:\n"
        "- start_time: ISO 8601 datetime string (include timezone if available)\n"
        "- end_time: ISO 8601 datetime string\n"
        "- start_battery_level: percentage (0-100)\n"
        "- end_battery_level: percentage (0-100)\n"
        "- energy_added_kwh: energy in kWh\n"
        "- cost_per_kwh: cost per kWh (number only)\n"
        "- total_cost: total cost (number only)\n"
        '- currency: 3-letter currency code (e.g., "EUR", "USD", "SEK", "AUD")\n'
        "- station_name: name of the charging station\n"
        '- station_operator: operator/network (e.g., "Tesla", "Ionity", "ChargePoint")\n'
        "- station_address: address of the station\n\n"
        "Return ONLY valid JSON, no markdown, no explanation."
    )

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {"role": "user", "content": payload.receipt_text},
            ],
        )

        response_text = message.content[0].text.strip()
        # Strip markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first line (```json or ```) and last line (```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines).strip()
        parsed = json.loads(response_text)

        return ParseReceiptResponse(**parsed)

    except json.JSONDecodeError:
        logger.error(f"[parse_charging_receipt] Failed to parse AI response as JSON")
        raise HTTPException(status_code=502, detail="Failed to parse AI response")
    except anthropic.APIError as e:
        logger.error(f"[parse_charging_receipt] Anthropic API error: {e}")
        raise HTTPException(status_code=502, detail="AI service error")
    except Exception as e:
        logger.error(f"[parse_charging_receipt] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse receipt")


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
        "Odometer (km)",
        "Location",
        "Operator",
        "Address"
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
            s.get("user_odometer_km", ""),
            s.get("station_name", ""),
            s.get("station_operator", ""),
            s.get("station_address", ""),
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


@router.get("/charging/cost-summary")
async def get_charging_cost_summary(user=Depends(get_supabase_user)):
    """
    Get total charging costs grouped by time period.
    Returns totals for last 7 days, 30 days, 12 months, and all time.
    Requires Pro tier.
    """
    user_id = user["sub"]

    if not await verify_pro_user(user_id):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    return await get_cost_summary(user_id)


# ============== OpenChargeMap Check-in ==============

# Cached OCM bearer token
_ocm_token_cache: dict[str, any] = {}


async def get_ocm_bearer_token() -> str:
    """Authenticate with OpenChargeMap and return a cached Bearer token."""
    now = _time.time()
    cached_token = _ocm_token_cache.get("token")
    expires_at = _ocm_token_cache.get("expires_at", 0)

    if cached_token and now < expires_at:
        return cached_token

    if not OPENCHARGEMAP_EMAIL or not OPENCHARGEMAP_PASSWORD:
        raise HTTPException(status_code=500, detail="OCM credentials not configured")

    params = {}
    if OPENCHARGEMAP_API_KEY:
        params["key"] = OPENCHARGEMAP_API_KEY

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            OPENCHARGEMAP_AUTH_URL,
            params=params,
            json={
                "emailAddress": OPENCHARGEMAP_EMAIL,
                "password": OPENCHARGEMAP_PASSWORD,
            },
        )

        if response.status_code != 200:
            logger.error(f"[get_ocm_bearer_token] Auth failed: {response.status_code} {response.text}")
            raise HTTPException(status_code=502, detail="Failed to authenticate with OpenChargeMap")

        data = response.json()
        # OCM returns nested structure: { "Data": { "access_token": "..." } }
        inner = data.get("Data") or data if isinstance(data, dict) else {}
        token = inner.get("access_token") or inner.get("token") or inner.get("Token") or data.get("access_token") or data.get("token")
        if not token:
            if isinstance(data, str):
                token = data
            else:
                logger.error(f"[get_ocm_bearer_token] No token in response: {data}")
                raise HTTPException(status_code=502, detail="No token in OCM auth response")

        # Cache for 30 days (OCM tokens are long-lived)
        _ocm_token_cache["token"] = token
        _ocm_token_cache["expires_at"] = now + (30 * 24 * 3600)

        logger.info("[get_ocm_bearer_token] Successfully obtained OCM token")
        return token


class OcmCheckinRequest(BaseModel):
    successful: bool = True
    rating: Optional[int] = None


@router.post("/charging/sessions/{session_id}/ocm-checkin")
async def submit_ocm_checkin(
    session_id: str,
    payload: OcmCheckinRequest,
    user=Depends(get_supabase_user),
):
    """
    Submit a check-in to OpenChargeMap for a charging session.
    Reports whether charging was successful or failed at the station.
    Requires Pro tier.
    """
    user_id = user["sub"]

    if not await verify_pro_user(user_id):
        raise HTTPException(status_code=403, detail="Pro subscription required")

    session = await get_session_by_id(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ocm_poi_id = session.get("ocm_poi_id")
    if not ocm_poi_id:
        raise HTTPException(status_code=400, detail="Session has no associated OpenChargeMap station")

    if session.get("ocm_checkin_sent"):
        raise HTTPException(status_code=400, detail="Check-in already submitted for this session")

    # Build comment text
    brand = session.get("brand", "")
    model = session.get("model", "")
    year = session.get("year", "")
    energy = session.get("energy_added_kwh")
    energy_str = f"{energy:.1f}kWh" if energy else "unknown energy"

    vehicle_str = f"{brand} {model}".strip()
    if year:
        vehicle_str += f" ({year})"

    comment_text = f"Charged {energy_str} with {vehicle_str} — reported by evconduit.com"

    # Get OCM bearer token
    token = await get_ocm_bearer_token()

    # checkinStatusTypeID: 10 = "Charging Confirmed" (success), 25 = "Charging Failed"
    checkin_status = 10 if payload.successful else 25

    checkin_data = {
        "chargePointID": ocm_poi_id,
        "checkinStatusTypeID": checkin_status,
        "commentTypeID": 10,  # General Comment
        "userName": "EVConduit",
        "comment": comment_text,
    }

    if payload.rating is not None:
        checkin_data["rating"] = max(1, min(5, payload.rating))

    params = {}
    if OPENCHARGEMAP_API_KEY:
        params["key"] = OPENCHARGEMAP_API_KEY

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            OPENCHARGEMAP_COMMENT_URL,
            params=params,
            json=checkin_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        if response.status_code not in (200, 201):
            logger.error(f"[submit_ocm_checkin] Failed: {response.status_code} {response.text}")
            raise HTTPException(status_code=502, detail="Failed to submit check-in to OpenChargeMap")

    # Mark as sent in the database
    from app.lib.supabase import get_supabase_admin_client
    supabase = get_supabase_admin_client()
    supabase.table("charging_sessions") \
        .update({"ocm_checkin_sent": True}) \
        .eq("session_id", session_id) \
        .eq("user_id", user_id) \
        .execute()

    logger.info(f"[submit_ocm_checkin] Check-in submitted for session {session_id}, POI {ocm_poi_id}")

    return {"success": True}

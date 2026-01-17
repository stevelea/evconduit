# backend/app/storage/charging.py
"""
Storage functions for charging data collection.
Saves charging samples from Enode vehicle webhooks and aggregates into sessions.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from app.lib.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)


async def save_charging_sample(
    vehicle_data: dict,
    user_id: str,
    source_event_id: Optional[str] = None
) -> Optional[str]:
    """
    Saves a charging sample from vehicle webhook data.
    Returns the sample ID if successful, None otherwise.
    """
    supabase = get_supabase_admin_client()

    try:
        # Extract charge state data
        charge_state = vehicle_data.get("chargeState", {})
        information = vehicle_data.get("information", {})
        location = vehicle_data.get("location", {})
        odometer_data = vehicle_data.get("odometer", {})

        # Get vehicle_id - could be 'id' or 'vehicle_id'
        vehicle_id = vehicle_data.get("id") or vehicle_data.get("vehicle_id")

        if not vehicle_id:
            logger.warning("[save_charging_sample] No vehicle_id found in data")
            return None

        # Build location point if available
        location_point = None
        if location and location.get("latitude") and location.get("longitude"):
            lat = location.get("latitude")
            lon = location.get("longitude")
            location_point = f"POINT({lon} {lat})"

        sample_id = str(uuid4())
        sample_time = vehicle_data.get("lastSeen") or datetime.now(timezone.utc).isoformat()

        payload = {
            "id": sample_id,
            "source_event_id": source_event_id,
            "vehicle_id": vehicle_id,
            "user_id": user_id,
            "sample_time": sample_time,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_charging": charge_state.get("isCharging"),
            "is_plugged_in": charge_state.get("isPluggedIn"),
            "is_fully_charged": charge_state.get("isFullyCharged"),
            "is_reachable": vehicle_data.get("isReachable"),
            "battery_level": charge_state.get("batteryLevel"),
            "battery_capacity_kwh": charge_state.get("batteryCapacity"),
            "charge_limit_percent": charge_state.get("chargeLimit"),
            "charge_rate_kw": charge_state.get("chargeRate"),
            "charge_time_remaining_min": charge_state.get("chargeTimeRemaining"),
            "range_km": charge_state.get("range"),
            "odometer_km": odometer_data.get("distance") if odometer_data else None,
            "power_delivery_state": charge_state.get("powerDeliveryState"),
            "vin": information.get("vin"),
            "brand": information.get("brand"),
            "model": information.get("model"),
            "year": information.get("year"),
        }

        # Only add location if we have valid coordinates
        if location_point:
            payload["location"] = location_point

        # Remove None values to avoid issues
        payload = {k: v for k, v in payload.items() if v is not None}

        logger.debug(f"[save_charging_sample] Saving sample for vehicle {vehicle_id}")

        response = supabase.table("charging_samples").insert(payload).execute()

        if response.data:
            logger.info(f"[save_charging_sample] Saved sample {sample_id} for vehicle {vehicle_id}")
            return sample_id
        else:
            logger.warning(f"[save_charging_sample] No data returned for vehicle {vehicle_id}")
            return None

    except Exception as e:
        logger.error(f"[save_charging_sample] Error saving sample: {e}", exc_info=True)
        return None


async def check_and_create_charging_session(vehicle_id: str, user_id: str) -> Optional[str]:
    """
    Checks recent charging samples and creates/updates charging sessions.
    A session is created when charging starts and completed when charging stops.
    Returns the session ID if a session was created/updated, None otherwise.
    """
    supabase = get_supabase_admin_client()

    try:
        # Get the last 2 samples for this vehicle to detect state changes
        response = supabase.table("charging_samples") \
            .select("*") \
            .eq("vehicle_id", vehicle_id) \
            .order("sample_time", desc=True) \
            .limit(2) \
            .execute()

        samples = response.data or []

        if len(samples) < 2:
            logger.debug(f"[check_and_create_charging_session] Not enough samples for vehicle {vehicle_id}")
            return None

        current = samples[0]
        previous = samples[1]

        current_charging = current.get("is_charging", False)
        previous_charging = previous.get("is_charging", False)

        # Detect charging session end (was charging, now not charging)
        if previous_charging and not current_charging:
            logger.info(f"[check_and_create_charging_session] Charging ended for vehicle {vehicle_id}")
            return await _finalize_charging_session(vehicle_id, user_id, current)

        # Detect charging session start (was not charging, now charging)
        if not previous_charging and current_charging:
            logger.info(f"[check_and_create_charging_session] Charging started for vehicle {vehicle_id}")
            # Session will be finalized when charging stops
            return None

        return None

    except Exception as e:
        logger.error(f"[check_and_create_charging_session] Error: {e}", exc_info=True)
        return None


async def _finalize_charging_session(
    vehicle_id: str,
    user_id: str,
    end_sample: dict
) -> Optional[str]:
    """
    Creates a charging session from samples collected during a charging period.
    """
    supabase = get_supabase_admin_client()

    try:
        # Find all samples from this charging session
        # Look back for samples where is_charging was True
        response = supabase.table("charging_samples") \
            .select("*") \
            .eq("vehicle_id", vehicle_id) \
            .order("sample_time", desc=True) \
            .limit(100) \
            .execute()

        samples = response.data or []

        if not samples:
            return None

        # Find the start of this charging session
        session_samples = []
        found_start = False

        for sample in samples:
            if sample.get("is_charging"):
                session_samples.append(sample)
                found_start = True
            elif found_start:
                # We've found a non-charging sample after charging samples
                break

        if not session_samples:
            logger.warning(f"[_finalize_charging_session] No charging samples found for vehicle {vehicle_id}")
            return None

        # Session samples are in reverse order, so first is end, last is start
        start_sample = session_samples[-1]
        end_sample_from_list = session_samples[0]

        # Calculate session metrics
        start_time = start_sample.get("sample_time")
        end_time = end_sample.get("sample_time") or end_sample_from_list.get("sample_time")
        start_battery = start_sample.get("battery_level")
        end_battery = end_sample.get("battery_level") or end_sample_from_list.get("battery_level")

        # Calculate duration in minutes
        duration_minutes = None
        if start_time and end_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                duration_minutes = (end_dt - start_dt).total_seconds() / 60
            except Exception as e:
                logger.warning(f"[_finalize_charging_session] Error calculating duration: {e}")

        # Calculate energy added (estimate based on battery capacity and level change)
        energy_added_kwh = None
        battery_capacity = start_sample.get("battery_capacity_kwh")
        if battery_capacity and start_battery is not None and end_battery is not None:
            energy_added_kwh = battery_capacity * (end_battery - start_battery) / 100

        # Calculate average charge rate
        charge_rates = [s.get("charge_rate_kw") for s in session_samples if s.get("charge_rate_kw")]
        avg_charge_rate = sum(charge_rates) / len(charge_rates) if charge_rates else None
        max_charge_rate = max(charge_rates) if charge_rates else None

        session_id = str(uuid4())

        payload = {
            "session_id": session_id,
            "vehicle_id": vehicle_id,
            "user_id": user_id,
            "start_time": start_time,
            "end_time": end_time,
            "start_battery_level": start_battery,
            "end_battery_level": end_battery,
            "energy_added_kwh": energy_added_kwh,
            "duration_minutes": duration_minutes,
            "max_charge_rate_kw": max_charge_rate,
            "average_charge_rate_kw": avg_charge_rate,
            "brand": start_sample.get("brand"),
            "model": start_sample.get("model"),
            "year": start_sample.get("year"),
        }

        # Add location if available
        start_location = start_sample.get("location")
        end_location = end_sample.get("location")
        if start_location:
            payload["start_location"] = start_location
        if end_location:
            payload["end_location"] = end_location

        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}

        response = supabase.table("charging_sessions").insert(payload).execute()

        if response.data:
            logger.info(f"[_finalize_charging_session] Created session {session_id} for vehicle {vehicle_id}")
            logger.info(f"  Duration: {duration_minutes:.1f} min, Energy: {energy_added_kwh:.2f} kWh" if duration_minutes and energy_added_kwh else "")
            return session_id
        else:
            logger.warning(f"[_finalize_charging_session] Failed to create session for vehicle {vehicle_id}")
            return None

    except Exception as e:
        logger.error(f"[_finalize_charging_session] Error: {e}", exc_info=True)
        return None

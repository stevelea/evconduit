# backend/app/storage/charging.py
"""
Storage functions for charging data collection.
Saves charging samples from Enode vehicle webhooks and aggregates into sessions.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

from app.lib.supabase import get_supabase_admin_client

logger = logging.getLogger(__name__)

# Cache to track last saved state per vehicle (avoid duplicate saves)
_last_sample_cache: dict[str, dict[str, Any]] = {}
SAMPLE_CACHE_TTL = 300  # 5 minutes - save at least once per 5 min even if unchanged


def _should_save_sample(vehicle_id: str, battery_level: int | None, is_charging: bool | None) -> bool:
    """
    Determine if we should save a charging sample.
    Skip if nothing changed and vehicle is not charging.
    """
    cache_key = vehicle_id
    now = datetime.utcnow()

    cached = _last_sample_cache.get(cache_key)

    # Always save if charging
    if is_charging:
        _last_sample_cache[cache_key] = {
            "battery_level": battery_level,
            "is_charging": is_charging,
            "saved_at": now
        }
        return True

    # No cache = first time, save it
    if not cached:
        _last_sample_cache[cache_key] = {
            "battery_level": battery_level,
            "is_charging": is_charging,
            "saved_at": now
        }
        return True

    # Check if TTL expired (save periodically even if unchanged)
    if now > cached["saved_at"] + timedelta(seconds=SAMPLE_CACHE_TTL):
        _last_sample_cache[cache_key] = {
            "battery_level": battery_level,
            "is_charging": is_charging,
            "saved_at": now
        }
        return True

    # Check if battery level changed significantly (>= 1%)
    old_level = cached.get("battery_level")
    if old_level is not None and battery_level is not None:
        if abs(battery_level - old_level) >= 1:
            _last_sample_cache[cache_key] = {
                "battery_level": battery_level,
                "is_charging": is_charging,
                "saved_at": now
            }
            return True

    # Check if charging state changed
    if cached.get("is_charging") != is_charging:
        _last_sample_cache[cache_key] = {
            "battery_level": battery_level,
            "is_charging": is_charging,
            "saved_at": now
        }
        return True

    # Nothing changed, skip
    return False


async def save_charging_sample(
    vehicle_data: dict,
    user_id: str,
    source_event_id: Optional[str] = None
) -> Optional[str]:
    """
    Saves a charging sample from vehicle webhook data.
    Only saves if vehicle is charging OR state has changed significantly.
    Returns the sample ID if successful, None otherwise.
    """
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

        # Check if we should save (skip if nothing changed and not charging)
        battery_level = charge_state.get("batteryLevel")
        is_charging = charge_state.get("isCharging")

        if not _should_save_sample(vehicle_id, battery_level, is_charging):
            logger.debug(f"[save_charging_sample] Skipping unchanged sample for vehicle {vehicle_id}")
            return None

        supabase = get_supabase_admin_client()

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

    Uses TWO detection methods:
    1. is_charging flag transitions (when available)
    2. Battery level decrease detection (charging ended when battery stops rising)

    This handles cases where Enode's is_charging flag is unreliable.
    """
    supabase = get_supabase_admin_client()

    try:
        # Get recent samples for this vehicle (last 24 hours worth)
        response = supabase.table("charging_samples") \
            .select("*") \
            .eq("vehicle_id", vehicle_id) \
            .order("sample_time", desc=True) \
            .limit(50) \
            .execute()

        samples = response.data or []

        if len(samples) < 2:
            logger.debug(f"[check_and_create_charging_session] Not enough samples for vehicle {vehicle_id}")
            return None

        current = samples[0]
        previous = samples[1]

        current_charging = current.get("is_charging", False)
        previous_charging = previous.get("is_charging", False)
        current_battery = current.get("battery_level")
        previous_battery = previous.get("battery_level")

        # Method 1: Detect by is_charging flag
        if previous_charging and not current_charging:
            logger.info(f"[check_and_create_charging_session] Charging ended (flag) for vehicle {vehicle_id}")
            return await _finalize_charging_session_by_battery(vehicle_id, user_id, samples)

        # Method 2: Detect by battery level decrease after increase
        # If battery was increasing but now decreased, charging ended
        if current_battery is not None and previous_battery is not None:
            # Look for pattern: battery was rising, now dropped
            if len(samples) >= 3:
                third = samples[2]
                third_battery = third.get("battery_level")

                # Pattern: third < previous (was rising) AND current < previous (now dropped)
                if third_battery is not None:
                    was_rising = previous_battery > third_battery
                    now_dropped = current_battery < previous_battery
                    drop_significant = (previous_battery - current_battery) >= 2  # At least 2% drop

                    if was_rising and now_dropped and drop_significant:
                        logger.info(f"[check_and_create_charging_session] Charging ended (battery drop) for vehicle {vehicle_id}: {previous_battery}% -> {current_battery}%")
                        return await _finalize_charging_session_by_battery(vehicle_id, user_id, samples)

        return None

    except Exception as e:
        logger.error(f"[check_and_create_charging_session] Error: {e}", exc_info=True)
        return None


async def _finalize_charging_session_by_battery(
    vehicle_id: str,
    user_id: str,
    recent_samples: list
) -> Optional[str]:
    """
    Creates a charging session by analyzing battery level changes.

    Looks for the most recent period where battery level consistently increased,
    regardless of the is_charging flag.
    """
    supabase = get_supabase_admin_client()

    # Session thresholds
    MIN_BATTERY_INCREASE = 5  # Minimum 5% increase to count as a session
    MIN_ENERGY_KWH = 1.0  # Minimum 1 kWh to create a session
    MAX_GAP_HOURS = 8  # Maximum hours between samples to be same session

    try:
        # Get more samples to find the full charging session
        response = supabase.table("charging_samples") \
            .select("*") \
            .eq("vehicle_id", vehicle_id) \
            .order("sample_time", desc=True) \
            .limit(200) \
            .execute()

        samples = response.data or []
        if len(samples) < 2:
            return None

        # Samples are in reverse chronological order (newest first)
        # Find the peak battery level (end of charge) and trace back to find the start

        # Find the local maximum battery level (charging peak)
        peak_idx = 0
        peak_battery = samples[0].get("battery_level", 0)

        for i, s in enumerate(samples[1:10], 1):  # Look in recent samples for peak
            bat = s.get("battery_level", 0)
            if bat and bat > peak_battery:
                peak_battery = bat
                peak_idx = i

        # Now trace back from peak to find where charging started (battery minimum)
        session_samples = [samples[peak_idx]]
        min_battery = peak_battery
        min_idx = peak_idx

        prev_time = None
        if samples[peak_idx].get("sample_time"):
            prev_time = datetime.fromisoformat(samples[peak_idx]["sample_time"].replace("Z", "+00:00"))

        for i in range(peak_idx + 1, len(samples)):
            s = samples[i]
            bat = s.get("battery_level")
            sample_time_str = s.get("sample_time")

            if bat is None or sample_time_str is None:
                continue

            try:
                sample_time = datetime.fromisoformat(sample_time_str.replace("Z", "+00:00"))
            except:
                continue

            # Check time gap
            if prev_time:
                gap_hours = (prev_time - sample_time).total_seconds() / 3600
                if gap_hours > MAX_GAP_HOURS:
                    logger.debug(f"[_finalize_charging_session_by_battery] Gap of {gap_hours:.1f}h detected, stopping search")
                    break

            # If battery is lower than minimum, we're tracing back the charge
            if bat < min_battery:
                min_battery = bat
                min_idx = i
                session_samples.append(s)
            elif bat > min_battery + 3:
                # Battery went significantly up from our minimum - we've gone past the session start
                break
            else:
                session_samples.append(s)

            prev_time = sample_time

        # Calculate session metrics
        battery_increase = peak_battery - min_battery

        if battery_increase < MIN_BATTERY_INCREASE:
            logger.info(f"[_finalize_charging_session_by_battery] Battery increase too small ({battery_increase}%)")
            return None

        # Get start and end samples
        start_sample = samples[min_idx]
        end_sample = samples[peak_idx]

        start_time = start_sample.get("sample_time")
        end_time = end_sample.get("sample_time")
        start_battery = min_battery
        end_battery = peak_battery

        # Calculate energy
        capacity = start_sample.get("battery_capacity_kwh") or end_sample.get("battery_capacity_kwh")
        energy_added_kwh = None
        if capacity:
            energy_added_kwh = capacity * battery_increase / 100

            if energy_added_kwh < MIN_ENERGY_KWH:
                logger.info(f"[_finalize_charging_session_by_battery] Energy too low ({energy_added_kwh:.1f} kWh)")
                return None

        # Calculate duration
        duration_minutes = None
        if start_time and end_time:
            try:
                start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                duration_minutes = (end_dt - start_dt).total_seconds() / 60
            except:
                pass

        # Check for duplicate
        if start_time:
            try:
                # Check within 30 minutes of start time
                existing = supabase.table("charging_sessions") \
                    .select("session_id") \
                    .eq("vehicle_id", vehicle_id) \
                    .gte("start_time", start_time) \
                    .execute()
                if existing and existing.data:
                    logger.info(f"[_finalize_charging_session_by_battery] Session already exists for this period")
                    return None
            except:
                pass

        # Get charge rates from samples that had charging flag
        charging_samples = [s for s in session_samples if s.get("is_charging") or s.get("charge_rate_kw")]
        charge_rates = [s.get("charge_rate_kw") for s in charging_samples if s.get("charge_rate_kw")]
        avg_charge_rate = sum(charge_rates) / len(charge_rates) if charge_rates else None
        max_charge_rate = max(charge_rates) if charge_rates else None

        # If no charge rates from samples, estimate from energy/duration
        if not avg_charge_rate and energy_added_kwh and duration_minutes and duration_minutes > 0:
            avg_charge_rate = energy_added_kwh / (duration_minutes / 60)
            max_charge_rate = avg_charge_rate  # Best estimate

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
            logger.info(f"[_finalize_charging_session_by_battery] Created session {session_id}")
            logger.info(f"  {start_battery}% -> {end_battery}% = {energy_added_kwh:.1f} kWh over {duration_minutes:.0f} min")
            return session_id

        return None

    except Exception as e:
        logger.error(f"[_finalize_charging_session_by_battery] Error: {e}", exc_info=True)
        return None


async def regenerate_charging_sessions(days_back: int = 7) -> dict:
    """
    Utility function to regenerate charging sessions from historical samples.
    Deletes existing sessions and recreates them using the improved battery-based detection.

    Args:
        days_back: Number of days of history to process

    Returns:
        Dict with counts of sessions created per vehicle
    """
    from collections import defaultdict

    supabase = get_supabase_admin_client()
    results = defaultdict(int)

    # Session thresholds
    MIN_BATTERY_INCREASE = 5  # Minimum 5% increase to count as a session
    MIN_ENERGY_KWH = 1.0  # Minimum 1 kWh to create a session
    MAX_GAP_HOURS = 4  # Maximum hours gap between samples in same session

    try:
        # Get all samples from the time window
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat()
        response = supabase.table("charging_samples") \
            .select("*") \
            .gte("sample_time", cutoff) \
            .order("sample_time") \
            .execute()

        samples = response.data or []
        logger.info(f"[regenerate_charging_sessions] Processing {len(samples)} samples from last {days_back} days")

        if not samples:
            return dict(results)

        # Group samples by vehicle
        by_vehicle = defaultdict(list)
        for s in samples:
            by_vehicle[s.get("vehicle_id")].append(s)

        # Process each vehicle
        for vehicle_id, vehicle_samples in by_vehicle.items():
            if len(vehicle_samples) < 2:
                continue

            user_id = vehicle_samples[0].get("user_id")
            capacity = None
            for s in vehicle_samples:
                if s.get("battery_capacity_kwh"):
                    capacity = s.get("battery_capacity_kwh")
                    break

            if not capacity:
                logger.warning(f"[regenerate_charging_sessions] No capacity for vehicle {vehicle_id}, skipping")
                continue

            # Find charging sessions by looking for periods of battery increase
            sessions_found = []
            i = 0

            while i < len(vehicle_samples) - 1:
                # Look for start of charge (battery starts increasing)
                start_idx = None
                start_battery = None

                # Find a point where battery starts rising
                while i < len(vehicle_samples) - 1:
                    current_bat = vehicle_samples[i].get("battery_level")
                    next_bat = vehicle_samples[i + 1].get("battery_level")

                    if current_bat is not None and next_bat is not None and next_bat > current_bat:
                        start_idx = i
                        start_battery = current_bat
                        break
                    i += 1

                if start_idx is None:
                    break

                # Now find end of charge (battery stops increasing or drops)
                end_idx = start_idx
                end_battery = start_battery
                prev_time = None

                for j in range(start_idx, len(vehicle_samples)):
                    s = vehicle_samples[j]
                    bat = s.get("battery_level")
                    time_str = s.get("sample_time")

                    if bat is None:
                        continue

                    # Parse time for gap detection
                    current_time = None
                    if time_str:
                        try:
                            current_time = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
                        except:
                            pass

                    # Check for time gap
                    if prev_time and current_time:
                        gap_hours = (current_time - prev_time).total_seconds() / 3600
                        if gap_hours > MAX_GAP_HOURS:
                            break

                    prev_time = current_time

                    if bat >= end_battery:
                        end_battery = bat
                        end_idx = j
                    elif bat < end_battery - 2:  # Battery dropped more than 2%
                        break

                # Check if this is a valid session
                battery_increase = end_battery - start_battery
                energy = capacity * battery_increase / 100

                if battery_increase >= MIN_BATTERY_INCREASE and energy >= MIN_ENERGY_KWH:
                    sessions_found.append({
                        "start_sample": vehicle_samples[start_idx],
                        "end_sample": vehicle_samples[end_idx],
                        "start_battery": start_battery,
                        "end_battery": end_battery,
                        "energy": energy
                    })

                i = end_idx + 1

            # Create sessions for this vehicle
            for sess in sessions_found:
                start_sample = sess["start_sample"]
                end_sample = sess["end_sample"]

                start_time = start_sample.get("sample_time")
                end_time = end_sample.get("sample_time")

                # Check for existing session
                if start_time:
                    try:
                        existing = supabase.table("charging_sessions") \
                            .select("session_id") \
                            .eq("vehicle_id", vehicle_id) \
                            .eq("start_time", start_time) \
                            .maybe_single() \
                            .execute()
                        if existing and existing.data:
                            continue
                    except:
                        pass

                # Calculate duration
                duration_minutes = None
                if start_time and end_time:
                    try:
                        start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                        end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
                        duration_minutes = (end_dt - start_dt).total_seconds() / 60
                    except:
                        pass

                # Estimate charge rate
                avg_rate = None
                if sess["energy"] and duration_minutes and duration_minutes > 0:
                    avg_rate = sess["energy"] / (duration_minutes / 60)

                session_id = str(uuid4())
                payload = {
                    "session_id": session_id,
                    "vehicle_id": vehicle_id,
                    "user_id": user_id,
                    "start_time": start_time,
                    "end_time": end_time,
                    "start_battery_level": sess["start_battery"],
                    "end_battery_level": sess["end_battery"],
                    "energy_added_kwh": sess["energy"],
                    "duration_minutes": duration_minutes,
                    "average_charge_rate_kw": avg_rate,
                    "max_charge_rate_kw": avg_rate,
                    "brand": start_sample.get("brand"),
                    "model": start_sample.get("model"),
                    "year": start_sample.get("year"),
                }

                payload = {k: v for k, v in payload.items() if v is not None}

                try:
                    supabase.table("charging_sessions").insert(payload).execute()
                    results[vehicle_id] += 1
                    logger.info(f"[regenerate_charging_sessions] Created session: {sess['start_battery']}% -> {sess['end_battery']}% = {sess['energy']:.1f} kWh")
                except Exception as e:
                    logger.error(f"[regenerate_charging_sessions] Failed to create session: {e}")

        return dict(results)

    except Exception as e:
        logger.error(f"[regenerate_charging_sessions] Error: {e}", exc_info=True)
        return dict(results)

"""
ABRP Pull Service — Read vehicle telemetry FROM ABRP.

Supports two modes:
1. Token-based (official): Uses EVConduit's API key + user's ABRP token
   via GET /1/tlm/get_telemetry?token=<user_token>
2. Session-based (legacy): Uses user's session_id + API key
   via POST /1/session/get_tlm
"""
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Official EVConduit API key from ABRP/Iternio
ABRP_API_KEY = os.environ.get("ABRP_API_KEY", "e7b10ea7-c815-4fef-8e5d-e201ff15edbd")

ABRP_GET_TELEMETRY_URL = "https://api.iternio.com/1/tlm/get_telemetry"
ABRP_GET_TLM_URL = "https://api.iternio.com/1/session/get_tlm"


class ABRPPullService:
    """Service for pulling telemetry data from ABRP."""

    async def pull_telemetry_token(self, user_token: str) -> dict:
        """
        Pull telemetry using the official token-based API.
        Uses EVConduit's API key + user's ABRP token.

        Args:
            user_token: The user's ABRP token (from ABRP settings or OAuth)

        Returns:
            dict with success status and telemetry data
        """
        if not user_token:
            return {"success": False, "message": "Missing ABRP user token"}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    ABRP_GET_TELEMETRY_URL,
                    params={"token": user_token},
                    headers={"Authorization": f"APIKEY {ABRP_API_KEY}"},
                    timeout=15.0,
                )

                if response.status_code == 401:
                    return {"success": False, "message": "Invalid or expired ABRP token"}

                if response.status_code != 200:
                    return {
                        "success": False,
                        "message": f"ABRP API returned status {response.status_code}: {response.text[:200]}",
                    }

                try:
                    result = response.json()
                except json.JSONDecodeError as e:
                    return {"success": False, "message": f"Failed to parse ABRP response: {e}"}

                # Token-based API returns different field names than session-based
                if result.get("status") == "ok":
                    data = result.get("result") or result.get("data")
                    if isinstance(data, list):
                        vehicles = data
                    elif isinstance(data, dict):
                        vehicles = [data]
                    else:
                        vehicles = []

                    # Remap token-based fields to match session-based format
                    # so the normalizer works with both
                    for v in vehicles:
                        # "telemetry" → "tlm"
                        if "telemetry" in v and "tlm" not in v:
                            v["tlm"] = v["telemetry"]
                        # "typecode" → "car_model"
                        if "typecode" in v and "car_model" not in v:
                            v["car_model"] = v["typecode"]

                    logger.info(f"🗺️ ABRP pull (token): got {len(vehicles)} vehicle(s)")
                    return {"success": True, "vehicles": vehicles, "raw": result}

                return {"success": False, "message": f"Unexpected ABRP response: {json.dumps(result)[:200]}"}

        except httpx.TimeoutException:
            logger.error("❌ ABRP pull (token) timed out")
            return {"success": False, "message": "Request timed out"}
        except Exception as e:
            logger.error(f"❌ ABRP pull (token) error: {e}")
            return {"success": False, "message": f"Failed to pull telemetry: {str(e)}"}

    async def pull_telemetry(
        self,
        session_id: str,
        api_key: str,
        vehicle_id: str,
    ) -> dict:
        """
        Legacy: Pull telemetry via POST /1/session/get_tlm.
        Kept for backward compatibility with existing users.
        """
        if not session_id or not api_key or not vehicle_id:
            return {"success": False, "message": "Missing ABRP pull credentials"}

        headers = {
            "Authorization": f"APIKEY {api_key}",
            "Content-Type": "application/json",
        }

        body = {
            "session_id": session_id,
            "wakeup_vehicle_id": int(vehicle_id) if vehicle_id.isdigit() else vehicle_id,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    ABRP_GET_TLM_URL,
                    headers=headers,
                    json=body,
                    timeout=15.0,
                )

                if response.status_code != 200:
                    return {
                        "success": False,
                        "message": f"ABRP API returned status {response.status_code}: {response.text[:200]}",
                    }

                try:
                    result = response.json()
                except json.JSONDecodeError as e:
                    return {"success": False, "message": f"Failed to parse ABRP response: {e}"}

                if result.get("status") == "ok" and isinstance(result.get("result"), list):
                    vehicles = result["result"]
                    logger.info(f"🗺️ ABRP pull (session): got {len(vehicles)} vehicle(s)")
                    return {"success": True, "vehicles": vehicles, "raw": result}

                return {"success": False, "message": f"Unexpected ABRP response: status={result.get('status')}"}

        except httpx.TimeoutException:
            logger.error("❌ ABRP pull request timed out")
            return {"success": False, "message": "Request timed out"}
        except Exception as e:
            logger.error(f"❌ ABRP pull error: {e}")
            return {"success": False, "message": f"Failed to pull telemetry: {str(e)}"}

    def normalize_to_vehicle(self, vehicle_data: dict, user_id: str) -> dict | None:
        """
        Normalize a single ABRP vehicle entry to Enode-compatible vehicle_cache format.

        Args:
            vehicle_data: A single vehicle dict from the ABRP result array
            user_id: The EVConduit user ID

        Returns:
            dict in Enode-like vehicle_cache format, or None if no telemetry
        """
        tlm = vehicle_data.get("tlm")
        if not tlm:
            return None  # No telemetry data for this vehicle

        abrp_vehicle_id = str(vehicle_data.get("vehicle_id", ""))
        car_model = vehicle_data.get("car_model", "")
        name = vehicle_data.get("name", "")

        # Parse car_model code like "xpeng:g6:25:88:rwd"
        # Parts: brand:model:year:battery_kwh:drivetrain
        brand = "Unknown"
        model = "Unknown"
        year = None
        model_detail = ""
        if car_model:
            parts = car_model.split(":")
            if len(parts) >= 1:
                brand = parts[0].capitalize()
            if len(parts) >= 2:
                model = parts[1].upper()
            if len(parts) >= 3 and parts[2].isdigit():
                year = 2000 + int(parts[2]) if int(parts[2]) < 100 else int(parts[2])
            # Build detail string from remaining parts (e.g. "88 kWh RWD")
            extras = []
            if len(parts) >= 4 and parts[3]:
                extras.append(f"{parts[3]} kWh")
            if len(parts) >= 5 and parts[4]:
                extras.append(parts[4].upper())
            model_detail = " ".join(extras)

        soc = tlm.get("soc")
        is_charging = tlm.get("is_charging", False)
        power = tlm.get("power")
        lat = tlm.get("lat")
        lon = tlm.get("lon")
        utc = tlm.get("utc")

        # Build display model: "G6 88 kWh RWD" or just "G6"
        full_model = f"{model} {model_detail}".strip() if model_detail else model

        # Map capacity and range to Enode-compatible chargeState fields
        capacity = tlm.get("capacity")
        est_range = tlm.get("est_battery_range")

        vehicle_cache = {
            "id": abrp_vehicle_id,
            "userId": user_id,
            "vendor": brand.lower(),
            "isReachable": True,
            "lastSeen": datetime.fromtimestamp(utc, tz=timezone.utc).isoformat() if utc else datetime.now(timezone.utc).isoformat(),
            "information": {
                "brand": brand,
                "model": full_model,
                "displayName": name or f"{brand} {full_model}",
                "vin": "",
                **({"year": year} if year else {}),
            },
            "chargeState": {
                "batteryLevel": soc,
                "isCharging": bool(is_charging),
                "chargeRate": abs(power) if power and is_charging else None,
                "isPluggedIn": bool(is_charging),
                **({"batteryCapacity": capacity} if capacity is not None else {}),
                **({"range": est_range} if est_range is not None else {}),
            },
        }

        if lat is not None and lon is not None:
            heading = tlm.get("heading")
            vehicle_cache["location"] = {
                "latitude": lat,
                "longitude": lon,
                "lastUpdated": vehicle_cache["lastSeen"],
                "id": None,
                **({"heading": heading} if heading is not None else {}),
            }

        # Map odometer to Enode-compatible top-level field
        odo = tlm.get("odometer")
        if odo is not None:
            vehicle_cache["odometer"] = {
                "distance": odo,
                "lastUpdated": vehicle_cache["lastSeen"],
            }

        # Store extra ABRP fields not in Enode schema
        abrp_extra = {}
        for key in (
            "voltage", "current", "batt_temp", "ext_temp", "soh", "soe",
            "speed", "odometer", "elevation", "is_dcfc", "is_parked",
            "capacity", "heading", "est_battery_range",
            "hvac_power", "hvac_setpoint", "cabin_temp",
            "tire_pressure_fl", "tire_pressure_fr",
            "tire_pressure_rl", "tire_pressure_rr",
        ):
            val = tlm.get(key)
            if val is not None:
                abrp_extra[key] = val
        if abrp_extra:
            vehicle_cache["abrp_extra"] = abrp_extra

        return vehicle_cache


# Global singleton
_abrp_pull_service: Optional[ABRPPullService] = None


def get_abrp_pull_service() -> ABRPPullService:
    """Get ABRP pull service singleton"""
    global _abrp_pull_service
    if _abrp_pull_service is None:
        _abrp_pull_service = ABRPPullService()
    return _abrp_pull_service

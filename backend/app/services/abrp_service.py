"""
ABRP (A Better Route Planner) Telemetry Service
Sends vehicle telemetry data to ABRP for route planning.
"""
import json
import logging
import time
from typing import Optional

import httpx

from app.config import ABRP_API_KEY

logger = logging.getLogger(__name__)

ABRP_TELEMETRY_URL = "https://api.iternio.com/1/tlm/send"


class ABRPService:
    """Service for sending telemetry data to ABRP"""

    def __init__(self):
        self.api_key = ABRP_API_KEY
        self.enabled = bool(self.api_key)
        if self.enabled:
            logger.info("🗺️ ABRP service initialized with API key")
        else:
            logger.warning("🗺️ ABRP service disabled - no API key configured")

    async def send_telemetry(
        self,
        user_token: str,
        soc: Optional[float] = None,
        is_charging: Optional[bool] = None,
        power: Optional[float] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        speed: Optional[float] = None,
        odometer: Optional[float] = None,
        ext_temp: Optional[float] = None,
    ) -> dict:
        """
        Send telemetry data to ABRP.

        The ABRP API expects data as a JSON object in the 'tlm' query parameter.

        Args:
            user_token: User's ABRP vehicle token (from ABRP app settings)
            soc: State of charge percentage (0-100)
            is_charging: Whether the vehicle is currently charging
            power: Charging/discharging power in kW (negative = charging)
            lat: Latitude coordinate
            lon: Longitude coordinate
            speed: Speed in km/h
            odometer: Odometer reading in km
            ext_temp: External temperature in Celsius

        Returns:
            dict with success status and message
        """
        if not user_token:
            return {"success": False, "message": "ABRP token not provided"}

        if not self.api_key:
            return {"success": False, "message": "ABRP API key not configured on server"}

        # Build telemetry object - utc timestamp is required
        tlm_data = {
            "utc": int(time.time()),
        }

        if soc is not None:
            tlm_data["soc"] = soc
        if is_charging is not None:
            tlm_data["is_charging"] = is_charging
        if power is not None:
            # ABRP expects negative power for charging
            tlm_data["power"] = -abs(power) if is_charging else power
        if lat is not None and lon is not None:
            tlm_data["lat"] = lat
            tlm_data["lon"] = lon
        if speed is not None:
            tlm_data["speed"] = speed
        if odometer is not None:
            tlm_data["odometer"] = odometer
        if ext_temp is not None:
            tlm_data["ext_temp"] = ext_temp

        try:
            params = {
                "api_key": self.api_key,
                "token": user_token,
                "tlm": json.dumps(tlm_data),
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    ABRP_TELEMETRY_URL,
                    params=params,
                    timeout=10.0,
                )

            # ABRP API may return plain text or non-standard JSON
            # Handle both cases gracefully
            response_text = response.text.strip()
            logger.info(f"🗺️ ABRP raw response (status={response.status_code}): {response_text[:200]}")

            # Try to parse as JSON first
            try:
                result = json.loads(response_text)
                status = result.get("status", "").lower()
            except json.JSONDecodeError as e:
                logger.warning(f"🗺️ ABRP response not JSON: {e}")
                # API might return plain text response
                status = response_text.lower()
                result = {"status": status}

            if response.status_code == 200 and status == "ok":
                logger.info(f"✅ ABRP telemetry sent: soc={soc}, is_charging={is_charging}")
                return {"success": True, "message": "Telemetry sent successfully"}
            else:
                error_msg = result.get("message") or result.get("status") or response_text or "Unknown error"
                logger.warning(f"❌ ABRP API error: {error_msg}")
                return {"success": False, "message": f"ABRP error: {error_msg}"}

        except httpx.TimeoutException:
            logger.error("❌ ABRP request timed out")
            return {"success": False, "message": "Request timed out"}
        except Exception as e:
            logger.error(f"❌ ABRP error: {e}")
            return {"success": False, "message": f"Failed to send telemetry: {str(e)}"}

    async def validate_token(self, user_token: str) -> dict:
        """
        Validate an ABRP token by sending a minimal telemetry request.
        A valid token will return status "ok", invalid will return an error.

        Args:
            user_token: The ABRP token to validate

        Returns:
            dict with valid status and message
        """
        if not user_token or len(user_token) < 10:
            return {"valid": False, "message": "Token appears too short"}

        # Send a minimal telemetry packet to validate the token
        # We use soc=50 as a neutral dummy value
        result = await self.send_telemetry(
            user_token=user_token,
            soc=50,
        )

        if result.get("success"):
            return {"valid": True, "message": "Token is valid"}
        else:
            return {"valid": False, "message": result.get("message", "Invalid token")}


# Global singleton
_abrp_service: Optional[ABRPService] = None


def get_abrp_service() -> ABRPService:
    """Get ABRP service singleton"""
    global _abrp_service
    if _abrp_service is None:
        _abrp_service = ABRPService()
    return _abrp_service

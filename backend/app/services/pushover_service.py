"""
Pushover Notification Service - Handles push notifications via Pushover API
"""
import logging
from typing import Optional
import httpx

from ..config import PUSHOVER_API_TOKEN

logger = logging.getLogger(__name__)

PUSHOVER_API_URL = "https://api.pushover.net/1/messages.json"


class PushoverService:
    """Service for sending push notifications via Pushover"""

    def __init__(self):
        self.api_token = PUSHOVER_API_TOKEN
        self.enabled = bool(self.api_token)
        if self.enabled:
            logger.info("📱 Pushover service initialized")
        else:
            logger.info("📱 Pushover API token not configured - notifications disabled")

    async def send_notification(
        self,
        user_key: str,
        message: str,
        title: Optional[str] = None,
        priority: int = 0,
        sound: Optional[str] = None,
        url: Optional[str] = None,
        url_title: Optional[str] = None,
        html: bool = False,
    ) -> dict:
        """
        Send a push notification via Pushover.

        Args:
            user_key: Recipient's Pushover user key (30 characters)
            message: Notification body (max 1024 chars)
            title: Optional message title (max 250 chars, defaults to app name)
            priority: -2 (silent) to 2 (emergency), default 0 (normal)
            sound: Notification sound (pushover, bike, bugle, etc.)
            url: Optional supplementary URL
            url_title: Label for the URL
            html: Enable HTML formatting in message

        Returns:
            dict with success status and details
        """
        if not self.enabled:
            return {
                "success": False,
                "message": "Pushover service is not configured"
            }

        if not user_key:
            return {
                "success": False,
                "message": "User Pushover key not provided"
            }

        try:
            payload = {
                "token": self.api_token,
                "user": user_key,
                "message": message[:1024],  # Max 1024 chars
            }

            if title:
                payload["title"] = title[:250]  # Max 250 chars
            if priority != 0:
                payload["priority"] = priority
            if sound:
                payload["sound"] = sound
            if url:
                payload["url"] = url[:512]  # Max 512 chars
            if url_title:
                payload["url_title"] = url_title[:100]  # Max 100 chars
            if html:
                payload["html"] = 1

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    PUSHOVER_API_URL,
                    data=payload,
                    timeout=10.0
                )

            result = response.json()

            if response.status_code == 200 and result.get("status") == 1:
                logger.info(f"✅ Pushover notification sent: {result.get('request')}")
                return {
                    "success": True,
                    "message": "Notification sent successfully",
                    "request_id": result.get("request")
                }
            else:
                errors = result.get("errors", ["Unknown error"])
                logger.warning(f"❌ Pushover API error: {errors}")
                return {
                    "success": False,
                    "message": f"Pushover error: {', '.join(errors)}"
                }

        except httpx.TimeoutException:
            logger.error("❌ Pushover request timed out")
            return {
                "success": False,
                "message": "Request timed out"
            }
        except Exception as e:
            logger.error(f"❌ Pushover error: {e}")
            return {
                "success": False,
                "message": f"Failed to send notification: {str(e)}"
            }

    async def validate_user_key(self, user_key: str) -> dict:
        """
        Validate a Pushover user key.

        Returns:
            dict with valid status and user devices if valid
        """
        if not self.enabled:
            return {
                "valid": False,
                "message": "Pushover service is not configured"
            }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.pushover.net/1/users/validate.json",
                    data={
                        "token": self.api_token,
                        "user": user_key
                    },
                    timeout=10.0
                )

            result = response.json()

            if result.get("status") == 1:
                return {
                    "valid": True,
                    "devices": result.get("devices", []),
                    "message": "User key is valid"
                }
            else:
                return {
                    "valid": False,
                    "message": "Invalid user key"
                }

        except Exception as e:
            logger.error(f"❌ Pushover validation error: {e}")
            return {
                "valid": False,
                "message": f"Validation failed: {str(e)}"
            }


# Global instance
_pushover_service: Optional[PushoverService] = None


def get_pushover_service() -> PushoverService:
    """Get Pushover service singleton"""
    global _pushover_service
    if _pushover_service is None:
        _pushover_service = PushoverService()
    return _pushover_service

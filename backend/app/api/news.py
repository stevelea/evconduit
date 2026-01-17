# backend/app/api/news.py
"""Public and admin endpoints for site news/announcements."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth.supabase_auth import get_supabase_user
from app.storage import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/news", tags=["news"])

NEWS_SETTING_NAME = "site_news"


class NewsUpdate(BaseModel):
    content: str
    enabled: bool = True


class NewsResponse(BaseModel):
    content: str
    enabled: bool
    updated_at: Optional[str] = None


def require_admin(user=Depends(get_supabase_user)):
    logger.info("🔍 News Admin check - checking role")
    role = user.get("user_metadata", {}).get("role")
    logger.info(f"🔐 Extracted role: {role}")
    if role != "admin":
        logger.warning(f"⛔ Access denied: role '{role}' tried to access news admin")
        raise HTTPException(status_code=403, detail="Admin access required")
    logger.info("✅ Admin access granted for news")
    return user


@router.get("", response_model=Optional[NewsResponse])
async def get_news():
    """Public endpoint to get the current site news/announcement."""
    setting = await settings.get_setting_by_name(NEWS_SETTING_NAME)
    if not setting:
        return None

    # Parse the stored value (stored as JSON string or dict)
    value = setting.get("value", {})
    if isinstance(value, str):
        import json
        try:
            value = json.loads(value)
        except:
            value = {"content": value, "enabled": True}

    if not value.get("enabled", True):
        return None

    return NewsResponse(
        content=value.get("content", ""),
        enabled=value.get("enabled", True),
        updated_at=setting.get("updated_at")
    )


@router.get("/admin", response_model=Optional[NewsResponse])
async def get_news_admin(user=Depends(require_admin)):
    """Admin endpoint to get news including disabled state."""
    logger.info("[NEWS] Fetching news for admin")
    setting = await settings.get_setting_by_name(NEWS_SETTING_NAME)
    logger.info(f"[NEWS] Setting from DB: {setting}")
    if not setting:
        logger.info("[NEWS] No setting found, returning empty")
        return NewsResponse(content="", enabled=False)

    value = setting.get("value", {})
    if isinstance(value, str):
        import json
        try:
            value = json.loads(value)
        except:
            value = {"content": value, "enabled": True}

    logger.info(f"[NEWS] Parsed value: {value}")
    return NewsResponse(
        content=value.get("content", ""),
        enabled=value.get("enabled", True),
        updated_at=setting.get("updated_at")
    )


@router.put("/admin")
async def update_news(news: NewsUpdate, user=Depends(require_admin)):
    """Admin endpoint to update the site news/announcement."""
    import json

    # Check if setting exists
    existing = await settings.get_setting_by_name(NEWS_SETTING_NAME)
    logger.info(f"[NEWS] Existing setting: {existing}")

    value_dict = {"content": news.content, "enabled": news.enabled}
    value = json.dumps(value_dict)
    logger.info(f"[NEWS] Value to save: {value}")

    if existing:
        # Update existing setting
        logger.info(f"[NEWS] Updating existing setting id={existing['id']}")
        result = await settings.update_setting(existing["id"], {"value": value})
        logger.info(f"[NEWS] Update result: {result}")
    else:
        # Create new setting - must match the table schema (includes label and type)
        setting_data = {
            "name": NEWS_SETTING_NAME,
            "group_name": "announcements",
            "label": "Site News",
            "description": "Site news/announcement displayed on the landing page",
            "type": "json",
            "value": value
        }
        logger.info(f"[NEWS] Creating new setting: {setting_data}")
        result = await settings.add_setting(setting_data)
        logger.info(f"[NEWS] Insert result: {result}")

    logger.info(f"[NEWS] Updated site news: enabled={news.enabled}")
    return {"success": True, "content": news.content, "enabled": news.enabled}

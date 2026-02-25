import logging
import re
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from app.auth.supabase_auth import get_supabase_user
from app.storage.xcombo import list_all_xcombo_scenes, update_xcombo_scene_status, update_xcombo_scene, delete_xcombo_scene

logger = logging.getLogger(__name__)

router = APIRouter()


def require_admin(user=Depends(get_supabase_user)):
    role = user.get("user_metadata", {}).get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/xcombo/scenes")
async def list_scenes(user=Depends(require_admin)):
    """List all XCombo scenes (all statuses) for admin review."""
    return list_all_xcombo_scenes()


@router.patch("/admin/xcombo/scenes/{scene_id}/status")
async def update_scene_status(scene_id: str, request: Request, user=Depends(require_admin)):
    """Update the status of an XCombo scene (approve/reject)."""
    data = await request.json()
    status = data.get("status")

    if status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status")

    result = update_xcombo_scene_status(scene_id, status)
    if not result:
        raise HTTPException(status_code=404, detail="Scene not found")

    logger.info(f"XCombo scene {scene_id} updated to {status} by admin {user.get('sub')}")
    return result


@router.patch("/admin/xcombo/scenes/{scene_id}")
async def update_scene(scene_id: str, request: Request, user=Depends(require_admin)):
    """Update editable fields of an XCombo scene."""
    data = await request.json()
    result = update_xcombo_scene(scene_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Scene not found")
    logger.info(f"XCombo scene {scene_id} updated by admin {user.get('sub')}: {list(data.keys())}")
    return result


XPENG_API = "https://private-eur.xpeng.com/personal-tailor/v4/scene/sharedDetailPoster"


def _extract_triggers(cond: dict) -> list[str]:
    triggers = []
    if cond.get("left"):
        category = cond.get("name", "")
        specific = cond["left"].get("name") or (cond["left"].get("resource") or {}).get("name", "")
        right_val = (cond.get("right") or {}).get("name", "")
        label = f"{category}: {specific}" if category and specific and category != specific else (specific or category)
        if right_val:
            label += f" \u2192 {right_val}"
        if label:
            triggers.append(label)
    for c in cond.get("conditions", []):
        triggers.extend(_extract_triggers(c))
    return list(dict.fromkeys(triggers))


def _extract_actions(action: dict) -> list[str]:
    actions = []
    if action.get("actionType") == "atom":
        display = action.get("argumentsDisplay", "")
        exec_name = (action.get("execution") or {}).get("name", "")
        parent = action.get("name", "")
        label = parent
        if exec_name and exec_name != parent:
            label += f": {exec_name}"
        if display:
            label += f" \u2192 {display}"
        actions.append(label)
    for a in action.get("actions", []):
        actions.extend(_extract_actions(a))
    return actions


def _build_description(data: dict) -> str:
    triggers = _extract_triggers(data.get("condition", {}))
    actions = _extract_actions(data.get("action", {}))
    if not triggers and not actions:
        return ""

    action_summaries = []
    for a in actions:
        parts = a.split(":")
        parent = parts[0].strip().lower()
        rest = ":".join(parts[1:]).strip()
        display = rest.split("\u2192")[1].strip().lower() if "\u2192" in rest else rest.lower()
        s = ""
        if "window switch" in parent or "window lock" in parent:
            s = "close windows" if "close" in display or "lock" in display else "open windows" if "open" in display else "adjust windows"
        elif "door lock" in parent or parent == "all door locks":
            s = "unlock doors" if "unlock" in display else "lock doors"
        elif "child lock" in parent:
            s = "enable child locks"
        elif "mirror" in parent:
            s = "fold mirrors" if "fold" in display else "adjust mirrors"
        elif "circulation" in parent or "hvac" in parent:
            s = "set air circulation"
        elif "sentry" in parent or "guard" in parent:
            s = "disable sentry mode" if "off" in display else "enable sentry mode"
        elif "volume" in parent:
            s = f"set volume to {display}".replace("media volume ", "level ")
        elif "announcement" in parent:
            s = "play announcement"
        elif "light" in parent or "lamp" in parent:
            s = "adjust lights"
        elif "climate" in parent or "temperature" in parent or "seat" in parent:
            s = "adjust climate"
        else:
            s = parent
        if s and s not in action_summaries:
            action_summaries.append(s)

    trigger_parts = []
    for t in triggers[:3]:
        trigger_parts.append(t.split(":")[0].strip().lower() if ":" in t else t.lower())
    trigger_parts = list(dict.fromkeys(trigger_parts))
    trigger_text = ", ".join(trigger_parts) + ("..." if len(triggers) > 3 else "")
    action_text = ", ".join(action_summaries)

    if "tapping the run button" in trigger_text.lower():
        return f"When triggered: {action_text}." if action_text else ""
    if not action_text:
        return f"Triggered by: {trigger_text}."
    return f"When {trigger_text}: {action_text}."


def _infer_category(data: dict) -> str:
    tps = []
    def collect_action_tps(action):
        if action.get("actionType") == "atom":
            tp = (action.get("execution") or {}).get("tecPoint", "")
            if tp:
                tps.append(tp.lower())
        for a in action.get("actions", []):
            collect_action_tps(a)
    def collect_trigger_tps(cond):
        tp = ((cond.get("left") or {}).get("resource") or {}).get("tecPoint", "")
        if tp:
            tps.append(tp.lower())
        for c in cond.get("conditions", []):
            collect_trigger_tps(c)
    collect_action_tps(data.get("action", {}))
    collect_trigger_tps(data.get("condition", {}))
    all_tps = " ".join(tps)
    if re.search(r"guard|sentry|carguard", all_tps): return "Security"
    if re.search(r"window|door|lock|mirror|child.*safe|rear.*view", all_tps): return "Convenience"
    if re.search(r"hvac|circulation|climate|temperature|seat.*heat|defog", all_tps): return "Climate"
    if re.search(r"light|lamp|ambient|headlight", all_tps): return "Lighting"
    if re.search(r"volume|media|sound|voice|announcement", all_tps): return "Media"
    if re.search(r"charge|battery", all_tps): return "Charging"
    if re.search(r"pilot|driving|cruise|park|speed|lane", all_tps): return "Driving"
    return ""


@router.post("/admin/xcombo/refresh")
async def refresh_all_scenes(user=Depends(require_admin)):
    """Re-fetch all scenes from XPeng API and update codes, descriptions, categories."""
    scenes = list_all_xcombo_scenes()
    updated = 0
    errors = 0

    async with httpx.AsyncClient(timeout=10) as client:
        for scene in scenes:
            try:
                res = await client.get(XPENG_API, params={"sceneId": scene["scene_id"]})
                if res.status_code != 200:
                    errors += 1
                    continue
                xpeng = res.json()
                if xpeng.get("code") != 200 or not xpeng.get("data"):
                    errors += 1
                    continue

                d = xpeng["data"]
                fields = {}

                # Update code
                code = d.get("sceneCode", "")
                if code and len(code.replace(" ", "")) == 8:
                    digits = code.replace(" ", "")
                    code = f"{digits[:4]} {digits[4:]}"
                if code and code != scene.get("xcombo_code"):
                    fields["xcombo_code"] = code

                # Update description
                desc = _build_description(xpeng["data"])
                if desc and desc != scene.get("description"):
                    fields["description"] = desc

                # Update category
                cat = _infer_category(xpeng["data"])
                if cat and cat != scene.get("category"):
                    fields["category"] = cat

                if fields:
                    update_xcombo_scene(scene["id"], fields)
                    updated += 1
            except Exception as e:
                logger.warning(f"Failed to refresh scene {scene['scene_id']}: {e}")
                errors += 1

    logger.info(f"XCombo refresh: {updated} updated, {errors} errors out of {len(scenes)}")
    return {"total": len(scenes), "updated": updated, "errors": errors}


@router.delete("/admin/xcombo/scenes/{scene_id}")
async def delete_scene(scene_id: str, user=Depends(require_admin)):
    """Delete an XCombo scene."""
    delete_xcombo_scene(scene_id)
    logger.info(f"XCombo scene {scene_id} deleted by admin {user.get('sub')}")
    return {"message": "Scene deleted"}

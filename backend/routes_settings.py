from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from db import db, now_iso
from auth import require_roles

router = APIRouter(prefix="/api", tags=["settings"])

SETTINGS_ID = "school"
DEFAULTS = {
    "id": SETTINGS_ID,
    "school_name": "MI Miftahul Jannah",
    "school_subtitle": "Madrasah Ibtidaiyah",
    "address": "",
    "headmaster": "",
    "headmaster_nip": "",
    "academic_year": "2025/2026",
    "semester": "2",
    "logo": None,
    "whatsapp_api_url": "",
    "whatsapp_api_key": "",
}


class SettingsInput(BaseModel):
    school_name: Optional[str] = None
    school_subtitle: Optional[str] = None
    address: Optional[str] = None
    headmaster: Optional[str] = None
    headmaster_nip: Optional[str] = None
    academic_year: Optional[str] = None
    semester: Optional[str] = None
    logo: Optional[str] = None
    whatsapp_api_url: Optional[str] = None
    whatsapp_api_key: Optional[str] = None


async def _get_settings():
    doc = await db.settings.find_one({"id": SETTINGS_ID}, {"_id": 0})
    if not doc:
        await db.settings.insert_one({**DEFAULTS, "created_at": now_iso()})
        return {**DEFAULTS}
    return {**DEFAULTS, **doc}


@router.get("/settings/public")
async def public_settings():
    s = await _get_settings()
    return {
        "school_name": s["school_name"], "school_subtitle": s["school_subtitle"],
        "logo": s["logo"], "academic_year": s["academic_year"], "semester": s["semester"],
        "address": s["address"], "headmaster": s["headmaster"], "headmaster_nip": s["headmaster_nip"],
        "whatsapp_configured": bool(s["whatsapp_api_url"]),
    }


@router.get("/settings")
async def get_settings(user: dict = Depends(require_roles("admin"))):
    return await _get_settings()


@router.put("/settings")
async def update_settings(input: SettingsInput, user: dict = Depends(require_roles("admin"))):
    update = {k: v for k, v in input.model_dump().items() if v is not None}
    update["updated_at"] = now_iso()
    await db.settings.update_one({"id": SETTINGS_ID}, {"$set": update}, upsert=True)
    return await _get_settings()

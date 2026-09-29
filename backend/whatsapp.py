import asyncio
import logging
import httpx
from db import db, now_iso, new_id

log = logging.getLogger(__name__)
FONNTE_URL = "https://api.fonnte.com/send"


def normalize_id_phone(value: str) -> str:
    s = "".join(ch for ch in str(value or "").strip() if ch.isdigit() or ch == "+")
    if s.startswith("+"):
        s = s[1:]
    if s.startswith("08"):
        s = "62" + s[1:]
    elif s.startswith("8"):
        s = "62" + s
    elif not s.startswith("62"):
        raise ValueError("Nomor harus diawali 08, 8, 62, atau +62")
    if not (s.startswith("628") and 10 <= len(s) <= 15):
        raise ValueError("Nomor HP Indonesia tidak valid")
    return s


def mask_phone(value: str) -> str:
    d = "".join(c for c in str(value or "") if c.isdigit())
    if len(d) < 7:
        return "***"
    return d[:4] + "*" * (len(d) - 7) + d[-3:]


async def _settings():
    return await db.settings.find_one({"id": "school"}, {"_id": 0, "whatsapp_api_key": 1, "school_name": 1}) or {}


async def _token():
    tok = (await _settings()).get("whatsapp_api_key")
    return tok.strip() if isinstance(tok, str) and tok.strip() else None


async def _log(target, context, status, reason=""):
    try:
        await db.wa_log.insert_one({
            "id": new_id(), "target": mask_phone(target), "context": context or "",
            "status": status, "reason": str(reason)[:200], "at": now_iso(),
        })
    except Exception:
        pass


async def send_whatsapp(target: str, message: str, context: str = "") -> dict:
    try:
        phone = normalize_id_phone(target)
    except ValueError as exc:
        await _log(target, context, "skipped", str(exc))
        return {"ok": False, "skipped": True, "reason": str(exc)}
    token = await _token()
    if not token:
        await _log(target, context, "skipped", "whatsapp_not_configured")
        return {"ok": False, "skipped": True, "reason": "whatsapp_not_configured"}
    form = {"target": (None, phone), "message": (None, message)}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(FONNTE_URL, headers={"Authorization": token}, files=form)
        try:
            payload = resp.json()
        except ValueError:
            payload = {"raw": resp.text}
        ok = resp.is_success and payload.get("status") is True
        if ok:
            await _log(target, context, "ok")
        else:
            await _log(target, context, "failed", payload.get("reason") or payload)
            log.error("Fonnte gagal: http=%s payload=%s", resp.status_code, payload)
        return {"ok": ok, "http_status": resp.status_code, "response": payload}
    except httpx.HTTPError as exc:
        await _log(target, context, "failed", "transport_error")
        log.exception("Fonnte transport error")
        return {"ok": False, "reason": "transport_error", "error": str(exc)}


async def send_bulk(items: list, concurrency: int = 5) -> list:
    sem = asyncio.Semaphore(concurrency)

    async def one(item):
        async with sem:
            r = await send_whatsapp(item["target"], item["message"], item.get("context", ""))
            return {"target": item["target"], **r}

    return await asyncio.gather(*(one(i) for i in items))


async def notify_attendance(parent_phone: str, student_name: str, class_name: str, type_label: str, time: str, date: str):
    if not parent_phone:
        return
    school = (await _settings()).get("school_name", "MI Miftahul Jannah")
    msg = (
        f"Assalamu'alaikum wr. wb.\n\n"
        f"Ananda *{student_name}* (Kelas {class_name}) telah tercatat *{type_label}* "
        f"pada pukul {time}, tanggal {date}.\n\n"
        f"Terima kasih.\n_{school}_"
    )
    await send_whatsapp(parent_phone, msg, context=f"Presensi {student_name}")

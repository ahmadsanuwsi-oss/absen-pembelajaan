from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from db import db
from auth import require_roles
from whatsapp import send_whatsapp, send_bulk
from routes_cron import _verify

router = APIRouter(prefix="/api", tags=["whatsapp"])
TYPE_LABELS = {"kehadiran": "Kehadiran Harian", "dhuha": "Sholat Dhuha", "ekstra": "Ekstrakurikuler"}


def wib_now():
    return datetime.now(timezone.utc) + timedelta(hours=7)


class TestInput(BaseModel):
    target: str
    message: str = "Tes notifikasi WhatsApp dari SIM MI Miftahul Jannah. Jika Anda menerima ini, integrasi berhasil."


async def build_recap_items(month: str, class_id: str = "", type: str = "kehadiran"):
    sq = {}
    if class_id:
        sq["class_id"] = class_id
    students = await db.students.find(sq, {"_id": 0}).to_list(1000)
    classes = {c["id"]: c for c in await db.classes.find({}, {"_id": 0}).to_list(200)}
    teachers = {t["id"]: t for t in await db.teachers.find({}, {"_id": 0}).to_list(200)}
    label = TYPE_LABELS.get(type, type)
    items = []
    for s in students:
        if not s.get("parent_phone"):
            continue
        records = await db.attendance.find({"student_id": s["id"], "type": type, "date": {"$regex": f"^{month}"}}, {"_id": 0}).to_list(100)
        c = {"hadir": 0, "terlambat": 0, "izin": 0, "sakit": 0, "alpa": 0}
        for r in records:
            c[r.get("status", "hadir")] = c.get(r.get("status", "hadir"), 0) + 1
        cname = classes.get(s.get("class_id"), {}).get("name", "-")
        msg = (
            f"Assalamu'alaikum wr. wb.\n\n"
            f"Rekap {label} bulan {month} untuk ananda *{s['name']}* (Kelas {cname}):\n"
            f"- Hadir: {c['hadir']}\n- Terlambat: {c['terlambat']}\n- Izin: {c['izin']}\n- Sakit: {c['sakit']}\n- Alpa: {c['alpa']}\n\n"
            f"Terima kasih atas perhatian Bapak/Ibu."
        )
        items.append({"target": s["parent_phone"], "message": msg, "context": f"Rekap {s['name']}"})

    wali_ids = set()
    if class_id and class_id in classes and classes[class_id].get("wali_kelas_id"):
        wali_ids.add(classes[class_id]["wali_kelas_id"])
    elif not class_id:
        for c in classes.values():
            if c.get("wali_kelas_id"):
                wali_ids.add(c["wali_kelas_id"])
    for tid in wali_ids:
        t = teachers.get(tid)
        if t and t.get("phone"):
            cls = next((c for c in classes.values() if c.get("wali_kelas_id") == tid), None)
            cname = cls["name"] if cls else "-"
            items.append({"target": t["phone"], "message": f"Yth. Wali Kelas {cname} ({t['name']}),\nRekap {label} bulan {month} telah dikirim ke orang tua siswa kelas {cname}.", "context": f"Wali Kelas {cname}"})
    return items


@router.post("/whatsapp/test")
async def whatsapp_test(input: TestInput, user: dict = Depends(require_roles("admin"))):
    result = await send_whatsapp(input.target, input.message, context="Tes Manual")
    if result.get("skipped") and result.get("reason") == "whatsapp_not_configured":
        raise HTTPException(400, "Token Fonnte belum diisi di Pengaturan")
    if not result.get("ok"):
        raise HTTPException(400, f"Gagal kirim: {result.get('reason') or result.get('response')}")
    return {"ok": True, "message": "Pesan tes terkirim"}


@router.post("/whatsapp/recap-blast")
async def recap_blast(background_tasks: BackgroundTasks, class_id: str = "", month: str = "", type: str = "kehadiran", user: dict = Depends(require_roles("admin", "guru"))):
    month = month or wib_now().strftime("%Y-%m")
    items = await build_recap_items(month, class_id, type)
    if not items:
        raise HTTPException(400, "Tidak ada nomor tujuan (No. HP orang tua/guru kosong)")
    background_tasks.add_task(send_bulk, items, 5)
    return {"accepted": True, "count": len(items), "month": month}


async def _run_monthly_recap(month: str):
    items = await build_recap_items(month, "", "kehadiran")
    if items:
        await send_bulk(items, 5)


@router.post("/cron/monthly-wa-recap")
async def cron_monthly_recap(request: Request, background_tasks: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _verify(request)
    first = wib_now().replace(day=1)
    prev_month = (first - timedelta(days=1)).strftime("%Y-%m")
    background_tasks.add_task(_run_monthly_recap, prev_month)
    return {"status": "accepted", "month": prev_month}


@router.get("/wa-log")
async def wa_log(search: str = "", status: str = "", limit: int = 100, user: dict = Depends(require_roles("admin"))):
    q = {}
    if status:
        q["status"] = status
    if search:
        q["$or"] = [{"context": {"$regex": search, "$options": "i"}}, {"target": {"$regex": search, "$options": "i"}}]
    logs = await db.wa_log.find(q, {"_id": 0}).sort("at", -1).to_list(min(max(limit, 1), 500))
    return {"logs": logs}

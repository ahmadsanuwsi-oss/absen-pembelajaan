from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from db import db, now_iso, new_id, paginate
from auth import require_roles
from whatsapp import notify_attendance

router = APIRouter(prefix="/api", tags=["attendance"])

JAKARTA_OFFSET = timedelta(hours=7)
ATTENDANCE_TYPES = ["datang", "pulang", "dhuha", "dzuhur", "pramuka", "tartil", "ekstra_tahfidz"]
TYPE_LABELS = {
    "datang": "Kehadiran (Datang)", "pulang": "Kehadiran (Pulang)",
    "dhuha": "Sholat Dhuha", "dzuhur": "Sholat Dzuhur",
    "pramuka": "Ekstra Pramuka", "tartil": "Ekstra Tartil", "ekstra_tahfidz": "Ekstra Tahfidz",
}


def local_now():
    return datetime.now(timezone.utc) + JAKARTA_OFFSET


def today_str():
    return local_now().strftime("%Y-%m-%d")


class KioskScanInput(BaseModel):
    code: str  # NISN or RFID uid
    type: str = "datang"


class ManualAttendanceInput(BaseModel):
    student_id: str
    type: str = "datang"
    status: str = "hadir"  # hadir | terlambat | izin | sakit | alpa
    date: Optional[str] = None


@router.post("/kiosk/scan")
async def kiosk_scan(input: KioskScanInput, background_tasks: BackgroundTasks):
    if input.type not in ATTENDANCE_TYPES:
        raise HTTPException(400, "Jenis absensi tidak valid")
    code = input.code.strip()
    student = await db.students.find_one({"$or": [{"nisn": code}, {"rfid_uid": code}]}, {"_id": 0})
    if not student:
        return {"status": "not_found", "message": "NISN / Kartu Tidak Ditemukan! Silakan hubungi TU."}
    date = today_str()
    existing = await db.attendance.find_one({"student_id": student["id"], "type": input.type, "date": date})
    class_name = "-"
    if student.get("class_id"):
        c = await db.classes.find_one({"id": student["class_id"]}, {"_id": 0, "name": 1})
        class_name = c["name"] if c else "-"
    if existing:
        return {
            "status": "already_scanned", "message": "Sudah Absen Hari Ini",
            "student": {"name": student["name"], "nisn": student["nisn"], "class_name": class_name, "photo_url": student.get("photo_url")},
            "time": existing.get("time"),
        }
    now = local_now()
    time_str = now.strftime("%H:%M:%S")
    # Kehadiran late after 07:00 local
    status = "hadir"
    if input.type == "datang" and (now.hour > 7 or (now.hour == 7 and now.minute > 0)):
        status = "terlambat"
    doc = {
        "id": new_id(), "student_id": student["id"], "type": input.type, "date": date,
        "time": time_str, "status": status, "source": "kiosk", "created_at": now_iso(),
    }
    await db.attendance.insert_one(doc)
    background_tasks.add_task(
        notify_attendance, student.get("parent_phone"), student["name"], class_name,
        TYPE_LABELS.get(input.type, input.type), time_str, date,
    )
    return {
        "status": "success",
        "message": "Tepat Waktu" if status == "hadir" else "Terlambat",
        "student": {"name": student["name"], "nisn": student["nisn"], "class_name": class_name, "photo_url": student.get("photo_url")},
        "time": time_str, "attendance_status": status,
    }


@router.get("/kiosk/classes")
async def kiosk_classes():
    classes = await db.classes.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    teachers = {t["id"]: t for t in await db.teachers.find({}, {"_id": 0}).to_list(200)}
    out = []
    for c in classes:
        t = teachers.get(c.get("wali_kelas_id"))
        out.append({"id": c["id"], "name": c["name"], "wali_name": t["name"] if t else None, "wali_phone": (t.get("phone") if t else None)})
    return out


@router.post("/attendance/manual")
async def manual_attendance(input: ManualAttendanceInput, user: dict = Depends(require_roles("admin", "guru"))):
    if input.status not in ("hadir", "terlambat", "izin", "sakit", "alpa"):
        raise HTTPException(400, "Status absensi tidak valid")
    if input.type not in ATTENDANCE_TYPES:
        raise HTTPException(400, "Jenis absensi tidak valid")
    date = input.date or today_str()
    existing = await db.attendance.find_one({"student_id": input.student_id, "type": input.type, "date": date})
    payload = {"status": input.status, "time": local_now().strftime("%H:%M:%S"), "source": "manual", "type": input.type, "date": date}
    if existing:
        await db.attendance.update_one({"id": existing["id"]}, {"$set": payload})
        return {"message": "Absensi diperbarui"}
    doc = {"id": new_id(), "student_id": input.student_id, **payload, "created_at": now_iso()}
    await db.attendance.insert_one(doc)
    return {"message": "Absensi dicatat"}


@router.get("/attendance")
async def list_attendance(date: str = "", type: str = "", class_id: str = "", page: int = 1, limit: int = 20, user: dict = Depends(require_roles("admin", "guru"))):
    q = {}
    if date:
        q["date"] = date
    if type:
        q["type"] = type
    student_map = {}
    if class_id:
        sids = [s["id"] for s in await db.students.find({"class_id": class_id}, {"_id": 0, "id": 1}).to_list(500)]
        q["student_id"] = {"$in": sids}
    result = await paginate(db.attendance, q, page, limit, "date", -1)
    ids = list({r["student_id"] for r in result["items"]})
    students = {s["id"]: s for s in await db.students.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)}
    classes = {c["id"]: c["name"] for c in await db.classes.find({}, {"_id": 0}).to_list(200)}
    for r in result["items"]:
        s = students.get(r["student_id"], {})
        r["student_name"] = s.get("name", "-")
        r["nisn"] = s.get("nisn", "-")
        r["class_name"] = classes.get(s.get("class_id"), "-")
        r["type_label"] = TYPE_LABELS.get(r["type"], r["type"])
    return result


@router.get("/attendance/recap")
async def attendance_recap(class_id: str = "", type: str = "datang", month: str = "", user: dict = Depends(require_roles("admin", "guru"))):
    month = month or local_now().strftime("%Y-%m")
    sq = {}
    if class_id:
        sq["class_id"] = class_id
    students = await db.students.find(sq, {"_id": 0}).sort("name", 1).to_list(500)
    recap = []
    for s in students:
        records = await db.attendance.find({"student_id": s["id"], "type": type, "date": {"$regex": f"^{month}"}}, {"_id": 0}).to_list(100)
        counts = {"hadir": 0, "terlambat": 0, "izin": 0, "sakit": 0, "alpa": 0}
        for r in records:
            st = r.get("status", "hadir")
            counts[st] = counts.get(st, 0) + 1
        recap.append({"student_id": s["id"], "name": s["name"], "nisn": s["nisn"], **counts, "total": len(records)})
    return {"month": month, "type": type, "recap": recap}

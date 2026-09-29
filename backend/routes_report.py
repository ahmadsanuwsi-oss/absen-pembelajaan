from fastapi import APIRouter, HTTPException, Depends
from db import db
from auth import require_roles
from routes_savings import get_balance
from routes_settings import _get_settings


router = APIRouter(prefix="/api", tags=["report"])


def descriptor(final: float) -> str:
    if final >= 90:
        return "Sangat Baik"
    if final >= 80:
        return "Baik"
    if final >= 70:
        return "Cukup"
    return "Perlu Bimbingan"


async def _build_rapor(student, settings, subjects_map, month=""):
    student_id = student["id"]
    klass = await db.classes.find_one({"id": student.get("class_id")}, {"_id": 0}) if student.get("class_id") else None
    wali_name = None
    if klass and klass.get("wali_kelas_id"):
        t = await db.teachers.find_one({"id": klass["wali_kelas_id"]}, {"_id": 0, "name": 1})
        wali_name = t["name"] if t else None

    assessments = await db.assessments.find({"student_id": student_id}, {"_id": 0}).to_list(2000)
    by_subject = {}
    for a in assessments:
        by_subject.setdefault(a["subject_id"], []).append(a)
    grades = []
    for sid, name in subjects_map.items():
        sa = by_subject.get(sid)
        if not sa:
            continue
        form = [a["score"] for a in sa if a["kind"] == "formatif"]
        summ = [a["score"] for a in sa if a["kind"] == "sumatif"]
        avg_f = round(sum(form) / len(form), 1) if form else 0
        avg_s = round(sum(summ) / len(summ), 1) if summ else 0
        final = round(avg_f * 0.4 + avg_s * 0.6, 1) if (form or summ) else 0
        grades.append({"subject": name, "formatif": avg_f, "sumatif": avg_s, "final": final, "descriptor": descriptor(final)})
    avg_all = round(sum(g["final"] for g in grades) / len(grades), 1) if grades else 0

    aq = {"student_id": student_id, "type": "datang"}
    if month:
        aq["date"] = {"$regex": f"^{month}"}
    att = await db.attendance.find(aq, {"_id": 0}).to_list(500)
    counts = {"hadir": 0, "terlambat": 0, "izin": 0, "sakit": 0, "alpa": 0}
    for a in att:
        counts[a.get("status", "hadir")] = counts.get(a.get("status", "hadir"), 0) + 1

    tahfidz = await db.tahfidz.find({"student_id": student_id}, {"_id": 0}).sort("date", -1).to_list(200)

    return {
        "school": {
            "name": settings["school_name"], "subtitle": settings["school_subtitle"],
            "address": settings["address"], "headmaster": settings["headmaster"],
            "headmaster_nip": settings["headmaster_nip"], "academic_year": settings["academic_year"],
            "semester": settings["semester"], "logo": settings["logo"],
        },
        "student": {**student, "class_name": klass["name"] if klass else "-"},
        "wali_name": wali_name,
        "grades": grades,
        "average": avg_all,
        "attendance": counts,
        "tahfidz": tahfidz,
        "tahfidz_count": len(tahfidz),
        "balance": await get_balance(student_id),
    }


@router.get("/report/rapor/{student_id}")
async def rapor(student_id: str, month: str = "", user: dict = Depends(require_roles("admin", "guru", "siswa"))):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Siswa tidak ditemukan")
    settings = await _get_settings()
    subjects_map = {s["id"]: s["name"] for s in await db.subjects.find({}, {"_id": 0}).sort("name", 1).to_list(200)}
    data = await _build_rapor(student, settings, subjects_map, month)
    anecdotes = await db.anecdotes.find({"student_id": student_id}, {"_id": 0}).sort("date", -1).to_list(50)
    data["anecdotes"] = anecdotes
    return data


@router.get("/report/rapor-class/{class_id}")
async def rapor_class(class_id: str, month: str = "", user: dict = Depends(require_roles("admin", "guru"))):
    klass = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not klass:
        raise HTTPException(404, "Kelas tidak ditemukan")
    settings = await _get_settings()
    subjects_map = {s["id"]: s["name"] for s in await db.subjects.find({}, {"_id": 0}).sort("name", 1).to_list(200)}
    students = await db.students.find({"class_id": class_id}, {"_id": 0}).sort("name", 1).to_list(500)
    rapors = [await _build_rapor(s, settings, subjects_map, month) for s in students]
    return {"class_name": klass["name"], "count": len(rapors), "rapors": rapors}

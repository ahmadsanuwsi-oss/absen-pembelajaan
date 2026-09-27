from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from db import db
from auth import require_roles, get_current_user, accessible_class_ids
from routes_savings import get_balance

router = APIRouter(prefix="/api", tags=["dashboard"])


def today_str():
    return (datetime.now(timezone.utc) + timedelta(hours=7)).strftime("%Y-%m-%d")


@router.get("/dashboard/admin")
async def admin_dashboard(user: dict = Depends(require_roles("admin"))):
    date = today_str()
    total_students = await db.students.count_documents({})
    total_teachers = await db.teachers.count_documents({})
    total_classes = await db.classes.count_documents({})
    present_today = await db.attendance.count_documents({"type": "datang", "date": date, "status": {"$in": ["hadir", "terlambat"]}})
    late_today = await db.attendance.count_documents({"type": "datang", "date": date, "status": "terlambat"})
    # attendance last 7 days
    trend = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) + timedelta(hours=7) - timedelta(days=i)).strftime("%Y-%m-%d")
        cnt = await db.attendance.count_documents({"type": "datang", "date": d, "status": {"$in": ["hadir", "terlambat"]}})
        trend.append({"date": d[5:], "hadir": cnt})
    # per class distribution
    classes = await db.classes.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    class_dist = []
    for c in classes:
        class_dist.append({"name": c["name"], "count": await db.students.count_documents({"class_id": c["id"]})})
    agg = await db.savings.aggregate([
        {"$group": {"_id": "$kind", "sum": {"$sum": "$amount"}}}
    ]).to_list(10)
    sums = {a["_id"]: a["sum"] for a in agg}
    total_savings = sums.get("setoran", 0) - sums.get("penarikan", 0)
    return {
        "total_students": total_students, "total_teachers": total_teachers, "total_classes": total_classes,
        "present_today": present_today, "late_today": late_today, "absent_today": max(total_students - present_today, 0),
        "total_savings": total_savings, "trend": trend, "class_distribution": class_dist,
    }


@router.get("/dashboard/guru")
async def guru_dashboard(user: dict = Depends(require_roles("guru"))):
    date = today_str()
    teacher_id = user.get("teacher_id")
    wali_class = await db.classes.find_one({"wali_kelas_id": teacher_id}, {"_id": 0}) if teacher_id else None
    my_journals = await db.journals.count_documents({"teacher_id": teacher_id}) if teacher_id else 0
    acc = await accessible_class_ids(user)
    acc_list = list(acc) if acc else []
    sids = [s["id"] for s in await db.students.find({"class_id": {"$in": acc_list}}, {"_id": 0, "id": 1}).to_list(2000)] if acc_list else []
    class_students = len(sids)
    present = await db.attendance.count_documents({"student_id": {"$in": sids}, "type": "datang", "date": date, "status": {"$in": ["hadir", "terlambat"]}}) if sids else 0
    total_assessments = await db.assessments.count_documents({"student_id": {"$in": sids}}) if sids else 0
    total_tahfidz = await db.tahfidz.count_documents({"student_id": {"$in": sids}}) if sids else 0
    return {
        "wali_class": wali_class, "my_journals": my_journals,
        "class_students": class_students, "present_today": present,
        "total_assessments": total_assessments,
        "total_tahfidz": total_tahfidz,
    }


@router.get("/portal/me")
async def student_portal(user: dict = Depends(require_roles("siswa"))):
    sid = user.get("student_id")
    if not sid:
        raise HTTPException(400, "Akun tidak tertaut ke siswa")
    student = await db.students.find_one({"id": sid}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Data siswa tidak ditemukan")
    class_name = "-"
    if student.get("class_id"):
        c = await db.classes.find_one({"id": student["class_id"]}, {"_id": 0, "name": 1})
        class_name = c["name"] if c else "-"
    month = today_str()[:7]
    att = await db.attendance.find({"student_id": sid, "type": "datang", "date": {"$regex": f"^{month}"}}, {"_id": 0}).to_list(100)
    att_counts = {"hadir": 0, "terlambat": 0, "izin": 0, "sakit": 0, "alpa": 0}
    for a in att:
        att_counts[a.get("status", "hadir")] = att_counts.get(a.get("status", "hadir"), 0) + 1
    return {
        "student": {**student, "class_name": class_name},
        "attendance_month": att_counts,
        "balance": await get_balance(sid),
        "tahfidz_count": await db.tahfidz.count_documents({"student_id": sid}),
        "assessment_count": await db.assessments.count_documents({"student_id": sid}),
    }

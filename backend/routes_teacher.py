from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from db import db, now_iso, new_id, paginate
from auth import require_roles, require_duty

router = APIRouter(prefix="/api", tags=["teacher"])


# ---------------- Assessments / Nilai (Kurikulum Merdeka) ----------------
class AssessmentInput(BaseModel):
    student_id: str
    class_id: str
    subject_id: str
    kind: str  # formatif | sumatif
    title: str
    score: float
    date: Optional[str] = None
    description: Optional[str] = None


@router.get("/assessments")
async def list_assessments(class_id: str = "", subject_id: str = "", kind: str = "", student_id: str = "", user: dict = Depends(require_roles("admin", "guru", "siswa"))):
    q = {}
    for f, v in (("class_id", class_id), ("subject_id", subject_id), ("kind", kind), ("student_id", student_id)):
        if v:
            q[f] = v
    items = await db.assessments.find(q, {"_id": 0}).sort("date", -1).to_list(1000)
    students = {s["id"]: s["name"] for s in await db.students.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)}
    subjects = {s["id"]: s["name"] for s in await db.subjects.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(200)}
    for a in items:
        a["student_name"] = students.get(a["student_id"], "-")
        a["subject_name"] = subjects.get(a["subject_id"], "-")
    return items


@router.post("/assessments")
async def create_assessment(input: AssessmentInput, user: dict = Depends(require_roles("admin", "guru"))):
    doc = {"id": new_id(), **input.model_dump(), "date": input.date or now_iso()[:10], "created_at": now_iso()}
    await db.assessments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/assessments/{aid}")
async def update_assessment(aid: str, input: AssessmentInput, user: dict = Depends(require_roles("admin", "guru"))):
    res = await db.assessments.update_one({"id": aid}, {"$set": input.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Nilai tidak ditemukan")
    return await db.assessments.find_one({"id": aid}, {"_id": 0})


@router.delete("/assessments/{aid}")
async def delete_assessment(aid: str, user: dict = Depends(require_roles("admin", "guru"))):
    await db.assessments.delete_one({"id": aid})
    return {"message": "Nilai dihapus"}


@router.get("/ledger")
async def grade_ledger(class_id: str, subject_id: str = "", user: dict = Depends(require_roles("admin", "guru"))):
    students = await db.students.find({"class_id": class_id}, {"_id": 0}).sort("name", 1).to_list(500)
    q = {"class_id": class_id}
    if subject_id:
        q["subject_id"] = subject_id
    assessments = await db.assessments.find(q, {"_id": 0}).to_list(2000)
    rows = []
    for s in students:
        sa = [a for a in assessments if a["student_id"] == s["id"]]
        form = [a["score"] for a in sa if a["kind"] == "formatif"]
        summ = [a["score"] for a in sa if a["kind"] == "sumatif"]
        avg_f = round(sum(form) / len(form), 1) if form else 0
        avg_s = round(sum(summ) / len(summ), 1) if summ else 0
        final = round(avg_f * 0.4 + avg_s * 0.6, 1) if (form or summ) else 0
        desc = "Sangat Baik" if final >= 90 else "Baik" if final >= 80 else "Cukup" if final >= 70 else "Perlu Bimbingan"
        rows.append({"student_id": s["id"], "name": s["name"], "nisn": s["nisn"], "formatif": avg_f, "sumatif": avg_s, "final": final, "descriptor": desc})
    return {"class_id": class_id, "subject_id": subject_id, "rows": rows}


# ---------------- Journals (Jurnal Harian) ----------------
class JournalInput(BaseModel):
    class_id: str
    subject_id: Optional[str] = None
    date: str
    material: str
    method: Optional[str] = None
    notes: Optional[str] = None


@router.get("/journals")
async def list_journals(class_id: str = "", page: int = 1, limit: int = 20, user: dict = Depends(require_roles("admin", "guru"))):
    q = {}
    if class_id:
        q["class_id"] = class_id
    if user["role"] == "guru":
        q["teacher_id"] = user.get("teacher_id")
    result = await paginate(db.journals, q, page, limit, "date", -1)
    subjects = {s["id"]: s["name"] for s in await db.subjects.find({}, {"_id": 0}).to_list(200)}
    classes = {c["id"]: c["name"] for c in await db.classes.find({}, {"_id": 0}).to_list(200)}
    for j in result["items"]:
        j["subject_name"] = subjects.get(j.get("subject_id"), "-")
        j["class_name"] = classes.get(j.get("class_id"), "-")
    return result


@router.post("/journals")
async def create_journal(input: JournalInput, user: dict = Depends(require_roles("admin", "guru"))):
    doc = {"id": new_id(), **input.model_dump(), "teacher_id": user.get("teacher_id"), "created_at": now_iso()}
    await db.journals.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/journals/{jid}")
async def delete_journal(jid: str, user: dict = Depends(require_roles("admin", "guru"))):
    await db.journals.delete_one({"id": jid})
    return {"message": "Jurnal dihapus"}


# ---------------- Anecdotal notes (Catatan Anekdot) ----------------
class AnecdoteInput(BaseModel):
    student_id: str
    date: str
    note: str
    category: str = "sikap"


@router.get("/anecdotes")
async def list_anecdotes(student_id: str = "", user: dict = Depends(require_roles("admin", "guru", "siswa"))):
    q = {}
    if student_id:
        q["student_id"] = student_id
    items = await db.anecdotes.find(q, {"_id": 0}).sort("date", -1).to_list(500)
    students = {s["id"]: s["name"] for s in await db.students.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)}
    for a in items:
        a["student_name"] = students.get(a["student_id"], "-")
    return items


@router.post("/anecdotes")
async def create_anecdote(input: AnecdoteInput, user: dict = Depends(require_roles("admin", "guru"))):
    doc = {"id": new_id(), **input.model_dump(), "teacher_id": user.get("teacher_id"), "created_at": now_iso()}
    await db.anecdotes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/anecdotes/{aid}")
async def delete_anecdote(aid: str, user: dict = Depends(require_roles("admin", "guru"))):
    await db.anecdotes.delete_one({"id": aid})
    return {"message": "Catatan dihapus"}


# ---------------- Piket Guru ----------------
class PiketGuruInput(BaseModel):
    day: str
    teacher_id: str
    note: Optional[str] = None


@router.get("/piket-guru")
async def list_piket_guru(user: dict = Depends(require_roles("admin", "guru"))):
    items = await db.piket_guru.find({}, {"_id": 0}).to_list(200)
    teachers = {t["id"]: t["name"] for t in await db.teachers.find({}, {"_id": 0}).to_list(200)}
    for p in items:
        p["teacher_name"] = teachers.get(p["teacher_id"], "-")
    return items


@router.post("/piket-guru")
async def create_piket_guru(input: PiketGuruInput, user: dict = Depends(require_roles("admin", "guru"))):
    doc = {"id": new_id(), **input.model_dump(), "created_at": now_iso()}
    await db.piket_guru.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/piket-guru/{pid}")
async def delete_piket_guru(pid: str, user: dict = Depends(require_roles("admin", "guru"))):
    await db.piket_guru.delete_one({"id": pid})
    return {"message": "Piket dihapus"}


# ---------------- Tahfidz ----------------
class TahfidzInput(BaseModel):
    student_id: str
    surah: str
    ayat_from: int
    ayat_to: int
    status: str = "muraja'ah"  # ziyadah | muraja'ah | lancar | mutqin
    date: Optional[str] = None
    note: Optional[str] = None


@router.get("/tahfidz")
async def list_tahfidz(student_id: str = "", class_id: str = "", user: dict = Depends(require_roles("admin", "guru", "siswa"))):
    q = {}
    if student_id:
        q["student_id"] = student_id
    if class_id:
        sids = [s["id"] for s in await db.students.find({"class_id": class_id}, {"_id": 0, "id": 1}).to_list(500)]
        q["student_id"] = {"$in": sids}
    items = await db.tahfidz.find(q, {"_id": 0}).sort("date", -1).to_list(1000)
    students = {s["id"]: s["name"] for s in await db.students.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)}
    for t in items:
        t["student_name"] = students.get(t["student_id"], "-")
    return items


@router.post("/tahfidz")
async def create_tahfidz(input: TahfidzInput, user: dict = Depends(require_duty("tahfidz"))):
    doc = {"id": new_id(), **input.model_dump(), "date": input.date or now_iso()[:10], "created_at": now_iso()}
    await db.tahfidz.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/tahfidz/{tid}")
async def delete_tahfidz(tid: str, user: dict = Depends(require_duty("tahfidz"))):
    await db.tahfidz.delete_one({"id": tid})
    return {"message": "Catatan tahfidz dihapus"}


# ---------------- Wali Kelas: Komitmen, Jadwal, Struktur, Piket Kelas ----------------
class ClassMetaInput(BaseModel):
    class_id: str
    kind: str  # komitmen | jadwal | struktur | piket_kelas
    data: dict


@router.get("/class-meta")
async def get_class_meta(class_id: str, kind: str, user: dict = Depends(require_roles("admin", "guru", "siswa"))):
    items = await db.class_meta.find({"class_id": class_id, "kind": kind}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return items


@router.post("/class-meta")
async def create_class_meta(input: ClassMetaInput, user: dict = Depends(require_roles("admin", "guru"))):
    doc = {"id": new_id(), **input.model_dump(), "created_at": now_iso()}
    await db.class_meta.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/class-meta/{mid}")
async def delete_class_meta(mid: str, user: dict = Depends(require_roles("admin", "guru"))):
    await db.class_meta.delete_one({"id": mid})
    return {"message": "Data dihapus"}

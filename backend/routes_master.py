from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import re
from db import db, now_iso, new_id, paginate
from auth import require_roles, hash_password

VALID_DUTIES = ("tabungan", "tahfidz", "tartil", "pramuka")
USERNAME_RE = re.compile(r"^[a-z0-9._]{3,30}$")

router = APIRouter(prefix="/api", tags=["master"])

# ---------------- Classes (Kelas) ----------------
class ClassInput(BaseModel):
    name: str
    level: int
    wali_kelas_id: Optional[str] = None
    academic_year: str = "2025/2026"


@router.get("/classes")
async def list_classes(user: dict = Depends(require_roles())):
    items = await db.classes.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    for c in items:
        c["student_count"] = await db.students.count_documents({"class_id": c["id"]})
        if c.get("wali_kelas_id"):
            t = await db.teachers.find_one({"id": c["wali_kelas_id"]}, {"_id": 0, "name": 1})
            c["wali_kelas_name"] = t["name"] if t else None
    return items


@router.post("/classes")
async def create_class(input: ClassInput, user: dict = Depends(require_roles("admin"))):
    doc = {"id": new_id(), **input.model_dump(), "created_at": now_iso()}
    await db.classes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/classes/{class_id}")
async def update_class(class_id: str, input: ClassInput, user: dict = Depends(require_roles("admin"))):
    res = await db.classes.update_one({"id": class_id}, {"$set": input.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Kelas tidak ditemukan")
    return await db.classes.find_one({"id": class_id}, {"_id": 0})


@router.delete("/classes/{class_id}")
async def delete_class(class_id: str, user: dict = Depends(require_roles("admin"))):
    await db.classes.delete_one({"id": class_id})
    return {"message": "Kelas dihapus"}


# ---------------- Subjects (Mapel) ----------------
class SubjectInput(BaseModel):
    name: str
    code: str


@router.get("/subjects")
async def list_subjects(user: dict = Depends(require_roles())):
    return await db.subjects.find({}, {"_id": 0}).sort("name", 1).to_list(200)


@router.post("/subjects")
async def create_subject(input: SubjectInput, user: dict = Depends(require_roles("admin"))):
    doc = {"id": new_id(), **input.model_dump(), "created_at": now_iso()}
    await db.subjects.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/subjects/{sid}")
async def delete_subject(sid: str, user: dict = Depends(require_roles("admin"))):
    await db.subjects.delete_one({"id": sid})
    return {"message": "Mapel dihapus"}


# ---------------- Teachers (Guru) ----------------
class TeacherInput(BaseModel):
    name: str
    nip: str
    gender: str = "L"
    phone: Optional[str] = None
    is_wali_kelas: bool = False


@router.get("/teachers")
async def list_teachers(page: int = 1, limit: int = 10, search: str = "", user: dict = Depends(require_roles("admin", "guru"))):
    q = {}
    if search:
        q = {"$or": [{"name": {"$regex": search, "$options": "i"}}, {"nip": {"$regex": search, "$options": "i"}}]}
    return await paginate(db.teachers, q, page, limit, "name", 1)


@router.post("/teachers")
async def create_teacher(input: TeacherInput, user: dict = Depends(require_roles("admin"))):
    doc = {"id": new_id(), **input.model_dump(), "created_at": now_iso()}
    await db.teachers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/teachers/{tid}")
async def update_teacher(tid: str, input: TeacherInput, user: dict = Depends(require_roles("admin"))):
    res = await db.teachers.update_one({"id": tid}, {"$set": input.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Guru tidak ditemukan")
    return await db.teachers.find_one({"id": tid}, {"_id": 0})


@router.delete("/teachers/{tid}")
async def delete_teacher(tid: str, user: dict = Depends(require_roles("admin"))):
    await db.teachers.delete_one({"id": tid})
    return {"message": "Guru dihapus"}


# ---------------- Students (Siswa) ----------------
class StudentInput(BaseModel):
    nisn: str
    name: str
    class_id: Optional[str] = None
    gender: str = "L"
    rfid_uid: Optional[str] = None
    birth_place: Optional[str] = None
    birth_date: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    photo_url: Optional[str] = None


@router.get("/students")
async def list_students(page: int = 1, limit: int = 10, search: str = "", class_id: str = "", user: dict = Depends(require_roles("admin", "guru"))):
    q = {}
    if class_id:
        q["class_id"] = class_id
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"nisn": {"$regex": search, "$options": "i"}}]
    result = await paginate(db.students, q, page, limit, "name", 1)
    classes = {c["id"]: c["name"] for c in await db.classes.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(200)}
    for s in result["items"]:
        s["class_name"] = classes.get(s.get("class_id"), "-")
    return result


@router.get("/students/{sid}")
async def get_student(sid: str, user: dict = Depends(require_roles())):
    s = await db.students.find_one({"id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Siswa tidak ditemukan")
    if s.get("class_id"):
        c = await db.classes.find_one({"id": s["class_id"]}, {"_id": 0, "name": 1})
        s["class_name"] = c["name"] if c else "-"
    return s


@router.post("/students")
async def create_student(input: StudentInput, user: dict = Depends(require_roles("admin"))):
    if await db.students.find_one({"nisn": input.nisn}):
        raise HTTPException(400, "NISN sudah terdaftar")
    doc = {"id": new_id(), **input.model_dump(), "created_at": now_iso()}
    await db.students.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/students/{sid}")
async def update_student(sid: str, input: StudentInput, user: dict = Depends(require_roles("admin"))):
    res = await db.students.update_one({"id": sid}, {"$set": input.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Siswa tidak ditemukan")
    return await db.students.find_one({"id": sid}, {"_id": 0})


@router.delete("/students/{sid}")
async def delete_student(sid: str, user: dict = Depends(require_roles("admin"))):
    await db.students.delete_one({"id": sid})
    return {"message": "Siswa dihapus"}


# ---------------- User Accounts ----------------
class UserAccountInput(BaseModel):
    username: str
    password: str
    name: str
    role: str  # guru | siswa | admin
    email: Optional[str] = None
    student_id: Optional[str] = None
    teacher_id: Optional[str] = None
    extra_duties: Optional[List[str]] = None


class UserUpdateInput(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    extra_duties: Optional[List[str]] = None


class ResetPasswordInput(BaseModel):
    new_password: str


@router.get("/users")
async def list_users(page: int = 1, limit: int = 10, search: str = "", role: str = "", user: dict = Depends(require_roles("admin"))):
    q = {}
    if role:
        q["role"] = role
    if search:
        q["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}, {"username": {"$regex": search, "$options": "i"}}]
    return await paginate(db.users, q, page, limit, "created_at", -1, {"_id": 0, "password_hash": 0})


@router.post("/users")
async def create_user(input: UserAccountInput, user: dict = Depends(require_roles("admin"))):
    username = (input.username or "").lower().strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(400, "Username minimal 3 karakter, hanya huruf/angka/titik/underscore, tanpa spasi")
    if await db.users.find_one({"username": username}):
        raise HTTPException(400, "Username sudah digunakan")
    if input.role not in ("guru", "siswa", "admin"):
        raise HTTPException(400, "Role tidak valid")
    email = (input.email or "").lower().strip() or None
    if email and await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email sudah digunakan")
    duties = [d for d in (input.extra_duties or []) if d in VALID_DUTIES] if input.role == "guru" else []
    doc = {
        "id": new_id(), "username": username, "email": email, "password_hash": hash_password(input.password),
        "name": input.name, "role": input.role, "student_id": input.student_id,
        "teacher_id": input.teacher_id, "extra_duties": duties, "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return doc


@router.put("/users/{uid}")
async def update_user(uid: str, input: UserUpdateInput, user: dict = Depends(require_roles("admin"))):
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(404, "User tidak ditemukan")
    upd = {}
    if input.username is not None:
        username = input.username.lower().strip()
        if not USERNAME_RE.match(username):
            raise HTTPException(400, "Username minimal 3 karakter, hanya huruf/angka/titik/underscore, tanpa spasi")
        if await db.users.find_one({"username": username, "id": {"$ne": uid}}):
            raise HTTPException(400, "Username sudah digunakan")
        upd["username"] = username
    if input.email is not None:
        email = input.email.lower().strip() or None
        if email and await db.users.find_one({"email": email, "id": {"$ne": uid}}):
            raise HTTPException(400, "Email sudah digunakan")
        upd["email"] = email
    if input.name is not None and input.name.strip():
        upd["name"] = input.name.strip()
    if input.extra_duties is not None:
        upd["extra_duties"] = [d for d in input.extra_duties if d in VALID_DUTIES] if target.get("role") == "guru" else []
    if upd:
        await db.users.update_one({"id": uid}, {"$set": upd})
    return await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})


@router.put("/users/{uid}/reset-password")
async def admin_reset_password(uid: str, input: ResetPasswordInput, user: dict = Depends(require_roles("admin"))):
    res = await db.users.update_one({"id": uid}, {"$set": {"password_hash": hash_password(input.new_password)}})
    if res.matched_count == 0:
        raise HTTPException(404, "User tidak ditemukan")
    return {"message": "Password berhasil direset"}


@router.delete("/users/{uid}")
async def delete_user(uid: str, user: dict = Depends(require_roles("admin"))):
    target = await db.users.find_one({"id": uid})
    if target and target.get("role") == "admin":
        admin_count = await db.users.count_documents({"role": "admin"})
        if admin_count <= 1:
            raise HTTPException(400, "Tidak bisa menghapus admin terakhir")
    await db.users.delete_one({"id": uid})
    return {"message": "User dihapus"}

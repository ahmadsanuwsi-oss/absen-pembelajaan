import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from db import db, now_iso, new_id

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Tipe token tidak valid")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User tidak ditemukan")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kadaluarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if roles and user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Akses ditolak untuk role ini")
        return user
    return checker


def require_duty(*duties):
    """Admin lolos semua. Guru harus punya minimal satu tugas tambahan yang cocok."""
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") == "admin":
            return user
        if user.get("role") == "guru" and set(duties) & set(user.get("extra_duties") or []):
            return user
        raise HTTPException(status_code=403, detail="Tidak memiliki tugas tambahan untuk fitur ini")
    return checker


router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginInput(BaseModel):
    identifier: str
    password: str


class ChangePasswordInput(BaseModel):
    old_password: str
    new_password: str


@router.post("/login")
async def login(input: LoginInput):
    ident = input.identifier.lower().strip()
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Terlalu banyak percobaan. Coba lagi dalam 15 menit.")
    user = await db.users.find_one({"$or": [{"username": ident}, {"email": ident}]})
    if not user or not verify_password(input.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Username/email atau password salah")
    await db.login_attempts.delete_one({"identifier": ident})
    token = create_access_token(user["id"], user.get("email") or "", user["role"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"access_token": token, "user": user}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"message": "Logout berhasil"}


@router.post("/change-password")
async def change_password(input: ChangePasswordInput, user: dict = Depends(require_roles("admin"))):
    full = await db.users.find_one({"id": user["id"]})
    if not verify_password(input.old_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(input.new_password)}})
    return {"message": "Password berhasil diubah"}


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": new_id(), "username": "admin", "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Administrator MI", "role": "admin", "student_id": None, "teacher_id": None,
            "extra_duties": [], "created_at": now_iso(),
        })
    else:
        upd = {}
        if not verify_password(admin_password, existing["password_hash"]):
            upd["password_hash"] = hash_password(admin_password)
        if not existing.get("username"):
            upd["username"] = "admin"
        if upd:
            await db.users.update_one({"email": admin_email}, {"$set": upd})

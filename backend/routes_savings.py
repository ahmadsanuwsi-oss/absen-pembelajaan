from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from db import db, now_iso, new_id, paginate
from auth import require_roles, require_duty

router = APIRouter(prefix="/api", tags=["savings"])


class SavingsTxnInput(BaseModel):
    student_id: str
    kind: str  # setoran | penarikan
    amount: float
    note: Optional[str] = None
    date: Optional[str] = None


async def get_balance(student_id: str) -> float:
    txns = await db.savings.find({"student_id": student_id}, {"_id": 0}).to_list(2000)
    bal = 0.0
    for t in txns:
        bal += t["amount"] if t["kind"] == "setoran" else -t["amount"]
    return bal


@router.get("/savings/summary")
async def savings_summary(user: dict = Depends(require_roles("admin", "guru"))):
    students = await db.students.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    classes = {c["id"]: c["name"] for c in await db.classes.find({}, {"_id": 0}).to_list(200)}
    rows = []
    total = 0.0
    for s in students:
        bal = await get_balance(s["id"])
        total += bal
        rows.append({"student_id": s["id"], "name": s["name"], "nisn": s["nisn"], "class_name": classes.get(s.get("class_id"), "-"), "balance": bal})
    return {"total_balance": total, "rows": rows}


@router.get("/savings/{student_id}")
async def savings_detail(student_id: str, user: dict = Depends(require_roles("admin", "guru", "siswa"))):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Siswa tidak ditemukan")
    txns = await db.savings.find({"student_id": student_id}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return {"student": {"id": student["id"], "name": student["name"], "nisn": student["nisn"]}, "balance": await get_balance(student_id), "transactions": txns}


@router.post("/savings")
async def create_savings_txn(input: SavingsTxnInput, user: dict = Depends(require_duty("tabungan"))):
    if input.kind not in ("setoran", "penarikan"):
        raise HTTPException(400, "Jenis transaksi tidak valid")
    if input.amount <= 0:
        raise HTTPException(400, "Nominal harus lebih dari 0")
    if input.kind == "penarikan":
        bal = await get_balance(input.student_id)
        if input.amount > bal:
            raise HTTPException(400, "Saldo tidak mencukupi")
    doc = {"id": new_id(), **input.model_dump(), "date": input.date or now_iso()[:10], "operator": user["name"], "created_at": now_iso()}
    await db.savings.insert_one(doc)
    doc.pop("_id", None)
    doc["balance"] = await get_balance(input.student_id)
    return doc


@router.delete("/savings/txn/{tid}")
async def delete_savings_txn(tid: str, user: dict = Depends(require_roles("admin"))):
    await db.savings.delete_one({"id": tid})
    return {"message": "Transaksi dihapus"}

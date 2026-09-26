import os
import json
import hmac
import shutil
import zipfile
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, Depends
from fastapi.responses import FileResponse
from db import db
from auth import require_roles

router = APIRouter(prefix="/api", tags=["cron"])

BACKUP_DIR = Path("/app/backups")
COLLECTIONS = [
    "users", "students", "teachers", "classes", "subjects", "attendance",
    "assessments", "journals", "anecdotes", "piket_guru", "tahfidz",
    "class_meta", "savings", "settings",
]
KEEP_BACKUPS = 7


def _verify(request: Request):
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else ""
    if not secret or not token or not hmac.compare_digest(token, secret):
        raise HTTPException(status_code=401, detail="Unauthorized")


async def _run_backup():
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    target = BACKUP_DIR / f"backup-{stamp}"
    target.mkdir(parents=True, exist_ok=True)
    meta = {"created_at": datetime.now(timezone.utc).isoformat(), "collections": {}}
    for name in COLLECTIONS:
        docs = await db[name].find({}, {"_id": 0}).to_list(100000)
        with open(target / f"{name}.json", "w", encoding="utf-8") as f:
            json.dump(docs, f, ensure_ascii=False, default=str)
        meta["collections"][name] = len(docs)
    with open(target / "_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)
    # retention: keep last N
    backups = sorted([p for p in BACKUP_DIR.glob("backup-*") if p.is_dir()])
    for old in backups[:-KEEP_BACKUPS]:
        shutil.rmtree(old, ignore_errors=True)
    await db.backup_log.insert_one({"stamp": stamp, "at": meta["created_at"], "counts": meta["collections"], "status": "ok"})


@router.post("/cron/backup")
async def cron_backup(request: Request, background_tasks: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    _verify(request)
    background_tasks.add_task(_run_backup)
    return {"status": "accepted"}


@router.get("/backups")
async def list_backups(user: dict = Depends(require_roles("admin"))):
    logs = await db.backup_log.find({}, {"_id": 0}).sort("at", -1).to_list(30)
    return {"backups": logs}


@router.post("/backups/run-now")
async def run_backup_now(background_tasks: BackgroundTasks, user: dict = Depends(require_roles("admin"))):
    background_tasks.add_task(_run_backup)
    return {"status": "accepted"}


@router.get("/backups/download/{stamp}")
async def download_backup(stamp: str, user: dict = Depends(require_roles("admin"))):
    safe = "".join(ch for ch in stamp if ch.isdigit() or ch == "-")
    folder = BACKUP_DIR / f"backup-{safe}"
    if not folder.is_dir():
        raise HTTPException(404, "Backup tidak ditemukan")
    zip_path = Path(tempfile.gettempdir()) / f"backup-{safe}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in folder.glob("*.json"):
            z.write(p, p.name)
    return FileResponse(zip_path, media_type="application/zip", filename=f"backup-{safe}.zip")

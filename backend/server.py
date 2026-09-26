from fastapi import FastAPI
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from starlette.middleware.cors import CORSMiddleware
from db import db, client
import auth
import routes_master
import routes_attendance
import routes_teacher
import routes_savings
import routes_dashboard
import routes_settings
import routes_report
import routes_cron
import routes_whatsapp
from auth import seed_admin
from seed import seed_data, ensure_indexes, ensure_demo_accounts

app = FastAPI(title="SIM MI Miftahul Jannah")

app.include_router(auth.router)
app.include_router(routes_master.router)
app.include_router(routes_attendance.router)
app.include_router(routes_teacher.router)
app.include_router(routes_savings.router)
app.include_router(routes_dashboard.router)
app.include_router(routes_settings.router)
app.include_router(routes_report.router)
app.include_router(routes_cron.router)
app.include_router(routes_whatsapp.router)


@app.get("/api/")
async def root():
    return {"message": "SIM MI Miftahul Jannah API"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await ensure_indexes()
    await seed_admin()
    await seed_data()
    await ensure_demo_accounts()
    await db.attendance.update_many({"type": "kehadiran"}, {"$set": {"type": "datang"}})
    await db.attendance.update_many({"type": "ekstra"}, {"$set": {"type": "pramuka"}})
    logger.info("Startup complete: indexes, admin, and seed data ready.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

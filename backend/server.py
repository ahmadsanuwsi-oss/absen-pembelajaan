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
from auth import seed_admin
from seed import seed_data, ensure_indexes

app = FastAPI(title="SIM MI Miftahul Jannah")

app.include_router(auth.router)
app.include_router(routes_master.router)
app.include_router(routes_attendance.router)
app.include_router(routes_teacher.router)
app.include_router(routes_savings.router)
app.include_router(routes_dashboard.router)


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
    logger.info("Startup complete: indexes, admin, and seed data ready.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

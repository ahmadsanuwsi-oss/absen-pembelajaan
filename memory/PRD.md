# SIM MI Miftahul Jannah (absen-pembelajaan)

## Overview
Indonesian Islamic school (MI) information system: attendance kiosk (RFID/NISN),
teacher/admin management, academics (assessments, journals, ledger, notes),
tahfidz tracking, student savings, and WhatsApp (Fonnte) parent recaps.

## Architecture
- **Backend:** FastAPI + MongoDB (motor/async), JWT auth. Routers: master, attendance,
  teacher, savings, dashboard, settings, report, cron, whatsapp. Startup auto-seeds
  indexes, admin, and demo data.
- **Frontend:** CRA + CRACO + Tailwind + shadcn/ui, React 19, react-router 7.
- **Integrations:** Fonnte WhatsApp (token stored in DB settings — blank = "skipped" mode, no errors).

## Import & Setup (2026-09-29)
- Imported from GitHub `main` (ahmadsanuwsi-oss/absen-pembelajaan) into `/app`.
- Backend `.env` created with `MONGO_URL`, `DB_NAME=absen_mijannah`, `CORS_ORIGINS`,
  required `JWT_SECRET`, and `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- Frontend `.env` uses Emergent preview `REACT_APP_BACKEND_URL`.
- Excluded `emergentintegrations`/`litellm` from install (unused, dependency conflict); all
  other deps installed. Frontend via yarn.
- Verified: backend health (`/api/`), admin/guru/siswa login (via username & email),
  login page and `/kiosk` render correctly.

## Env keys
- backend: MONGO_URL, DB_NAME, CORS_ORIGINS, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, WEBHOOK_CRON_SECRET
- WhatsApp token is set in-app via Settings (not env).

## Backlog / Next
- P1: Change default admin password (repo history public).
- P2: Configure real Fonnte token in Settings to enable WhatsApp sends.
- P2: Optional full Dockerize.

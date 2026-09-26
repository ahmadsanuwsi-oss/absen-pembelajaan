"""Iteration 4 new features: monthly-wa-recap cron, backup download ZIP, /api/wa-log."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

CRON_SECRET = ""
with open("/app/backend/.env") as f:
    for line in f:
        if line.startswith("WEBHOOK_CRON_SECRET"):
            CRON_SECRET = line.split("=", 1)[1].strip().strip('"')

ADMIN = {"email": "ahmadsanuwsi@gmail.com", "password": "admin123"}
GURU = {"email": "guru@mijannah.sch.id", "password": "guru123"}
SISWA = {"email": "siswa@mijannah.sch.id", "password": "siswa123"}


def _login(c):
    return requests.post(f"{BASE_URL}/api/auth/login", json=c, timeout=15)


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def admin_token():
    r = _login(ADMIN)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def guru_token():
    r = _login(GURU)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def siswa_token():
    r = _login(SISWA)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# ---------- Cron monthly-wa-recap security ----------
class TestMonthlyWARecapCron:
    def test_no_auth_returns_401(self):
        r = requests.post(f"{BASE_URL}/api/cron/monthly-wa-recap", timeout=15)
        assert r.status_code == 401

    def test_wrong_bearer_returns_401(self):
        r = requests.post(
            f"{BASE_URL}/api/cron/monthly-wa-recap",
            headers={"Authorization": "Bearer wrong-secret"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_correct_bearer_returns_accepted_prev_month(self):
        assert CRON_SECRET, "WEBHOOK_CRON_SECRET missing"
        r = requests.post(
            f"{BASE_URL}/api/cron/monthly-wa-recap",
            headers={"Authorization": f"Bearer {CRON_SECRET}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("status") == "accepted"
        assert "month" in data
        # Format YYYY-MM
        assert len(data["month"]) == 7 and data["month"][4] == "-"


# ---------- Backup Download ----------
class TestBackupDownload:
    def test_backup_download_full_flow(self, admin_token):
        # Trigger a fresh backup
        r = requests.post(
            f"{BASE_URL}/api/backups/run-now", headers=H(admin_token), timeout=15
        )
        assert r.status_code == 200
        time.sleep(2)  # let background task complete
        # List
        r = requests.get(f"{BASE_URL}/api/backups", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        backups = r.json().get("backups", [])
        assert len(backups) >= 1
        stamp = backups[0]["stamp"]
        # Download
        r = requests.get(
            f"{BASE_URL}/api/backups/download/{stamp}",
            headers=H(admin_token),
            timeout=30,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/zip")
        assert len(r.content) > 500  # non-empty ZIP

    def test_invalid_stamp_returns_404(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/backups/download/99999999-999999",
            headers=H(admin_token),
            timeout=15,
        )
        assert r.status_code == 404

    def test_non_admin_forbidden(self, guru_token):
        r = requests.get(
            f"{BASE_URL}/api/backups/download/00000000-000000",
            headers=H(guru_token),
            timeout=15,
        )
        assert r.status_code == 403

    def test_no_auth_forbidden(self):
        r = requests.get(
            f"{BASE_URL}/api/backups/download/00000000-000000", timeout=15
        )
        assert r.status_code in (401, 403)


# ---------- WA Log ----------
class TestWALog:
    def test_wa_log_admin_after_recap_blast(self, admin_token):
        # Trigger a blast (Fonnte token unset -> skipped, but log should be written)
        r = requests.post(
            f"{BASE_URL}/api/whatsapp/recap-blast",
            headers=H(admin_token),
            timeout=30,
        )
        # 200 accepted or 400 no recipients — both are acceptable, but
        # test-manual is safer:
        assert r.status_code in (200, 400)
        # Also try a test send to guarantee at least one log entry
        rt = requests.post(
            f"{BASE_URL}/api/whatsapp/test",
            headers=H(admin_token),
            json={"target": "08123456789", "message": "iter4 test"},
            timeout=30,
        )
        # Fonnte token unset -> 400 with 'Token Fonnte belum diisi'
        assert rt.status_code == 400
        # Give background task a moment to complete
        time.sleep(3)

        r = requests.get(f"{BASE_URL}/api/wa-log", headers=H(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "logs" in data
        logs = data["logs"]
        assert isinstance(logs, list)
        assert len(logs) > 0, "wa_log should have entries after test/blast"
        entry = logs[0]
        assert "target" in entry
        assert "context" in entry
        assert "status" in entry
        assert "reason" in entry
        assert "at" in entry
        assert entry["status"] in ("ok", "skipped", "failed")
        # Since Fonnte not configured, status must NOT be 'failed' — it should be skipped
        skipped_count = sum(1 for l in logs if l["status"] == "skipped")
        assert skipped_count > 0, "Expected skipped entries since Fonnte token unset"
        # Verify masking: target should contain '*'
        masked_targets = [l for l in logs if "*" in str(l.get("target", ""))]
        assert len(masked_targets) > 0, "targets should be masked with '*'"

    def test_wa_log_guru_forbidden(self, guru_token):
        r = requests.get(f"{BASE_URL}/api/wa-log", headers=H(guru_token), timeout=15)
        assert r.status_code == 403

    def test_wa_log_siswa_forbidden(self, siswa_token):
        r = requests.get(f"{BASE_URL}/api/wa-log", headers=H(siswa_token), timeout=15)
        assert r.status_code == 403

    def test_wa_log_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/wa-log", timeout=15)
        assert r.status_code in (401, 403)


# ---------- Light regression ----------
class TestRegression:
    def test_admin_login_role(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("role") == "admin"

    def test_guru_login_role(self, guru_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=H(guru_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("role") == "guru"

    def test_siswa_login_role(self, siswa_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=H(siswa_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("role") == "siswa"

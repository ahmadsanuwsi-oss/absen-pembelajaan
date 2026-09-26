"""Iteration 3 new features: rapor-class, cron backup, WhatsApp."""
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

# Read cron secret from backend .env
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
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def siswa_token():
    r = _login(SISWA)
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def class_id(admin_token):
    r = requests.get(f"{BASE_URL}/api/classes", headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    items = r.json()
    if isinstance(items, dict):
        items = items.get("items", [])
    if not items:
        pytest.skip("no classes")
    return items[0]["id"]


# ---- Rapor Sekelas ----
class TestRaporClass:
    def test_rapor_class_admin(self, admin_token, class_id):
        r = requests.get(f"{BASE_URL}/api/report/rapor-class/{class_id}",
                         headers=H(admin_token), timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "class_name" in d and "count" in d and "rapors" in d
        assert isinstance(d["rapors"], list)
        assert d["count"] == len(d["rapors"])
        if d["rapors"]:
            first = d["rapors"][0]
            for k in ("school", "student", "grades", "average", "attendance", "tahfidz", "balance"):
                assert k in first, f"missing {k} in rapor"

    def test_rapor_class_guru(self, guru_token, class_id):
        r = requests.get(f"{BASE_URL}/api/report/rapor-class/{class_id}",
                         headers=H(guru_token), timeout=60)
        assert r.status_code == 200

    def test_rapor_class_siswa_forbidden(self, siswa_token, class_id):
        r = requests.get(f"{BASE_URL}/api/report/rapor-class/{class_id}",
                         headers=H(siswa_token), timeout=15)
        assert r.status_code == 403

    def test_rapor_class_not_found(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/report/rapor-class/nope-xyz",
                         headers=H(admin_token), timeout=15)
        assert r.status_code == 404


# ---- Cron Backup security ----
class TestCronBackup:
    def test_cron_backup_no_auth(self):
        r = requests.post(f"{BASE_URL}/api/cron/backup", timeout=15)
        assert r.status_code == 401

    def test_cron_backup_wrong_bearer(self):
        r = requests.post(f"{BASE_URL}/api/cron/backup",
                          headers={"Authorization": "Bearer wrong-token"}, timeout=15)
        assert r.status_code == 401

    def test_cron_backup_correct_bearer_creates_file(self):
        assert CRON_SECRET, "WEBHOOK_CRON_SECRET missing"
        r = requests.post(f"{BASE_URL}/api/cron/backup",
                          headers={"Authorization": f"Bearer {CRON_SECRET}"}, timeout=15)
        assert r.status_code in (200, 202), r.text
        # background task, wait & check
        time.sleep(3)
        assert os.path.isdir("/app/backups")
        entries = [x for x in os.listdir("/app/backups") if x.startswith("backup-")]
        assert entries, "no backup dir created"

    def test_backups_list_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/backups", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "backups" in d and isinstance(d["backups"], list)

    def test_backups_list_forbidden_guru(self, guru_token):
        r = requests.get(f"{BASE_URL}/api/backups", headers=H(guru_token), timeout=15)
        assert r.status_code == 403

    def test_backups_run_now_admin(self, admin_token):
        before = requests.get(f"{BASE_URL}/api/backups", headers=H(admin_token), timeout=15).json()["backups"]
        before_n = len(before)
        r = requests.post(f"{BASE_URL}/api/backups/run-now", headers=H(admin_token), timeout=15)
        assert r.status_code in (200, 202)
        assert r.json().get("status") == "accepted"
        time.sleep(3)
        after = requests.get(f"{BASE_URL}/api/backups", headers=H(admin_token), timeout=15).json()["backups"]
        assert len(after) >= before_n + 1, f"expected new backup log, before={before_n}, after={len(after)}"

    def test_backups_run_now_forbidden_guru(self, guru_token):
        r = requests.post(f"{BASE_URL}/api/backups/run-now", headers=H(guru_token), timeout=15)
        assert r.status_code == 403


# ---- WhatsApp ----
class TestWhatsApp:
    def test_wa_test_no_token_configured_returns_400(self, admin_token):
        # Assumes settings.whatsapp_api_key not configured
        r = requests.post(f"{BASE_URL}/api/whatsapp/test",
                          json={"target": "081234567890", "message": "test"},
                          headers=H(admin_token), timeout=15)
        # If token happens to be configured, skip
        if r.status_code == 200:
            pytest.skip("whatsapp token appears configured")
        assert r.status_code == 400
        assert "Token" in r.text or "Fonnte" in r.text or "belum" in r.text

    def test_wa_test_forbidden_guru(self, guru_token):
        r = requests.post(f"{BASE_URL}/api/whatsapp/test",
                          json={"target": "081234567890"},
                          headers=H(guru_token), timeout=15)
        assert r.status_code == 403

    def test_wa_test_forbidden_siswa(self, siswa_token):
        r = requests.post(f"{BASE_URL}/api/whatsapp/test",
                          json={"target": "081234567890"},
                          headers=H(siswa_token), timeout=15)
        assert r.status_code == 403

    def test_wa_recap_blast_admin(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/whatsapp/recap-blast",
                          headers=H(admin_token), timeout=30)
        # Either accepted (has recipients) or 400 (no phones)
        assert r.status_code in (200, 400)
        if r.status_code == 200:
            d = r.json()
            assert d.get("accepted") is True
            assert d.get("count", 0) > 0

    def test_wa_recap_blast_guru_allowed(self, guru_token):
        r = requests.post(f"{BASE_URL}/api/whatsapp/recap-blast",
                          headers=H(guru_token), timeout=30)
        assert r.status_code in (200, 400)

    def test_wa_recap_blast_forbidden_siswa(self, siswa_token):
        r = requests.post(f"{BASE_URL}/api/whatsapp/recap-blast",
                          headers=H(siswa_token), timeout=15)
        assert r.status_code == 403


# ---- Settings whatsapp fields ----
class TestSettingsWhatsapp:
    def test_persist_whatsapp_fields(self, admin_token):
        # save empty key + a url
        r = requests.put(f"{BASE_URL}/api/settings",
                         json={"whatsapp_api_key": "", "whatsapp_api_url": "https://api.fonnte.com/send"},
                         headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/settings", headers=H(admin_token), timeout=15).json()
        assert "whatsapp_api_key" in g
        assert g.get("whatsapp_api_url") == "https://api.fonnte.com/send"


# ---- Kiosk regression (schedules WA background) ----
class TestKioskRegression:
    def test_kiosk_scan_not_found(self):
        r = requests.post(f"{BASE_URL}/api/kiosk/scan",
                          json={"code": "0000000000000", "type": "kehadiran"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "not_found"

    def test_kiosk_scan_success_or_already(self, admin_token):
        # pick a real student
        items = requests.get(f"{BASE_URL}/api/students?page=1&limit=1",
                             headers=H(admin_token), timeout=15).json().get("items", [])
        if not items:
            pytest.skip("no students")
        nisn = items[0].get("nisn")
        if not nisn:
            pytest.skip("student has no nisn")
        r = requests.post(f"{BASE_URL}/api/kiosk/scan",
                          json={"code": nisn, "type": "kehadiran"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") in ("success", "already_scanned")


# ---- Regression: role logins ----
class TestLoginRegression:
    def test_admin_login(self):
        r = _login(ADMIN)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_guru_login(self):
        r = _login(GURU)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "guru"

    def test_siswa_login(self):
        r = _login(SISWA)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "siswa"

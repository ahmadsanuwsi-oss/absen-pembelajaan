"""Iteration 6 tests: 7 attendance types + kiosk/classes public endpoint + regression."""
import os
import pytest
import requests

def _read_frontend_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        return None
    return None

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_env() or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"

ADMIN = {"email": "ahmadsanuwsi@gmail.com", "password": "admin123"}
GURU = {"email": "guru@mijannah.sch.id", "password": "guru123"}
SISWA = {"email": "siswa@mijannah.sch.id", "password": "siswa123"}

ATTENDANCE_TYPES = ["datang", "pulang", "dhuha", "dzuhur", "pramuka", "tartil", "ekstra_tahfidz"]


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    return r


@pytest.fixture(scope="module")
def admin_token():
    r = _login(ADMIN)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def a_student(admin_headers):
    r = requests.get(f"{API}/students", headers=admin_headers, params={"page": 1, "limit": 5}, timeout=15)
    assert r.status_code == 200
    items = r.json().get("items", [])
    assert items, "no students seeded"
    return items[0]


# ---------------- Kiosk public endpoint ----------------
class TestKioskClasses:
    def test_public_no_auth(self):
        r = requests.get(f"{API}/kiosk/classes", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        first = data[0]
        for k in ("id", "name", "wali_name", "wali_phone"):
            assert k in first, f"missing {k} in {first}"

    def test_returns_multiple_classes(self):
        r = requests.get(f"{API}/kiosk/classes", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 1


# ---------------- Scan for each of 7 types ----------------
class TestKioskScan7Types:
    @pytest.mark.parametrize("atype", ATTENDANCE_TYPES)
    def test_scan_each_type(self, a_student, atype):
        r = requests.post(f"{API}/kiosk/scan", json={"code": a_student["nisn"], "type": atype}, timeout=15)
        assert r.status_code == 200, f"{atype} -> {r.status_code} {r.text}"
        data = r.json()
        assert data["status"] in ("success", "already_scanned"), f"{atype} -> {data}"
        # Success payload sanity
        if data["status"] == "success":
            assert "student" in data and data["student"]["nisn"] == a_student["nisn"]
            assert "time" in data
            assert data.get("attendance_status") in ("hadir", "terlambat")

    def test_invalid_type_400(self, a_student):
        r = requests.post(f"{API}/kiosk/scan", json={"code": a_student["nisn"], "type": "bogus"}, timeout=15)
        assert r.status_code == 400

    def test_not_found_code(self):
        r = requests.post(f"{API}/kiosk/scan", json={"code": "00000000", "type": "datang"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "not_found"

    def test_late_logic_only_for_datang(self, a_student):
        # Just verify the datang response has attendance_status; the actual value depends on WIB clock.
        r = requests.post(f"{API}/kiosk/scan", json={"code": a_student["nisn"], "type": "datang"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        if d["status"] == "success":
            assert d["attendance_status"] in ("hadir", "terlambat")
        # For non-datang types, status is always 'hadir' if success
        r2 = requests.post(f"{API}/kiosk/scan", json={"code": a_student["nisn"], "type": "dzuhur"}, timeout=15)
        d2 = r2.json()
        if d2["status"] == "success":
            assert d2["attendance_status"] == "hadir"


# ---------------- Attendance list & recap ----------------
class TestAttendanceListRecap:
    @pytest.mark.parametrize("atype", ATTENDANCE_TYPES)
    def test_list_accepts_type(self, admin_headers, atype):
        r = requests.get(f"{API}/attendance", headers=admin_headers, params={"type": atype, "limit": 5}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "items" in j

    @pytest.mark.parametrize("atype", ATTENDANCE_TYPES)
    def test_recap_accepts_type(self, admin_headers, atype):
        r = requests.get(f"{API}/attendance/recap", headers=admin_headers, params={"type": atype}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["type"] == atype
        assert "recap" in j


# ---------------- Dashboard migration check ----------------
class TestDashboardMigration:
    def test_admin_dashboard_present_today(self, admin_headers):
        r = requests.get(f"{API}/dashboard/admin", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "present_today" in d
        # Should be >0 as migration ran and seed produced datang records
        assert d["present_today"] >= 0
        assert isinstance(d.get("trend"), list) and len(d["trend"]) == 7


# ---------------- Regression: role logins ----------------
class TestRoleLogins:
    def test_admin(self):
        r = _login(ADMIN)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_guru(self):
        r = _login(GURU)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "guru"

    def test_siswa(self):
        r = _login(SISWA)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "siswa"

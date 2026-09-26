"""Iteration 2 new features: settings, rapor, manual attendance."""
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


# ---- Settings ----
class TestSettings:
    def test_public_settings_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/settings/public", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "school_name" in d
        assert isinstance(d["school_name"], str) and len(d["school_name"]) > 0

    def test_public_does_not_leak_wa_key(self):
        r = requests.get(f"{BASE_URL}/api/settings/public", timeout=15).json()
        assert "whatsapp_api_key" not in r

    def test_get_settings_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/settings", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("school_name", "school_subtitle", "headmaster", "whatsapp_api_url"):
            assert k in d

    def test_get_settings_forbidden_non_admin(self, guru_token, siswa_token):
        r1 = requests.get(f"{BASE_URL}/api/settings", headers=H(guru_token), timeout=15)
        r2 = requests.get(f"{BASE_URL}/api/settings", headers=H(siswa_token), timeout=15)
        assert r1.status_code == 403
        assert r2.status_code == 403

    def test_update_settings_persistence(self, admin_token):
        marker = f"MI Test {int(time.time())}"
        r = requests.put(
            f"{BASE_URL}/api/settings",
            json={"school_name": marker, "headmaster": "H. Test", "whatsapp_api_url": "https://wa.test/send"},
            headers=H(admin_token), timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["school_name"] == marker
        # verify persistence
        g = requests.get(f"{BASE_URL}/api/settings", headers=H(admin_token), timeout=15).json()
        assert g["school_name"] == marker
        assert g["headmaster"] == "H. Test"
        assert g["whatsapp_api_url"] == "https://wa.test/send"
        # restore
        requests.put(
            f"{BASE_URL}/api/settings",
            json={"school_name": "MI Miftahul Jannah"},
            headers=H(admin_token), timeout=15,
        )

    def test_update_settings_forbidden_guru(self, guru_token):
        r = requests.put(
            f"{BASE_URL}/api/settings",
            json={"school_name": "hack"},
            headers=H(guru_token), timeout=15,
        )
        assert r.status_code == 403


# ---- Rapor ----
class TestRapor:
    def test_rapor_admin(self, admin_token):
        stu = requests.get(f"{BASE_URL}/api/students?page=1&limit=1",
                           headers=H(admin_token), timeout=15).json()["items"]
        if not stu:
            pytest.skip("no students")
        sid = stu[0]["id"]
        r = requests.get(f"{BASE_URL}/api/report/rapor/{sid}",
                         headers=H(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("school", "student", "grades", "average", "attendance", "tahfidz", "balance"):
            assert k in d, f"missing {k}"
        assert d["student"]["id"] == sid
        for k in ("hadir", "izin", "sakit", "alpa", "terlambat"):
            assert k in d["attendance"]

    def test_rapor_not_found(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/report/rapor/nonexistent-id",
                         headers=H(admin_token), timeout=15)
        assert r.status_code == 404

    def test_rapor_guru_allowed(self, guru_token, admin_token):
        stu = requests.get(f"{BASE_URL}/api/students?page=1&limit=1",
                           headers=H(admin_token), timeout=15).json()["items"]
        if not stu:
            pytest.skip("no students")
        r = requests.get(f"{BASE_URL}/api/report/rapor/{stu[0]['id']}",
                         headers=H(guru_token), timeout=15)
        assert r.status_code == 200


# ---- Manual attendance ----
class TestManualAttendance:
    def test_manual_attendance_create_and_persist(self, admin_token):
        stu = requests.get(f"{BASE_URL}/api/students?page=1&limit=1",
                           headers=H(admin_token), timeout=15).json()["items"]
        if not stu:
            pytest.skip("no students")
        sid = stu[0]["id"]
        # unique date to avoid collision
        date = "2025-01-15"
        r = requests.post(
            f"{BASE_URL}/api/attendance/manual",
            json={"student_id": sid, "type": "kehadiran", "status": "izin", "date": date},
            headers=H(admin_token), timeout=15,
        )
        assert r.status_code == 200
        # Verify via GET /api/attendance
        g = requests.get(f"{BASE_URL}/api/attendance?date={date}&type=kehadiran",
                         headers=H(admin_token), timeout=15).json()
        rec = next((x for x in g["items"] if x["student_id"] == sid), None)
        assert rec is not None
        assert rec["status"] == "izin"
        assert rec["source"] == "manual"

        # update -> should overwrite
        r2 = requests.post(
            f"{BASE_URL}/api/attendance/manual",
            json={"student_id": sid, "type": "kehadiran", "status": "sakit", "date": date},
            headers=H(admin_token), timeout=15,
        )
        assert r2.status_code == 200
        g2 = requests.get(f"{BASE_URL}/api/attendance?date={date}&type=kehadiran",
                          headers=H(admin_token), timeout=15).json()
        rec2 = next((x for x in g2["items"] if x["student_id"] == sid), None)
        assert rec2["status"] == "sakit"

    def test_manual_attendance_forbidden_siswa(self, siswa_token):
        r = requests.post(
            f"{BASE_URL}/api/attendance/manual",
            json={"student_id": "x", "type": "kehadiran", "status": "hadir"},
            headers=H(siswa_token), timeout=15,
        )
        assert r.status_code == 403

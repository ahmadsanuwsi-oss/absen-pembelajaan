"""Iteration 7: Username login + guru extra_duties RBAC + admin user CRUD."""
import os
import time
import pytest
import requests

def _load_frontend_env():
    path = "/app/frontend/.env"
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    return os.environ.get("REACT_APP_BACKEND_URL", "")

BASE_URL = _load_frontend_env().rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"


def _login(identifier, password):
    return requests.post(f"{API}/auth/login", json={"identifier": identifier, "password": password}, timeout=30)


@pytest.fixture(scope="module")
def admin_token():
    r = _login("admin", "admin123")
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# --------------- Login flows ---------------
class TestLogin:
    def test_admin_login_by_username(self):
        r = _login("admin", "admin123")
        assert r.status_code == 200
        j = r.json()
        assert j["user"]["role"] == "admin"
        assert "access_token" in j

    def test_admin_login_by_email(self):
        r = _login("ahmadsanuwsi@gmail.com", "admin123")
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_guru_login_by_email(self):
        r = _login("guru@mijannah.sch.id", "guru123")
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "guru"

    def test_invalid_credentials(self):
        # Use unique identifier so lockout doesn't affect other tests
        r = _login(f"nouser_{int(time.time())}@x.com", "badpass")
        assert r.status_code == 401
        detail = r.json().get("detail", "")
        assert "Username/email atau password salah" in detail


# --------------- User create/update/validation ---------------
class TestUserCRUD:
    created_ids = []

    def test_create_guru_with_username_and_duties(self, admin_headers):
        uname = f"test.qa{int(time.time())}"
        payload = {
            "username": uname, "password": "pass1234", "name": "TEST QA Guru",
            "role": "guru", "extra_duties": ["tabungan", "tahfidz"],
        }
        r = requests.post(f"{API}/users", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["username"] == uname
        assert set(j["extra_duties"]) == {"tabungan", "tahfidz"}
        assert j.get("email") is None
        TestUserCRUD.created_ids.append(j["id"])
        # Login as newly created guru with username
        r2 = _login(uname, "pass1234")
        assert r2.status_code == 200
        assert r2.json()["user"]["role"] == "guru"

    def test_username_too_short(self, admin_headers):
        r = requests.post(f"{API}/users", json={"username": "ab", "password": "pass1234", "name": "x", "role": "guru"}, headers=admin_headers)
        assert r.status_code == 400

    def test_username_with_space(self, admin_headers):
        r = requests.post(f"{API}/users", json={"username": "bad name", "password": "pass1234", "name": "x", "role": "guru"}, headers=admin_headers)
        assert r.status_code == 400

    def test_duplicate_username(self, admin_headers):
        uname = f"dup{int(time.time())}"
        r1 = requests.post(f"{API}/users", json={"username": uname, "password": "pass1234", "name": "dup", "role": "guru"}, headers=admin_headers)
        assert r1.status_code == 200
        TestUserCRUD.created_ids.append(r1.json()["id"])
        r2 = requests.post(f"{API}/users", json={"username": uname, "password": "pass1234", "name": "dup2", "role": "guru"}, headers=admin_headers)
        assert r2.status_code == 400

    def test_update_user_username_and_duties(self, admin_headers):
        # create then update
        uname = f"upd{int(time.time())}"
        c = requests.post(f"{API}/users", json={"username": uname, "password": "pass1234", "name": "Upd", "role": "guru", "extra_duties": ["tabungan"]}, headers=admin_headers)
        assert c.status_code == 200
        uid = c.json()["id"]
        TestUserCRUD.created_ids.append(uid)
        new_name = f"{uname}.v2"
        u = requests.put(f"{API}/users/{uid}", json={"username": new_name, "extra_duties": ["pramuka", "tartil"]}, headers=admin_headers)
        assert u.status_code == 200, u.text
        j = u.json()
        assert j["username"] == new_name
        assert set(j["extra_duties"]) == {"pramuka", "tartil"}

    @classmethod
    def teardown_class(cls):
        # cleanup
        r = _login("admin", "admin123")
        if r.status_code == 200:
            h = {"Authorization": f"Bearer {r.json()['access_token']}"}
            for uid in cls.created_ids:
                requests.delete(f"{API}/users/{uid}", headers=h)


# --------------- RBAC duty gating ---------------
class TestDutyRBAC:
    guru_ids = []
    guru_token = None
    student_id = None

    @classmethod
    def setup_class(cls):
        # Login admin
        r = _login("admin", "admin123")
        assert r.status_code == 200
        cls.admin_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

        # Create a guru with tabungan + tartil duties
        uname = f"rbac{int(time.time())}"
        c = requests.post(f"{API}/users", json={
            "username": uname, "password": "pass1234", "name": "RBAC Guru",
            "role": "guru", "extra_duties": ["tabungan", "tartil"],
        }, headers=cls.admin_headers)
        assert c.status_code == 200, c.text
        cls.guru_ids.append(c.json()["id"])
        gl = _login(uname, "pass1234")
        assert gl.status_code == 200
        cls.guru_token = gl.json()["access_token"]
        cls.guru_headers = {"Authorization": f"Bearer {cls.guru_token}"}

        # Fetch any student
        s = requests.get(f"{API}/students", params={"limit": 1}, headers=cls.admin_headers)
        assert s.status_code == 200
        items = s.json().get("items", [])
        cls.student_id = items[0]["id"] if items else None

    @classmethod
    def teardown_class(cls):
        for uid in cls.guru_ids:
            requests.delete(f"{API}/users/{uid}", headers=cls.admin_headers)

    def test_guru_savings_allowed(self):
        if not self.student_id:
            pytest.skip("no student seed")
        r = requests.post(f"{API}/savings", json={"student_id": self.student_id, "kind": "setoran", "amount": 1000, "note": "TEST rbac"}, headers=self.guru_headers)
        assert r.status_code in (200, 201), r.text

    def test_guru_tahfidz_forbidden(self):
        if not self.student_id:
            pytest.skip("no student seed")
        r = requests.post(f"{API}/tahfidz", json={"student_id": self.student_id, "surah": "Al-Fatihah", "ayat_from": 1, "ayat_to": 7, "status": "lancar"}, headers=self.guru_headers)
        assert r.status_code == 403

    def test_guru_attendance_tartil_allowed(self):
        if not self.student_id:
            pytest.skip("no student seed")
        r = requests.post(f"{API}/attendance/manual", json={"student_id": self.student_id, "type": "tartil", "status": "hadir"}, headers=self.guru_headers)
        assert r.status_code in (200, 201), r.text

    def test_guru_attendance_pramuka_forbidden(self):
        if not self.student_id:
            pytest.skip("no student seed")
        r = requests.post(f"{API}/attendance/manual", json={"student_id": self.student_id, "type": "pramuka", "status": "hadir"}, headers=self.guru_headers)
        assert r.status_code == 403

    def test_guru_attendance_datang_open(self):
        if not self.student_id:
            pytest.skip("no student seed")
        r = requests.post(f"{API}/attendance/manual", json={"student_id": self.student_id, "type": "datang", "status": "hadir"}, headers=self.guru_headers)
        assert r.status_code in (200, 201), r.text

    def test_admin_bypasses_all(self):
        if not self.student_id:
            pytest.skip("no student seed")
        r1 = requests.post(f"{API}/savings", json={"student_id": self.student_id, "kind": "setoran", "amount": 500, "note": "TEST"}, headers=self.admin_headers)
        assert r1.status_code in (200, 201)
        r2 = requests.post(f"{API}/tahfidz", json={"student_id": self.student_id, "surah": "An-Nas", "ayat_from": 1, "ayat_to": 6, "status": "lancar"}, headers=self.admin_headers)
        assert r2.status_code in (200, 201), r2.text
        r3 = requests.post(f"{API}/attendance/manual", json={"student_id": self.student_id, "type": "pramuka", "status": "hadir"}, headers=self.admin_headers)
        assert r3.status_code in (200, 201), r3.text


# --------------- Change password gating ---------------
class TestChangePassword:
    def test_guru_change_password_forbidden(self):
        r = _login("guru@mijannah.sch.id", "guru123")
        assert r.status_code == 200
        t = r.json()["access_token"]
        cp = requests.post(f"{API}/auth/change-password", json={"old_password": "guru123", "new_password": "newer123"}, headers={"Authorization": f"Bearer {t}"})
        assert cp.status_code == 403

    def test_siswa_change_password_forbidden(self):
        r = _login("siswa@mijannah.sch.id", "siswa123")
        assert r.status_code == 200
        t = r.json()["access_token"]
        cp = requests.post(f"{API}/auth/change-password", json={"old_password": "siswa123", "new_password": "newer123"}, headers={"Authorization": f"Bearer {t}"})
        assert cp.status_code == 403

    def test_admin_change_password_wrong_old(self):
        r = _login("admin", "admin123")
        t = r.json()["access_token"]
        cp = requests.post(f"{API}/auth/change-password", json={"old_password": "wrong", "new_password": "newer123"}, headers={"Authorization": f"Bearer {t}"})
        assert cp.status_code == 400


# --------------- Regression ---------------
class TestRegression:
    def test_students_list(self, admin_headers):
        r = requests.get(f"{API}/students", params={"limit": 5}, headers=admin_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_attendance_recap_datang(self, admin_headers):
        r = requests.get(f"{API}/attendance/recap", params={"type": "datang"}, headers=admin_headers)
        assert r.status_code == 200

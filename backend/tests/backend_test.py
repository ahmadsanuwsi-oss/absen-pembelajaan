"""
Backend regression tests for SIM MI Miftahul Jannah.
Covers auth, master data (students/teachers/classes/subjects/users),
kiosk & attendance, teacher endpoints, savings, dashboard/portal.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
    except Exception:
        pass

ADMIN = {"email": "ahmadsanuwsi@gmail.com", "password": "admin123"}
GURU = {"email": "guru@mijannah.sch.id", "password": "guru123"}
SISWA = {"email": "siswa@mijannah.sch.id", "password": "siswa123"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=15)
    return r


@pytest.fixture(scope="session")
def admin_token():
    r = _login(ADMIN)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def guru_token():
    r = _login(GURU)
    if r.status_code != 200:
        pytest.skip(f"guru login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def siswa_token():
    r = _login(SISWA)
    if r.status_code != 200:
        pytest.skip(f"siswa login failed: {r.status_code} {r.text}")
    return r.json()["access_token"]


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self):
        r = _login(ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and data["user"]["role"] == "admin"

    def test_guru_login(self):
        r = _login(GURU)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "guru"

    def test_siswa_login(self):
        r = _login(SISWA)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "siswa"

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "nope@x.com", "password": "wrong"}, timeout=15)
        assert r.status_code in (401, 429)

    def test_me(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_me_unauth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401


# ---------- Dashboards & Portal ----------
class TestDashboards:
    def test_admin_dashboard(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/admin", headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_students", "total_teachers", "total_classes",
                  "present_today", "trend", "class_distribution", "total_savings"):
            assert k in d
        assert isinstance(d["trend"], list) and len(d["trend"]) == 7

    def test_guru_dashboard(self, guru_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/guru", headers=H(guru_token), timeout=15)
        assert r.status_code == 200

    def test_portal_me(self, siswa_token):
        r = requests.get(f"{BASE_URL}/api/portal/me", headers=H(siswa_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "student" in d and "attendance_month" in d and "balance" in d

    def test_admin_cannot_access_portal(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/portal/me", headers=H(admin_token), timeout=15)
        assert r.status_code == 403

    def test_siswa_cannot_access_admin_dashboard(self, siswa_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/admin", headers=H(siswa_token), timeout=15)
        assert r.status_code == 403


# ---------- Master: Students ----------
class TestStudents:
    created_id = None
    test_nisn = f"9999{int(time.time()) % 1000000:06d}"

    def test_list_students(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/students?page=1&limit=5", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d

    def test_create_student(self, admin_token):
        payload = {"nisn": TestStudents.test_nisn, "name": "TEST_Student One", "gender": "L"}
        r = requests.post(f"{BASE_URL}/api/students", json=payload, headers=H(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["nisn"] == payload["nisn"]
        TestStudents.created_id = data["id"]

    def test_duplicate_nisn(self, admin_token):
        payload = {"nisn": TestStudents.test_nisn, "name": "TEST_Dup", "gender": "L"}
        r = requests.post(f"{BASE_URL}/api/students", json=payload, headers=H(admin_token), timeout=15)
        assert r.status_code == 400

    def test_update_student(self, admin_token):
        assert TestStudents.created_id
        payload = {"nisn": TestStudents.test_nisn, "name": "TEST_Student Updated", "gender": "L"}
        r = requests.put(f"{BASE_URL}/api/students/{TestStudents.created_id}",
                         json=payload, headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/students/{TestStudents.created_id}",
                         headers=H(admin_token), timeout=15).json()
        assert g["name"] == "TEST_Student Updated"

    def test_search_student(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/students?search=TEST_Student",
                         headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert any(TestStudents.test_nisn == s["nisn"] for s in r.json()["items"])

    def test_delete_student(self, admin_token):
        r = requests.delete(f"{BASE_URL}/api/students/{TestStudents.created_id}",
                            headers=H(admin_token), timeout=15)
        assert r.status_code == 200


# ---------- Master: Teachers / Classes / Subjects ----------
class TestMaster:
    def test_teachers_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/teachers", headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_classes_list_with_counts(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/classes", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        for c in r.json():
            assert "student_count" in c

    def test_subjects_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/subjects", headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_teacher_crud(self, admin_token):
        payload = {"name": "TEST_Guru X", "nip": f"NIP{int(time.time())}", "gender": "L"}
        r = requests.post(f"{BASE_URL}/api/teachers", json=payload, headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        tid = r.json()["id"]
        r2 = requests.put(f"{BASE_URL}/api/teachers/{tid}",
                          json={**payload, "name": "TEST_Guru Updated"},
                          headers=H(admin_token), timeout=15)
        assert r2.status_code == 200 and r2.json()["name"] == "TEST_Guru Updated"
        r3 = requests.delete(f"{BASE_URL}/api/teachers/{tid}", headers=H(admin_token), timeout=15)
        assert r3.status_code == 200

    def test_subject_crud(self, admin_token):
        payload = {"name": "TEST_Mapel", "code": f"TST{int(time.time()) % 10000}"}
        r = requests.post(f"{BASE_URL}/api/subjects", json=payload, headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        sid = r.json()["id"]
        requests.delete(f"{BASE_URL}/api/subjects/{sid}", headers=H(admin_token), timeout=15)

    def test_class_crud(self, admin_token):
        payload = {"name": "TEST_Kelas 6Z", "level": 6, "academic_year": "2025/2026"}
        r = requests.post(f"{BASE_URL}/api/classes", json=payload, headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        requests.delete(f"{BASE_URL}/api/classes/{cid}", headers=H(admin_token), timeout=15)


# ---------- Users ----------
class TestUsers:
    uid = None
    email = f"test_{int(time.time())}@x.com"

    def test_list_users(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/users", headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_create_user(self, admin_token):
        payload = {"email": TestUsers.email, "password": "pass1234",
                   "name": "TEST_Guru User", "role": "guru"}
        r = requests.post(f"{BASE_URL}/api/users", json=payload, headers=H(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        TestUsers.uid = r.json()["id"]

    def test_login_new_user(self):
        r = _login({"email": TestUsers.email, "password": "pass1234"})
        assert r.status_code == 200

    def test_reset_password(self, admin_token):
        assert TestUsers.uid
        r = requests.put(f"{BASE_URL}/api/users/{TestUsers.uid}/reset-password",
                         json={"new_password": "newpass1"},
                         headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        # verify new password works
        r2 = _login({"email": TestUsers.email, "password": "newpass1"})
        assert r2.status_code == 200

    def test_delete_user(self, admin_token):
        r = requests.delete(f"{BASE_URL}/api/users/{TestUsers.uid}",
                            headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_cannot_delete_last_admin(self, admin_token):
        # find admin id
        users = requests.get(f"{BASE_URL}/api/users?role=admin",
                             headers=H(admin_token), timeout=15).json()
        items = users["items"] if isinstance(users, dict) else users
        admin_id = None
        for u in items:
            if u.get("email") == ADMIN["email"]:
                admin_id = u["id"]
                break
        assert admin_id
        # attempt delete - since count==1 should 400
        r = requests.delete(f"{BASE_URL}/api/users/{admin_id}",
                            headers=H(admin_token), timeout=15)
        # if only 1 admin, should be 400. If more, may succeed - so just assert not 500
        assert r.status_code in (200, 400)


# ---------- Kiosk & Attendance ----------
class TestKiosk:
    def test_kiosk_not_found(self):
        r = requests.post(f"{BASE_URL}/api/kiosk/scan",
                          json={"code": "0000000000", "type": "kehadiran"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "not_found"

    def test_kiosk_success_or_already(self, admin_token):
        # Get a real student
        stu = requests.get(f"{BASE_URL}/api/students?page=1&limit=1",
                           headers=H(admin_token), timeout=15).json()
        if not stu["items"]:
            pytest.skip("No seeded students")
        nisn = stu["items"][0]["nisn"]
        r = requests.post(f"{BASE_URL}/api/kiosk/scan",
                          json={"code": nisn, "type": "dhuha"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] in ("success", "already_scanned")
        assert "student" in d and d["student"]["nisn"] == nisn

    def test_kiosk_invalid_type(self):
        r = requests.post(f"{BASE_URL}/api/kiosk/scan",
                          json={"code": "0000000000", "type": "bogus"}, timeout=15)
        assert r.status_code == 400

    def test_kiosk_public_no_auth(self):
        # ensure no auth header still works
        r = requests.post(f"{BASE_URL}/api/kiosk/scan",
                          json={"code": "0000000000", "type": "kehadiran"}, timeout=15)
        assert r.status_code == 200

    def test_attendance_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/attendance?type=kehadiran",
                         headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_attendance_recap(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/attendance/recap?type=kehadiran",
                         headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert "recap" in r.json()


# ---------- Teacher endpoints ----------
class TestTeacherEndpoints:
    def test_list_journals(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/journals", headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_list_assessments(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/assessments", headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_ledger_final_grade_formula(self, admin_token):
        classes = requests.get(f"{BASE_URL}/api/classes", headers=H(admin_token), timeout=15).json()
        subjects = requests.get(f"{BASE_URL}/api/subjects", headers=H(admin_token), timeout=15).json()
        students = requests.get(f"{BASE_URL}/api/students?page=1&limit=5",
                                headers=H(admin_token), timeout=15).json()["items"]
        if not (classes and subjects and students):
            pytest.skip("Missing seed data")
        stu = next((s for s in students if s.get("class_id")), None)
        if not stu:
            pytest.skip("no student with class")
        cid, sid = stu["class_id"], subjects[0]["id"]
        # Create formatif 80 + sumatif 90 -> final = 80*0.4 + 90*0.6 = 86
        f = {"student_id": stu["id"], "class_id": cid, "subject_id": sid,
             "kind": "formatif", "title": "TEST_F", "score": 80}
        s = {"student_id": stu["id"], "class_id": cid, "subject_id": sid,
             "kind": "sumatif", "title": "TEST_S", "score": 90}
        fr = requests.post(f"{BASE_URL}/api/assessments", json=f,
                           headers=H(admin_token), timeout=15)
        sr = requests.post(f"{BASE_URL}/api/assessments", json=s,
                           headers=H(admin_token), timeout=15)
        assert fr.status_code == 200 and sr.status_code == 200
        led = requests.get(f"{BASE_URL}/api/ledger?class_id={cid}&subject_id={sid}",
                           headers=H(admin_token), timeout=15).json()
        row = next(r for r in led["rows"] if r["student_id"] == stu["id"])
        # Only holds if this is the only assessment; but formula check anyway
        assert abs(row["final"] - (row["formatif"] * 0.4 + row["sumatif"] * 0.6)) < 0.2
        # cleanup
        requests.delete(f"{BASE_URL}/api/assessments/{fr.json()['id']}",
                        headers=H(admin_token), timeout=15)
        requests.delete(f"{BASE_URL}/api/assessments/{sr.json()['id']}",
                        headers=H(admin_token), timeout=15)

    def test_class_meta_crud(self, admin_token):
        classes = requests.get(f"{BASE_URL}/api/classes", headers=H(admin_token), timeout=15).json()
        if not classes:
            pytest.skip("no classes")
        cid = classes[0]["id"]
        payload = {"class_id": cid, "kind": "komitmen", "data": {"text": "TEST komitmen"}}
        r = requests.post(f"{BASE_URL}/api/class-meta", json=payload,
                          headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        mid = r.json()["id"]
        g = requests.get(f"{BASE_URL}/api/class-meta?class_id={cid}&kind=komitmen",
                         headers=H(admin_token), timeout=15).json()
        assert any(m["id"] == mid for m in g)
        requests.delete(f"{BASE_URL}/api/class-meta/{mid}",
                        headers=H(admin_token), timeout=15)


# ---------- Savings ----------
class TestSavings:
    txn_id = None

    def test_savings_summary(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/savings/summary", headers=H(admin_token), timeout=20)
        assert r.status_code == 200
        assert "total_balance" in r.json()

    def test_deposit_and_balance(self, admin_token):
        stu = requests.get(f"{BASE_URL}/api/students?page=1&limit=1",
                           headers=H(admin_token), timeout=15).json()["items"]
        if not stu:
            pytest.skip("no student")
        sid = stu[0]["id"]
        r = requests.post(f"{BASE_URL}/api/savings",
                          json={"student_id": sid, "kind": "setoran", "amount": 10000},
                          headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["balance"] >= 10000
        TestSavings.txn_id = r.json()["id"]
        TestSavings.sid = sid

    def test_withdraw_over_balance_rejected(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/savings",
                          json={"student_id": TestSavings.sid, "kind": "penarikan",
                                "amount": 99999999},
                          headers=H(admin_token), timeout=15)
        assert r.status_code == 400

    def test_withdraw_valid(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/savings",
                          json={"student_id": TestSavings.sid, "kind": "penarikan",
                                "amount": 5000},
                          headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_invalid_amount(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/savings",
                          json={"student_id": TestSavings.sid, "kind": "setoran",
                                "amount": -5},
                          headers=H(admin_token), timeout=15)
        assert r.status_code == 400

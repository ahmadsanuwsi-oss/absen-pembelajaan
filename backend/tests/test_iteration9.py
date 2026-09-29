"""Iteration 9 tests: guru dashboard scoping, is_wali flag, students/teachers import."""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/") + "/api"


def _login(identifier, password):
    r = requests.post(f"{BASE}/auth/login", json={"identifier": identifier, "password": password})
    assert r.status_code == 200, f"Login failed {identifier}: {r.status_code} {r.text}"
    data = r.json()
    # normalize token key
    data["token"] = data.get("token") or data.get("access_token")
    return data


@pytest.fixture(scope="module")
def admin_token():
    return _login("admin", "admin123")["token"]


@pytest.fixture(scope="module")
def guru_login():
    return _login("guru@mijannah.sch.id", "guru123")


def H(token):
    return {"Authorization": f"Bearer {token}"}


# --- is_wali flag ---
def test_login_returns_is_wali_true_for_demo_guru(guru_login):
    assert guru_login["user"].get("is_wali") is True


def test_me_returns_is_wali_true(guru_login):
    r = requests.get(f"{BASE}/auth/me", headers=H(guru_login["token"]))
    assert r.status_code == 200
    assert r.json().get("is_wali") is True


# --- guru dashboard scoping ---
def test_guru_dashboard_scoped(guru_login, admin_token):
    rg = requests.get(f"{BASE}/dashboard/guru", headers=H(guru_login["token"]))
    assert rg.status_code == 200
    g = rg.json()
    ra = requests.get(f"{BASE}/dashboard/admin", headers=H(admin_token))
    assert ra.status_code == 200
    a = ra.json()
    # Scoped counts should be <= school-wide
    assert g["class_students"] <= a["total_students"]
    # Guru total_assessments/tahfidz keys exist
    assert "total_assessments" in g and "total_tahfidz" in g


# --- Non-wali guru: is_wali=false, no wali class ---
@pytest.fixture(scope="module")
def non_wali_user(admin_token):
    payload = {
        "username": "test_nonwali_it9",
        "password": "test1234",
        "name": "TEST NonWali Guru",
        "role": "guru",
        "email": "test_nonwali_it9@example.com",
        "extra_duties": ["tabungan"],
    }
    r = requests.post(f"{BASE}/users", json=payload, headers=H(admin_token))
    assert r.status_code == 200, r.text
    u = r.json()
    yield u
    requests.delete(f"{BASE}/users/{u['id']}", headers=H(admin_token))


def test_non_wali_guru_login_is_wali_false(non_wali_user):
    l = _login("test_nonwali_it9", "test1234")
    assert l["user"].get("is_wali") is False
    r = requests.get(f"{BASE}/auth/me", headers=H(l["token"]))
    assert r.status_code == 200
    assert r.json().get("is_wali") is False


# --- Students import ---
def test_students_import_create_then_update(admin_token):
    nisn = "9990001234"
    rows = [{"nisn": nisn, "name": "TEST Import Student", "class_name": "1A", "gender": "Perempuan", "parent_phone": "081200000000"}]
    r1 = requests.post(f"{BASE}/students/import", json={"rows": rows}, headers=H(admin_token))
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    assert d1["created"] + d1["updated"] == 1
    # Re-import updates
    r2 = requests.post(f"{BASE}/students/import", json={"rows": rows}, headers=H(admin_token))
    d2 = r2.json()
    assert d2["updated"] == 1 and d2["created"] == 0
    # Verify class_id mapping and gender P
    s = requests.get(f"{BASE}/students?search={nisn}", headers=H(admin_token)).json()
    assert s["items"], "Student not found after import"
    st = s["items"][0]
    assert st["gender"] == "P"
    assert st["class_name"] == "1A"
    # cleanup
    requests.delete(f"{BASE}/students/{st['id']}", headers=H(admin_token))


# --- Teachers import ---
def test_teachers_import_create_then_update(admin_token):
    nip = "TEST999NIP001"
    rows = [{"name": "TEST Import Teacher", "nip": nip, "gender": "Laki-laki", "phone": "081300000000", "is_wali_kelas": "Ya"}]
    r1 = requests.post(f"{BASE}/teachers/import", json={"rows": rows}, headers=H(admin_token))
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    assert d1["created"] + d1["updated"] == 1
    r2 = requests.post(f"{BASE}/teachers/import", json={"rows": rows}, headers=H(admin_token))
    d2 = r2.json()
    assert d2["updated"] == 1 and d2["created"] == 0
    t = requests.get(f"{BASE}/teachers?search={nip}", headers=H(admin_token)).json()
    assert t["items"]
    tt = t["items"][0]
    assert tt["gender"] == "L"
    assert tt["is_wali_kelas"] is True
    requests.delete(f"{BASE}/teachers/{tt['id']}", headers=H(admin_token))


# --- Regression: guru scoping on classes ---
def test_guru_sees_only_accessible_classes(guru_login):
    r = requests.get(f"{BASE}/classes", headers=H(guru_login["token"]))
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    # demo guru is wali of 1A; must include 1A
    assert "1A" in names

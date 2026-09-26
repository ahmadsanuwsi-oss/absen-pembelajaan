"""Iteration 5: WA log search + status filter."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://manajemen-nilai-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "ahmadsanuwsi@gmail.com", "password": "admin123"}
GURU = {"email": "guru@mijannah.sch.id", "password": "guru123"}
SISWA = {"email": "siswa@mijannah.sch.id", "password": "siswa123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def guru_token():
    return _login(GURU)


@pytest.fixture(scope="module")
def siswa_token():
    return _login(SISWA)


class TestWaLogFilters:
    def test_no_filter_returns_list(self, admin_token):
        r = requests.get(f"{API}/wa-log", headers=H(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert "logs" in data and isinstance(data["logs"], list)

    def test_status_skipped(self, admin_token):
        r = requests.get(f"{API}/wa-log", headers=H(admin_token), params={"status": "skipped"})
        assert r.status_code == 200
        for l in r.json()["logs"]:
            assert l.get("status") == "skipped"

    def test_status_failed(self, admin_token):
        r = requests.get(f"{API}/wa-log", headers=H(admin_token), params={"status": "failed"})
        assert r.status_code == 200
        for l in r.json()["logs"]:
            assert l.get("status") == "failed"

    def test_status_ok(self, admin_token):
        r = requests.get(f"{API}/wa-log", headers=H(admin_token), params={"status": "ok"})
        assert r.status_code == 200
        for l in r.json()["logs"]:
            assert l.get("status") == "ok"

    def test_search_443(self, admin_token):
        r = requests.get(f"{API}/wa-log", headers=H(admin_token), params={"search": "443"})
        assert r.status_code == 200
        logs = r.json()["logs"]
        for l in logs:
            hay = (l.get("target", "") + " " + (l.get("context") or "")).lower()
            assert "443" in hay

    def test_search_combined_with_status(self, admin_token):
        r = requests.get(f"{API}/wa-log", headers=H(admin_token), params={"search": "443", "status": "skipped"})
        assert r.status_code == 200
        for l in r.json()["logs"]:
            assert l.get("status") == "skipped"
            hay = (l.get("target", "") + " " + (l.get("context") or "")).lower()
            assert "443" in hay

    def test_limit_cap_500(self, admin_token):
        r = requests.get(f"{API}/wa-log", headers=H(admin_token), params={"limit": 100000})
        assert r.status_code == 200
        assert len(r.json()["logs"]) <= 500

    def test_limit_small(self, admin_token):
        r = requests.get(f"{API}/wa-log", headers=H(admin_token), params={"limit": 2})
        assert r.status_code == 200
        assert len(r.json()["logs"]) <= 2

    def test_guru_forbidden(self, guru_token):
        r = requests.get(f"{API}/wa-log", headers=H(guru_token))
        assert r.status_code == 403

    def test_siswa_forbidden(self, siswa_token):
        r = requests.get(f"{API}/wa-log", headers=H(siswa_token))
        assert r.status_code == 403

    def test_unauth_forbidden(self):
        r = requests.get(f"{API}/wa-log")
        assert r.status_code in (401, 403)


class TestRegression:
    def test_admin_login_returns_role(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200
        assert r.json().get("user", {}).get("role") == "admin"

    def test_classes_list(self, admin_token):
        r = requests.get(f"{API}/classes", headers=H(admin_token))
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_rapor_endpoint(self, admin_token):
        r = requests.get(f"{API}/students", headers=H(admin_token), params={"limit": 1})
        assert r.status_code == 200
        items = r.json().get("items", [])
        if not items:
            pytest.skip("no students")
        sid = items[0]["id"]
        rr = requests.get(f"{API}/report/rapor/{sid}", headers=H(admin_token))
        assert rr.status_code == 200
        d = rr.json()
        assert "student" in d and "grades" in d and "school" in d

"""Iteration 8: Per-duty class checklist + class-scoped guru access.
Covers: teaching_class_ids, mapel_ids, duty_classes scoping across
classes/subjects/students/assessments/ledger/savings/tahfidz + admin non-scoping regression + wali auto-include.
"""
import os
import uuid
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def _login(identifier, password):
    r = requests.post(f"{BASE}/api/auth/login", json={"identifier": identifier, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"], r.json()["user"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def admin_tok():
    tok, _ = _login("admin", "admin123")
    return tok


@pytest.fixture(scope="module")
def refs(admin_tok):
    classes = requests.get(f"{BASE}/api/classes", headers=_h(admin_tok)).json()
    assert len(classes) >= 2
    c1a = next((c for c in classes if c["name"] == "1A"), classes[0])
    other = next((c for c in classes if c["id"] != c1a["id"]), classes[1])
    subjects = requests.get(f"{BASE}/api/subjects", headers=_h(admin_tok)).json()
    assert len(subjects) >= 2
    return {"c1a": c1a, "other": other, "subjects": subjects, "all_classes": classes}


@pytest.fixture(scope="module")
def scoped_guru(admin_tok, refs):
    """Create a guru scoped to 1A: mapel[0], teaching=[1A], tabungan=[1A]."""
    uname = f"testg8_{uuid.uuid4().hex[:6]}"
    payload = {
        "username": uname, "password": "guru12345", "name": "Guru Test Iter8",
        "role": "guru", "extra_duties": ["tabungan"],
        "duty_classes": {"tabungan": [refs["c1a"]["id"]]},
        "mapel_ids": [refs["subjects"][0]["id"]],
        "teaching_class_ids": [refs["c1a"]["id"]],
    }
    r = requests.post(f"{BASE}/api/users", json=payload, headers=_h(admin_tok))
    assert r.status_code == 200, r.text
    uid = r.json()["id"]
    tok, u = _login(uname, "guru12345")
    yield {"uid": uid, "tok": tok, "username": uname, "user": u}
    requests.delete(f"{BASE}/api/users/{uid}", headers=_h(admin_tok))


# ---------------- Create/edit user w/ new fields ----------------
class TestUserAccountFields:
    def test_create_persists_new_fields(self, admin_tok, scoped_guru, refs):
        r = requests.get(f"{BASE}/api/users?search={scoped_guru['username']}", headers=_h(admin_tok))
        assert r.status_code == 200
        items = r.json()["items"]
        u = next(x for x in items if x["id"] == scoped_guru["uid"])
        assert u["teaching_class_ids"] == [refs["c1a"]["id"]]
        assert u["mapel_ids"] == [refs["subjects"][0]["id"]]
        assert u["duty_classes"] == {"tabungan": [refs["c1a"]["id"]]}
        assert u["extra_duties"] == ["tabungan"]

    def test_update_rescoped(self, admin_tok, scoped_guru, refs):
        new_subj = refs["subjects"][1]["id"]
        payload = {"mapel_ids": [new_subj], "teaching_class_ids": [refs["c1a"]["id"], refs["other"]["id"]]}
        r = requests.put(f"{BASE}/api/users/{scoped_guru['uid']}", json=payload, headers=_h(admin_tok))
        assert r.status_code == 200, r.text
        assert r.json()["mapel_ids"] == [new_subj]
        assert refs["other"]["id"] in r.json()["teaching_class_ids"]
        # revert
        requests.put(f"{BASE}/api/users/{scoped_guru['uid']}", json={
            "mapel_ids": [refs["subjects"][0]["id"]],
            "teaching_class_ids": [refs["c1a"]["id"]],
        }, headers=_h(admin_tok))


# ---------------- Guru scoping ----------------
class TestGuruScoping:
    def test_classes_filtered(self, scoped_guru, refs):
        r = requests.get(f"{BASE}/api/classes", headers=_h(scoped_guru["tok"]))
        assert r.status_code == 200
        ids = {c["id"] for c in r.json()}
        assert ids == {refs["c1a"]["id"]}, f"expected only 1A, got {ids}"

    def test_subjects_filtered(self, scoped_guru, refs):
        r = requests.get(f"{BASE}/api/subjects", headers=_h(scoped_guru["tok"]))
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert ids == [refs["subjects"][0]["id"]]

    def test_students_scoped(self, scoped_guru, refs):
        r_other = requests.get(f"{BASE}/api/students?class_id={refs['other']['id']}", headers=_h(scoped_guru["tok"]))
        assert r_other.status_code == 403
        r_ok = requests.get(f"{BASE}/api/students?class_id={refs['c1a']['id']}", headers=_h(scoped_guru["tok"]))
        assert r_ok.status_code == 200

    def test_assessments_rbac(self, scoped_guru, refs, admin_tok):
        # get one student in 1A
        stu = requests.get(f"{BASE}/api/students?class_id={refs['c1a']['id']}", headers=_h(admin_tok)).json()
        if not stu["items"]:
            pytest.skip("No student in 1A")
        sid = stu["items"][0]["id"]
        subj_assigned = refs["subjects"][0]["id"]
        subj_other = refs["subjects"][1]["id"]

        # wrong class
        p = {"student_id": sid, "class_id": refs["other"]["id"], "subject_id": subj_assigned,
             "kind": "formatif", "title": "T", "score": 80}
        assert requests.post(f"{BASE}/api/assessments", json=p, headers=_h(scoped_guru["tok"])).status_code == 403
        # wrong subject
        p2 = {**p, "class_id": refs["c1a"]["id"], "subject_id": subj_other}
        assert requests.post(f"{BASE}/api/assessments", json=p2, headers=_h(scoped_guru["tok"])).status_code == 403
        # ok
        p3 = {**p, "class_id": refs["c1a"]["id"], "subject_id": subj_assigned}
        r = requests.post(f"{BASE}/api/assessments", json=p3, headers=_h(scoped_guru["tok"]))
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        requests.delete(f"{BASE}/api/assessments/{aid}", headers=_h(scoped_guru["tok"]))

    def test_ledger_scoped(self, scoped_guru, refs):
        r = requests.get(f"{BASE}/api/ledger?class_id={refs['other']['id']}", headers=_h(scoped_guru["tok"]))
        assert r.status_code == 403
        r2 = requests.get(f"{BASE}/api/ledger?class_id={refs['c1a']['id']}", headers=_h(scoped_guru["tok"]))
        assert r2.status_code == 200

    def test_savings_scoped(self, scoped_guru, refs, admin_tok):
        summary = requests.get(f"{BASE}/api/savings/summary", headers=_h(scoped_guru["tok"])).json()
        # all summary rows must belong to 1A
        c1a_stu = requests.get(f"{BASE}/api/students?class_id={refs['c1a']['id']}&limit=200", headers=_h(admin_tok)).json()
        c1a_ids = {s["id"] for s in c1a_stu["items"]}
        for row in summary["rows"]:
            assert row["student_id"] in c1a_ids

        # get non-1A student
        other_stu = requests.get(f"{BASE}/api/students?class_id={refs['other']['id']}&limit=1", headers=_h(admin_tok)).json()
        if other_stu["items"]:
            oid = other_stu["items"][0]["id"]
            r = requests.post(f"{BASE}/api/savings", json={"student_id": oid, "kind": "setoran", "amount": 1000}, headers=_h(scoped_guru["tok"]))
            assert r.status_code == 403
        if c1a_stu["items"]:
            sid = c1a_stu["items"][0]["id"]
            r = requests.post(f"{BASE}/api/savings", json={"student_id": sid, "kind": "setoran", "amount": 500}, headers=_h(scoped_guru["tok"]))
            assert r.status_code == 200, r.text
            # cleanup
            requests.delete(f"{BASE}/api/savings/txn/{r.json()['id']}", headers=_h(admin_tok))

    def test_tahfidz_requires_duty(self, scoped_guru, refs, admin_tok):
        c1a_stu = requests.get(f"{BASE}/api/students?class_id={refs['c1a']['id']}&limit=1", headers=_h(admin_tok)).json()
        if not c1a_stu["items"]:
            pytest.skip("no student")
        sid = c1a_stu["items"][0]["id"]
        r = requests.post(f"{BASE}/api/tahfidz", json={"student_id": sid, "surah": "An-Naba", "ayat_from": 1, "ayat_to": 5}, headers=_h(scoped_guru["tok"]))
        assert r.status_code == 403


# ---------------- Regressions ----------------
class TestAdminNotScoped:
    def test_admin_sees_all_classes(self, admin_tok):
        r = requests.get(f"{BASE}/api/classes", headers=_h(admin_tok))
        assert r.status_code == 200
        assert len(r.json()) >= 10  # ~12 expected

    def test_admin_can_assess_any_class(self, admin_tok, refs):
        stu = requests.get(f"{BASE}/api/students?class_id={refs['other']['id']}&limit=1", headers=_h(admin_tok)).json()
        if not stu["items"]:
            pytest.skip("no student")
        p = {"student_id": stu["items"][0]["id"], "class_id": refs["other"]["id"],
             "subject_id": refs["subjects"][1]["id"], "kind": "formatif", "title": "AdmT", "score": 90}
        r = requests.post(f"{BASE}/api/assessments", json=p, headers=_h(admin_tok))
        assert r.status_code == 200
        requests.delete(f"{BASE}/api/assessments/{r.json()['id']}", headers=_h(admin_tok))


class TestWaliAutoInclude:
    def test_demo_guru_wali_1a(self, refs):
        tok, u = _login("guru@mijannah.sch.id", "guru123")
        r = requests.get(f"{BASE}/api/classes", headers=_h(tok))
        assert r.status_code == 200
        names = [c["name"] for c in r.json()]
        assert "1A" in names, f"wali guru should see 1A; got {names}"


class TestUsernameLoginRegression:
    def test_admin_username(self):
        r = requests.post(f"{BASE}/api/auth/login", json={"identifier": "admin", "password": "admin123"})
        assert r.status_code == 200

    def test_guru_email(self):
        r = requests.post(f"{BASE}/api/auth/login", json={"identifier": "guru@mijannah.sch.id", "password": "guru123"})
        assert r.status_code == 200

    def test_invalid_username_400(self, admin_tok):
        r = requests.post(f"{BASE}/api/users", json={"username": "AB", "password": "x", "name": "x", "role": "guru"}, headers=_h(admin_tok))
        assert r.status_code == 400

    def test_change_password_guru_403(self):
        tok, _ = _login("guru@mijannah.sch.id", "guru123")
        r = requests.post(f"{BASE}/api/auth/change-password", json={"old_password": "guru123", "new_password": "newpw123"}, headers=_h(tok))
        assert r.status_code == 403

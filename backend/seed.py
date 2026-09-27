import random
from datetime import datetime, timezone, timedelta
from db import db, now_iso, new_id
from auth import hash_password, verify_password

FIRST_NAMES_L = ["Ahmad", "Muhammad", "Abdullah", "Fauzan", "Rizky", "Hafiz", "Zaid", "Yusuf", "Ali", "Ibrahim", "Umar", "Bilal"]
FIRST_NAMES_P = ["Aisyah", "Fatimah", "Khadijah", "Zahra", "Nadia", "Salsabila", "Maryam", "Halimah", "Aqila", "Nisrina", "Hafshah", "Syifa"]
LAST_NAMES = ["Ramadhan", "Nugroho", "Pratama", "Hidayat", "Maulana", "Firdaus", "Wijaya", "Saputra", "Anugrah", "Kurniawan"]
SUBJECTS = [("Pendidikan Agama Islam", "PAI"), ("Bahasa Indonesia", "BIN"), ("Matematika", "MTK"), ("IPAS", "IPAS"), ("PPKn", "PKN"), ("Bahasa Arab", "BAR"), ("Seni Budaya", "SBD"), ("PJOK", "PJK")]
SURAHS = ["An-Naba", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Muthaffifin", "Al-Insyiqaq", "Al-Buruj", "Ath-Thariq", "Al-A'la"]
TAHFIDZ_STATUS = ["ziyadah", "muraja'ah", "lancar", "mutqin"]


async def seed_data():
    if await db.students.count_documents({}) > 0:
        return  # already seeded
    # Classes 1A-6B
    class_ids = {}
    for level in range(1, 7):
        for sec in ["A", "B"]:
            cid = new_id()
            name = f"{level}{sec}"
            class_ids[name] = cid
            await db.classes.insert_one({"id": cid, "name": name, "level": level, "wali_kelas_id": None, "academic_year": "2025/2026", "created_at": now_iso()})

    # Subjects
    subject_ids = []
    for name, code in SUBJECTS:
        sid = new_id()
        subject_ids.append(sid)
        await db.subjects.insert_one({"id": sid, "name": name, "code": code, "created_at": now_iso()})

    # Teachers
    teacher_ids = []
    class_names = list(class_ids.keys())
    for i in range(12):
        tid = new_id()
        teacher_ids.append(tid)
        gender = "L" if i % 2 == 0 else "P"
        fname = random.choice(FIRST_NAMES_L if gender == "L" else FIRST_NAMES_P)
        name = f"{'Ust. ' if gender=='L' else 'Usth. '}{fname} {random.choice(LAST_NAMES)}, S.Pd"
        await db.teachers.insert_one({"id": tid, "name": name, "nip": f"1985{random.randint(1000000000,9999999999)}", "gender": gender, "phone": f"0812{random.randint(10000000,99999999)}", "is_wali_kelas": i < len(class_names), "created_at": now_iso()})
        # assign as wali kelas
        if i < len(class_names):
            await db.classes.update_one({"id": class_ids[class_names[i]]}, {"$set": {"wali_kelas_id": tid}})

    # Students (24)
    nisn_base = 1000000000
    student_records = []
    for i in range(24):
        sid = new_id()
        gender = "L" if i % 2 == 0 else "P"
        fname = random.choice(FIRST_NAMES_L if gender == "L" else FIRST_NAMES_P)
        name = f"{fname} {random.choice(LAST_NAMES)}"
        nisn = str(nisn_base + i * 7 + random.randint(1, 6))
        cid = class_ids[class_names[i % len(class_names)]]
        doc = {
            "id": sid, "nisn": nisn, "name": name, "class_id": cid, "gender": gender,
            "rfid_uid": f"RF{random.randint(100000,999999)}", "birth_place": "Jakarta",
            "birth_date": f"201{random.randint(2,7)}-0{random.randint(1,9)}-1{random.randint(0,9)}",
            "parent_name": f"Bpk. {random.choice(LAST_NAMES)}", "parent_phone": f"0813{random.randint(10000000,99999999)}",
            "photo_url": None, "created_at": now_iso(),
        }
        student_records.append(doc)
        await db.students.insert_one(doc)

    # Attendance for last 7 days
    for day_offset in range(7):
        d = (datetime.now(timezone.utc) + timedelta(hours=7) - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        for s in student_records:
            if random.random() < 0.85:
                status = "terlambat" if random.random() < 0.12 else "hadir"
                await db.attendance.insert_one({"id": new_id(), "student_id": s["id"], "type": "kehadiran", "date": d, "time": f"0{random.randint(6,7)}:{random.randint(10,59)}:00", "status": status, "source": "kiosk", "created_at": now_iso()})

    # Assessments
    for s in student_records:
        for subj in subject_ids[:5]:
            for kind in ["formatif", "sumatif"]:
                await db.assessments.insert_one({"id": new_id(), "student_id": s["id"], "class_id": s["class_id"], "subject_id": subj, "kind": kind, "title": f"{'Asesmen Formatif' if kind=='formatif' else 'Sumatif Akhir'} 1", "score": random.randint(70, 98), "date": now_iso()[:10], "description": "", "created_at": now_iso()})

    # Tahfidz
    for s in student_records:
        for _ in range(random.randint(1, 3)):
            af = random.randint(1, 20)
            await db.tahfidz.insert_one({"id": new_id(), "student_id": s["id"], "surah": random.choice(SURAHS), "ayat_from": af, "ayat_to": af + random.randint(1, 10), "status": random.choice(TAHFIDZ_STATUS), "date": now_iso()[:10], "note": "", "created_at": now_iso()})

    # Savings
    for s in student_records:
        bal = 0
        for _ in range(random.randint(2, 6)):
            amt = random.choice([5000, 10000, 15000, 20000, 25000])
            await db.savings.insert_one({"id": new_id(), "student_id": s["id"], "kind": "setoran", "amount": amt, "note": "Setoran rutin", "date": now_iso()[:10], "operator": "Administrator MI", "created_at": now_iso()})
            bal += amt

    # Journals
    for tid in teacher_ids[:6]:
        cls = await db.classes.find_one({"wali_kelas_id": tid}, {"_id": 0})
        if cls:
            await db.journals.insert_one({"id": new_id(), "class_id": cls["id"], "subject_id": subject_ids[0], "date": now_iso()[:10], "material": "Mengenal Rukun Iman", "method": "Ceramah & Diskusi", "notes": "Siswa antusias mengikuti pelajaran", "teacher_id": tid, "created_at": now_iso()})

    # Link user accounts: one guru (wali 1A) and one siswa
    first_teacher = await db.teachers.find_one({}, {"_id": 0})
    if first_teacher:
        await db.users.insert_one({"id": new_id(), "email": "guru@mijannah.sch.id", "password_hash": hash_password("guru123"), "name": first_teacher["name"], "role": "guru", "student_id": None, "teacher_id": first_teacher["id"], "created_at": now_iso()})
    first_student = student_records[0]
    await db.users.insert_one({"id": new_id(), "email": "siswa@mijannah.sch.id", "password_hash": hash_password("siswa123"), "name": first_student["name"], "role": "siswa", "student_id": first_student["id"], "teacher_id": None, "created_at": now_iso()})


async def ensure_demo_accounts():
    # Idempotent: re-apply demo passwords on every startup so they never drift.
    demos = [("guru@mijannah.sch.id", "guru123"), ("siswa@mijannah.sch.id", "siswa123")]
    for email, pw in demos:
        existing = await db.users.find_one({"email": email})
        if existing and not verify_password(pw, existing["password_hash"]):
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})


async def ensure_indexes():
    try:
        await db.users.drop_index("email_1")
    except Exception:
        pass
    try:
        await db.users.drop_index("username_1")
    except Exception:
        pass
    # partialFilterExpression instead of sparse=True so that documents
    # with an explicit null value are also excluded from uniqueness.
    await db.users.create_index(
        "email", unique=True,
        partialFilterExpression={"email": {"$type": "string"}},
    )
    await db.users.create_index(
        "username", unique=True,
        partialFilterExpression={"username": {"$type": "string"}},
    )
    await db.students.create_index("nisn")
    await db.students.create_index("rfid_uid")
    await db.students.create_index("class_id")
    await db.attendance.create_index([("student_id", 1), ("type", 1), ("date", 1)])
    await db.login_attempts.create_index("identifier")

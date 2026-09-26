# PRD — SIM MI Miftahul Jannah

## Original Problem Statement
Sistem manajemen sekolah berbasis web untuk MI Miftahul Jannah (Madrasah Ibtidaiyah), full online: absensi kiosk (RFID + lookup NISN), nilai Kurikulum Merdeka, tahfidz, tabungan, jurnal guru, manajemen data, dengan auth role-based (Admin, Guru, Siswa).

## User Decisions (locked)
- Auth: JWT custom, akun dibuat oleh Admin (no self-register). Reset password manual oleh Admin (no email).
- OCR dilewati: NISN diambil langsung dari database (RFID keyboard-emulation + ketik NISN). Tidak pakai Gemini/AI.
- Scope: bangun semua fitur sekaligus.
- Tema maroon + gold, identitas Islami, logo SVG crest.

## Architecture
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, recharts, sonner, lucide-react. JWT Bearer token di localStorage (`sim_token`).
- Backend: FastAPI modular — auth.py, routes_master.py, routes_attendance.py, routes_teacher.py, routes_savings.py, routes_dashboard.py, seed.py, db.py. Semua route prefix `/api`.
- DB: MongoDB (uuid string ids, ISO datetime strings). Indexes pada users.email(unique), students.nisn/rfid_uid/class_id, attendance compound.

## User Personas
- Admin: master data, akun, laporan, kiosk.
- Guru/Wali Kelas: jurnal, asesmen, leger, catatan/piket, tahfidz, tabungan, manajemen kelas.
- Siswa/Orang tua: portal nilai/absensi/tahfidz/tabungan.
- Kiosk: absensi cepat publik (tanpa login).

## Implemented (2026-06)
- Auth: login, /me, change-password, brute-force lockout, admin seed (ahmadsanuwsi@gmail.com).
- Master data: Students, Teachers, Classes, Subjects (CRUD + search + pagination + filter).
- User accounts: create guru/siswa linked to teacher/student, manual reset password, delete (guard last admin).
- Kiosk: public scan (RFID keyboard-emulation + 10-digit NISN keypad), Web Audio feedback, 3 jenis absensi, feedback success/already_scanned/not_found.
- Attendance: daily list + monthly recap per student; manual attendance endpoint.
- Academic: Assessments (formatif/sumatif), Ledger (final = formatif*0.4 + sumatif*0.6 + descriptor), Journals, Anecdotal notes, Piket guru, Tahfidz.
- Wali kelas: class-meta (komitmen/jadwal/struktur/piket_kelas).
- Savings: setoran/penarikan dengan validasi saldo, summary + detail panel + riwayat.
- Portal siswa: nilai, absensi, tahfidz, tabungan.
- Dashboards per role (admin stats+charts w/ aggregation, guru, siswa).
- Seed data: 12 kelas (1A–6B), 8 mapel, 12 guru, 24 siswa, absensi 7 hari, nilai, tahfidz, tabungan, jurnal.

## Verified
- Backend: 44/44 pytest passed (`/app/backend/tests/backend_test.py`).
- Frontend: login 3 role + kiosk publik + role redirect (Playwright smoke).

## Backlog / Remaining
- P1: Export Excel/PDF laporan & leger (saat ini cetak via window.print).
- P1: Manual attendance UI (endpoint sudah ada, belum ada tombol input izin/sakit di UI).
- P2: Foto siswa upload (object storage) — saat ini inisial avatar.
- P2: Backup otomatis DB harian (open question user).
- P2: Cache/optimasi get_balance untuk skala besar.
- P2: Cap limit pagination pada list endpoints.

## Next Tasks
- Konfirmasi kebutuhan export laporan & backup harian dari user.
- Tambah UI input absensi manual (izin/sakit/alpa) di halaman Absensi.

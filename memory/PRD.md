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
### Iterasi 5
- **Filter Log WA**: GET /api/wa-log terima ?search=&status=&limit= ; panel Pengaturan punya kotak cari + tombol filter status (Semua/Terkirim/Gagal/Dilewati) untuk menelusuri nomor bermasalah.
- **Unduh Rapor PDF**: tombol "Unduh PDF" di halaman Rapor (client-side html2canvas + jsPDF) simpan rapor siswa jadi berkas .pdf multi-halaman tanpa dialog cetak browser.
- Idempotensi akun demo: password guru/siswa di-set ulang otomatis tiap startup (anti-drift).
- Uji: 14/14 tes iterasi lulus (total kumulatif hijau).

### Iterasi 4
- **Jadwal Rekap WA Otomatis**: cron `monthly-wa-recap` (tiap tanggal 1, 00:00 UTC) → POST /api/cron/monthly-wa-recap (Bearer secret) kirim rekap kehadiran bulan lalu ke semua orang tua + wali kelas otomatis.
- **Unduh Backup**: GET /api/backups/download/{stamp} (admin, ZIP; stamp divalidasi regex `\d{8}-\d{6}` anti path-traversal) + tombol Unduh ZIP per baris di panel Pengaturan.
- **Log Pengiriman WA**: setiap kirim dicatat ke koleksi wa_log (target dimask, konteks, status ok/skipped/failed, alasan). GET /api/wa-log (admin) + tabel "Log Pengiriman WhatsApp" di Pengaturan.
- Uji: 92/92 tes backend lulus; smoke frontend lulus.

### Iterasi 3
- **Rapor Sekelas**: GET /api/report/rapor-class/{class_id} + tombol "Cetak Sekelas" → semua siswa satu kelas dirender bertumpuk dengan page-break, cetak/simpan jadi satu PDF.
- **Backup harian otomatis**: platform cron `.emergent/crons.yml` (01:00 WIB) → POST /api/cron/backup (Bearer WEBHOOK_CRON_SECRET, kerja di background) dump 14 koleksi ke /app/backups (retensi 7). Panel di Pengaturan: GET /api/backups + tombol "Backup Sekarang" (/api/backups/run-now).
- **WhatsApp Fonnte**: whatsapp.py (normalisasi 08→628, send_whatsapp/send_bulk, token dari settings.whatsapp_api_key). Real-time saat presensi kiosk (background), blast rekap bulanan POST /api/whatsapp/recap-blast (orang tua + wali kelas dari data guru), tes kirim POST /api/whatsapp/test. UI: tombol "Kirim WA" di rekap absensi + "Kirim Tes" di Pengaturan.
- **Privasi**: foto NISN kiosk diproses OCR di browser (Tesseract.js); hanya 10 digit dikirim, foto tidak diunggah/disimpan.
- Uji: 78/78 tes backend lulus; smoke frontend lulus.

### Iterasi 2
- Absensi manual (tombol hadir/terlambat/izin/sakit/alpa) di tab "Input Manual", dengan validasi status di backend.
- Export Excel (.xlsx) untuk Leger nilai & Rekap absensi bulanan (SheetJS/xlsx).
- Rapor Kurikulum Merdeka cetak: kop surat + logo, tabel nilai (akhir=40% formatif+60% sumatif) + capaian, rekap kehadiran, tahfidz, tabungan, blok tanda tangan wali kelas & kepala madrasah (print via @media print).
- Kiosk presensi via KAMERA foto NISN 10 digit + OCR client-side Tesseract.js (auto-submit) + fallback unggah foto + RFID keyboard-emulation. Keypad ketik dihapus.
- Halaman Pengaturan (Admin): identitas madrasah, upload logo (base64), URL & API key WhatsApp.
- Rombak desain total: maroon+emerald+gold di atas ivory hangat, pola geometris Islami, kaligrafi Basmalah, kartu bersih, print styles.
- Backend baru: routes_settings.py (settings + public), routes_report.py (rapor).
- Uji: 55/55 tes backend lulus; smoke frontend lulus.

### Iterasi 1

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

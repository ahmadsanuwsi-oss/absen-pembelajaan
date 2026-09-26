import { LayoutDashboard, Users, GraduationCap, School, UserCog, FileBarChart, ClipboardList, BookOpenCheck, Notebook, BookMarked, Wallet, CalendarRange, CheckSquare, Trophy, ScrollText } from "lucide-react";

// Grouped navigation per role, accordion style
export const NAV = {
  admin: [
    {
      group: "Utama",
      items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
    },
    {
      group: "Master Data",
      items: [
        { label: "Data Siswa", to: "/siswa", icon: GraduationCap },
        { label: "Data Guru", to: "/guru", icon: Users },
        { label: "Data Kelas", to: "/kelas", icon: School },
        { label: "Mata Pelajaran", to: "/mapel", icon: BookMarked },
      ],
    },
    {
      group: "Akademik",
      items: [
        { label: "Absensi & Rekap", to: "/absensi", icon: CheckSquare },
        { label: "Nilai / Leger", to: "/leger", icon: BookOpenCheck },
        { label: "Program Tahfidz", to: "/tahfidz", icon: Trophy },
        { label: "Tabungan Siswa", to: "/tabungan", icon: Wallet },
      ],
    },
    {
      group: "Sistem",
      items: [
        { label: "Kelola Akun", to: "/akun", icon: UserCog },
        { label: "Laporan", to: "/laporan", icon: FileBarChart },
      ],
    },
  ],
  guru: [
    {
      group: "Utama",
      items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
    },
    {
      group: "Administrasi Guru",
      items: [
        { label: "Jurnal Harian", to: "/jurnal", icon: Notebook },
        { label: "Asesmen", to: "/asesmen", icon: ClipboardList },
        { label: "Leger Nilai", to: "/leger", icon: BookOpenCheck },
        { label: "Catatan & Piket", to: "/catatan", icon: ScrollText },
      ],
    },
    {
      group: "Wali Kelas",
      items: [
        { label: "Absensi Kelas", to: "/absensi", icon: CheckSquare },
        { label: "Program Tahfidz", to: "/tahfidz", icon: Trophy },
        { label: "Tabungan Siswa", to: "/tabungan", icon: Wallet },
        { label: "Manajemen Kelas", to: "/kelas-saya", icon: CalendarRange },
      ],
    },
  ],
  siswa: [
    {
      group: "Portal Siswa",
      items: [
        { label: "Beranda", to: "/dashboard", icon: LayoutDashboard },
        { label: "Nilai & Rapor", to: "/portal/nilai", icon: BookOpenCheck },
        { label: "Rekap Absensi", to: "/portal/absensi", icon: CheckSquare },
        { label: "Capaian Tahfidz", to: "/portal/tahfidz", icon: Trophy },
        { label: "Tabungan", to: "/portal/tabungan", icon: Wallet },
      ],
    },
  ],
};

export const ROLE_LABELS = {
  admin: "Administrator",
  guru: "Guru / Wali Kelas",
  siswa: "Siswa / Orang Tua",
};

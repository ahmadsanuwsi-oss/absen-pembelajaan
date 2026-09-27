import { LayoutDashboard, Users, GraduationCap, School, UserCog, FileBarChart, ClipboardList, BookOpenCheck, Notebook, BookMarked, Wallet, CalendarRange, CheckSquare, Trophy, ScrollText, Settings, FileText, Tent, BookText } from "lucide-react";

const NAV_ADMIN = [
  { group: "Utama", items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }] },
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
      { label: "Cetak Rapor", to: "/rapor", icon: FileText },
    ],
  },
  {
    group: "Sistem",
    items: [
      { label: "Kelola Akun", to: "/akun", icon: UserCog },
      { label: "Laporan", to: "/laporan", icon: FileBarChart },
      { label: "Pengaturan", to: "/pengaturan", icon: Settings },
    ],
  },
];

const NAV_SISWA = [
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
];

// Guru: base menu + menu berdasarkan tugas tambahan (extra_duties)
function buildGuruNav(user) {
  const duties = user?.extra_duties || [];
  const groups = [
    { group: "Utama", items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }] },
    {
      group: "Administrasi Guru",
      items: [
        { label: "Jurnal Harian", to: "/jurnal", icon: Notebook },
        { label: "Asesmen", to: "/asesmen", icon: ClipboardList },
        { label: "Leger Nilai", to: "/leger", icon: BookOpenCheck },
        { label: "Catatan & Piket", to: "/catatan", icon: ScrollText },
        { label: "Cetak Rapor", to: "/rapor", icon: FileText },
      ],
    },
    {
      group: "Wali Kelas",
      items: [
        { label: "Absensi Kelas", to: "/absensi", icon: CheckSquare },
        { label: "Manajemen Kelas", to: "/kelas-saya", icon: CalendarRange },
      ],
    },
  ];

  const dutyItems = [];
  if (duties.includes("tabungan")) dutyItems.push({ label: "Tabungan Siswa", to: "/tabungan", icon: Wallet });
  if (duties.includes("tahfidz")) dutyItems.push({ label: "Program Tahfidz", to: "/tahfidz", icon: Trophy });
  if (duties.includes("tartil")) dutyItems.push({ label: "Ekstra Tartil", to: "/ekstra/tartil", icon: BookText });
  if (duties.includes("pramuka")) dutyItems.push({ label: "Ekstra Pramuka", to: "/ekstra/pramuka", icon: Tent });
  if (dutyItems.length) groups.push({ group: "Tugas Tambahan", items: dutyItems });

  return groups;
}

export function getNav(user) {
  if (!user) return [];
  if (user.role === "admin") return NAV_ADMIN;
  if (user.role === "siswa") return NAV_SISWA;
  if (user.role === "guru") return buildGuruNav(user);
  return [];
}

export const ROLE_LABELS = {
  admin: "Administrator",
  guru: "Guru / Wali Kelas",
  siswa: "Siswa / Orang Tua",
};

export const DUTY_LABELS = {
  tabungan: "Tabungan",
  tahfidz: "Tahfidz",
  tartil: "Tartil",
  pramuka: "Pramuka",
};

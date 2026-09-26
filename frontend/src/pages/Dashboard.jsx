import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { formatRupiah } from "@/lib/api";
import { StatCard, PageHeader } from "@/components/ui-kit";
import { Users, GraduationCap, School, CheckCircle2, Clock, Wallet, Notebook, Trophy, BookOpenCheck, ScanLine } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { useNavigate } from "react-router-dom";

function AdminDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard/admin").then((r) => setD(r.data)); }, []);
  if (!d) return <div className="text-slate-400">Memuat…</div>;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Siswa" value={d.total_students} icon={GraduationCap} accent="#800020" />
        <StatCard label="Total Guru" value={d.total_teachers} icon={Users} accent="#0D5C3A" />
        <StatCard label="Jumlah Kelas" value={d.total_classes} icon={School} accent="#B8860B" />
        <StatCard label="Total Tabungan" value={formatRupiah(d.total_savings)} icon={Wallet} accent="#334155" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Hadir Hari Ini" value={d.present_today} icon={CheckCircle2} accent="#0D5C3A" sub="Kehadiran harian" />
        <StatCard label="Terlambat" value={d.late_today} icon={Clock} accent="#B8860B" />
        <StatCard label="Belum Absen" value={d.absent_today} icon={Users} accent="#9E1B32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-heading font-semibold text-slate-800 mb-4">Tren Kehadiran (7 Hari)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={d.trend}>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#800020" stopOpacity={0.4} /><stop offset="100%" stopColor="#800020" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="hadir" stroke="#800020" strokeWidth={2.5} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-heading font-semibold text-slate-800 mb-4">Sebaran Siswa per Kelas</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.class_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 12 }} />
              <Tooltip /><Bar dataKey="count" fill="#D4AF37" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function GuruDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard/guru").then((r) => setD(r.data)); }, []);
  if (!d) return <div className="text-slate-400">Memuat…</div>;
  return (
    <>
      {d.wali_class && (
        <div className="maroon-gradient rounded-2xl p-6 text-white mb-6">
          <p className="text-[#D4AF37] text-sm font-medium">Wali Kelas</p>
          <h2 className="font-heading text-3xl font-bold">{d.wali_class.name}</h2>
          <p className="text-white/70 mt-1">{d.class_students} siswa · {d.present_today} hadir hari ini</p>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Siswa Kelas" value={d.class_students} icon={GraduationCap} accent="#800020" />
        <StatCard label="Hadir Hari Ini" value={d.present_today} icon={CheckCircle2} accent="#0D5C3A" />
        <StatCard label="Jurnal Saya" value={d.my_journals} icon={Notebook} accent="#B8860B" />
        <StatCard label="Total Tahfidz" value={d.total_tahfidz} icon={Trophy} accent="#334155" />
      </div>
    </>
  );
}

function SiswaDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/portal/me").then((r) => setD(r.data)); }, []);
  if (!d) return <div className="text-slate-400">Memuat…</div>;
  const a = d.attendance_month;
  return (
    <>
      <div className="maroon-gradient rounded-2xl p-6 text-white mb-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold font-heading">
          {d.student.name.split(" ").slice(0,2).map((w)=>w[0]).join("")}
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold">{d.student.name}</h2>
          <p className="text-white/80">NISN {d.student.nisn} · Kelas {d.student.class_name}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Hadir (Bulan Ini)" value={a.hadir + a.terlambat} icon={CheckCircle2} accent="#0D5C3A" />
        <StatCard label="Saldo Tabungan" value={formatRupiah(d.balance)} icon={Wallet} accent="#800020" />
        <StatCard label="Catatan Tahfidz" value={d.tahfidz_count} icon={Trophy} accent="#B8860B" />
        <StatCard label="Nilai Tercatat" value={d.assessment_count} icon={BookOpenCheck} accent="#334155" />
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title={`Assalamu'alaikum, ${user.name.split(" ")[0]}`} subtitle="Ringkasan aktivitas sekolah hari ini." icon={School}>
        {(user.role === "admin" || user.role === "guru") && (
          <button onClick={() => navigate("/kiosk")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D5C3A] text-white text-sm font-semibold hover:bg-[#0a4a2f]">
            <ScanLine className="w-4 h-4" /> Buka Kiosk
          </button>
        )}
      </PageHeader>
      {user.role === "admin" && <AdminDash />}
      {user.role === "guru" && <GuruDash />}
      {user.role === "siswa" && <SiswaDash />}
    </div>
  );
}

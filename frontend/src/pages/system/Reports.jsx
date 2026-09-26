import { useEffect, useState } from "react";
import api, { formatRupiah } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { FileBarChart, GraduationCap, Users, School, Wallet, CheckCircle2, Printer } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = ["#800020", "#D4AF37", "#0D5C3A", "#9E1B32", "#B8860B", "#334155"];

export default function Reports() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard/admin").then((r) => setD(r.data)); }, []);
  if (!d) return <div className="text-slate-400">Memuat…</div>;

  return (
    <div>
      <PageHeader title="Laporan & Rekapitulasi" subtitle="Ringkasan data sekolah TA 2025/2026" icon={FileBarChart}>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50" data-testid="print-report-btn"><Printer className="w-4 h-4" /> Cetak</button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Siswa" value={d.total_students} icon={GraduationCap} accent="#800020" />
        <StatCard label="Total Guru" value={d.total_teachers} icon={Users} accent="#0D5C3A" />
        <StatCard label="Jumlah Kelas" value={d.total_classes} icon={School} accent="#B8860B" />
        <StatCard label="Total Tabungan" value={formatRupiah(d.total_savings)} icon={Wallet} accent="#334155" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-heading font-semibold text-slate-800 mb-4">Distribusi Siswa per Kelas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={d.class_distribution} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {d.class_distribution.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-heading font-semibold text-slate-800 mb-4">Ringkasan Kehadiran Hari Ini</h3>
          <div className="space-y-4">
            <StatCard label="Hadir" value={d.present_today} icon={CheckCircle2} accent="#0D5C3A" />
            <StatCard label="Terlambat" value={d.late_today} icon={CheckCircle2} accent="#B8860B" />
            <StatCard label="Belum Absen" value={d.absent_today} icon={Users} accent="#9E1B32" />
          </div>
        </div>
      </div>
    </div>
  );
}

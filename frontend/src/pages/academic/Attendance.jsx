import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { PageHeader, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckSquare } from "lucide-react";

const STATUS_BADGE = {
  hadir: "bg-emerald-100 text-emerald-700", terlambat: "bg-amber-100 text-amber-700",
  izin: "bg-sky-100 text-sky-700", sakit: "bg-violet-100 text-violet-700", alpa: "bg-rose-100 text-rose-700",
};
const TYPES = [{ v: "kehadiran", l: "Kehadiran Harian" }, { v: "dhuha", l: "Sholat Dhuha" }, { v: "ekstra", l: "Ekstrakurikuler" }];

export default function Attendance() {
  const [tab, setTab] = useState("harian");
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [type, setType] = useState("kehadiran");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [daily, setDaily] = useState({ items: [] });
  const [recap, setRecap] = useState({ recap: [] });

  useEffect(() => { api.get("/classes").then((r) => setClasses(r.data)); }, []);

  const loadDaily = useCallback(() => {
    const params = { date, type, limit: 100 };
    if (classFilter) params.class_id = classFilter;
    api.get("/attendance", { params }).then((r) => setDaily(r.data));
  }, [date, type, classFilter]);
  const loadRecap = useCallback(() => {
    const params = { month, type };
    if (classFilter) params.class_id = classFilter;
    api.get("/attendance/recap", { params }).then((r) => setRecap(r.data));
  }, [month, type, classFilter]);

  useEffect(() => { if (tab === "harian") loadDaily(); else loadRecap(); }, [tab, loadDaily, loadRecap]);

  return (
    <div>
      <PageHeader title="Absensi & Rekapitulasi" subtitle="Data kehadiran dari kiosk & input manual" icon={CheckSquare}>
        <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32" data-testid="att-class-filter"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40" data-testid="att-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("harian")} data-testid="tab-harian" className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "harian" ? "bg-[#800020] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>Harian</button>
        <button onClick={() => setTab("rekap")} data-testid="tab-rekap" className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "rekap" ? "bg-[#800020] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>Rekap Bulanan</button>
        {tab === "harian"
          ? <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" data-testid="att-date" />
          : <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" data-testid="att-month" />}
      </div>

      {tab === "harian" ? (
        <TableWrap>
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Waktu</th><th className="text-left px-4 py-3">NISN</th><th className="text-left px-4 py-3">Nama</th><th className="text-left px-4 py-3">Kelas</th><th className="text-left px-4 py-3">Jenis</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Sumber</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {daily.items.length === 0 ? <EmptyRow colSpan={7} text="Belum ada absensi pada tanggal ini" /> : daily.items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{r.time}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.nisn}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.student_name}</td>
                <td className="px-4 py-3">{r.class_name}</td>
                <td className="px-4 py-3 text-xs">{r.type_label}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${STATUS_BADGE[r.status] || "bg-slate-100"}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400 capitalize">{r.source}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <TableWrap>
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Nama</th><th className="px-4 py-3">Hadir</th><th className="px-4 py-3">Terlambat</th><th className="px-4 py-3">Izin</th><th className="px-4 py-3">Sakit</th><th className="px-4 py-3">Alpa</th><th className="px-4 py-3">Total</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {recap.recap.length === 0 ? <EmptyRow colSpan={7} /> : recap.recap.map((r) => (
              <tr key={r.student_id} className="hover:bg-slate-50 text-center">
                <td className="px-4 py-3 text-left font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3 text-emerald-600 font-semibold">{r.hadir}</td>
                <td className="px-4 py-3 text-amber-600">{r.terlambat}</td>
                <td className="px-4 py-3">{r.izin}</td><td className="px-4 py-3">{r.sakit}</td>
                <td className="px-4 py-3 text-rose-600">{r.alpa}</td>
                <td className="px-4 py-3 font-bold">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

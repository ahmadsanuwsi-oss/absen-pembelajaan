import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckSquare, Download, MessageCircle } from "lucide-react";
import { exportToXlsx } from "@/lib/exportXlsx";
import { ATTENDANCE_TYPES } from "@/config/attendanceTypes";
const TYPES = ATTENDANCE_TYPES.map((t) => ({ v: t.value, l: t.label }));
import { toast } from "sonner";

const STATUS_BADGE = {
  hadir: "bg-emerald-100 text-emerald-700", terlambat: "bg-amber-100 text-amber-700",
  izin: "bg-sky-100 text-sky-700", sakit: "bg-violet-100 text-violet-700", alpa: "bg-rose-100 text-rose-700",
};
const MANUAL_STATUS = ["hadir", "terlambat", "izin", "sakit", "alpa"];

export default function Attendance({ lockedType }) {
  const [tab, setTab] = useState(lockedType ? "manual" : "harian");
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [type, setType] = useState(lockedType || "datang");
  const lockedLabel = lockedType ? TYPES.find((t) => t.v === lockedType)?.l : null;
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [daily, setDaily] = useState({ items: [] });
  const [recap, setRecap] = useState({ recap: [] });
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});

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
  const loadManual = useCallback(() => {
    if (!classFilter) { setStudents([]); return; }
    api.get("/students", { params: { class_id: classFilter, limit: 100 } }).then((r) => setStudents(r.data.items));
    api.get("/attendance", { params: { date, type, class_id: classFilter, limit: 200 } }).then((r) => {
      const m = {}; r.data.items.forEach((a) => { m[a.student_id] = a.status; }); setStatusMap(m);
    });
  }, [classFilter, date, type]);

  useEffect(() => {
    if (tab === "harian") loadDaily();
    else if (tab === "rekap") loadRecap();
    else loadManual();
  }, [tab, loadDaily, loadRecap, loadManual]);

  const mark = async (studentId, status) => {
    try {
      await api.post("/attendance/manual", { student_id: studentId, type, status, date });
      setStatusMap((m) => ({ ...m, [studentId]: status }));
      toast.success("Absensi dicatat");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const exportRecap = () => {
    const rows = recap.recap.map((r, i) => ({ No: i + 1, NISN: r.nisn, Nama: r.name, Hadir: r.hadir, Terlambat: r.terlambat, Izin: r.izin, Sakit: r.sakit, Alpa: r.alpa, Total: r.total }));
    exportToXlsx(rows, "Rekap Absensi", `rekap-absensi-${month}.xlsx`);
  };

  const [waSending, setWaSending] = useState(false);
  const blastWa = async () => {
    setWaSending(true);
    try {
      const { data } = await api.post("/whatsapp/recap-blast", null, { params: { class_id: classFilter, month, type } });
      toast.success(`WA rekap dikirim ke ${data.count} nomor (bulan ${data.month})`);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setWaSending(false); }
  };

  return (
    <div>
      <PageHeader title={lockedLabel || "Absensi & Rekapitulasi"} subtitle={lockedType ? "Catat presensi kegiatan ekstrakurikuler" : "Data presensi dari kiosk & input manual"} icon={CheckSquare} overline="Akademik">
        <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32 bg-white" data-testid="att-class-filter"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        {!lockedType && (
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40 bg-white" data-testid="att-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
        </Select>
        )}
      </PageHeader>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <button onClick={() => setTab("harian")} data-testid="tab-harian" className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "harian" ? "bg-[#800020] text-white" : "bg-white border border-[#EFE7D8] text-slate-600"}`}>Harian</button>
        <button onClick={() => setTab("rekap")} data-testid="tab-rekap" className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "rekap" ? "bg-[#800020] text-white" : "bg-white border border-[#EFE7D8] text-slate-600"}`}>Rekap Bulanan</button>
        <button onClick={() => setTab("manual")} data-testid="tab-manual" className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "manual" ? "bg-[#800020] text-white" : "bg-white border border-[#EFE7D8] text-slate-600"}`}>Input Manual</button>
        {tab === "rekap"
          ? <><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40 bg-white" data-testid="att-month" /><button onClick={exportRecap} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#EFE7D8] bg-white text-sm text-slate-600 hover:bg-slate-50" data-testid="export-recap-btn"><Download className="w-4 h-4" /> Excel</button><button onClick={blastWa} disabled={waSending} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F5132] text-white text-sm font-semibold hover:bg-[#0a3d25] disabled:opacity-50" data-testid="wa-blast-btn"><MessageCircle className="w-4 h-4" /> Kirim WA</button></>
          : <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 bg-white" data-testid="att-date" />}
      </div>

      {tab === "harian" && (
        <TableWrap>
          <thead className="bg-[#FAF6EE] text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Waktu</th><th className="text-left px-4 py-3">NISN</th><th className="text-left px-4 py-3">Nama</th><th className="text-left px-4 py-3">Kelas</th><th className="text-left px-4 py-3">Jenis</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Sumber</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {daily.items.length === 0 ? <EmptyRow colSpan={7} text="Belum ada absensi pada tanggal ini" /> : daily.items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{r.time}</td><td className="px-4 py-3 font-mono text-xs">{r.nisn}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.student_name}</td><td className="px-4 py-3">{r.class_name}</td>
                <td className="px-4 py-3 text-xs">{r.type_label}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${STATUS_BADGE[r.status] || "bg-slate-100"}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400 capitalize">{r.source}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {tab === "rekap" && (
        <TableWrap>
          <thead className="bg-[#FAF6EE] text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Nama</th><th className="px-4 py-3">Hadir</th><th className="px-4 py-3">Terlambat</th><th className="px-4 py-3">Izin</th><th className="px-4 py-3">Sakit</th><th className="px-4 py-3">Alpa</th><th className="px-4 py-3">Total</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {recap.recap.length === 0 ? <EmptyRow colSpan={7} /> : recap.recap.map((r) => (
              <tr key={r.student_id} className="hover:bg-slate-50 text-center">
                <td className="px-4 py-3 text-left font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3 text-emerald-600 font-semibold">{r.hadir}</td><td className="px-4 py-3 text-amber-600">{r.terlambat}</td>
                <td className="px-4 py-3">{r.izin}</td><td className="px-4 py-3">{r.sakit}</td><td className="px-4 py-3 text-rose-600">{r.alpa}</td><td className="px-4 py-3 font-bold">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {tab === "manual" && (
        !classFilter ? <div className="card-soft p-10 text-center text-slate-400">Pilih kelas untuk input absensi manual</div> : (
          <TableWrap>
            <thead className="bg-[#FAF6EE] text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Nama</th><th className="text-left px-4 py-3">NISN</th><th className="text-left px-4 py-3">Tandai Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? <EmptyRow colSpan={3} /> : students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50" data-testid={`manual-row-${s.id}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.nisn}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {MANUAL_STATUS.map((st) => (
                        <button key={st} onClick={() => mark(s.id, st)} data-testid={`mark-${st}-${s.id}`}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all ${statusMap[s.id] === st ? STATUS_BADGE[st] + " ring-2 ring-offset-1 ring-[#800020]/40" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{st}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )
      )}
    </div>
  );
}

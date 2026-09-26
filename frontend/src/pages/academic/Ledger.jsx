import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { PageHeader, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { BookOpenCheck, Printer } from "lucide-react";

const DESC_BADGE = {
  "Sangat Baik": "bg-emerald-100 text-emerald-700", "Baik": "bg-sky-100 text-sky-700",
  "Cukup": "bg-amber-100 text-amber-700", "Perlu Bimbingan": "bg-rose-100 text-rose-700",
};

export default function Ledger() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => { api.get("/classes").then((r) => setClasses(r.data)); api.get("/subjects").then((r) => setSubjects(r.data)); }, []);
  const load = useCallback(() => {
    if (!classId) { setRows([]); return; }
    const params = { class_id: classId };
    if (subjectId) params.subject_id = subjectId;
    api.get("/ledger", { params }).then((r) => setRows(r.data.rows));
  }, [classId, subjectId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Leger Nilai" subtitle="Rekap nilai akhir (Formatif 40% + Sumatif 60%)" icon={BookOpenCheck}>
        <Select value={classId || "none"} onValueChange={(v) => setClassId(v === "none" ? "" : v)}>
          <SelectTrigger className="w-28" data-testid="ledger-class"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent><SelectItem value="none">Pilih Kelas</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={subjectId || "all"} onValueChange={(v) => setSubjectId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44" data-testid="ledger-subject"><SelectValue placeholder="Mapel" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Mapel</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <button onClick={() => window.print()} disabled={!classId} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40" data-testid="print-ledger-btn"><Printer className="w-4 h-4" /> Cetak</button>
      </PageHeader>

      {!classId ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">Pilih kelas untuk melihat leger nilai</div>
      ) : (
        <TableWrap>
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">No</th><th className="text-left px-4 py-3">NISN</th><th className="text-left px-4 py-3">Nama</th><th className="px-4 py-3">Formatif</th><th className="px-4 py-3">Sumatif</th><th className="px-4 py-3">Nilai Akhir</th><th className="text-left px-4 py-3">Capaian</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? <EmptyRow colSpan={7} /> : rows.map((r, i) => (
              <tr key={r.student_id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.nisn}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3 text-center">{r.formatif || "-"}</td>
                <td className="px-4 py-3 text-center">{r.sumatif || "-"}</td>
                <td className="px-4 py-3 text-center font-bold text-[#800020]">{r.final || "-"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${DESC_BADGE[r.descriptor]}`}>{r.descriptor}</span></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

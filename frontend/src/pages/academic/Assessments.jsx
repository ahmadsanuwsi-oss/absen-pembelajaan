import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Assessments() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [kind, setKind] = useState("");
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ student_id: "", kind: "formatif", title: "", score: "", description: "" });

  useEffect(() => {
    api.get("/classes").then((r) => setClasses(r.data));
    api.get("/subjects").then((r) => setSubjects(r.data));
  }, []);
  useEffect(() => { if (classId) api.get("/students", { params: { class_id: classId, limit: 100 } }).then((r) => setStudents(r.data.items)); }, [classId]);

  const load = useCallback(() => {
    if (!classId) { setItems([]); return; }
    const params = { class_id: classId };
    if (subjectId) params.subject_id = subjectId;
    if (kind) params.kind = kind;
    api.get("/assessments", { params }).then((r) => setItems(r.data));
  }, [classId, subjectId, kind]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await api.post("/assessments", { ...form, class_id: classId, subject_id: subjectId, score: Number(form.score) });
      toast.success("Nilai disimpan"); setDialog(false); setForm({ student_id: "", kind: "formatif", title: "", score: "", description: "" }); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async (id) => { try { await api.delete(`/assessments/${id}`); toast.success("Dihapus"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  const canAdd = classId && subjectId;

  return (
    <div>
      <PageHeader title="Asesmen Kurikulum Merdeka" subtitle="Input nilai Formatif & Sumatif" icon={ClipboardList}>
        <Select value={classId || "none"} onValueChange={(v) => setClassId(v === "none" ? "" : v)}>
          <SelectTrigger className="w-28" data-testid="asmt-class"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent><SelectItem value="none">Pilih Kelas</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={subjectId || "none"} onValueChange={(v) => setSubjectId(v === "none" ? "" : v)}>
          <SelectTrigger className="w-44" data-testid="asmt-subject"><SelectValue placeholder="Mapel" /></SelectTrigger>
          <SelectContent><SelectItem value="none">Semua Mapel</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={kind || "all"} onValueChange={(v) => setKind(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32" data-testid="asmt-kind"><SelectValue placeholder="Jenis" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua</SelectItem><SelectItem value="formatif">Formatif</SelectItem><SelectItem value="sumatif">Sumatif</SelectItem></SelectContent>
        </Select>
        <Button onClick={() => setDialog(true)} disabled={!canAdd} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-assessment-btn"><Plus className="w-4 h-4 mr-1" /> Nilai</Button>
      </PageHeader>

      {!classId ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">Pilih kelas untuk melihat & input nilai</div>
      ) : (
        <TableWrap>
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Tanggal</th><th className="text-left px-4 py-3">Siswa</th><th className="text-left px-4 py-3">Mapel</th><th className="text-left px-4 py-3">Jenis</th><th className="text-left px-4 py-3">Penilaian</th><th className="px-4 py-3">Nilai</th><th className="text-right px-4 py-3">Aksi</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? <EmptyRow colSpan={7} /> : items.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50" data-testid={`assessment-row-${a.id}`}>
                <td className="px-4 py-3 text-xs text-slate-500">{a.date}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{a.student_name}</td>
                <td className="px-4 py-3 text-xs">{a.subject_name}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${a.kind === "formatif" ? "bg-sky-100 text-sky-700" : "bg-[#F9ECEF] text-[#800020]"}`}>{a.kind}</span></td>
                <td className="px-4 py-3 text-sm">{a.title}</td>
                <td className="px-4 py-3 text-center font-bold text-slate-800">{a.score}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(a.id)} data-testid={`delete-assessment-${a.id}`} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Input Nilai</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Siswa</Label>
              <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                <SelectTrigger data-testid="form-asmt-student"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jenis</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}><SelectTrigger data-testid="form-asmt-kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="formatif">Formatif</SelectItem><SelectItem value="sumatif">Sumatif</SelectItem></SelectContent></Select>
              </div>
              <div><Label>Nilai (0-100)</Label><Input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} data-testid="form-asmt-score" /></div>
            </div>
            <div><Label>Judul Penilaian</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="mis. Ulangan Harian 1" data-testid="form-asmt-title" /></div>
            <div><Label>Deskripsi Capaian (opsional)</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={save} disabled={!form.student_id || !form.title || form.score === ""} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-assessment-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

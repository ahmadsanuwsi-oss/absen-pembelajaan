import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function Notes() {
  const [tab, setTab] = useState("anekdot");
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classId, setClassId] = useState("");
  const [anecdotes, setAnecdotes] = useState([]);
  const [piket, setPiket] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [pikDialog, setPikDialog] = useState(false);
  const [form, setForm] = useState({ student_id: "", date: new Date().toISOString().slice(0, 10), category: "sikap", note: "" });
  const [pikForm, setPikForm] = useState({ day: "Senin", teacher_id: "", note: "" });

  useEffect(() => {
    api.get("/classes").then((r) => setClasses(r.data));
    api.get("/teachers", { params: { limit: 200 } }).then((r) => setTeachers(r.data.items));
    api.get("/piket-guru").then((r) => setPiket(r.data));
  }, []);
  useEffect(() => { if (classId) api.get("/students", { params: { class_id: classId, limit: 100 } }).then((r) => setStudents(r.data.items)); }, [classId]);
  const loadAnec = useCallback(() => { api.get("/anecdotes").then((r) => setAnecdotes(r.data)); }, []);
  useEffect(() => { loadAnec(); }, [loadAnec]);

  const saveAnec = async () => {
    try { await api.post("/anecdotes", form); toast.success("Catatan tersimpan"); setDialog(false); setForm({ ...form, note: "" }); loadAnec(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const savePiket = async () => {
    try { await api.post("/piket-guru", pikForm); toast.success("Piket tersimpan"); setPikDialog(false); api.get("/piket-guru").then((r) => setPiket(r.data)); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader title="Catatan & Piket Guru" subtitle="Catatan anekdot siswa dan jadwal piket guru" icon={ScrollText} />
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("anekdot")} data-testid="tab-anekdot" className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "anekdot" ? "bg-[#800020] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>Catatan Anekdot</button>
        <button onClick={() => setTab("piket")} data-testid="tab-piket" className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "piket" ? "bg-[#800020] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>Piket Guru</button>
      </div>

      {tab === "anekdot" ? (
        <>
          <div className="flex justify-end mb-3"><Button onClick={() => setDialog(true)} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-anecdote-btn"><Plus className="w-4 h-4 mr-1" /> Catatan</Button></div>
          <TableWrap>
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Tanggal</th><th className="text-left px-4 py-3">Siswa</th><th className="text-left px-4 py-3">Kategori</th><th className="text-left px-4 py-3">Catatan</th><th className="text-right px-4 py-3">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {anecdotes.length === 0 ? <EmptyRow colSpan={5} /> : anecdotes.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-500">{a.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.student_name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs capitalize">{a.category}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-600">{a.note}</td>
                  <td className="px-4 py-3 text-right"><button onClick={async () => { await api.delete(`/anecdotes/${a.id}`); loadAnec(); }} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      ) : (
        <>
          <div className="flex justify-end mb-3"><Button onClick={() => setPikDialog(true)} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-piket-btn"><Plus className="w-4 h-4 mr-1" /> Piket</Button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS.map((d) => (
              <div key={d} className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="font-heading font-semibold text-[#800020] mb-2">{d}</h3>
                <div className="space-y-1.5">
                  {piket.filter((p) => p.day === d).length === 0 ? <p className="text-xs text-slate-400">-</p> : piket.filter((p) => p.day === d).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5">
                      <span>{p.teacher_name}</span>
                      <button onClick={async () => { await api.delete(`/piket-guru/${p.id}`); api.get("/piket-guru").then((r) => setPiket(r.data)); }} className="text-rose-500 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Catatan Anekdot</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Kelas</Label>
              <Select value={classId} onValueChange={setClassId}><SelectTrigger data-testid="anec-class"><SelectValue placeholder="Pilih kelas" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Siswa</Label>
              <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}><SelectTrigger data-testid="form-anec-student"><SelectValue placeholder="Pilih siswa" /></SelectTrigger><SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sikap">Sikap</SelectItem><SelectItem value="prestasi">Prestasi</SelectItem><SelectItem value="pelanggaran">Pelanggaran</SelectItem></SelectContent></Select>
              </div>
              <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div><Label>Catatan</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} data-testid="form-anec-note" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={saveAnec} disabled={!form.student_id || !form.note} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-anecdote-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pikDialog} onOpenChange={setPikDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Piket Guru</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Hari</Label>
              <Select value={pikForm.day} onValueChange={(v) => setPikForm({ ...pikForm, day: v })}><SelectTrigger data-testid="form-piket-day"><SelectValue /></SelectTrigger><SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Guru</Label>
              <Select value={pikForm.teacher_id} onValueChange={(v) => setPikForm({ ...pikForm, teacher_id: v })}><SelectTrigger data-testid="form-piket-teacher"><SelectValue placeholder="Pilih guru" /></SelectTrigger><SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPikDialog(false)}>Batal</Button><Button onClick={savePiket} disabled={!pikForm.teacher_id} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-piket-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, TableWrap, EmptyRow, Pagination } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Notebook, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Journals() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classFilter, setClassFilter] = useState("");
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ class_id: "", subject_id: "", date: new Date().toISOString().slice(0, 10), material: "", method: "", notes: "" });

  useEffect(() => { api.get("/classes").then((r) => setClasses(r.data)); api.get("/subjects").then((r) => setSubjects(r.data)); }, []);
  const load = useCallback(() => {
    const params = { page, limit: 10 };
    if (classFilter) params.class_id = classFilter;
    api.get("/journals", { params }).then((r) => setData(r.data));
  }, [page, classFilter]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post("/journals", { ...form, subject_id: form.subject_id || null }); toast.success("Jurnal tersimpan"); setDialog(false); setForm({ ...form, material: "", method: "", notes: "" }); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async (id) => { try { await api.delete(`/journals/${id}`); toast.success("Dihapus"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  return (
    <div>
      <PageHeader title="Jurnal Harian" subtitle="Agenda & catatan pembelajaran harian" icon={Notebook}>
        <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32" data-testid="journal-class-filter"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setDialog(true)} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-journal-btn"><Plus className="w-4 h-4 mr-1" /> Jurnal</Button>
      </PageHeader>
      <div className="space-y-3">
        {data.items.length === 0 ? <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">Belum ada jurnal</div> : data.items.map((j) => (
          <div key={j.id} className="bg-white rounded-2xl border border-slate-200 p-5" data-testid={`journal-${j.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-[#F9ECEF] text-[#800020] font-semibold">{j.class_name}</span>
                  <span>{j.subject_name}</span><span>·</span><span>{j.date}</span>
                </div>
                <h3 className="font-heading font-semibold text-slate-800">{j.material}</h3>
                {j.method && <p className="text-sm text-slate-600 mt-1"><b>Metode:</b> {j.method}</p>}
                {j.notes && <p className="text-sm text-slate-500 mt-1">{j.notes}</p>}
              </div>
              <button onClick={() => remove(j.id)} data-testid={`delete-journal-${j.id}`} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Jurnal Harian</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kelas</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}><SelectTrigger data-testid="form-journal-class"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Mapel</Label>
                <Select value={form.subject_id || "none"} onValueChange={(v) => setForm({ ...form, subject_id: v === "none" ? "" : v })}><SelectTrigger data-testid="form-journal-subject"><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="none">- Umum -</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="form-journal-date" /></div>
            <div><Label>Materi</Label><Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} data-testid="form-journal-material" /></div>
            <div><Label>Metode</Label><Input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} /></div>
            <div><Label>Catatan</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={save} disabled={!form.class_id || !form.material} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-journal-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

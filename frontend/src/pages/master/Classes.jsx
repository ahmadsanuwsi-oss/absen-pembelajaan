import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { School, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { name: "", level: 1, wali_kelas_id: "", academic_year: "2025/2026" };

export default function Classes() {
  const [items, setItems] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);

  const load = useCallback(() => { api.get("/classes").then((r) => setItems(r.data)); }, []);
  useEffect(() => { load(); api.get("/teachers", { params: { limit: 100 } }).then((r) => setTeachers(r.data.items)); }, [load]);

  const save = async () => {
    try {
      const payload = { ...form, level: Number(form.level), wali_kelas_id: form.wali_kelas_id || null };
      if (editId) await api.put(`/classes/${editId}`, payload); else await api.post("/classes", payload);
      toast.success("Kelas tersimpan"); setDialog(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async () => { try { await api.delete(`/classes/${delId}`); toast.success("Kelas dihapus"); setDelId(null); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  return (
    <div>
      <PageHeader title="Data Kelas" subtitle="Rombongan belajar & wali kelas" icon={School}>
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setDialog(true); }} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-class-btn"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
      </PageHeader>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow" data-testid={`class-card-${c.id}`}>
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-[#F9ECEF] flex items-center justify-center font-heading text-xl font-bold text-[#800020]">{c.name}</div>
              <div className="flex gap-1">
                <button onClick={() => { setForm({ ...EMPTY, ...c, wali_kelas_id: c.wali_kelas_id || "" }); setEditId(c.id); setDialog(true); }} data-testid={`edit-class-${c.id}`} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setDelId(c.id)} data-testid={`delete-class-${c.id}`} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-600">{c.student_count} siswa</div>
            <div className="text-xs text-slate-400 mt-1 truncate">{c.wali_kelas_name || "Belum ada wali kelas"}</div>
          </div>
        ))}
        {items.length === 0 && <p className="text-slate-400 col-span-full text-center py-10">Belum ada kelas</p>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama Kelas (mis. 1A)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-class-name" /></div>
              <div><Label>Tingkat</Label><Input type="number" min="1" max="6" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} data-testid="form-class-level" /></div>
            </div>
            <div><Label>Wali Kelas</Label>
              <Select value={form.wali_kelas_id || "none"} onValueChange={(v) => setForm({ ...form, wali_kelas_id: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="form-class-wali"><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                <SelectContent><SelectItem value="none">- Belum -</SelectItem>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tahun Ajaran</Label><Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={save} disabled={!form.name} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-class-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus kelas ini?</AlertDialogTitle><AlertDialogDescription>Siswa di kelas ini tidak ikut terhapus.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-rose-600 hover:bg-rose-700" data-testid="confirm-delete-class">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

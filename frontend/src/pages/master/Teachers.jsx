import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, SearchBar, Pagination, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { name: "", nip: "", gender: "L", phone: "", is_wali_kelas: false };

export default function Teachers() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);

  const load = useCallback(() => { api.get("/teachers", { params: { page, limit: 10, search } }).then((r) => setData(r.data)); }, [page, search]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const save = async () => {
    try {
      if (editId) await api.put(`/teachers/${editId}`, form);
      else await api.post("/teachers", form);
      toast.success("Data guru tersimpan"); setDialog(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async () => { try { await api.delete(`/teachers/${delId}`); toast.success("Guru dihapus"); setDelId(null); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  return (
    <div>
      <PageHeader title="Data Guru" subtitle="Master data guru & tenaga pengajar" icon={Users}>
        <SearchBar value={search} onChange={setSearch} placeholder="Cari nama / NIP…" testId="teacher-search-input" />
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setDialog(true); }} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-teacher-btn"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
      </PageHeader>
      <TableWrap>
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
          <tr><th className="text-left px-4 py-3">NIP</th><th className="text-left px-4 py-3">Nama</th><th className="text-left px-4 py-3">L/P</th><th className="text-left px-4 py-3">No. HP</th><th className="text-left px-4 py-3">Wali Kelas</th><th className="text-right px-4 py-3">Aksi</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.items.length === 0 ? <EmptyRow colSpan={6} /> : data.items.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50" data-testid={`teacher-row-${t.id}`}>
              <td className="px-4 py-3 font-mono text-xs">{t.nip}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
              <td className="px-4 py-3">{t.gender}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{t.phone || "-"}</td>
              <td className="px-4 py-3">{t.is_wali_kelas ? <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-semibold">Ya</span> : <span className="text-slate-400 text-xs">-</span>}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button onClick={() => { setForm({ ...EMPTY, ...t }); setEditId(t.id); setDialog(true); }} data-testid={`edit-teacher-${t.id}`} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setDelId(t.id)} data-testid={`delete-teacher-${t.id}`} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600 ml-1"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Guru" : "Tambah Guru"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Nama Lengkap (dengan gelar)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-teacher-name" /></div>
            <div><Label>NIP</Label><Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} data-testid="form-teacher-nip" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jenis Kelamin</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent></Select>
              </div>
              <div><Label>No. HP</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_wali_kelas} onChange={(e) => setForm({ ...form, is_wali_kelas: e.target.checked })} data-testid="form-teacher-wali" /> Berperan sebagai Wali Kelas</label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={save} disabled={!form.name || !form.nip} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-teacher-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus guru ini?</AlertDialogTitle><AlertDialogDescription>Data akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-rose-600 hover:bg-rose-700" data-testid="confirm-delete-teacher">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

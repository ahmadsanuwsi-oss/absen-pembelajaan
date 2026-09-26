import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { BookMarked, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Subjects() {
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [delId, setDelId] = useState(null);

  const load = useCallback(() => { api.get("/subjects").then((r) => setItems(r.data)); }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post("/subjects", form); toast.success("Mapel ditambahkan"); setDialog(false); setForm({ name: "", code: "" }); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async () => { try { await api.delete(`/subjects/${delId}`); toast.success("Mapel dihapus"); setDelId(null); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  return (
    <div>
      <PageHeader title="Mata Pelajaran" subtitle="Daftar mapel Kurikulum Merdeka" icon={BookMarked}>
        <Button onClick={() => setDialog(true)} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-subject-btn"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
      </PageHeader>
      <TableWrap>
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Kode</th><th className="text-left px-4 py-3">Nama Mapel</th><th className="text-right px-4 py-3">Aksi</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 ? <EmptyRow colSpan={3} /> : items.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50" data-testid={`subject-row-${s.id}`}>
              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-[#FDF8E2] text-[#B8860B] text-xs font-bold">{s.code}</span></td>
              <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
              <td className="px-4 py-3 text-right"><button onClick={() => setDelId(s.id)} data-testid={`delete-subject-${s.id}`} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Mata Pelajaran</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Nama Mapel</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-subject-name" /></div>
            <div><Label>Kode</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="form-subject-code" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={save} disabled={!form.name || !form.code} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-subject-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus mapel ini?</AlertDialogTitle><AlertDialogDescription>Data akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-rose-600 hover:bg-rose-700" data-testid="confirm-delete-subject">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

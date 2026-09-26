import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, SearchBar, Pagination, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { GraduationCap, Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { nisn: "", name: "", class_id: "", gender: "L", rfid_uid: "", birth_place: "", birth_date: "", parent_name: "", parent_phone: "" };

export default function Students() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [classes, setClasses] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const params = { page, limit: 10, search };
    if (classFilter) params.class_id = classFilter;
    api.get("/students", { params }).then((r) => setData(r.data));
  }, [page, search, classFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/classes").then((r) => setClasses(r.data)); }, []);
  useEffect(() => { setPage(1); }, [search, classFilter]);

  const openNew = () => { setForm(EMPTY); setEditId(null); setDialog(true); };
  const openEdit = (s) => { setForm({ ...EMPTY, ...s }); setEditId(s.id); setDialog(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, class_id: form.class_id || null };
      if (editId) await api.put(`/students/${editId}`, payload);
      else await api.post("/students", payload);
      toast.success(editId ? "Siswa diperbarui" : "Siswa ditambahkan");
      setDialog(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try { await api.delete(`/students/${delId}`); toast.success("Siswa dihapus"); setDelId(null); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader title="Data Siswa" subtitle="Master data siswa MI Miftahul Jannah" icon={GraduationCap}>
        <SearchBar value={search} onChange={setSearch} placeholder="Cari nama / NISN…" testId="student-search-input" />
        <Select value={classFilter || "all"} onValueChange={(v) => setClassFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32" data-testid="student-class-filter"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && <Button onClick={openNew} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-student-btn"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>}
      </PageHeader>

      <TableWrap>
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-3">NISN</th>
            <th className="text-left px-4 py-3">Nama</th>
            <th className="text-left px-4 py-3">Kelas</th>
            <th className="text-left px-4 py-3">L/P</th>
            <th className="text-left px-4 py-3">RFID</th>
            <th className="text-left px-4 py-3">Orang Tua</th>
            {isAdmin && <th className="text-right px-4 py-3">Aksi</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.items.length === 0 ? <EmptyRow colSpan={isAdmin ? 7 : 6} /> : data.items.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50" data-testid={`student-row-${s.id}`}>
              <td className="px-4 py-3 font-mono text-xs">{s.nisn}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-[#F9ECEF] text-[#800020] text-xs font-semibold">{s.class_name}</span></td>
              <td className="px-4 py-3">{s.gender}</td>
              <td className="px-4 py-3 text-xs text-slate-500 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />{s.rfid_uid || "-"}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{s.parent_name || "-"}</td>
              {isAdmin && (
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(s)} data-testid={`edit-student-${s.id}`} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDelId(s.id)} data-testid={`delete-student-${s.id}`} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600 ml-1"><Trash2 className="w-4 h-4" /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div><Label>NISN (10 digit)</Label><Input value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} data-testid="form-nisn" /></div>
            <div><Label>Nama Lengkap</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-name" /></div>
            <div><Label>Kelas</Label>
              <Select value={form.class_id || "none"} onValueChange={(v) => setForm({ ...form, class_id: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="form-class"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent><SelectItem value="none">- Belum -</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Jenis Kelamin</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger data-testid="form-gender"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>RFID UID</Label><Input value={form.rfid_uid || ""} onChange={(e) => setForm({ ...form, rfid_uid: e.target.value })} data-testid="form-rfid" /></div>
            <div><Label>Tempat Lahir</Label><Input value={form.birth_place || ""} onChange={(e) => setForm({ ...form, birth_place: e.target.value })} /></div>
            <div><Label>Tanggal Lahir</Label><Input type="date" value={form.birth_date || ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
            <div><Label>Nama Orang Tua</Label><Input value={form.parent_name || ""} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></div>
            <div><Label>No. HP Orang Tua</Label><Input value={form.parent_phone || ""} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button onClick={save} disabled={saving || !form.nisn || !form.name} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-student-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus siswa ini?</AlertDialogTitle><AlertDialogDescription>Data akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-rose-600 hover:bg-rose-700" data-testid="confirm-delete-student">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

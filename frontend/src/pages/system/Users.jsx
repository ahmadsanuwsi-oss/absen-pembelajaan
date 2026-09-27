import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, SearchBar, Pagination, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { UserCog, Plus, KeyRound, Trash2, Pencil } from "lucide-react";
import { DUTY_LABELS } from "@/config/nav";
import { toast } from "sonner";

const ROLE_BADGE = { admin: "bg-[#F9ECEF] text-[#800020]", guru: "bg-emerald-100 text-emerald-700", siswa: "bg-[#FDF8E2] text-[#B8860B]" };
const DUTIES = ["tabungan", "tahfidz", "tartil", "pramuka"];

// Reusable multi-select chips for {id,label} options
function Chips({ options, value, onChange, testPrefix }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  if (!options.length) return <div className="text-xs text-slate-400 italic">Belum ada data</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button type="button" key={o.id} onClick={() => toggle(o.id)} data-testid={`${testPrefix}-${o.id}`}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${value.includes(o.id) ? "bg-[#0F5132] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Guru assignment editor: duties (+ per-duty classes), mapel, kelas diampu
function GuruAssignments({ state, setState, classOptions, subjectOptions, prefix }) {
  const toggleDuty = (d) => {
    const enabled = state.extra_duties.includes(d);
    const extra_duties = enabled ? state.extra_duties.filter((x) => x !== d) : [...state.extra_duties, d];
    const duty_classes = { ...state.duty_classes };
    if (enabled) delete duty_classes[d]; else duty_classes[d] = duty_classes[d] || [];
    setState({ ...state, extra_duties, duty_classes });
  };
  const setDutyClasses = (d, v) => setState({ ...state, duty_classes: { ...state.duty_classes, [d]: v } });

  return (
    <div className="space-y-4 rounded-xl border border-[#EFE7D8] bg-[#FAF6EE]/50 p-3">
      <div>
        <Label>Guru Mapel <span className="text-slate-400 font-normal">(opsional)</span></Label>
        <div className="text-xs text-slate-500 mt-1.5 mb-1">Mata Pelajaran diampu</div>
        <Chips options={subjectOptions} value={state.mapel_ids} onChange={(v) => setState({ ...state, mapel_ids: v })} testPrefix={`${prefix}-mapel`} />
        <div className="text-xs text-slate-500 mt-2 mb-1">Kelas diampu (mapel)</div>
        <Chips options={classOptions} value={state.teaching_class_ids} onChange={(v) => setState({ ...state, teaching_class_ids: v })} testPrefix={`${prefix}-teaching-class`} />
      </div>
      <div>
        <Label>Tugas Tambahan <span className="text-slate-400 font-normal">(opsional)</span></Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {DUTIES.map((d) => (
            <button type="button" key={d} onClick={() => toggleDuty(d)} data-testid={`${prefix}-duty-${d}`}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all ${state.extra_duties.includes(d) ? "bg-[#800020] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {DUTY_LABELS[d]}
            </button>
          ))}
        </div>
        {state.extra_duties.map((d) => (
          <div key={d} className="mt-2 pl-2 border-l-2 border-[#800020]/30">
            <div className="text-xs text-slate-500 mb-1">Kelas untuk tugas <b className="capitalize">{DUTY_LABELS[d]}</b>:</div>
            <Chips options={classOptions} value={state.duty_classes[d] || []} onChange={(v) => setDutyClasses(d, v)} testPrefix={`${prefix}-duty-${d}-class`} />
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_FORM = { username: "", email: "", password: "", name: "", role: "guru", student_id: "", teacher_id: "", extra_duties: [], duty_classes: {}, mapel_ids: [], teaching_class_ids: [] };

export default function Users() {
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [resetUser, setResetUser] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [delId, setDelId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const classOptions = classes.map((c) => ({ id: c.id, label: c.name }));
  const subjectOptions = subjects.map((s) => ({ id: s.id, label: s.code || s.name }));

  const load = useCallback(() => {
    const params = { page, limit: 10, search };
    if (roleFilter) params.role = roleFilter;
    api.get("/users", { params }).then((r) => setData(r.data));
  }, [page, search, roleFilter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);
  useEffect(() => {
    api.get("/teachers", { params: { limit: 200 } }).then((r) => setTeachers(r.data.items));
    api.get("/students", { params: { limit: 500 } }).then((r) => setStudents(r.data.items));
    api.get("/classes").then((r) => setClasses(r.data));
    api.get("/subjects").then((r) => setSubjects(r.data));
  }, []);

  const save = async () => {
    try {
      const isGuru = form.role === "guru";
      const payload = {
        username: form.username, password: form.password, name: form.name, role: form.role,
        email: form.email || null, student_id: form.student_id || null, teacher_id: form.teacher_id || null,
        extra_duties: isGuru ? form.extra_duties : [],
        duty_classes: isGuru ? form.duty_classes : {},
        mapel_ids: isGuru ? form.mapel_ids : [],
        teaching_class_ids: isGuru ? form.teaching_class_ids : [],
      };
      await api.post("/users", payload);
      toast.success("Akun dibuat"); setDialog(false); setForm(EMPTY_FORM); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ username: u.username || "", email: u.email || "", name: u.name || "", extra_duties: u.extra_duties || [], duty_classes: u.duty_classes || {}, mapel_ids: u.mapel_ids || [], teaching_class_ids: u.teaching_class_ids || [] });
  };
  const saveEdit = async () => {
    try {
      const isGuru = editUser.role === "guru";
      const payload = { username: editForm.username, email: editForm.email || null, name: editForm.name };
      if (isGuru) {
        payload.extra_duties = editForm.extra_duties;
        payload.duty_classes = editForm.duty_classes;
        payload.mapel_ids = editForm.mapel_ids;
        payload.teaching_class_ids = editForm.teaching_class_ids;
      }
      await api.put(`/users/${editUser.id}`, payload);
      toast.success("Akun diperbarui"); setEditUser(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const doReset = async () => {
    try { await api.put(`/users/${resetUser.id}/reset-password`, { new_password: newPw }); toast.success(`Password ${resetUser.name} direset`); setResetUser(null); setNewPw(""); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async () => { try { await api.delete(`/users/${delId}`); toast.success("Akun dihapus"); setDelId(null); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  return (
    <div>
      <PageHeader title="Kelola Akun" subtitle="Buat akun guru & siswa, atur username, tugas & kelas yang diampu" icon={UserCog}>
        <SearchBar value={search} onChange={setSearch} placeholder="Cari nama / username…" testId="user-search-input" />
        <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32" data-testid="user-role-filter"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="guru">Guru</SelectItem><SelectItem value="siswa">Siswa</SelectItem></SelectContent>
        </Select>
        <Button onClick={() => setDialog(true)} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-user-btn"><Plus className="w-4 h-4 mr-1" /> Akun Baru</Button>
      </PageHeader>
      <TableWrap>
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Nama</th><th className="text-left px-4 py-3">Username</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Tugas & Kelas</th><th className="text-right px-4 py-3">Aksi</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {data.items.length === 0 ? <EmptyRow colSpan={5} /> : data.items.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50" data-testid={`user-row-${u.id}`}>
              <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
              <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.username || <span className="text-rose-400 italic">belum diatur</span>}</td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
              <td className="px-4 py-3">
                {u.role === "guru"
                  ? <div className="flex flex-wrap gap-1">
                      {(u.extra_duties || []).map((d) => <span key={d} className="px-1.5 py-0.5 rounded bg-[#F9ECEF] text-[#800020] text-[11px] font-semibold capitalize">{DUTY_LABELS[d]}</span>)}
                      {(u.mapel_ids || []).length > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold">{(u.mapel_ids || []).length} mapel</span>}
                      {(u.teaching_class_ids || []).length > 0 && <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[11px] font-semibold">{(u.teaching_class_ids || []).length} kelas</span>}
                      {(u.extra_duties || []).length === 0 && (u.mapel_ids || []).length === 0 && (u.teaching_class_ids || []).length === 0 && <span className="text-slate-300 text-xs">—</span>}
                    </div>
                  : <span className="text-slate-300 text-xs">—</span>}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button onClick={() => openEdit(u)} data-testid={`edit-user-${u.id}`} className="p-1.5 rounded-md hover:bg-sky-100 text-sky-600" title="Edit"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setResetUser(u)} data-testid={`reset-user-${u.id}`} className="p-1.5 rounded-md hover:bg-amber-100 text-amber-600 ml-1" title="Reset Password"><KeyRound className="w-4 h-4" /></button>
                <button onClick={() => setDelId(u.id)} data-testid={`delete-user-${u.id}`} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600 ml-1"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Pagination page={page} pages={data.pages} total={data.total} onPage={setPage} />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Akun Baru</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...EMPTY_FORM, username: form.username, email: form.email, password: form.password, name: form.name, role: v })}>
                <SelectTrigger data-testid="form-user-role"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="guru">Guru</SelectItem><SelectItem value="siswa">Siswa / Orang Tua</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            {form.role === "guru" && (
              <div><Label>Tautkan ke Guru</Label>
                <Select value={form.teacher_id || "none"} onValueChange={(v) => { const t = teachers.find((x) => x.id === v); setForm({ ...form, teacher_id: v === "none" ? "" : v, name: t ? t.name : form.name }); }}>
                  <SelectTrigger data-testid="form-user-teacher"><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">- Tidak -</SelectItem>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.role === "siswa" && (
              <div><Label>Tautkan ke Siswa</Label>
                <Select value={form.student_id || "none"} onValueChange={(v) => { const s = students.find((x) => x.id === v); setForm({ ...form, student_id: v === "none" ? "" : v, name: s ? s.name : form.name }); }}>
                  <SelectTrigger data-testid="form-user-student"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">- Tidak -</SelectItem>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.nisn})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-user-name" /></div>
            <div><Label>Username <span className="text-slate-400 font-normal">(untuk login, unik)</span></Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="cth: usth.aisyah" data-testid="form-user-username" /></div>
            <div><Label>Email <span className="text-slate-400 font-normal">(opsional)</span></Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="form-user-email" /></div>
            <div><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="form-user-password" /></div>
            {form.role === "guru" && <GuruAssignments state={form} setState={setForm} classOptions={classOptions} subjectOptions={subjectOptions} prefix="form-user" />}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={save} disabled={!form.username || !form.password || !form.name} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-user-btn">Buat Akun</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Akun</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-3 py-2">
              <div><Label>Nama</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="edit-user-name" /></div>
              <div><Label>Username <span className="text-slate-400 font-normal">(untuk login, unik)</span></Label><Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} placeholder="cth: usth.aisyah" data-testid="edit-user-username" /></div>
              <div><Label>Email <span className="text-slate-400 font-normal">(opsional)</span></Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} data-testid="edit-user-email" /></div>
              {editUser?.role === "guru" && <GuruAssignments state={editForm} setState={setEditForm} classOptions={classOptions} subjectOptions={subjectOptions} prefix="edit-user" />}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditUser(null)}>Batal</Button><Button onClick={saveEdit} disabled={!editForm?.username || !editForm?.name} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-edit-user-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetUser} onOpenChange={() => { setResetUser(null); setNewPw(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Reset password untuk <b>{resetUser?.name}</b> (@{resetUser?.username || resetUser?.email}).</p>
          <div className="py-2"><Label>Password Baru</Label><Input value={newPw} onChange={(e) => setNewPw(e.target.value)} data-testid="reset-new-password-input" /></div>
          <DialogFooter><Button variant="outline" onClick={() => { setResetUser(null); setNewPw(""); }}>Batal</Button><Button onClick={doReset} disabled={!newPw} className="bg-amber-600 hover:bg-amber-700" data-testid="confirm-reset-password">Reset</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={() => setDelId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus akun ini?</AlertDialogTitle><AlertDialogDescription>Akun tidak dapat login lagi.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-rose-600 hover:bg-rose-700" data-testid="confirm-delete-user">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

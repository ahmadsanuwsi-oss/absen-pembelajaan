import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Trophy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_BADGE = {
  ziyadah: "bg-sky-100 text-sky-700", "muraja'ah": "bg-amber-100 text-amber-700",
  lancar: "bg-emerald-100 text-emerald-700", mutqin: "bg-[#F9ECEF] text-[#800020]",
};
const SURAHS = ["An-Naba", "An-Nazi'at", "'Abasa", "At-Takwir", "Al-Infitar", "Al-Muthaffifin", "Al-Insyiqaq", "Al-Buruj", "Ath-Thariq", "Al-A'la", "Al-Ghasyiyah", "Al-Fajr", "Al-Balad", "Asy-Syams", "Al-Lail", "Adh-Dhuha"];

export default function Tahfidz() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState("");
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ student_id: "", surah: "An-Naba", ayat_from: 1, ayat_to: 5, status: "ziyadah", date: new Date().toISOString().slice(0, 10), note: "" });

  useEffect(() => { api.get("/classes").then((r) => setClasses(r.data)); }, []);
  useEffect(() => { if (classId) api.get("/students", { params: { class_id: classId, limit: 100 } }).then((r) => setStudents(r.data.items)); else setStudents([]); }, [classId]);
  const load = useCallback(() => {
    const params = {};
    if (classId) params.class_id = classId;
    api.get("/tahfidz", { params }).then((r) => setItems(r.data));
  }, [classId]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post("/tahfidz", { ...form, ayat_from: Number(form.ayat_from), ayat_to: Number(form.ayat_to) }); toast.success("Tahfidz tersimpan"); setDialog(false); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async (id) => { try { await api.delete(`/tahfidz/${id}`); toast.success("Dihapus"); load(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  return (
    <div>
      <PageHeader title="Program Tahfidz" subtitle="Pencatatan hafalan Al-Quran (Juz 30)" icon={Trophy}>
        <Select value={classId || "all"} onValueChange={(v) => setClassId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32" data-testid="tahfidz-class-filter"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setDialog(true)} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-tahfidz-btn"><Plus className="w-4 h-4 mr-1" /> Setoran</Button>
      </PageHeader>
      <TableWrap>
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Tanggal</th><th className="text-left px-4 py-3">Siswa</th><th className="text-left px-4 py-3 font-arabic">Surah</th><th className="text-left px-4 py-3">Ayat</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Catatan</th><th className="text-right px-4 py-3">Aksi</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {items.length === 0 ? <EmptyRow colSpan={7} /> : items.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50" data-testid={`tahfidz-row-${t.id}`}>
              <td className="px-4 py-3 text-xs text-slate-500">{t.date}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{t.student_name}</td>
              <td className="px-4 py-3">{t.surah}</td>
              <td className="px-4 py-3 text-sm">{t.ayat_from}–{t.ayat_to}</td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
              <td className="px-4 py-3 text-xs text-slate-500">{t.note || "-"}</td>
              <td className="px-4 py-3 text-right"><button onClick={() => remove(t.id)} data-testid={`delete-tahfidz-${t.id}`} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Setoran Hafalan</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Kelas</Label>
              <Select value={classId} onValueChange={setClassId}><SelectTrigger data-testid="tahfidz-dialog-class"><SelectValue placeholder="Pilih kelas" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Siswa</Label>
              <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}><SelectTrigger data-testid="form-tahfidz-student"><SelectValue placeholder="Pilih siswa" /></SelectTrigger><SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Surah</Label>
              <Select value={form.surah} onValueChange={(v) => setForm({ ...form, surah: v })}><SelectTrigger data-testid="form-tahfidz-surah"><SelectValue /></SelectTrigger><SelectContent>{SURAHS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Ayat Awal</Label><Input type="number" min="1" value={form.ayat_from} onChange={(e) => setForm({ ...form, ayat_from: e.target.value })} /></div>
              <div><Label>Ayat Akhir</Label><Input type="number" min="1" value={form.ayat_to} onChange={(e) => setForm({ ...form, ayat_to: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ziyadah">Ziyadah</SelectItem><SelectItem value="muraja'ah">Muraja'ah</SelectItem><SelectItem value="lancar">Lancar</SelectItem><SelectItem value="mutqin">Mutqin</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div><Label>Catatan</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={save} disabled={!form.student_id} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-tahfidz-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

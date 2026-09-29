import { useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarRange, Plus, Trash2, Handshake, CalendarDays, Users2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const KINDS = [
  { key: "komitmen", label: "Komitmen Kelas", icon: Handshake, fields: [{ k: "text", l: "Isi Komitmen" }] },
  { key: "jadwal", label: "Jadwal Pelajaran", icon: CalendarDays, fields: [{ k: "day", l: "Hari" }, { k: "time", l: "Jam" }, { k: "subject", l: "Mapel" }] },
  { key: "struktur", label: "Struktur Kelas", icon: Users2, fields: [{ k: "position", l: "Jabatan" }, { k: "name", l: "Nama Siswa" }] },
  { key: "piket_kelas", label: "Piket Kelas", icon: Sparkles, fields: [{ k: "day", l: "Hari" }, { k: "name", l: "Nama Siswa" }] },
];

export default function ClassManagement() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [kind, setKind] = useState("komitmen");
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    api.get("/classes").then((r) => {
      setClasses(r.data);
      const mine = r.data.find((c) => c.wali_kelas_id === user.teacher_id);
      setClassId(mine ? mine.id : r.data[0]?.id || "");
    });
  }, [user.teacher_id]);

  const load = useCallback(() => {
    if (!classId) return;
    api.get("/class-meta", { params: { class_id: classId, kind } }).then((r) => setItems(r.data));
  }, [classId, kind]);
  useEffect(() => { load(); }, [load]);

  const current = KINDS.find((k) => k.key === kind);
  const save = async () => {
    try { await api.post("/class-meta", { class_id: classId, kind, data: form }); toast.success("Tersimpan"); setDialog(false); setForm({}); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const remove = async (id) => { await api.delete(`/class-meta/${id}`); load(); };

  return (
    <div>
      <PageHeader title="Manajemen Kelas" subtitle="Komitmen, jadwal, struktur & piket kelas" icon={CalendarRange}>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-32" data-testid="cm-class"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </PageHeader>

      <div className="flex gap-2 mb-5 flex-wrap">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)} data-testid={`cm-tab-${k.key}`} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${kind === k.key ? "bg-[#800020] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            <k.icon className="w-4 h-4" /> {k.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end mb-3"><Button onClick={() => { setForm({}); setDialog(true); }} disabled={!classId} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="add-cm-btn"><Plus className="w-4 h-4 mr-1" /> Tambah</Button></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 ? <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">Belum ada data {current.label.toLowerCase()}</div> : items.map((it) => (
          <div key={it.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-2" data-testid={`cm-item-${it.id}`}>
            <div className="space-y-1 text-sm">
              {current.fields.map((f) => <div key={f.k}><span className="text-slate-400 text-xs">{f.l}: </span><span className="text-slate-800 font-medium">{it.data[f.k]}</span></div>)}
            </div>
            <button onClick={() => remove(it.id)} className="p-1.5 rounded-md hover:bg-rose-100 text-rose-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah {current.label}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {current.fields.map((f) => (
              <div key={f.k}><Label>{f.l}</Label><Input value={form[f.k] || ""} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} data-testid={`form-cm-${f.k}`} /></div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={save} disabled={current.fields.some((f) => !form[f.k])} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-cm-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

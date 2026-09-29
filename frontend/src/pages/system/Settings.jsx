import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useSchool } from "@/context/SchoolContext";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Upload, Save, MessageCircle, Building2, Database, RefreshCw, Download } from "lucide-react";import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function SettingsPage() {
  const { refresh } = useSchool();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backingUp, setBackingUp] = useState(false);
  const [waTest, setWaTest] = useState("");
  const [waTesting, setWaTesting] = useState(false);
  const [waLog, setWaLog] = useState([]);
  const [waSearch, setWaSearch] = useState("");
  const [waStatus, setWaStatus] = useState("");

  const sendWaTest = async () => {
    setWaTesting(true);
    try { await api.post("/whatsapp/test", { target: waTest }); toast.success("Pesan tes WhatsApp terkirim"); loadWaLog(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setWaTesting(false); }
  };
  const loadWaLog = () => {
    const params = {};
    if (waSearch) params.search = waSearch;
    if (waStatus) params.status = waStatus;
    return api.get("/wa-log", { params }).then((r) => setWaLog(r.data.logs)).catch(() => {});
  };
  const downloadBackup = async (stamp) => {
    try {
      const res = await api.get(`/backups/download/${stamp}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `backup-${stamp}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error("Gagal mengunduh backup"); }
  };

  const loadBackups = () => api.get("/backups").then((r) => setBackups(r.data.backups)).catch(() => {});
  useEffect(() => { api.get("/settings").then((r) => setForm(r.data)); loadBackups(); loadWaLog(); }, []);
  useEffect(() => { const t = setTimeout(loadWaLog, 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [waSearch, waStatus]);

  const runBackup = async () => {
    setBackingUp(true);
    try { await api.post("/backups/run-now"); toast.success("Backup dijalankan"); setTimeout(loadBackups, 1500); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setTimeout(() => setBackingUp(false), 1500); }
  };

  const onLogo = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 800 * 1024) { toast.error("Ukuran logo maksimal 800KB"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((s) => ({ ...s, logo: reader.result }));
    reader.readAsDataURL(f);
  };

  const save = async () => {
    setSaving(true);
    try { await api.put("/settings", form); toast.success("Pengaturan disimpan"); refresh(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  if (!form) return <div className="text-slate-400">Memuat…</div>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <PageHeader title="Pengaturan Aplikasi" subtitle="Identitas madrasah, logo & integrasi WhatsApp" icon={Settings} overline="Sistem">
        <Button onClick={save} disabled={saving} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-settings-btn"><Save className="w-4 h-4 mr-1.5" /> Simpan</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card-soft p-6 flex flex-col items-center text-center">
          <div className="text-[11px] uppercase font-bold tracking-widest text-amber-700 mb-3">Logo Madrasah</div>
          <div className="w-28 h-28 rounded-2xl bg-[#FAF6EE] border border-[#EFE7D8] flex items-center justify-center overflow-hidden mb-4">
            {form.logo ? <img src={form.logo} alt="logo" className="w-full h-full object-contain" /> : <Logo size={84} />}
          </div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F5132] text-white text-sm font-semibold hover:bg-[#0a3d25]">
            <Upload className="w-4 h-4" /> Unggah Logo
            <input type="file" accept="image/*" onChange={onLogo} className="hidden" data-testid="logo-upload-input" />
          </label>
          {form.logo && <button onClick={() => setForm({ ...form, logo: null })} className="mt-2 text-xs text-rose-500" data-testid="logo-remove-btn">Hapus logo</button>}
          <p className="text-xs text-slate-400 mt-3">PNG/JPG, maks 800KB. Tampil di sidebar, login & rapor.</p>
        </div>

        <div className="card-soft p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-[#800020]" /><h3 className="font-heading font-semibold text-slate-800">Identitas Madrasah</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Nama Madrasah</Label><Input value={form.school_name || ""} onChange={set("school_name")} data-testid="set-school-name" /></div>
            <div><Label>Subjudul</Label><Input value={form.school_subtitle || ""} onChange={set("school_subtitle")} data-testid="set-school-subtitle" /></div>
            <div className="sm:col-span-2"><Label>Alamat</Label><Input value={form.address || ""} onChange={set("address")} data-testid="set-address" /></div>
            <div><Label>Kepala Madrasah</Label><Input value={form.headmaster || ""} onChange={set("headmaster")} data-testid="set-headmaster" /></div>
            <div><Label>NIP Kepala</Label><Input value={form.headmaster_nip || ""} onChange={set("headmaster_nip")} data-testid="set-headmaster-nip" /></div>
            <div><Label>Tahun Ajaran</Label><Input value={form.academic_year || ""} onChange={set("academic_year")} data-testid="set-academic-year" /></div>
            <div><Label>Semester</Label><Input value={form.semester || ""} onChange={set("semester")} data-testid="set-semester" /></div>
          </div>

          <div className="flex items-center gap-2 mt-8 mb-4"><MessageCircle className="w-5 h-5 text-[#0F5132]" /><h3 className="font-heading font-semibold text-slate-800">Integrasi WhatsApp API</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Label>URL API WhatsApp</Label><Input value={form.whatsapp_api_url || ""} onChange={set("whatsapp_api_url")} placeholder="https://api.fonnte.com/send" data-testid="set-wa-url" /></div>
            <div className="sm:col-span-2"><Label>Token / API Key Fonnte</Label><Input type="password" value={form.whatsapp_api_key || ""} onChange={set("whatsapp_api_key")} placeholder="••••••••••••" data-testid="set-wa-key" /></div>
          </div>
          <div className="mt-4 flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[180px]"><Label>Kirim WA Tes ke Nomor</Label><Input value={waTest} onChange={(e) => setWaTest(e.target.value)} placeholder="0812xxxxxxxx" data-testid="wa-test-input" /></div>
            <Button onClick={sendWaTest} disabled={!waTest || waTesting} className="bg-[#0F5132] hover:bg-[#0a3d25]" data-testid="wa-test-btn"><MessageCircle className="w-4 h-4 mr-1.5" /> Kirim Tes</Button>
          </div>
          <p className="text-xs text-slate-400 mt-3">Provider: <b>Fonnte</b>. Token diambil dari menu Device di dashboard Fonnte, disimpan aman di server. WA otomatis terkirim saat siswa presensi & saat blast rekap bulanan.</p>
        </div>
      </div>

      <div className="card-soft p-6 mt-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2"><Database className="w-5 h-5 text-[#800020]" /><h3 className="font-heading font-semibold text-slate-800">Backup Database Otomatis</h3></div>
          <button onClick={runBackup} disabled={backingUp} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F5132] text-white text-sm font-semibold hover:bg-[#0a3d25] disabled:opacity-50" data-testid="run-backup-btn">
            <RefreshCw className={`w-4 h-4 ${backingUp ? "animate-spin" : ""}`} /> Backup Sekarang
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Backup berjalan otomatis <b>setiap malam pukul 01.00 WIB</b> (menyimpan seluruh data: absensi, nilai, tahfidz, tabungan). 7 backup terakhir disimpan.</p>
        <div className="border border-[#EFE7D8] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF6EE] text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-2">Waktu</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Total Data</th><th className="text-right px-4 py-2">Unduh</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {backups.length === 0 ? <tr><td colSpan={4} className="text-center text-slate-400 py-6">Belum ada backup</td></tr> : backups.map((b, i) => (
                <tr key={i} data-testid={`backup-row-${i}`}>
                  <td className="px-4 py-2 font-mono text-xs">{new Date(b.at).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase">{b.status}</span></td>
                  <td className="px-4 py-2 text-slate-500">{Object.values(b.counts || {}).reduce((a, c) => a + c, 0)} dokumen</td>
                  <td className="px-4 py-2 text-right"><button onClick={() => downloadBackup(b.stamp)} data-testid={`download-backup-${i}`} className="inline-flex items-center gap-1 text-xs text-[#0F5132] hover:bg-emerald-50 px-2 py-1 rounded-md font-semibold"><Download className="w-4 h-4" /> ZIP</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-soft p-6 mt-5">
        <div className="flex items-center gap-2 mb-4"><MessageCircle className="w-5 h-5 text-[#0F5132]" /><h3 className="font-heading font-semibold text-slate-800">Log Pengiriman WhatsApp</h3></div>
        <div className="flex flex-wrap gap-2 mb-3">
          <Input value={waSearch} onChange={(e) => setWaSearch(e.target.value)} placeholder="Cari konteks / nomor (mis. 443)…" data-testid="wa-log-search" className="w-full sm:w-64" />
          {[["", "Semua"], ["ok", "Terkirim"], ["failed", "Gagal"], ["skipped", "Dilewati"]].map(([v, l]) => (
            <button key={v || "all"} onClick={() => setWaStatus(v)} data-testid={`wa-log-filter-${v || "all"}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${waStatus === v ? "bg-[#800020] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
          ))}
        </div>
        <div className="border border-[#EFE7D8] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF6EE] text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-2">Waktu</th><th className="text-left px-4 py-2">Konteks</th><th className="text-left px-4 py-2">Tujuan</th><th className="text-left px-4 py-2">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {waLog.length === 0 ? <tr><td colSpan={4} className="text-center text-slate-400 py-6">Belum ada pengiriman WA</td></tr> : waLog.map((w, i) => (
                <tr key={i} data-testid={`wa-log-${i}`}>
                  <td className="px-4 py-2 font-mono text-xs">{new Date(w.at).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-2 text-slate-600">{w.context || "-"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{w.target}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase ${w.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : w.status === 'skipped' ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-700'}`}>{w.status}</span>{w.reason && w.status !== 'ok' ? <span className="ml-2 text-[11px] text-slate-400">{w.reason}</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

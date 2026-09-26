import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useSchool } from "@/context/SchoolContext";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Upload, Save, MessageCircle, Building2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function SettingsPage() {
  const { refresh } = useSchool();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/settings").then((r) => setForm(r.data)); }, []);

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
            <div className="sm:col-span-2"><Label>URL API WhatsApp</Label><Input value={form.whatsapp_api_url || ""} onChange={set("whatsapp_api_url")} placeholder="https://api.whatsapp-gateway.com/send" data-testid="set-wa-url" /></div>
            <div className="sm:col-span-2"><Label>API Key WhatsApp</Label><Input type="password" value={form.whatsapp_api_key || ""} onChange={set("whatsapp_api_key")} placeholder="••••••••••••" data-testid="set-wa-key" /></div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Kunci disimpan aman di server. Digunakan untuk notifikasi WhatsApp ke orang tua (fitur pengiriman menyusul).</p>
        </div>
      </div>
    </div>
  );
}

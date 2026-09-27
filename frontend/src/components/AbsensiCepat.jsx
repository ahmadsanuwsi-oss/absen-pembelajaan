import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { API } from "@/lib/api";
import { ATTENDANCE_TYPES, waLinkFromPhone } from "@/config/attendanceTypes";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CreditCard, CheckCircle2, AlertTriangle, XCircle, Info, MessageCircle, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";

function playTone(kind) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const beep = (f, s, d, v = 0.15) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(v, now + s); g.gain.exponentialRampToValueAtTime(0.001, now + s + d); o.connect(g); g.connect(ctx.destination); o.start(now + s); o.stop(now + s + d); };
    if (kind === "success") { beep(880, 0, 0.12); beep(1320, 0.13, 0.18); } else if (kind === "warning") { beep(520, 0, 0.15); beep(520, 0.2, 0.15); } else { beep(200, 0, 0.4, 0.2); }
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {}
}

export function AbsensiCepat({ compact = false }) {
  const navigate = useNavigate();
  const [type, setType] = useState("datang");
  const [code, setCode] = useState("");
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const typeRef = useRef(type);
  const timer = useRef(null);
  typeRef.current = type;

  useEffect(() => {
    axios.get(`${API}/kiosk/classes`).then((r) => { setClasses(r.data); if (r.data[0]) setSelClass(r.data[0].id); }).catch(() => {});
  }, []);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = useCallback(async (value) => {
    const v = String(value || "").trim();
    if (v.length < 3) return;
    try {
      const { data } = await axios.post(`${API}/kiosk/scan`, { code: v, type: typeRef.current });
      setResult(data);
      playTone(data.status === "success" ? "success" : data.status === "already_scanned" ? "warning" : "error");
    } catch (e) { setResult({ status: "not_found", message: "Kesalahan koneksi." }); playTone("error"); }
    setCode("");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setResult(null), 4500);
    inputRef.current?.focus();
  }, []);

  const cls = classes.find((c) => c.id === selClass);
  const waLink = cls?.wali_phone ? waLinkFromPhone(cls.wali_phone, `Assalamu'alaikum, saya orang tua/wali siswa kelas ${cls.name}. Ananda berhalangan hadir hari ini.`) : null;

  const statusStyle = { success: "bg-emerald-50 border-emerald-300 text-emerald-800", already_scanned: "bg-amber-50 border-amber-300 text-amber-800", not_found: "bg-rose-50 border-rose-300 text-rose-800" };
  const StatusIcon = { success: CheckCircle2, already_scanned: AlertTriangle, not_found: XCircle }[result?.status] || Info;

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <div className="flex justify-center mb-2"><ScanLine className="w-9 h-9 text-[#800020]" /></div>
      <h2 className="font-heading text-2xl font-extrabold text-[#800020]">Absensi Cepat</h2>
      <p className="text-sm text-slate-500 mb-5">Pilih jenis absen lalu scan kartu Anda</p>

      <div className="text-left mb-4">
        <label className="text-xs font-bold text-slate-600">1. Pilih Jenis Absen</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="mt-1.5 bg-white h-11" data-testid="ac-type"><SelectValue /></SelectTrigger>
          <SelectContent>{ATTENDANCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="text-center mb-2"><span className="text-sm font-bold text-slate-700">2. Tempelkan Kartu RFID</span></div>
      <div className="relative mb-4">
        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
        <Input ref={inputRef} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(code); }}
          placeholder="Fokus di sini & Tap Kartu…" data-testid="ac-rfid-input"
          className="h-14 text-center text-lg tracking-widest border-2 border-dashed border-[#E7C9D0] focus:border-[#800020] pl-10" />
      </div>

      {result && (
        <div className={`mb-4 rounded-xl border p-3 text-left flex items-center gap-3 animate-flash-in ${statusStyle[result.status]}`} data-testid="ac-result">
          <StatusIcon className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            {result.student ? <><div className="font-bold truncate">{result.student.name}</div><div className="text-xs">{result.student.class_name} · {result.status === "success" ? `${result.message} ${result.time}` : result.message}</div></> : <div className="font-semibold text-sm">{result.message}</div>}
          </div>
        </div>
      )}

      <div className="border-t border-[#EFE7D8] pt-4 text-left">
        <div className="flex items-center gap-1.5 justify-center mb-2 text-[#800020]"><Info className="w-4 h-4" /><span className="text-sm font-bold">Berhalangan Hadir?</span></div>
        <Select value={selClass} onValueChange={setSelClass}>
          <SelectTrigger className="bg-white mb-2" data-testid="ac-class"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
          <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <a href={waLink || undefined} target="_blank" rel="noreferrer"
          onClick={(e) => { if (!waLink) { e.preventDefault(); } }}
          data-testid="ac-contact-wali"
          className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm transition-colors ${waLink ? "bg-[#800020] text-white hover:bg-[#6B0D24]" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
          <MessageCircle className="w-4 h-4" /> Hubungi Wali Kelas{cls?.wali_name ? ` (${cls.wali_name})` : ""}
        </a>
      </div>

      {!compact && (
        <button onClick={() => navigate("/kiosk")} data-testid="ac-fullscreen" className="mt-4 text-xs text-slate-400 hover:text-[#800020] underline">Buka mode layar penuh (kiosk)</button>
      )}
    </div>
  );
}

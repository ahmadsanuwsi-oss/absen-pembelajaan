import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Tesseract from "tesseract.js";
import { API } from "@/lib/api";
import { useSchool } from "@/context/SchoolContext";
import { Logo } from "@/components/Logo";
import { ATTENDANCE_TYPES, waLinkFromPhone } from "@/config/attendanceTypes";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, XCircle, Camera, X, ScanLine, Loader2, Upload, CreditCard, MessageCircle, Info } from "lucide-react";

function playTone(kind) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const beep = (f, s, d, v = 0.15) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(v, now + s); g.gain.exponentialRampToValueAtTime(0.001, now + s + d); o.connect(g); g.connect(ctx.destination); o.start(now + s); o.stop(now + s + d); };
    if (kind === "success") { beep(880, 0, 0.12); beep(1320, 0.13, 0.18); } else if (kind === "warning") { beep(520, 0, 0.15); beep(520, 0.2, 0.15); } else { beep(200, 0, 0.4, 0.2); }
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {}
}

function extractNisn(text) {
  const groups = (text || "").match(/\d{8,12}/g);
  if (groups?.length) { groups.sort((a, b) => Math.abs(a.length - 10) - Math.abs(b.length - 10)); return groups[0].slice(0, 10); }
  const d = (text || "").replace(/[^0-9]/g, "");
  return d.length >= 10 ? d.slice(0, 10) : null;
}

export default function Kiosk() {
  const navigate = useNavigate();
  const { school } = useSchool();
  const [type, setType] = useState("datang");
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [scanning, setScanning] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState("");
  const videoRef = useRef(null); const streamRef = useRef(null); const inputRef = useRef(null);
  const timer = useRef(null); const fileRef = useRef(null); const typeRef = useRef(type);
  typeRef.current = type;

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { axios.get(`${API}/kiosk/classes`).then((r) => { setClasses(r.data); if (r.data[0]) setSelClass(r.data[0].id); }).catch(() => {}); }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); if (!active) { s.getTracks().forEach((t) => t.stop()); return; } streamRef.current = s; if (videoRef.current) { videoRef.current.srcObject = s; setCamReady(true); } }
      catch (e) { setCamError(true); }
    })();
    return () => { active = false; if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, []);

  const submitCode = useCallback(async (value) => {
    const v = String(value || "").trim();
    if (v.length < 3) return;
    try { const { data } = await axios.post(`${API}/kiosk/scan`, { code: v, type: typeRef.current }); setResult(data); playTone(data.status === "success" ? "success" : data.status === "already_scanned" ? "warning" : "error"); }
    catch (e) { setResult({ status: "not_found", message: "Kesalahan koneksi." }); playTone("error"); }
    setCode("");
    clearTimeout(timer.current); timer.current = setTimeout(() => setResult(null), 4500);
    inputRef.current?.focus();
  }, []);

  const runOcr = useCallback(async (src) => {
    setScanning(true);
    try {
      const { data: { text } } = await Tesseract.recognize(src, "eng");
      const nisn = extractNisn(text);
      // Privasi: foto TIDAK disimpan; hanya 10 digit NISN dikirim.
      if (nisn) await submitCode(nisn);
      else { setResult({ status: "not_found", message: "NISN tidak terbaca. Foto lebih jelas." }); playTone("error"); clearTimeout(timer.current); timer.current = setTimeout(() => setResult(null), 4000); }
    } catch (e) { setResult({ status: "not_found", message: "Gagal memproses foto." }); playTone("error"); }
    finally { setScanning(false); }
  }, [submitCode]);

  const capture = useCallback(() => {
    if (!videoRef.current || !camReady) return;
    const v = videoRef.current, c = document.createElement("canvas");
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); runOcr(c);
  }, [camReady, runOcr]);
  const onFile = (e) => { const f = e.target.files?.[0]; if (f) runOcr(f); e.target.value = ""; };

  const cls = classes.find((c) => c.id === selClass);
  const waLink = cls?.wali_phone ? waLinkFromPhone(cls.wali_phone, `Assalamu'alaikum, saya wali siswa kelas ${cls.name}. Ananda berhalangan hadir hari ini.`) : null;
  const statusMap = { success: { bg: "bg-[#0F5132]", icon: CheckCircle2 }, already_scanned: { bg: "bg-amber-500", icon: AlertTriangle }, not_found: { bg: "bg-[#9E1B32]", icon: XCircle } };

  return (
    <div className="min-h-screen text-white flex flex-col relative overflow-hidden" style={{ background: "#4A0616" }}>
      <div className="absolute inset-0 islamic-pattern-dark opacity-60" />
      <header className="relative flex items-center justify-between px-6 sm:px-10 py-4 border-b border-white/10">
        <div className="flex items-center gap-3"><div className="bg-white/95 rounded-xl p-1.5"><Logo size={40} /></div><div><div className="font-heading font-extrabold leading-tight">{school.school_name}</div><div className="text-[#E9C46A] text-xs">Absensi Cepat — Kiosk</div></div></div>
        <div className="text-right"><div className="font-heading text-2xl sm:text-3xl font-bold tabular-nums">{clock.toLocaleTimeString("id-ID", { hour12: false })}</div><div className="text-white/60 text-xs capitalize">{clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div></div>
        <button onClick={() => navigate(-1)} data-testid="exit-kiosk-btn" className="absolute top-3 right-3 sm:static p-2 rounded-lg hover:bg-white/10"><X className="w-6 h-6" /></button>
      </header>

      <div className="relative flex-1 flex flex-col lg:flex-row items-start justify-center gap-8 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Left controls */}
        <div className="w-full max-w-sm space-y-4">
          <div><label className="text-sm font-bold text-[#E9C46A]">1. Pilih Jenis Absen</label>
            <Select value={type} onValueChange={setType}><SelectTrigger className="mt-1.5 h-12 bg-white/10 border-white/20 text-white" data-testid="kiosk-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>{ATTENDANCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><label className="text-sm font-bold text-[#E9C46A]">2. Tempelkan Kartu RFID</label>
            <div className="relative mt-1.5">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input ref={inputRef} autoFocus value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitCode(code); }}
                placeholder="Fokus di sini & Tap Kartu…" data-testid="kiosk-rfid-input"
                className="w-full h-14 rounded-xl bg-white/10 border-2 border-dashed border-[#E9C46A]/40 focus:border-[#E9C46A] outline-none text-center text-lg tracking-widest pl-10 placeholder:text-white/40" />
            </div>
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-1.5 mb-2 text-[#E9C46A]"><Info className="w-4 h-4" /><span className="text-sm font-bold">Berhalangan Hadir?</span></div>
            <Select value={selClass} onValueChange={setSelClass}><SelectTrigger className="bg-white/10 border-white/20 text-white mb-2" data-testid="kiosk-berhalangan-class"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            <a href={waLink || undefined} target="_blank" rel="noreferrer" onClick={(e) => { if (!waLink) e.preventDefault(); }} data-testid="kiosk-contact-wali"
              className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm ${waLink ? "bg-[#0F5132] hover:bg-[#0a3d25]" : "bg-white/10 text-white/40 cursor-not-allowed"}`}>
              <MessageCircle className="w-4 h-4" /> Hubungi Wali Kelas{cls?.wali_name ? ` (${cls.wali_name})` : ""}
            </a>
          </div>
        </div>

        {/* Middle camera */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-[320px] h-[220px] rounded-2xl overflow-hidden border-4 border-[#D4AF37]/60 bg-black/40">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" data-testid="kiosk-camera-video" />
            {!camReady && !camError && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/60" /></div>}
            {camError && <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 text-center px-3"><Camera className="w-8 h-8 mb-1" /><span className="text-xs">Kamera tidak tersedia — pakai unggah</span></div>}
            <div className="absolute inset-5 border-2 border-dashed border-[#E9C46A]/70 rounded-lg pointer-events-none" />
            {scanning && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#E9C46A]" /><span className="text-xs mt-1">Membaca NISN…</span></div>}
          </div>
          <div className="flex gap-2">
            <button onClick={capture} disabled={!camReady || scanning} data-testid="kiosk-capture-btn" className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0F5132] hover:bg-[#0a3d25] disabled:opacity-50 font-bold"><Camera className="w-5 h-5" /> Foto NISN</button>
            <button onClick={() => fileRef.current?.click()} disabled={scanning} data-testid="kiosk-upload-btn" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-semibold"><Upload className="w-5 h-5" /></button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" data-testid="kiosk-file-input" />
          </div>
          <p className="text-white/50 text-xs text-center max-w-[300px]">Foto NISN diproses di perangkat; gambar tidak disimpan.</p>
        </div>

        {/* Right result */}
        <div className="w-full max-w-xs">
          {!result ? (
            <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl h-[300px] flex flex-col items-center justify-center text-white/40"><div className="relative w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center pulse-ring mb-3"><ScanLine className="w-10 h-10 text-[#E9C46A]" /></div><p>Menunggu presensi…</p></div>
          ) : (
            <div className={`${statusMap[result.status].bg} rounded-2xl p-6 text-center animate-flash-in shadow-2xl`} data-testid="kiosk-result">
              {(() => { const I = statusMap[result.status].icon; return <I className="w-20 h-20 mx-auto mb-3" />; })()}
              {result.student ? (<><div className="w-16 h-16 rounded-full bg-white/25 mx-auto flex items-center justify-center text-2xl font-bold mb-2">{result.student.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}</div><h2 className="font-heading text-xl font-bold">{result.student.name}</h2><p className="text-white/80 text-sm">NISN {result.student.nisn} · {result.student.class_name}</p><div className="mt-3 inline-block bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold">{result.status === "success" ? `${result.time} · ${result.message}` : `${result.message}${result.time ? ` · ${result.time}` : ""}`}</div></>) : (<h2 className="font-heading text-xl font-bold mt-1">{result.message}</h2>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Tesseract from "tesseract.js";
import { API } from "@/lib/api";
import { useSchool } from "@/context/SchoolContext";
import { Logo } from "@/components/Logo";
import { CheckCircle2, AlertTriangle, XCircle, Camera, X, Sun, Sparkles, ScanLine, Loader2, Upload } from "lucide-react";

const TYPES = [
  { key: "kehadiran", label: "Kehadiran Harian", icon: CheckCircle2 },
  { key: "dhuha", label: "Sholat Dhuha", icon: Sun },
  { key: "ekstra", label: "Ekstrakurikuler", icon: Sparkles },
];

function playTone(kind) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const beep = (freq, start, dur, vol = 0.15) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + start); osc.stop(now + start + dur);
    };
    if (kind === "success") { beep(880, 0, 0.12); beep(1320, 0.13, 0.18); }
    else if (kind === "warning") { beep(520, 0, 0.15); beep(520, 0.2, 0.15); }
    else { beep(200, 0, 0.4, 0.2); }
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {}
}

function extractNisn(text) {
  const digitsOnly = (text || "").replace(/[^0-9]/g, "");
  const groups = (text || "").match(/\d{8,12}/g);
  if (groups && groups.length) {
    groups.sort((a, b) => Math.abs(a.length - 10) - Math.abs(b.length - 10));
    return groups[0].slice(0, 10);
  }
  if (digitsOnly.length >= 10) return digitsOnly.slice(0, 10);
  return null;
}

export default function Kiosk() {
  const navigate = useNavigate();
  const { school } = useSchool();
  const [type, setType] = useState("kehadiran");
  const [result, setResult] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [scanning, setScanning] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const bufferRef = useRef("");
  const lastKeyRef = useRef(0);
  const resultTimer = useRef(null);
  const typeRef = useRef(type);
  const fileRef = useRef(null);
  typeRef.current = type;

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  // start webcam
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; setCamReady(true); }
      } catch (e) { setCamError(true); }
    })();
    return () => { active = false; if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, []);

  const submitCode = useCallback(async (value) => {
    if (!value || value.length < 3) return;
    try {
      const { data } = await axios.post(`${API}/kiosk/scan`, { code: value, type: typeRef.current });
      setResult(data);
      playTone(data.status === "success" ? "success" : data.status === "already_scanned" ? "warning" : "error");
    } catch (e) {
      setResult({ status: "not_found", message: "Terjadi kesalahan koneksi." });
      playTone("error");
    }
    clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setResult(null), 4500);
  }, []);

  const runOcr = useCallback(async (imageSource) => {
    setScanning(true);
    try {
      const { data: { text } } = await Tesseract.recognize(imageSource, "eng");
      const nisn = extractNisn(text);
      if (nisn) { await submitCode(nisn); }
      // Privasi: foto TIDAK disimpan/diunggah. Hanya 10 digit NISN dikirim ke server; canvas/gambar dibuang setelah dibaca.
      else {
        setResult({ status: "not_found", message: "Nomor NISN tidak terbaca. Foto lebih jelas & dekat." });
        playTone("error");
        clearTimeout(resultTimer.current);
        resultTimer.current = setTimeout(() => setResult(null), 4000);
      }
    } catch (e) {
      setResult({ status: "not_found", message: "Gagal memproses foto." });
      playTone("error");
    } finally { setScanning(false); }
  }, [submitCode]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !camReady) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
    runOcr(canvas);
  }, [camReady, runOcr]);

  const onFile = (e) => { const f = e.target.files?.[0]; if (f) runOcr(f); e.target.value = ""; };

  // RFID keyboard-emulation listener (primary path)
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT") return;
      const now = Date.now();
      if (now - lastKeyRef.current > 100) bufferRef.current = "";
      lastKeyRef.current = now;
      if (e.key === "Enter") { if (bufferRef.current.length >= 3) submitCode(bufferRef.current); bufferRef.current = ""; }
      else if (/^[a-zA-Z0-9]$/.test(e.key)) bufferRef.current += e.key;
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submitCode]);

  const statusMap = {
    success: { bg: "bg-[#0F5132]", icon: CheckCircle2 },
    already_scanned: { bg: "bg-amber-500", icon: AlertTriangle },
    not_found: { bg: "bg-[#9E1B32]", icon: XCircle },
  };

  return (
    <div className="min-h-screen text-white flex flex-col relative overflow-hidden" style={{ background: "#4A0616" }}>
      <div className="absolute inset-0 islamic-pattern-dark opacity-60" />
      <header className="relative flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-white/95 rounded-xl p-1.5"><Logo size={44} /></div>
          <div><div className="font-heading font-extrabold text-lg leading-tight">{school.school_name}</div><div className="text-[#E9C46A] text-xs">Kiosk Presensi Digital</div></div>
        </div>
        <div className="text-right">
          <div className="font-heading text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">{clock.toLocaleTimeString("id-ID", { hour12: false })}</div>
          <div className="text-white/60 text-sm capitalize">{clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <button onClick={() => navigate(-1)} data-testid="exit-kiosk-btn" className="absolute top-4 right-4 sm:static p-2 rounded-lg hover:bg-white/10"><X className="w-6 h-6" /></button>
      </header>

      <div className="relative flex justify-center gap-3 sm:gap-4 px-4 py-6 flex-wrap">
        {TYPES.map((t) => (
          <button key={t.key} onClick={() => setType(t.key)} data-testid={`kiosk-type-${t.key}`}
            className={`flex items-center gap-2.5 px-5 sm:px-7 py-3.5 rounded-2xl font-semibold text-sm sm:text-base transition-all ${type === t.key ? "bg-[#D4AF37] text-[#4A0616] scale-105 shadow-lg" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
            <t.icon className="w-5 h-5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 flex flex-col lg:flex-row items-center justify-center gap-10 px-6 pb-10">
        {/* Camera viewport */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-[360px] h-[260px] rounded-3xl overflow-hidden border-4 border-[#D4AF37]/60 bg-black/40 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" data-testid="kiosk-camera-video" />
            {!camReady && !camError && <div className="absolute inset-0 flex items-center justify-center text-white/60"><Loader2 className="w-8 h-8 animate-spin" /></div>}
            {camError && <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 text-center px-4"><Camera className="w-10 h-10 mb-2" /><span className="text-sm">Kamera tidak tersedia. Gunakan unggah foto.</span></div>}
            {/* NISN framing guides */}
            <div className="absolute inset-6 border-2 border-dashed border-[#E9C46A]/70 rounded-xl pointer-events-none" />
            {scanning && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#E9C46A]" /><span className="mt-2 text-sm">Membaca NISN…</span></div>}
          </div>
          <p className="text-white/70 text-sm text-center max-w-[320px]">Arahkan angka NISN (10 digit) ke dalam bingkai, lalu tekan <b>Ambil Foto</b>. Kartu RFID juga bisa langsung di-tap.</p>
          <div className="flex gap-3">
            <button onClick={capturePhoto} disabled={!camReady || scanning} data-testid="kiosk-capture-btn"
              className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-[#0F5132] hover:bg-[#0a3d25] disabled:opacity-50 font-bold text-lg transition-all active:scale-95">
              <Camera className="w-6 h-6" /> Ambil Foto & Presensi
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={scanning} data-testid="kiosk-upload-btn" className="flex items-center gap-2 px-4 py-4 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold transition-all">
              <Upload className="w-5 h-5" /> Unggah
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" data-testid="kiosk-file-input" />
          </div>
        </div>

        {/* Result panel */}
        <div className="w-full max-w-md">
          {!result ? (
            <div className="bg-white/5 border border-dashed border-white/20 rounded-3xl h-[380px] flex flex-col items-center justify-center text-white/40">
              <div className="relative w-24 h-24 rounded-full bg-[#D4AF37]/10 flex items-center justify-center pulse-ring mb-4"><ScanLine className="w-12 h-12 text-[#E9C46A]" /></div>
              <p className="text-lg">Menunggu presensi…</p>
            </div>
          ) : (
            <div className={`${statusMap[result.status].bg} rounded-3xl p-8 text-center animate-flash-in shadow-2xl`} data-testid="kiosk-result">
              {(() => { const I = statusMap[result.status].icon; return <I className="w-24 h-24 mx-auto mb-4" />; })()}
              {result.student ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-white/25 mx-auto flex items-center justify-center text-3xl font-bold font-heading mb-3">{result.student.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}</div>
                  <h2 className="font-heading text-2xl font-bold">{result.student.name}</h2>
                  <p className="text-white/80">NISN {result.student.nisn} · Kelas {result.student.class_name}</p>
                  <div className="mt-4 inline-block bg-white/20 rounded-full px-5 py-2 font-semibold">{result.status === "success" ? `${result.time} · ${result.message}` : `${result.message}${result.time ? ` · ${result.time}` : ""}`}</div>
                </>
              ) : (<h2 className="font-heading text-2xl font-bold mt-2">{result.message}</h2>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

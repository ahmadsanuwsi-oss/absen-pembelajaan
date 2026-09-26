import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { CheckCircle2, AlertTriangle, XCircle, Delete, ScanLine, X, Sun, Sparkles } from "lucide-react";

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
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
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

export default function Kiosk() {
  const navigate = useNavigate();
  const [type, setType] = useState("kehadiran");
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [clock, setClock] = useState(new Date());
  const bufferRef = useRef("");
  const lastKeyRef = useRef(0);
  const resultTimer = useRef(null);
  const typeRef = useRef(type);
  typeRef.current = type;

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
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
    setCode("");
    clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setResult(null), 4500);
  }, []);

  // RFID keyboard-emulation listener
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT") return;
      const now = Date.now();
      if (now - lastKeyRef.current > 100) bufferRef.current = "";
      lastKeyRef.current = now;
      if (e.key === "Enter") {
        if (bufferRef.current.length >= 3) submitCode(bufferRef.current);
        bufferRef.current = "";
      } else if (/^[a-zA-Z0-9]$/.test(e.key)) {
        bufferRef.current += e.key;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submitCode]);

  const press = (d) => setCode((c) => (c.length < 10 ? c + d : c));
  const backspace = () => setCode((c) => c.slice(0, -1));

  const statusMap = {
    success: { bg: "bg-emerald-600", icon: CheckCircle2, ring: "text-emerald-100" },
    already_scanned: { bg: "bg-amber-500", icon: AlertTriangle, ring: "text-amber-100" },
    not_found: { bg: "bg-rose-600", icon: XCircle, ring: "text-rose-100" },
  };

  return (
    <div className="min-h-screen kiosk-pattern text-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Logo size={48} />
          <div>
            <div className="font-heading font-extrabold text-lg leading-tight">MI Miftahul Jannah</div>
            <div className="text-[#D4AF37] text-xs">Kiosk Absensi Digital</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-heading text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">
            {clock.toLocaleTimeString("id-ID", { hour12: false })}
          </div>
          <div className="text-white/60 text-sm capitalize">
            {clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <button onClick={() => navigate(-1)} data-testid="exit-kiosk-btn" className="absolute top-4 right-4 sm:static p-2 rounded-lg hover:bg-white/10">
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* Type selector */}
      <div className="flex justify-center gap-3 sm:gap-4 px-4 py-6 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            data-testid={`kiosk-type-${t.key}`}
            className={`flex items-center gap-2.5 px-5 sm:px-7 py-3.5 rounded-2xl font-semibold text-sm sm:text-base transition-all ${
              type === t.key ? "bg-[#D4AF37] text-[#4A0616] scale-105 shadow-lg" : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            <t.icon className="w-5 h-5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-10 px-6 pb-10">
        {/* RFID indicator + keypad */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex flex-col items-center">
            <div className="relative w-32 h-32 rounded-full bg-[#D4AF37]/15 flex items-center justify-center pulse-ring">
              <ScanLine className="w-16 h-16 text-[#D4AF37]" />
            </div>
            <p className="mt-4 text-white/70 text-sm text-center max-w-[220px]">Tap kartu RFID Anda,<br />atau ketik 10 digit NISN</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 w-[300px]">
            <div data-testid="kiosk-nisn-display" className="h-14 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center font-heading text-3xl font-bold tabular-nums tracking-[0.15em] mb-4">
              {code || <span className="text-white/30 text-xl tracking-normal">NISN…</span>}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {["1","2","3","4","5","6","7","8","9"].map((n) => (
                <button key={n} onClick={() => press(n)} data-testid={`keypad-${n}`} className="h-16 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-2xl font-semibold transition-all">{n}</button>
              ))}
              <button onClick={backspace} data-testid="keypad-backspace" className="h-16 rounded-xl bg-white/10 hover:bg-rose-500/40 flex items-center justify-center transition-all"><Delete className="w-6 h-6" /></button>
              <button onClick={() => press("0")} data-testid="keypad-0" className="h-16 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-2xl font-semibold transition-all">0</button>
              <button onClick={() => submitCode(code)} data-testid="kiosk-submit-btn" className="h-16 rounded-xl bg-[#0D5C3A] hover:bg-[#0a4a2f] flex items-center justify-center font-bold transition-all">OK</button>
            </div>
          </div>
        </div>

        {/* Result panel */}
        <div className="w-full max-w-md">
          {!result ? (
            <div className="bg-white/5 border border-dashed border-white/20 rounded-3xl h-[380px] flex flex-col items-center justify-center text-white/40">
              <ScanLine className="w-20 h-20 mb-4" />
              <p className="text-lg">Menunggu scan…</p>
            </div>
          ) : (
            <div className={`${statusMap[result.status].bg} rounded-3xl p-8 text-center animate-flash-in shadow-2xl`} data-testid="kiosk-result">
              {(() => { const I = statusMap[result.status].icon; return <I className="w-24 h-24 mx-auto mb-4" />; })()}
              {result.student ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-white/25 mx-auto flex items-center justify-center text-3xl font-bold font-heading mb-3">
                    {result.student.name.split(" ").slice(0,2).map((w)=>w[0]).join("")}
                  </div>
                  <h2 className="font-heading text-2xl font-bold">{result.student.name}</h2>
                  <p className="text-white/80">NISN {result.student.nisn} · Kelas {result.student.class_name}</p>
                  <div className="mt-4 inline-block bg-white/20 rounded-full px-5 py-2 font-semibold">
                    {result.status === "success" ? `${result.time} · ${result.message}` : `${result.message}${result.time ? ` · ${result.time}` : ""}`}
                  </div>
                </>
              ) : (
                <h2 className="font-heading text-2xl font-bold mt-2">{result.message}</h2>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

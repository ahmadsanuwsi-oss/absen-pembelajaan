import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
import { Loader2, ScanLine, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 maroon-gradient relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 kiosk-pattern opacity-60" />
        <div className="relative flex items-center gap-3">
          <Logo size={52} />
          <div>
            <div className="font-heading font-extrabold text-white text-xl">MI Miftahul Jannah</div>
            <div className="text-[#D4AF37] text-sm">Madrasah Ibtidaiyah</div>
          </div>
        </div>
        <div className="relative">
          <p className="font-arabic text-[#D4AF37] text-3xl mb-4">بِسْمِ اللّٰهِ</p>
          <h2 className="font-heading text-4xl font-bold text-white leading-tight">Sistem Informasi<br />Manajemen Sekolah</h2>
          <p className="text-white/70 mt-4 max-w-md leading-relaxed">Absensi kiosk, nilai Kurikulum Merdeka, tahfidz, tabungan, dan administrasi guru dalam satu platform terpadu.</p>
        </div>
        <div className="relative text-white/40 text-xs">© 2026 MI Miftahul Jannah · Tahun Ajaran 2025/2026</div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FAF9F6]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Logo size={48} />
            <div className="font-heading font-extrabold text-[#800020] text-lg">MI Miftahul Jannah</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h1 className="font-heading text-2xl font-bold text-slate-900">Selamat Datang</h1>
            <p className="text-sm text-slate-500 mt-1 mb-6">Masuk untuk mengakses dashboard Anda.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@mijannah.sch.id" required data-testid="login-email-input" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required data-testid="login-password-input" />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-testid="login-error">{error}</div>}
              <Button type="submit" disabled={loading} data-testid="login-submit-btn" className="w-full bg-[#800020] hover:bg-[#6B0D24] h-11 text-base">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk"}
              </Button>
            </form>
            <button onClick={() => navigate("/kiosk")} data-testid="goto-kiosk-btn" className="mt-4 w-full flex items-center justify-center gap-2 h-11 rounded-lg border-2 border-[#0D5C3A] text-[#0D5C3A] font-semibold hover:bg-[#0D5C3A] hover:text-white transition-colors">
              <ScanLine className="w-5 h-5" /> Mode Kiosk Absensi
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-6">Akun dibuat oleh Administrator. Lupa password? Hubungi TU.</p>
        </div>
      </div>
    </div>
  );
}

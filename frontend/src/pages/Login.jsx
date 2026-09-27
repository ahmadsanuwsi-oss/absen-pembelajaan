import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSchool } from "@/context/SchoolContext";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { AbsensiCepat } from "@/components/AbsensiCepat";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatApiError } from "@/lib/api";
import { Loader2, Eye, EyeOff, LogIn, User, Lock } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const { school } = useSchool();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await login(identifier.trim(), password); navigate("/dashboard"); }
    catch (e) { setError(formatApiError(e.response?.data?.detail) || e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left — Absensi Cepat */}
      <div className="lg:w-1/2 relative flex items-center justify-center p-6 sm:p-10" style={{ background: "linear-gradient(160deg,#FDF2F4 0%,#FBE9EE 100%)" }}>
        <div className="absolute inset-0 islamic-pattern opacity-40" />
        <div className="relative card-soft p-8 w-full max-w-md">
          <AbsensiCepat compact={false} />
        </div>
      </div>

      {/* Right — Login MifjanOke */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4"><div className="bg-white rounded-2xl p-2 shadow-sm border border-[#EFE7D8]"><Logo size={72} /></div></div>
          <h1 className="font-heading text-xl sm:text-2xl font-extrabold text-[#800020] leading-snug">Manajemen Informasi Finansial, Jurnal Administrasi, Nilai, Observasi Kehadiran, dan Evaluasi</h1>
          <p className="text-sm text-slate-500 mt-2 mb-6">Silakan masuk ke akun Anda</p>
          <form onSubmit={submit} className="space-y-4 text-left">
            <div>
              <Label htmlFor="email">Username</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="email" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Masukkan username" required data-testid="login-email-input" className="pl-9 h-11" />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" required data-testid="login-password-input" className="pl-9 h-11" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-testid="login-error">{error}</div>}
            <Button type="submit" disabled={loading} data-testid="login-submit-button" className="w-full bg-[#800020] hover:bg-[#6B0D24] h-12 text-base font-semibold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 mr-2" /> MASUK SISTEM</>}
            </Button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-6">{school.school_name} · TA {school.academic_year} · Akun dibuat oleh Administrator</p>
        </div>
      </div>
    </div>
  );
}

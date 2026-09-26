import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { NAV, ROLE_LABELS } from "@/config/nav";
import { Logo } from "@/components/Logo";
import { ChevronDown, LogOut, Menu, X, ScanLine, KeyRound } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const groups = NAV[user.role] || [];
  const [open, setOpen] = useState(() => groups.map((_, i) => i));

  const toggle = (i) => setOpen((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <Logo size={44} />
        <div className="leading-tight">
          <div className="font-heading font-extrabold text-white text-[15px]">MI Miftahul Jannah</div>
          <div className="text-[11px] text-[#D4AF37] font-medium tracking-wide">Sistem Manajemen Sekolah</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {groups.map((g, i) => (
          <div key={g.group}>
            <button
              data-testid={`nav-group-${i}`}
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37]/80 hover:text-[#D4AF37]"
            >
              {g.group}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open.includes(i) ? "" : "-rotate-90"}`} />
            </button>
            {open.includes(i) && (
              <div className="space-y-0.5 mt-0.5">
                {g.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === "/dashboard"}
                    onClick={onNavigate}
                    data-testid={`nav-link-${it.to.replace(/\//g, "-").replace(/^-/, "")}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive ? "bg-[#D4AF37] text-[#4A0616] font-semibold shadow-sm" : "text-white/85 hover:bg-white/10"
                      }`
                    }
                  >
                    <it.icon className="w-[18px] h-[18px] shrink-0" />
                    <span>{it.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 text-[11px] text-white/40 border-t border-white/10">
        TA 2025/2026 &middot; Semester 2
      </div>
    </div>
  );
}

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const initials = (user?.name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#FAF9F6]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 maroon-gradient flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 maroon-gradient flex flex-col animate-flash-in">
            <button className="absolute top-4 right-4 text-white" onClick={() => setMobileOpen(false)}>
              <X className="w-6 h-6" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3">
          <button className="lg:hidden text-slate-700" onClick={() => setMobileOpen(true)} data-testid="mobile-menu-btn">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          {(user.role === "admin" || user.role === "guru") && (
            <button
              onClick={() => navigate("/kiosk")}
              data-testid="open-kiosk-btn"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0D5C3A] text-white text-sm font-semibold hover:bg-[#0a4a2f] transition-colors"
            >
              <ScanLine className="w-4 h-4" /> <span className="hidden sm:inline">Mode Kiosk</span>
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100" data-testid="user-menu-btn">
                <div className="w-9 h-9 rounded-full bg-[#800020] text-white flex items-center justify-center text-sm font-bold">{initials}</div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-sm font-semibold text-slate-800 max-w-[140px] truncate">{user.name}</div>
                  <div className="text-[11px] text-slate-500">{ROLE_LABELS[user.role]}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPwOpen(true)} data-testid="change-password-item">
                <KeyRound className="w-4 h-4 mr-2" /> Ubah Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} data-testid="logout-btn" className="text-rose-600 focus:text-rose-600">
                <LogOut className="w-4 h-4 mr-2" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

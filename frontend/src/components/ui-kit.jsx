import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PageHeader({ title, subtitle, children, icon: Icon, overline }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 no-print">
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#800020] to-[#9E1B32] flex items-center justify-center shrink-0 shadow-sm">
            <Icon className="w-6 h-6 text-[#D4AF37]" />
          </div>
        )}
        <div>
          {overline && <div className="text-[11px] uppercase font-bold tracking-widest text-amber-700 mb-0.5">{overline}</div>}
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "#800020", sub }) {
  return (
    <div className="card-soft p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${accent}14` }}>
        <Icon className="w-6 h-6" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold font-heading text-slate-900 truncate">{value}</div>
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = "Cari...", testId = "search-input" }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testId} className="pl-9 w-full sm:w-64 bg-white" />
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (!pages || pages <= 1) return <div className="text-xs text-slate-500 py-3">{total || 0} data</div>;
  return (
    <div className="flex items-center justify-between py-3 flex-wrap gap-2 no-print">
      <span className="text-xs text-slate-500">Halaman {page} dari {pages} &middot; {total} data</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid="page-prev" className="p-2 rounded-lg border border-[#EFE7D8] disabled:opacity-40 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} data-testid="page-next" className="p-2 rounded-lg border border-[#EFE7D8] disabled:opacity-40 hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export function TableWrap({ children }) {
  return (
    <div className="card-soft overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>
    </div>
  );
}

export function EmptyRow({ colSpan, text = "Belum ada data" }) {
  return <tr><td colSpan={colSpan} className="text-center text-slate-400 py-10">{text}</td></tr>;
}

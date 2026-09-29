import { useEffect, useState } from "react";
import api, { formatRupiah } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatCard, TableWrap, EmptyRow } from "@/components/ui-kit";
import { BookOpenCheck, CheckSquare, Trophy, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

const STATUS_BADGE = {
  hadir: "bg-emerald-100 text-emerald-700", terlambat: "bg-amber-100 text-amber-700",
  izin: "bg-sky-100 text-sky-700", sakit: "bg-violet-100 text-violet-700", alpa: "bg-rose-100 text-rose-700",
};

// mode: nilai | absensi | tahfidz | tabungan
export default function Portal({ mode }) {
  const { user } = useAuth();
  const sid = user.student_id;
  const [portal, setPortal] = useState(null);
  const [items, setItems] = useState([]);
  const [savings, setSavings] = useState(null);

  useEffect(() => {
    api.get("/portal/me").then((r) => setPortal(r.data));
    if (mode === "nilai") api.get("/assessments", { params: { student_id: sid } }).then((r) => setItems(r.data));
    if (mode === "absensi") api.get("/attendance/recap", { params: { month: new Date().toISOString().slice(0, 7) } }).then((r) => setItems(r.data.recap.filter((x) => x.student_id === sid)));
    if (mode === "tahfidz") api.get("/tahfidz", { params: { student_id: sid } }).then((r) => setItems(r.data));
    if (mode === "tabungan") api.get(`/savings/${sid}`).then((r) => setSavings(r.data));
  }, [mode, sid]);

  const titles = {
    nilai: ["Nilai & Rapor", "Daftar penilaian formatif & sumatif", BookOpenCheck],
    absensi: ["Rekap Absensi", "Kehadiran bulan ini", CheckSquare],
    tahfidz: ["Capaian Tahfidz", "Riwayat setoran hafalan", Trophy],
    tabungan: ["Tabungan", "Saldo & riwayat transaksi", Wallet],
  };
  const [title, sub, Icon] = titles[mode];

  return (
    <div>
      <PageHeader title={title} subtitle={sub} icon={Icon} />
      {portal && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#800020] text-white flex items-center justify-center font-bold">{portal.student.name.split(" ").slice(0,2).map((w)=>w[0]).join("")}</div>
          <div><div className="font-semibold text-slate-800">{portal.student.name}</div><div className="text-xs text-slate-500">NISN {portal.student.nisn} · Kelas {portal.student.class_name}</div></div>
        </div>
      )}

      {mode === "nilai" && (
        <TableWrap>
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Tanggal</th><th className="text-left px-4 py-3">Mapel</th><th className="text-left px-4 py-3">Jenis</th><th className="text-left px-4 py-3">Penilaian</th><th className="px-4 py-3">Nilai</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? <EmptyRow colSpan={5} /> : items.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-xs text-slate-500">{a.date}</td><td className="px-4 py-3 font-medium">{a.subject_name}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${a.kind === "formatif" ? "bg-sky-100 text-sky-700" : "bg-[#F9ECEF] text-[#800020]"}`}>{a.kind}</span></td><td className="px-4 py-3 text-sm">{a.title}</td><td className="px-4 py-3 text-center font-bold">{a.score}</td></tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {mode === "absensi" && (
        items.length === 0 ? <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">Belum ada data absensi bulan ini</div> : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {["hadir", "terlambat", "izin", "sakit", "alpa"].map((k) => (
              <StatCard key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={items[0][k]} icon={CheckSquare} accent={k === "alpa" ? "#9E1B32" : k === "hadir" ? "#0D5C3A" : "#B8860B"} />
            ))}
          </div>
        )
      )}

      {mode === "tahfidz" && (
        <TableWrap>
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Tanggal</th><th className="text-left px-4 py-3">Surah</th><th className="text-left px-4 py-3">Ayat</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Catatan</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? <EmptyRow colSpan={5} /> : items.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-xs text-slate-500">{t.date}</td><td className="px-4 py-3 font-medium">{t.surah}</td><td className="px-4 py-3 text-sm">{t.ayat_from}–{t.ayat_to}</td><td className="px-4 py-3 capitalize text-sm">{t.status}</td><td className="px-4 py-3 text-xs text-slate-500">{t.note || "-"}</td></tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {mode === "tabungan" && savings && (
        <>
          <div className="maroon-gradient rounded-2xl p-6 text-white mb-6"><p className="text-white/70 text-sm">Saldo Tabungan</p><p className="font-heading text-4xl font-bold">{formatRupiah(savings.balance)}</p></div>
          <TableWrap>
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Tanggal</th><th className="text-left px-4 py-3">Jenis</th><th className="text-left px-4 py-3">Keterangan</th><th className="text-right px-4 py-3">Nominal</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {savings.transactions.length === 0 ? <EmptyRow colSpan={4} /> : savings.transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-xs text-slate-500">{t.date}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 capitalize text-sm">{t.kind === "setoran" ? <ArrowDownCircle className="w-4 h-4 text-emerald-600" /> : <ArrowUpCircle className="w-4 h-4 text-rose-600" />}{t.kind}</span></td><td className="px-4 py-3 text-sm text-slate-500">{t.note || "-"}</td><td className={`px-4 py-3 text-right font-semibold ${t.kind === "setoran" ? "text-emerald-600" : "text-rose-600"}`}>{t.kind === "setoran" ? "+" : "-"}{formatRupiah(t.amount)}</td></tr>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}
    </div>
  );
}

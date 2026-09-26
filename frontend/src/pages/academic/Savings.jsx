import { useEffect, useState, useCallback } from "react";
import api, { formatApiError, formatRupiah } from "@/lib/api";
import { PageHeader, SearchBar, StatCard, TableWrap, EmptyRow } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Wallet, ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import { toast } from "sonner";

export default function Savings() {
  const [summary, setSummary] = useState({ total_balance: 0, rows: [] });
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ student_id: "", kind: "setoran", amount: "", note: "" });

  const load = useCallback(() => { api.get("/savings/summary").then((r) => setSummary(r.data)); }, []);
  useEffect(() => { load(); }, [load]);

  const openDetail = (studentId) => { api.get(`/savings/${studentId}`).then((r) => setDetail(r.data)); };
  const openTxn = (studentId, kind) => { setForm({ student_id: studentId, kind, amount: "", note: "" }); setDialog(true); };

  const save = async () => {
    try {
      await api.post("/savings", { ...form, amount: Number(form.amount) });
      toast.success(form.kind === "setoran" ? "Setoran berhasil" : "Penarikan berhasil");
      setDialog(false); load();
      if (detail && detail.student.id === form.student_id) openDetail(form.student_id);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const rows = summary.rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.nisn.includes(search));

  return (
    <div>
      <PageHeader title="Tabungan Siswa" subtitle="Setoran, penarikan & riwayat saldo" icon={Wallet}>
        <SearchBar value={search} onChange={setSearch} placeholder="Cari siswa…" testId="savings-search-input" />
      </PageHeader>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Saldo Sekolah" value={formatRupiah(summary.total_balance)} icon={Wallet} accent="#800020" />
        <StatCard label="Jumlah Penabung" value={summary.rows.filter((r) => r.balance > 0).length} icon={ArrowDownCircle} accent="#0D5C3A" />
        <StatCard label="Total Siswa" value={summary.rows.length} icon={Wallet} accent="#B8860B" />
      </div>

      <TableWrap>
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3">Nama</th><th className="text-left px-4 py-3">Kelas</th><th className="text-right px-4 py-3">Saldo</th><th className="text-right px-4 py-3">Aksi</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? <EmptyRow colSpan={4} /> : rows.map((r) => (
            <tr key={r.student_id} className="hover:bg-slate-50" data-testid={`savings-row-${r.student_id}`}>
              <td className="px-4 py-3 font-medium text-slate-800 cursor-pointer" onClick={() => openDetail(r.student_id)}>{r.name}</td>
              <td className="px-4 py-3 text-sm">{r.class_name}</td>
              <td className="px-4 py-3 text-right font-bold text-[#800020]">{formatRupiah(r.balance)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button onClick={() => openTxn(r.student_id, "setoran")} data-testid={`deposit-btn-${r.student_id}`} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-md"><ArrowDownCircle className="w-4 h-4" /> Setor</button>
                <button onClick={() => openTxn(r.student_id, "penarikan")} data-testid={`withdraw-btn-${r.student_id}`} className="inline-flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md ml-1"><ArrowUpCircle className="w-4 h-4" /> Tarik</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="savings-detail-panel">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto p-6 animate-flash-in">
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 text-slate-400"><X className="w-6 h-6" /></button>
            <h3 className="font-heading text-xl font-bold text-slate-900">{detail.student.name}</h3>
            <p className="text-sm text-slate-500">NISN {detail.student.nisn}</p>
            <div className="maroon-gradient rounded-2xl p-5 text-white my-4">
              <p className="text-white/70 text-sm">Saldo Saat Ini</p>
              <p className="font-heading text-3xl font-bold">{formatRupiah(detail.balance)}</p>
            </div>
            <h4 className="font-semibold text-slate-700 text-sm mb-2">Riwayat Transaksi</h4>
            <div className="space-y-2">
              {detail.transactions.length === 0 ? <p className="text-slate-400 text-sm">Belum ada transaksi</p> : detail.transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    {t.kind === "setoran" ? <ArrowDownCircle className="w-5 h-5 text-emerald-600" /> : <ArrowUpCircle className="w-5 h-5 text-rose-600" />}
                    <div><div className="text-sm font-medium capitalize">{t.kind}</div><div className="text-xs text-slate-400">{t.date}</div></div>
                  </div>
                  <span className={`font-semibold ${t.kind === "setoran" ? "text-emerald-600" : "text-rose-600"}`}>{t.kind === "setoran" ? "+" : "-"}{formatRupiah(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.kind === "setoran" ? "Setoran Tabungan" : "Penarikan Tabungan"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Jenis</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}><SelectTrigger data-testid="form-savings-kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="setoran">Setoran</SelectItem><SelectItem value="penarikan">Penarikan</SelectItem></SelectContent></Select>
            </div>
            <div><Label>Nominal (Rp)</Label><Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="form-savings-amount" /></div>
            <div><Label>Keterangan</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Batal</Button><Button onClick={save} disabled={!form.amount || Number(form.amount) <= 0} className="bg-[#800020] hover:bg-[#6B0D24]" data-testid="save-savings-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

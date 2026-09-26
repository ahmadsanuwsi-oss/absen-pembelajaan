import { useEffect, useState } from "react";
import api, { formatRupiah } from "@/lib/api";
import { PageHeader } from "@/components/ui-kit";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileText, Printer, Loader2, Users, FileDown } from "lucide-react";
import { exportElementToPdf } from "@/lib/exportPdf";
import { toast } from "sonner";

const DESC_BADGE = { "Sangat Baik": "text-emerald-700", "Baik": "text-sky-700", "Cukup": "text-amber-700", "Perlu Bimbingan": "text-rose-700" };

function RaporSheet({ d }) {
  return (
    <div className="card-soft p-8 sm:p-10 print-area rapor-page max-w-4xl mx-auto mb-8" data-testid="rapor-content">
      <div className="flex items-center gap-4 border-b-4 border-double border-[#800020] pb-4">
        <div className="w-20 h-20 flex items-center justify-center shrink-0">
          {d.school.logo ? <img src={d.school.logo} alt="logo" className="w-full h-full object-contain" /> : (
            <svg width="72" height="72" viewBox="0 0 64 64" fill="none"><path d="M32 2L58 11V30C58 46 47 57 32 62C17 57 6 46 6 30V11L32 2Z" fill="#800020" stroke="#D4AF37" strokeWidth="2.5"/></svg>
          )}
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-slate-500">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
          <h2 className="font-heading text-2xl font-extrabold text-[#800020] uppercase">{d.school.name}</h2>
          <p className="text-xs text-slate-500">{d.school.subtitle}{d.school.address ? ` · ${d.school.address}` : ""}</p>
        </div>
      </div>
      <h3 className="text-center font-heading font-bold text-lg mt-5 mb-1">LAPORAN HASIL BELAJAR (RAPOR)</h3>
      <p className="text-center text-sm text-slate-500 mb-6">Tahun Ajaran {d.school.academic_year} — Semester {d.school.semester} · Kurikulum Merdeka</p>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6">
        <div className="flex justify-between border-b border-dotted pb-1"><span className="text-slate-500">Nama</span><span className="font-semibold">{d.student.name}</span></div>
        <div className="flex justify-between border-b border-dotted pb-1"><span className="text-slate-500">Kelas</span><span className="font-semibold">{d.student.class_name}</span></div>
        <div className="flex justify-between border-b border-dotted pb-1"><span className="text-slate-500">NISN</span><span className="font-semibold">{d.student.nisn}</span></div>
        <div className="flex justify-between border-b border-dotted pb-1"><span className="text-slate-500">Wali Kelas</span><span className="font-semibold">{d.wali_name || "-"}</span></div>
      </div>
      <table className="w-full text-sm border border-slate-300 mb-6">
        <thead className="bg-[#FAF6EE]"><tr>
          <th className="border border-slate-300 px-2 py-1.5 text-left">No</th>
          <th className="border border-slate-300 px-2 py-1.5 text-left">Mata Pelajaran</th>
          <th className="border border-slate-300 px-2 py-1.5">Formatif</th>
          <th className="border border-slate-300 px-2 py-1.5">Sumatif</th>
          <th className="border border-slate-300 px-2 py-1.5">Nilai Akhir</th>
          <th className="border border-slate-300 px-2 py-1.5 text-left">Capaian Kompetensi</th>
        </tr></thead>
        <tbody>
          {d.grades.length === 0 ? <tr><td colSpan={6} className="text-center text-slate-400 py-4 border border-slate-300">Belum ada nilai</td></tr> : d.grades.map((g, i) => (
            <tr key={i}>
              <td className="border border-slate-300 px-2 py-1.5">{i + 1}</td>
              <td className="border border-slate-300 px-2 py-1.5">{g.subject}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center">{g.formatif || "-"}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center">{g.sumatif || "-"}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">{g.final || "-"}</td>
              <td className={`border border-slate-300 px-2 py-1.5 font-semibold ${DESC_BADGE[g.descriptor]}`}>{g.descriptor}</td>
            </tr>
          ))}
          {d.grades.length > 0 && (
            <tr className="bg-[#FAF6EE] font-bold"><td colSpan={4} className="border border-slate-300 px-2 py-1.5 text-right">Rata-rata</td><td className="border border-slate-300 px-2 py-1.5 text-center text-[#800020]">{d.average}</td><td className="border border-slate-300"></td></tr>
          )}
        </tbody>
      </table>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-sm">
        <div className="border border-slate-300 rounded-lg p-3">
          <div className="font-semibold text-slate-700 mb-2">Kehadiran</div>
          <div className="space-y-0.5 text-slate-600">
            <div className="flex justify-between"><span>Hadir</span><b>{d.attendance.hadir}</b></div>
            <div className="flex justify-between"><span>Izin</span><b>{d.attendance.izin}</b></div>
            <div className="flex justify-between"><span>Sakit</span><b>{d.attendance.sakit}</b></div>
            <div className="flex justify-between"><span>Alpa</span><b>{d.attendance.alpa}</b></div>
          </div>
        </div>
        <div className="border border-slate-300 rounded-lg p-3">
          <div className="font-semibold text-slate-700 mb-2">Tahfidz</div>
          <p className="text-slate-600">{d.tahfidz_count} setoran hafalan.</p>
          {d.tahfidz[0] && <p className="text-slate-500 text-xs mt-1">Terakhir: {d.tahfidz[0].surah} ({d.tahfidz[0].status})</p>}
        </div>
        <div className="border border-slate-300 rounded-lg p-3">
          <div className="font-semibold text-slate-700 mb-2">Tabungan</div>
          <p className="text-[#800020] font-bold">{formatRupiah(d.balance)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-8 text-sm mt-10">
        <div className="text-center"><p>Wali Kelas,</p><div className="h-16" /><p className="font-semibold border-t border-slate-400 inline-block px-6">{d.wali_name || "..............................."}</p></div>
        <div className="text-center">
          <p>Kepala Madrasah,</p><div className="h-16" />
          <p className="font-semibold border-t border-slate-400 inline-block px-6">{d.school.headmaster || "..............................."}</p>
          {d.school.headmaster_nip && <p className="text-xs text-slate-500">NIP. {d.school.headmaster_nip}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Rapor() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [data, setData] = useState(null);
  const [classData, setClassData] = useState(null);
  const [loadingClass, setLoadingClass] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadPdf = async () => {
    const el = document.querySelector('[data-testid="rapor-content"]');
    if (!el || !data) return;
    setPdfLoading(true);
    try { await exportElementToPdf(el, `Rapor-${data.student.name.replace(/\s+/g, "_")}.pdf`); }
    catch (e) { toast.error("Gagal membuat PDF"); }
    finally { setPdfLoading(false); }
  };

  useEffect(() => { api.get("/classes").then((r) => setClasses(r.data)); }, []);
  useEffect(() => {
    setClassData(null);
    if (classId) api.get("/students", { params: { class_id: classId, limit: 100 } }).then((r) => { setStudents(r.data.items); setStudentId(""); setData(null); });
    else setStudents([]);
  }, [classId]);
  useEffect(() => {
    setClassData(null);
    if (studentId) api.get(`/report/rapor/${studentId}`).then((r) => setData(r.data));
    else setData(null);
  }, [studentId]);

  const printClass = async () => {
    if (!classId) return;
    setLoadingClass(true); setData(null); setStudentId("");
    try {
      const { data: res } = await api.get(`/report/rapor-class/${classId}`);
      if (!res.rapors.length) { toast.error("Kelas ini belum ada siswa"); return; }
      setClassData(res);
      setTimeout(() => window.print(), 400);
    } catch (e) { toast.error("Gagal memuat rapor kelas"); }
    finally { setLoadingClass(false); }
  };

  return (
    <div>
      <PageHeader title="Cetak Rapor" subtitle="Rapor Kurikulum Merdeka — per siswa atau satu kelas" icon={FileText} overline="Laporan">
        <Select value={classId || "none"} onValueChange={(v) => setClassId(v === "none" ? "" : v)}>
          <SelectTrigger className="w-28 bg-white" data-testid="rapor-class"><SelectValue placeholder="Kelas" /></SelectTrigger>
          <SelectContent><SelectItem value="none">Kelas</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={studentId || "none"} onValueChange={(v) => setStudentId(v === "none" ? "" : v)}>
          <SelectTrigger className="w-56 bg-white" data-testid="rapor-student"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
          <SelectContent><SelectItem value="none">Pilih siswa</SelectItem>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <button onClick={() => window.print()} disabled={!data} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#800020] text-white text-sm font-semibold hover:bg-[#6B0D24] disabled:opacity-40" data-testid="print-rapor-button"><Printer className="w-4 h-4" /> Cetak Siswa</button>
        <button onClick={downloadPdf} disabled={!data || pdfLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B8860B] text-white text-sm font-semibold hover:bg-[#9a7009] disabled:opacity-40" data-testid="download-rapor-pdf-button">{pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Unduh PDF</button>
        <button onClick={printClass} disabled={!classId || loadingClass} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F5132] text-white text-sm font-semibold hover:bg-[#0a3d25] disabled:opacity-40" data-testid="print-rapor-class-button">
          {loadingClass ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Cetak Sekelas
        </button>
      </PageHeader>

      {classData ? (
        <div>
          <div className="no-print mb-4 text-sm text-slate-600">Menampilkan {classData.count} rapor kelas <b>{classData.class_name}</b>. Gunakan dialog cetak untuk simpan sebagai PDF (satu berkas).</div>
          {classData.rapors.map((d, i) => <RaporSheet key={i} d={d} />)}
        </div>
      ) : !data ? (
        <div className="card-soft p-12 text-center text-slate-400">Pilih kelas &amp; siswa untuk rapor per siswa, atau tekan <b>Cetak Sekelas</b> untuk seluruh kelas</div>
      ) : (
        <RaporSheet d={data} />
      )}
    </div>
  );
}

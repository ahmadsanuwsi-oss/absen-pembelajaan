import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";

import Login from "@/pages/Login";
import Kiosk from "@/pages/Kiosk";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/master/Students";
import Teachers from "@/pages/master/Teachers";
import Classes from "@/pages/master/Classes";
import Subjects from "@/pages/master/Subjects";
import Users from "@/pages/system/Users";
import Reports from "@/pages/system/Reports";
import Attendance from "@/pages/academic/Attendance";
import Assessments from "@/pages/academic/Assessments";
import Ledger from "@/pages/academic/Ledger";
import Journals from "@/pages/academic/Journals";
import Notes from "@/pages/academic/Notes";
import Tahfidz from "@/pages/academic/Tahfidz";
import Savings from "@/pages/academic/Savings";
import ClassManagement from "@/pages/academic/ClassManagement";
import Portal from "@/pages/portal/Portal";

const Page = ({ roles, children }) => (
  <ProtectedRoute roles={roles}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/kiosk" element={<Kiosk />} />

            <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
            <Route path="/siswa" element={<Page roles={["admin", "guru"]}><Students /></Page>} />
            <Route path="/guru" element={<Page roles={["admin"]}><Teachers /></Page>} />
            <Route path="/kelas" element={<Page roles={["admin"]}><Classes /></Page>} />
            <Route path="/mapel" element={<Page roles={["admin"]}><Subjects /></Page>} />
            <Route path="/akun" element={<Page roles={["admin"]}><Users /></Page>} />
            <Route path="/laporan" element={<Page roles={["admin"]}><Reports /></Page>} />
            <Route path="/absensi" element={<Page roles={["admin", "guru"]}><Attendance /></Page>} />
            <Route path="/asesmen" element={<Page roles={["admin", "guru"]}><Assessments /></Page>} />
            <Route path="/leger" element={<Page roles={["admin", "guru"]}><Ledger /></Page>} />
            <Route path="/jurnal" element={<Page roles={["admin", "guru"]}><Journals /></Page>} />
            <Route path="/catatan" element={<Page roles={["admin", "guru"]}><Notes /></Page>} />
            <Route path="/tahfidz" element={<Page roles={["admin", "guru"]}><Tahfidz /></Page>} />
            <Route path="/tabungan" element={<Page roles={["admin", "guru"]}><Savings /></Page>} />
            <Route path="/kelas-saya" element={<Page roles={["guru"]}><ClassManagement /></Page>} />

            <Route path="/portal/nilai" element={<Page roles={["siswa"]}><Portal mode="nilai" /></Page>} />
            <Route path="/portal/absensi" element={<Page roles={["siswa"]}><Portal mode="absensi" /></Page>} />
            <Route path="/portal/tahfidz" element={<Page roles={["siswa"]}><Portal mode="tahfidz" /></Page>} />
            <Route path="/portal/tabungan" element={<Page roles={["siswa"]}><Portal mode="tabungan" /></Page>} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;

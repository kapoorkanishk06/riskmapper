import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { FileDetailPage } from "./pages/FileDetailPage";
import { LandingPage } from "./pages/LandingPage";
import { ProgressPage } from "./pages/ProgressPage";
import { SimulatorPage } from "./pages/SimulatorPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyze/:jobId" element={<ProgressPage />} />
        <Route path="/dashboard/:jobId" element={<DashboardPage />} />
        <Route path="/dashboard/:jobId/file/:fileId" element={<FileDetailPage />} />
        <Route path="/dashboard/:jobId/simulate" element={<SimulatorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
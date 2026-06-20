import { Navigate, Route, Routes } from "react-router-dom";
import { BoardPage } from "./pages/BoardPage";
import { AnalystHub } from "./pages/AnalystHub";
import { LoginPage } from "./pages/LoginPage";
import { ClarifyPage } from "./pages/ClarifyPage";
import { PrdPage } from "./pages/PrdPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LineagePage } from "./pages/LineagePage";
import { ConflictPage } from "./pages/ConflictPage";
import { BuildPage } from "./pages/BuildPage";
import { ValidatePage } from "./pages/ValidatePage";
import { ReleasePage } from "./pages/ReleasePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/analyst" element={<AnalystHub />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/r/:rid" element={<Navigate to="clarify" replace />} />
      <Route path="/r/:rid/clarify" element={<ClarifyPage />} />
      <Route path="/r/:rid/prd" element={<PrdPage />} />
      <Route path="/r/:rid/history" element={<HistoryPage />} />
      <Route path="/r/:rid/lineage" element={<LineagePage />} />
      <Route path="/r/:rid/conflict" element={<ConflictPage />} />
      <Route path="/r/:rid/build" element={<BuildPage />} />
      <Route path="/r/:rid/validate" element={<ValidatePage />} />
      <Route path="/r/:rid/release" element={<ReleasePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

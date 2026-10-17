import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { OverviewPage } from "./pages/OverviewPage";
import { DigitalTwinPage } from "./pages/DigitalTwinPage";
import { SessionsPage } from "./pages/SessionsPage";
import { ReplayPage } from "./pages/ReplayPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";
import { SettingsPage } from "./pages/SettingsPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/twin" element={<DigitalTwinPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/replay/:sessionId" element={<ReplayPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/diagnostics" element={<DiagnosticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;

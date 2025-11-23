import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './app/layout/AppLayout';
import ProtectedRoute from './app/ProtectedRoute';
import DashboardDetailPage from './pages/DashboardDetailPage';
import DashboardsListPage from './pages/DashboardsListPage';
import ImportsPage from './pages/ImportsPage';
import KpiDetailPage from './pages/KpiDetailPage';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboards" replace />} />
        <Route path="/dashboards" element={<DashboardsListPage />} />
        <Route path="/dashboards/:dashboardId" element={<DashboardDetailPage />} />
        <Route path="/kpis/:kpiId" element={<KpiDetailPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/imports" element={<ImportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboards" replace />} />
    </Routes>
  );
}

export default App;

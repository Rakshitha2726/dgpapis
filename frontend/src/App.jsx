import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DepartmentManagementPage from './pages/DepartmentManagementPage';
import KPIManagementPage from './pages/KPIManagementPage';
import ReadOnlyDepartmentList from './pages/ReadOnlyDepartmentList';
import ReadOnlyKPIList from './pages/ReadOnlyKPIList';
import AdminSubmissionsPage from './pages/AdminSubmissionsPage';
import OfficerDashboard from './pages/OfficerDashboard';
import OfficerDataEntryPage from './pages/OfficerDataEntryPage';
import PolicymakerDashboard from './pages/PolicymakerDashboard';
import UnauthorizedPage from './pages/UnauthorizedPage';
import HomePage from './pages/HomePage';
import ScoreBreakdownPage from './pages/ScoreBreakdownPage';
import RankingPage from './pages/RankingPage';
import ForecastingPage from './pages/ForecastingPage';
import OfficerForecastPage from './pages/OfficerForecastPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/" element={<HomePage />} />

          {/* Admin Restricted Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/departments" element={<DepartmentManagementPage />} />
            <Route path="/admin/department-status" element={<ReadOnlyDepartmentList />} />
            <Route path="/admin/departments/status" element={<ReadOnlyDepartmentList />} />
            <Route path="/admin/kpis" element={<KPIManagementPage />} />
            <Route path="/admin/kpi-status" element={<ReadOnlyKPIList />} />
            <Route path="/admin/kpis/status" element={<ReadOnlyKPIList />} />
            <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
            <Route path="/admin/rankings" element={<RankingPage />} />
            <Route path="/admin/forecasting" element={<ForecastingPage />} />
          </Route>

          {/* Department Officer Restricted Routes */}
          <Route element={<ProtectedRoute allowedRoles={['department_officer']} />}>
            <Route path="/officer" element={<OfficerDashboard />} />
            <Route path="/officer/data-entry" element={<OfficerDataEntryPage />} />
            <Route path="/officer/score" element={<ScoreBreakdownPage />} />
            <Route path="/officer/rankings" element={<RankingPage />} />
            <Route path="/officer/forecast" element={<OfficerForecastPage />} />
          </Route>

          {/* Policymaker Restricted Routes */}
          <Route element={<ProtectedRoute allowedRoles={['policymaker']} />}>
            <Route path="/policymaker" element={<PolicymakerDashboard />} />
            <Route path="/policymaker/scores" element={<ScoreBreakdownPage />} />
            <Route path="/policymaker/rankings" element={<RankingPage />} />
            <Route path="/policymaker/forecasting" element={<ForecastingPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;


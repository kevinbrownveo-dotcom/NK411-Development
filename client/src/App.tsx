import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AssetsPage from './pages/assets/AssetsPage';
import AssetDependencyMapPage from './pages/assets/AssetDependencyMapPage';
import ThreatsPage from './pages/threats/ThreatsPage';
import VulnerabilitiesPage from './pages/vulnerabilities/VulnerabilitiesPage';
import RisksPage from './pages/risks/RisksPage';
import IncidentsPage from './pages/incidents/IncidentsPage';
import SolutionsPage from './pages/solutions/SolutionsPage';
import RequirementsPage from './pages/requirements/RequirementsPage';
import ReconciliationsPage from './pages/audit/ReconciliationsPage';
import AuditLogPage from './pages/audit/AuditLogPage';
import LegalRiskRegisterRedirect from './pages/legal/LegalRiskRegisterRedirect';
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import LdapMappingPage from './pages/admin/LdapMappingPage';
import { usePermission } from './hooks/usePermission';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const { isAdmin } = usePermission();

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;

  return <MainLayout>{children}</MainLayout>;
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
      <Route path="/assets-map" element={<ProtectedRoute><AssetDependencyMapPage /></ProtectedRoute>} />
      <Route path="/threats" element={<ProtectedRoute><ThreatsPage /></ProtectedRoute>} />
      <Route path="/vulnerabilities" element={<ProtectedRoute><VulnerabilitiesPage /></ProtectedRoute>} />
      <Route path="/risks" element={<ProtectedRoute><RisksPage /></ProtectedRoute>} />
      <Route path="/incidents" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
      <Route path="/solutions" element={<ProtectedRoute><SolutionsPage /></ProtectedRoute>} />
      <Route path="/requirements" element={<ProtectedRoute><RequirementsPage /></ProtectedRoute>} />
      <Route path="/reconciliations" element={<ProtectedRoute><ReconciliationsPage /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
      <Route path="/legal/risk-register" element={<LegalRiskRegisterRedirect />} />
      <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
      <Route path="/admin/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
      <Route path="/admin/ldap" element={<AdminRoute><LdapMappingPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

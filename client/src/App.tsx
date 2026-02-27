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
import ProfilePage from './pages/ProfilePage';
import { usePermission } from './hooks/usePermission';

function ProtectedRoute({ children, resource }: { children: React.ReactNode; resource?: string }) {
  const { isAuthenticated, loading } = useAuth();
  const { canRead } = usePermission();

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (resource && !canRead(resource)) {
    return <Navigate to="/" replace />;
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
      <Route path="/" element={<ProtectedRoute resource="dashboard"><DashboardPage /></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute resource="assets"><AssetsPage /></ProtectedRoute>} />
      <Route path="/assets-map" element={<ProtectedRoute resource="assets"><AssetDependencyMapPage /></ProtectedRoute>} />
      <Route path="/threats" element={<ProtectedRoute resource="threats"><ThreatsPage /></ProtectedRoute>} />
      <Route path="/vulnerabilities" element={<ProtectedRoute resource="vulnerabilities"><VulnerabilitiesPage /></ProtectedRoute>} />
      <Route path="/risks" element={<ProtectedRoute resource="risks"><RisksPage /></ProtectedRoute>} />
      <Route path="/incidents" element={<ProtectedRoute resource="incidents"><IncidentsPage /></ProtectedRoute>} />
      <Route path="/solutions" element={<ProtectedRoute resource="solutions"><SolutionsPage /></ProtectedRoute>} />
      <Route path="/requirements" element={<ProtectedRoute resource="requirements"><RequirementsPage /></ProtectedRoute>} />
      <Route path="/reconciliations" element={<ProtectedRoute resource="reconciliations"><ReconciliationsPage /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute resource="audit"><AuditLogPage /></ProtectedRoute>} />
      <Route path="/legal/risk-register" element={<LegalRiskRegisterRedirect />} />
      <Route path="/admin/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
      <Route path="/admin/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
      <Route path="/admin/ldap" element={<AdminRoute><LdapMappingPage /></AdminRoute>} />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

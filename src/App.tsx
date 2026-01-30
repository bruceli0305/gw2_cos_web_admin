// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BasicLayout from './layouts/BasicLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import UserListPage from './pages/UserList';

import TranslationsPage from './pages/Translations';
import ContentRaidsPage from './pages/ContentRaids';
import ContentPvpPage from './pages/ContentPvp';
import RbacRolesPage from './pages/RbacRoles';
import RbacAdminUsersPage from './pages/RbacAdminUsers';
import AuditPage from './pages/Audit';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('gw2_admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <BasicLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UserListPage />} />

          <Route path="translations" element={<TranslationsPage />} />

          <Route path="content" element={<Navigate to="/content/raids" replace />} />
          <Route path="content/raids" element={<ContentRaidsPage />} />
          <Route path="content/pvp" element={<ContentPvpPage />} />

          <Route path="rbac" element={<Navigate to="/rbac/admin-users" replace />} />
          <Route path="rbac/roles" element={<RbacRolesPage />} />
          <Route path="rbac/admin-users" element={<RbacAdminUsersPage />} />

          <Route path="audit" element={<AuditPage />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BasicLayout from './layouts/BasicLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import UserListPage from './pages/UserList';

import TranslationsPage from './pages/Translations';
import SlangPage from './pages/Slang';
import ContentRaidsPage from './pages/ContentRaids';
import ContentPvpPage from './pages/ContentPvp';
import RbacRolesPage from './pages/RbacRoles';
import RbacAdminUsersPage from './pages/RbacAdminUsers';
import AuditPage from './pages/Audit';

import DataResourcesDirectoryPage from './pages/DataResourcesDirectory';
import DataResourcesRecommendedPage from './pages/DataResourcesRecommended';
import DataLegendaryBlueprintsPage from './pages/DataLegendaryBlueprints';
import DataFractalDailiesPage from './pages/DataFractalDailies';
import DataMistlockInstabilitiesPage from './pages/DataMistlockInstabilities';
import DataMistlockRotationsPage from './pages/DataMistlockRotations';

import ChangePasswordPage from './pages/ChangePassword';
import type { JSX } from 'react';

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

          <Route path="change-password" element={<ChangePasswordPage />} />

          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="translations" element={<TranslationsPage />} />
          <Route path="slang" element={<SlangPage />} />

          <Route path="content" element={<Navigate to="/content/raids" replace />} />
          <Route path="content/raids" element={<ContentRaidsPage />} />
          <Route path="content/pvp" element={<ContentPvpPage />} />

          <Route path="data" element={<Navigate to="/data/resources-directory" replace />} />
          <Route path="data/resources-directory" element={<DataResourcesDirectoryPage />} />
          <Route path="data/resources-recommended" element={<DataResourcesRecommendedPage />} />
          <Route path="data/legendary-blueprints" element={<DataLegendaryBlueprintsPage />} />
          <Route path="data/fractal-dailies" element={<DataFractalDailiesPage />} />
          <Route path="data/mistlock-instabilities" element={<DataMistlockInstabilitiesPage />} />
          <Route path="data/mistlock-rotations" element={<DataMistlockRotationsPage />} />

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
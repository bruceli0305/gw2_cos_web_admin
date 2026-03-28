// src/App.tsx
import { Suspense, lazy, type JSX, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const BasicLayout = lazy(() => import('./layouts/BasicLayout'));
const LoginPage = lazy(() => import('./pages/Login'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePassword'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const UserListPage = lazy(() => import('./pages/UserList'));
const TranslationsPage = lazy(() => import('./pages/Translations'));
const SlangPage = lazy(() => import('./pages/Slang'));
const ContentRaidsPage = lazy(() => import('./pages/ContentRaids'));
const RbacRolesPage = lazy(() => import('./pages/RbacRoles'));
const RbacAdminUsersPage = lazy(() => import('./pages/RbacAdminUsers'));
const AuditPage = lazy(() => import('./pages/Audit'));
const WvwGuildsPage = lazy(() => import('./pages/WvwGuilds'));
const WvwGuildEditPage = lazy(() => import('./pages/WvwGuildEdit'));
const DataResourcesDirectoryPage = lazy(() => import('./pages/DataResourcesDirectory'));
const DataResourcesRecommendedPage = lazy(() => import('./pages/DataResourcesRecommended'));
const DataLegendaryBlueprintsPage = lazy(() => import('./pages/DataLegendaryBlueprints'));
const DataFractalDailiesPage = lazy(() => import('./pages/DataFractalDailies'));
const DataMistlockInstabilitiesPage = lazy(() => import('./pages/DataMistlockInstabilities'));
const DataMistlockRotationsPage = lazy(() => import('./pages/DataMistlockRotations'));
const DataMarketWatchPage = lazy(() => import('./pages/DataMarketWatch'));
const DataGw2ApiPage = lazy(() => import('./pages/DataGw2Api'));

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('gw2_admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RouteFallback({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      style={{
        minHeight: fullScreen ? '100vh' : 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '3px solid rgba(0, 0, 0, 0.12)',
          borderTopColor: '#1677ff',
          animation: 'gw2-admin-route-spin 0.8s linear infinite',
        }}
      />
      <span style={{ color: '#666', fontSize: 14 }}>Loading...</span>
      <style>{'@keyframes gw2-admin-route-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

function withRouteSuspense(element: ReactNode, fullScreen = false) {
  return <Suspense fallback={<RouteFallback fullScreen={fullScreen} />}>{element}</Suspense>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={withRouteSuspense(<LoginPage />, true)} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              {withRouteSuspense(<BasicLayout />, true)}
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="change-password" element={withRouteSuspense(<ChangePasswordPage />)} />

          <Route path="dashboard" element={withRouteSuspense(<DashboardPage />)} />
          <Route path="users" element={withRouteSuspense(<UserListPage />)} />
          <Route path="translations" element={withRouteSuspense(<TranslationsPage />)} />
          <Route path="slang" element={withRouteSuspense(<SlangPage />)} />

          <Route path="content" element={<Navigate to="/content/raids" replace />} />
          <Route path="content/raids" element={withRouteSuspense(<ContentRaidsPage />)} />

          <Route path="data" element={<Navigate to="/data/resources-directory" replace />} />
          <Route path="data/resources-directory" element={withRouteSuspense(<DataResourcesDirectoryPage />)} />
          <Route path="data/resources-recommended" element={withRouteSuspense(<DataResourcesRecommendedPage />)} />
          <Route path="data/legendary-blueprints" element={withRouteSuspense(<DataLegendaryBlueprintsPage />)} />
          <Route path="data/fractal-dailies" element={withRouteSuspense(<DataFractalDailiesPage />)} />
          <Route path="data/mistlock-instabilities" element={withRouteSuspense(<DataMistlockInstabilitiesPage />)} />
          <Route path="data/mistlock-rotations" element={withRouteSuspense(<DataMistlockRotationsPage />)} />
          <Route path="data/gw2-api" element={withRouteSuspense(<DataGw2ApiPage />)} />
          <Route path="data/market-watch" element={withRouteSuspense(<DataMarketWatchPage />)} />

          <Route path="rbac" element={<Navigate to="/rbac/admin-users" replace />} />
          <Route path="rbac/roles" element={withRouteSuspense(<RbacRolesPage />)} />
          <Route path="rbac/admin-users" element={withRouteSuspense(<RbacAdminUsersPage />)} />

          <Route path="audit" element={withRouteSuspense(<AuditPage />)} />

          <Route path="wvw-guilds" element={withRouteSuspense(<WvwGuildsPage />)} />
          <Route path="wvw-guilds/:id" element={withRouteSuspense(<WvwGuildEditPage />)} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

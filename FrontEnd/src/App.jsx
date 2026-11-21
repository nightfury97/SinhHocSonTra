import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import Shell from './components/Shell.jsx';
import { Loading } from './components/ui.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import SpeciesPage from './pages/SpeciesPage.jsx';
import ObservationsPage from './pages/ObservationsPage.jsx';
import SurveysPage from './pages/SurveysPage.jsx';
import DatasetsPage from './pages/DatasetsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

// MapLibre nặng (~800 kB) — chỉ tải khi mở bản đồ.
const MapPage = lazy(() => import('./pages/MapPage.jsx'));

/** Trang nội bộ: chưa đăng nhập thì chuyển sang trang đăng nhập, rồi quay lại đúng trang. */
function RequireAuth({ admin = false }) {
  const { user, can } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={`/dang-nhap?tiep=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (admin && !can.admin) return <Navigate to="/" replace />;
  return <Outlet />;
}

function Routed() {
  const { user, checking } = useAuth();
  if (checking) return <Loading rows={3} />;
  return (
    <Routes>
      <Route path="dang-nhap" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<Shell />}>
        {/* Công khai */}
        <Route index element={<OverviewPage />} />
        <Route
          path="ban-do"
          element={
            <Suspense fallback={<Loading rows={3} />}>
              <MapPage />
            </Suspense>
          }
        />
        {/* Cần đăng nhập */}
        <Route element={<RequireAuth />}>
          <Route path="loai" element={<SpeciesPage />} />
          <Route path="quan-sat" element={<ObservationsPage />} />
          <Route path="khao-sat" element={<SurveysPage />} />
          <Route path="bo-du-lieu" element={<DatasetsPage />} />
        </Route>
        <Route element={<RequireAuth admin />}>
          <Route path="nguoi-dung" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routed />
        {/* Ở cấp ứng dụng để hiện trên mọi trang (kể cả đăng nhập) và giữ nguyên hội thoại khi chuyển trang. */}
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}

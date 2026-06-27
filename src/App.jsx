import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import SplashScreen from './components/branding/SplashScreen';
import LoadingScreen from './components/ui/LoadingScreen';
import AppLayout from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import BudgetPage from './pages/BudgetPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';

// ─── Auth Guard ───────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

// ─── Router Tree ──────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/auth"
        element={
          <RedirectIfAuthed>
            <AuthPage />
          </RedirectIfAuthed>
        }
      />

      {/* Protected — wrapped in AppLayout (bottom nav) */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    // Show splash for ~2.2s then start fade-out
    const timer = setTimeout(() => setSplashVisible(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Splash — mounted until animation completes */}
      {!splashDone && (
        <SplashScreen
          visible={splashVisible}
          onDone={() => setSplashDone(true)}
        />
      )}

      {/* Main app — rendered underneath, revealed when splash fades */}
      <div
        style={{
          opacity: splashDone ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: splashDone ? 'auto' : 'none',
        }}
      >
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </div>
    </>
  );
}

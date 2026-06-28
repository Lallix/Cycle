import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import SplashScreen from './components/branding/SplashScreen'
import LockScreen from './components/branding/LockScreen'
import LoadingScreen from './components/ui/LoadingScreen'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import BudgetPage from './pages/BudgetPage'
import ExpensesPage from './pages/ExpensesPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import { useServiceWorker } from './hooks/useServiceWorker'

// ─── Entry sequence states ────────────────────────────────────────────────────
// splash → lock (returning user) OR auth (new/logged-out user) → app
//
// SPLASH_VISIBLE: portal ring animating
// SPLASH_DONE:    splash faded out, determine next step
// LOCKED:         returning user sees lock screen over blurred dashboard
// UNLOCKED:       biometric passed, stagger in home screen
// AUTHED:         already unlocked this session (navigating between pages)

const SEQ = {
  SPLASH:   'splash',
  LOCK:     'lock',
  APP:      'app',
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/auth" state={{ from: location }} replace />
  return children
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user)    return <Navigate to="/" replace />
  return children
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function AppRoutes() {
  useServiceWorker()
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <RedirectIfAuthed>
            <AuthPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index          element={<DashboardPage />} />
        <Route path="budget"  element={<BudgetPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin"   element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { user, loading, biometricEnabled, sessionUnlocked, setSessionUnlocked } = useAuth()

  // Entry sequence state
  const [seq, setSeq]           = useState(SEQ.SPLASH)
  const [splashVisible, setSplashVisible] = useState(true)

  // Step 1 — show splash for 2.5s then evaluate what comes next
  useEffect(() => {
    const t = setTimeout(() => setSplashVisible(false), 2500)
    return () => clearTimeout(t)
  }, [])

  // Step 2 — once splash fades, decide: lock or straight to app
  function onSplashDone() {
    if (!loading && user && biometricEnabled && !sessionUnlocked) {
      setSeq(SEQ.LOCK)
    } else {
      setSeq(SEQ.APP)
    }
  }

  // Step 3 — lock screen unlocked
  function onUnlocked() {
    setSessionUnlocked(true)   // don't show lock again this session
    setSeq(SEQ.APP)
  }

  return (
    <>
      {/* SPLASH — always shows first */}
      {seq === SEQ.SPLASH && (
        <SplashScreen
          visible={splashVisible}
          onDone={onSplashDone}
        />
      )}

      {/* LOCK SCREEN — returning user with biometric */}
      {seq === SEQ.LOCK && (
        <LockScreen onUnlocked={onUnlocked} />
      )}

      {/* APP — router handles auth redirects */}
      <div
        style={{
          position: seq === SEQ.APP ? 'relative' : 'absolute',
          inset: 0,
          opacity: seq === SEQ.APP ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: seq === SEQ.APP ? 'auto' : 'none',
          height: '100%',
        }}
      >
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </div>
    </>
  )
}

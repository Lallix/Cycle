import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import BrandLogo, { Backdrop } from './BrandLogo'

// Blurred dashboard preview behind the lock
function BlurredDashboard() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: '60%', overflow: 'hidden', pointerEvents: 'none',
    }}>
      {/* Simulated hero card */}
      <div style={{
        margin: '60px 16px 0',
        background: 'rgb(var(--c-surface))',
        borderRadius: 24,
        border: '0.5px solid rgb(var(--c-border))',
        padding: 20,
        filter: 'blur(6px)',
        opacity: 0.3,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Ring placeholder */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            border: '10px solid rgb(var(--c-accent))', opacity: 0.4, flexShrink: 0,
          }} />
          <div>
            <div style={{ width: 80, height: 10, background: 'rgb(var(--c-surface-2))', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 120, height: 28, background: 'rgb(var(--c-accent))', borderRadius: 6, opacity: 0.3, marginBottom: 8 }} />
            <div style={{ width: 100, height: 8, background: 'rgb(var(--c-surface-2))', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, marginTop: 16, borderTop: '0.5px solid rgb(var(--c-border))', paddingTop: 12 }}>
          {['Income', 'Spent', 'Left'].map(l => (
            <div key={l} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ width: 40, height: 6, background: 'rgb(var(--c-border-strong))', borderRadius: 3, margin: '0 auto 6px' }} />
              <div style={{ width: 50, height: 12, background: 'rgb(var(--c-surface-2))', borderRadius: 4, margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
      {/* Gradient fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(to bottom, transparent, rgb(var(--c-bg)))',
      }} />
    </div>
  )
}

export default function LockScreen({ onUnlocked }) {
  const { profile, authenticateWithBiometric, biometricEnabled, biometricAvailable, signOut } = useAuth()
  const toast = useToast()
  const [loading, setLoading]       = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [attempts, setAttempts]     = useState(0)
  const [visible, setVisible]       = useState(false)

  const firstName = profile?.full_name?.split(' ')[0] || 'back'

  // Fade in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Auto-trigger biometric on mount if available
  useEffect(() => {
    if (biometricEnabled) {
      const t = setTimeout(() => handleBiometric(), 600)
      return () => clearTimeout(t)
    }
  }, [biometricEnabled])

  async function handleBiometric() {
    if (loading) return
    setLoading(true)
    try {
      const success = await authenticateWithBiometric()
      if (success) {
        handleSuccess()
      } else {
        setAttempts(a => a + 1)
        // Device will have shown its own PIN fallback — if we get here, user cancelled
        toast('Try again or use password', 'error')
      }
    } catch (e) {
      toast('Biometric unavailable — use password', 'error')
      setShowPassword(true)
    } finally {
      setLoading(false)
    }
  }

  function handleSuccess() {
    // Fade out lock screen then signal parent
    setVisible(false)
    setTimeout(onUnlocked, 350)
  }

  async function handleSignOut() {
    await signOut()
    // Auth state change will redirect to /auth automatically
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgb(var(--c-bg))',
        zIndex: 100,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <Backdrop />
      {/* Blurred dashboard behind */}
      <BlurredDashboard />

      {/* Lock content — bottom sheet style */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '32px 28px',
        paddingBottom: 'max(env(safe-area-inset-bottom), 32px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'linear-gradient(to top, rgb(var(--c-bg)) 60%, transparent)',
      }}>
        {/* Ring mark */}
        <BrandLogo size={76} fill={0.75} label="R" />

        {/* Greeting */}
        <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 28 }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800,
            color: 'rgb(var(--c-text))', letterSpacing: '-0.02em',
          }}>
            Welcome back, {firstName}
          </p>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: 13,
            color: 'rgb(var(--c-text-3))', marginTop: 4,
          }}>
            Your dashboard is ready
          </p>
        </div>

        {/* Primary — biometric */}
        {biometricEnabled && (
          <button
            onClick={handleBiometric}
            disabled={loading}
            style={{
              width: '100%', padding: '15px 0',
              background: loading ? 'rgb(var(--c-accent-dark))' : 'rgb(var(--c-accent))',
              borderRadius: 16, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
              color: 'rgb(var(--c-bg))',
              transition: 'all 0.2s ease',
              boxShadow: loading ? 'none' : '0 0 0 0 transparent',
              marginBottom: 12,
            }}
          >
            {/* Fingerprint / Face ID icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--c-bg))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 10a2 2 0 0 0-2 2v4"/>
              <path d="M12 6C8.686 6 6 8.686 6 12"/>
              <path d="M12 6c3.314 0 6 2.686 6 6"/>
              <path d="M6 12c0 1.657.672 3.157 1.757 4.243"/>
              <path d="M18 12a5.978 5.978 0 0 1-.757 2.928"/>
              <path d="M9 21c.936.628 2.025 1 3.214 1"/>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.82.487 3.53 1.338 5"/>
              <path d="M22 12c0-5.523-4.477-10-10-10"/>
            </svg>
            {loading ? 'Verifying...' : 'Unlock with Face ID / Touch'}
          </button>
        )}

        {/* Secondary — device PIN (triggers biometric prompt which includes PIN) */}
        {biometricAvailable && (
          <button
            onClick={handleBiometric}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 0',
              background: 'transparent',
              borderRadius: 14,
              border: '0.5px solid rgb(var(--c-border-strong))',
              fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400,
              color: 'rgb(var(--c-text-2))',
              marginBottom: 16,
              transition: 'all 0.2s ease',
            }}
          >
            Use device PIN
          </button>
        )}

        {/* Tertiary — password fallback */}
        <button
          onClick={() => setShowPassword(v => !v)}
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: 13,
            color: 'rgb(var(--c-text-3))',
            background: 'none', border: 'none',
            marginBottom: showPassword ? 16 : 0,
            textDecoration: 'underline',
            textDecorationColor: 'rgb(var(--c-border-strong))',
          }}
        >
          {showPassword ? 'Hide password login' : 'Sign in with password instead'}
        </button>

        {/* Password form — shown on demand or after failed biometric */}
        {showPassword && (
          <PasswordFallback onSuccess={handleSuccess} />
        )}

        {/* Sign out link — bottom */}
        <button
          onClick={handleSignOut}
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: 11,
            color: 'rgb(var(--c-border-strong))', background: 'none', border: 'none',
            marginTop: 20,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

// Password fallback — shown inline when biometric not available or user requests it
function PasswordFallback({ onSuccess }) {
  const { signIn } = useAuth()
  const toast = useToast()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPw, setShowPw]     = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      await signIn(email, password)
      onSuccess()
    } catch (err) {
      toast(err.message || 'Sign in failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignIn} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        style={{
          width: '100%', padding: '12px 16px',
          background: 'rgb(var(--c-surface))', border: '0.5px solid rgb(var(--c-border))',
          borderRadius: 12, color: 'rgb(var(--c-text))',
          fontFamily: 'Inter, sans-serif', fontSize: 14,
        }}
      />
      <div style={{ position: 'relative' }}>
        <input
          type={showPw ? 'text' : 'password'}
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{
            width: '100%', padding: '12px 44px 12px 16px',
            background: 'rgb(var(--c-surface))', border: '0.5px solid rgb(var(--c-border))',
            borderRadius: 12, color: 'rgb(var(--c-text))',
            fontFamily: 'Inter, sans-serif', fontSize: 14,
          }}
        />
        <button
          type="button"
          onClick={() => setShowPw(v => !v)}
          style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'rgb(var(--c-text-3))', fontSize: 13,
          }}
        >
          {showPw ? 'Hide' : 'Show'}
        </button>
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '13px 0', background: 'rgb(var(--c-accent))', borderRadius: 12,
          border: 'none', fontFamily: 'var(--font-display)',
          fontSize: 14, fontWeight: 600, color: 'rgb(var(--c-bg))',
        }}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

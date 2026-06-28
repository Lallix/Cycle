import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'

// Portal ring — same mark as splash, smaller
function MiniRing({ size = 80 }) {
  const s = size
  return (
    <>
      <style>{`
        @keyframes lsCW  { from { transform: rotate(0deg) }   to { transform: rotate(360deg) } }
        @keyframes lsCCW { from { transform: rotate(0deg) }   to { transform: rotate(-360deg) } }
        @keyframes lsSpark {
          0%,100% { opacity: 0.4; transform: scale(0.8); }
          50%     { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
      <div style={{ width: s, height: s, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer ring CW */}
        <div style={{
          position: 'absolute', width: s * 0.94, height: s * 0.94, borderRadius: '50%',
          border: `${Math.max(1.5, s * 0.025)}px solid transparent`,
          borderTopColor: '#FFD166', borderRightColor: '#FFD166',
          borderBottomColor: '#2A2010', borderLeftColor: '#2A2010',
          animation: 'lsCW 4s linear infinite',
          filter: 'drop-shadow(0 0 4px rgba(255,209,102,0.5))',
        }} />
        {/* Inner ring CCW */}
        <div style={{
          position: 'absolute', width: s * 0.66, height: s * 0.66, borderRadius: '50%',
          border: `${Math.max(1, s * 0.02)}px solid transparent`,
          borderTopColor: '#FFE8A3', borderLeftColor: '#FFE8A3',
          borderBottomColor: '#1A1508', borderRightColor: '#1A1508',
          animation: 'lsCCW 2.5s linear infinite',
        }} />
        {/* Sparks */}
        <div style={{ position: 'absolute', width: s * 0.94, height: s * 0.94, animation: 'lsCW 3s linear infinite' }}>
          {[
            { top: '-2px', left: '48%' },
            { bottom: '2px', right: '25%' },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', width: 3, height: 3, borderRadius: '50%',
              background: '#FFE87A', ...pos,
              boxShadow: '0 0 4px #FFE87A',
              animation: `lsSpark ${0.8 + i * 0.4}s ease-in-out infinite`,
            }} />
          ))}
        </div>
        {/* Centre */}
        <div style={{
          position: 'absolute', width: s * 0.34, height: s * 0.34, borderRadius: '50%',
          background: '#0D0D0D', border: '1px solid rgba(255,209,102,0.12)',
        }} />
      </div>
    </>
  )
}

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
        background: '#1B1B1B',
        borderRadius: 24,
        border: '0.5px solid #2A2A2A',
        padding: 20,
        filter: 'blur(6px)',
        opacity: 0.3,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Ring placeholder */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            border: '10px solid #FFD166', opacity: 0.4, flexShrink: 0,
          }} />
          <div>
            <div style={{ width: 80, height: 10, background: '#333', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 120, height: 28, background: '#FFD166', borderRadius: 6, opacity: 0.3, marginBottom: 8 }} />
            <div style={{ width: 100, height: 8, background: '#333', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, marginTop: 16, borderTop: '0.5px solid #2A2A2A', paddingTop: 12 }}>
          {['Income', 'Spent', 'Left'].map(l => (
            <div key={l} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ width: 40, height: 6, background: '#444', borderRadius: 3, margin: '0 auto 6px' }} />
              <div style={{ width: 50, height: 12, background: '#333', borderRadius: 4, margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
      {/* Gradient fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(to bottom, transparent, #0D0D0D)',
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
        position: 'fixed', inset: 0, background: '#0D0D0D',
        zIndex: 100,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Blurred dashboard behind */}
      <BlurredDashboard />

      {/* Lock content — bottom sheet style */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '32px 28px',
        paddingBottom: 'max(env(safe-area-inset-bottom), 32px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'linear-gradient(to top, #0D0D0D 60%, transparent)',
      }}>
        {/* Ring mark */}
        <MiniRing size={72} />

        {/* Greeting */}
        <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 28 }}>
          <p style={{
            fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 300,
            color: '#FFFFFF', letterSpacing: '-0.01em',
          }}>
            Welcome back, {firstName}
          </p>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: 13,
            color: '#717179', marginTop: 4,
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
              background: loading ? '#B8922E' : '#FFD166',
              borderRadius: 16, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 600,
              color: '#0D0D0D',
              transition: 'all 0.2s ease',
              boxShadow: loading ? 'none' : '0 0 24px rgba(255,209,102,0.3)',
              marginBottom: 12,
            }}
          >
            {/* Fingerprint / Face ID icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
              border: '0.5px solid #3A3A3A',
              fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 400,
              color: '#A1A1AA',
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
            color: '#717179',
            background: 'none', border: 'none',
            marginBottom: showPassword ? 16 : 0,
            textDecoration: 'underline',
            textDecorationColor: '#3A3A3A',
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
            color: '#3A3A3A', background: 'none', border: 'none',
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
          background: '#1B1B1B', border: '0.5px solid #2A2A2A',
          borderRadius: 12, color: '#FFFFFF',
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
            background: '#1B1B1B', border: '0.5px solid #2A2A2A',
            borderRadius: 12, color: '#FFFFFF',
            fontFamily: 'Inter, sans-serif', fontSize: 14,
          }}
        />
        <button
          type="button"
          onClick={() => setShowPw(v => !v)}
          style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: '#717179', fontSize: 13,
          }}
        >
          {showPw ? 'Hide' : 'Show'}
        </button>
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '13px 0', background: '#FFD166', borderRadius: 12,
          border: 'none', fontFamily: 'Poppins, sans-serif',
          fontSize: 14, fontWeight: 600, color: '#0D0D0D',
        }}
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}

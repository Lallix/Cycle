import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

const MODES = { SIGNIN: 'signin', SIGNUP: 'signup', RESET: 'reset' }

// Mini ring for auth page header
function AuthRing() {
  return (
    <>
      <style>{`
        @keyframes arCW  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes arCCW { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
      `}</style>
      <div style={{ width: 64, height: 64, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', width: 60, height: 60, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#FFD166', borderRightColor: '#FFD166',
          borderBottomColor: '#2A2010', borderLeftColor: '#2A2010',
          animation: 'arCW 4s linear infinite',
          filter: 'drop-shadow(0 0 5px rgba(255,209,102,0.5))',
        }} />
        <div style={{
          position: 'absolute', width: 40, height: 40, borderRadius: '50%',
          border: '1.5px solid transparent',
          borderTopColor: '#FFE8A3', borderLeftColor: '#FFE8A3',
          borderBottomColor: '#1A1508', borderRightColor: '#1A1508',
          animation: 'arCCW 2.5s linear infinite',
        }} />
        <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: '#0D0D0D' }} />
      </div>
    </>
  )
}

export default function AuthPage() {
  const navigate = useNavigate()
  const { signIn, signUp, resetPassword, biometricAvailable, biometricEnabled, registerBiometric } = useAuth()
  const toast = useToast()

  const [mode, setMode]           = useState(MODES.SIGNIN)
  const [loading, setLoading]     = useState(false)
  const [showPassword, setShowPw] = useState(false)
  const [form, setForm]           = useState({ email: '', password: '', fullName: '' })
  const [errors, setErrors]       = useState({})

  function setField(field, value) {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
    if (mode !== MODES.RESET) {
      if (!form.password) errs.password = 'Password is required'
      else if (mode === MODES.SIGNUP && form.password.length < 8) errs.password = 'Minimum 8 characters'
    }
    if (mode === MODES.SIGNUP && !form.fullName) errs.fullName = 'Name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === MODES.SIGNIN) {
        await signIn(form.email, form.password)
        // Show biometric prompt if available and not yet enrolled
        if (biometricAvailable && !biometricEnabled) {
          setShowBioPrompt(true)
        } else {
          navigate('/')
        }
      } else if (mode === MODES.SIGNUP) {
        await signUp(form.email, form.password, form.fullName)
        toast('Account created! Check your email to confirm.', 'success')
        setMode(MODES.SIGNIN)
      } else {
        await resetPassword(form.email)
        toast('Reset link sent to your email.', 'success')
        setMode(MODES.SIGNIN)
      }
    } catch (err) {
      // Map Supabase error messages to user-friendly versions
      const msg = err.message || ''
      let friendly = 'Something went wrong — please try again'

      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        friendly = 'Incorrect email or password'
      } else if (msg.includes('Email not confirmed')) {
        friendly = 'Please confirm your email before signing in'
      } else if (msg.includes('User already registered')) {
        friendly = 'An account with this email already exists'
      } else if (
        msg.includes('Signups not allowed') ||
        msg.includes('signup') ||
        msg.includes('not enabled') ||
        mode === MODES.SIGNUP
      ) {
        friendly = 'Access is by invitation only — contact Gideon to request access'
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        friendly = 'Too many attempts — please wait a moment and try again'
      } else if (msg.includes('network') || msg.includes('fetch')) {
        friendly = 'Connection error — check your internet and try again'
      }

      toast(friendly, 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError) => ({
    width: '100%', padding: '13px 16px',
    background: '#1B1B1B',
    border: `0.5px solid ${hasError ? '#EF4444' : '#2A2A2A'}`,
    borderRadius: 12, color: '#FFFFFF',
    fontFamily: 'Inter, sans-serif', fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  })

  return (
    <div style={{
      minHeight: '100svh', background: '#0D0D0D',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
        <AuthRing />
        <div style={{
          fontFamily: 'Poppins, sans-serif', fontSize: 26, fontWeight: 300,
          color: '#FFD166', letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 16,
        }}>
          CYCLE
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#717179', marginTop: 4, letterSpacing: '0.1em' }}>
          Your budget. Your cycle.
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#3A3530', marginTop: 4, letterSpacing: '0.08em' }}>
          Crafted by PGV
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#1B1B1B',
        borderRadius: 24, border: '0.5px solid #2A2A2A',
        padding: 24,
      }}>

        {/* Mode tabs */}
        {mode !== MODES.RESET && (
          <div style={{
            display: 'flex', background: '#0D0D0D',
            borderRadius: 12, padding: 4, marginBottom: 24,
          }}>
            {[MODES.SIGNIN, MODES.SIGNUP].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}) }}
                style={{
                  flex: 1, padding: '9px 0',
                  borderRadius: 9, border: 'none',
                  background: mode === m ? '#2E2E2E' : 'transparent',
                  color: mode === m ? '#FFFFFF' : '#717179',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: mode === m ? 500 : 400,
                  transition: 'all 0.2s ease', cursor: 'pointer',
                }}
              >
                {m === MODES.SIGNIN ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
        )}

        {/* Reset header */}
        {mode === MODES.RESET && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 500, color: '#FFFFFF' }}>
              Reset password
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#717179', marginTop: 4 }}>
              We'll send a reset link to your email.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Full name — signup only */}
          {mode === MODES.SIGNUP && (
            <div>
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                Name
              </label>
              <input
                type="text" placeholder="Your full name"
                value={form.fullName}
                onChange={e => setField('fullName', e.target.value)}
                autoComplete="name"
                style={inputStyle(errors.fullName)}
              />
              {errors.fullName && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>{errors.fullName}</p>}
            </div>
          )}

          {/* Email */}
          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email" placeholder="you@example.com"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              autoComplete="email" inputMode="email"
              style={inputStyle(errors.email)}
            />
            {errors.email && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>{errors.email}</p>}
          </div>

          {/* Password */}
          {mode !== MODES.RESET && (
            <div>
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  autoComplete={mode === MODES.SIGNUP ? 'new-password' : 'current-password'}
                  style={{ ...inputStyle(errors.password), paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#717179', cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>{errors.password}</p>}
            </div>
          )}

          {/* Forgot password */}
          {mode === MODES.SIGNIN && (
            <button
              type="button"
              onClick={() => setMode(MODES.RESET)}
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: 12,
                color: '#717179', background: 'none', border: 'none',
                textAlign: 'right', cursor: 'pointer',
                alignSelf: 'flex-end',
              }}
            >
              Forgot password?
            </button>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px 0', marginTop: 4,
              background: loading ? '#B8922E' : '#FFD166',
              borderRadius: 14, border: 'none',
              fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 600,
              color: '#0D0D0D', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: loading ? 'none' : '0 0 20px rgba(255,209,102,0.2)',
            }}
          >
            {loading
              ? 'Please wait...'
              : mode === MODES.SIGNIN ? 'Sign in'
              : mode === MODES.SIGNUP ? 'Create account'
              : 'Send reset link'
            }
          </button>

          {/* Back to sign in */}
          {mode === MODES.RESET && (
            <button
              type="button"
              onClick={() => setMode(MODES.SIGNIN)}
              style={{
                fontFamily: 'Inter, sans-serif', fontSize: 13,
                color: '#717179', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'center', marginTop: 4,
              }}
            >
              ← Back to sign in
            </button>
          )}
        </form>
      </div>

      {/* Biometric enrolment prompt — shown after first successful login */}
      {showBioPrompt && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            width: '100%', maxWidth: 480,
            background: '#1B1B1B', borderRadius: '24px 24px 0 0',
            border: '0.5px solid #2A2A2A', padding: '28px 28px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'rgba(255,209,102,0.1)',
              border: '0.5px solid rgba(255,209,102,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, marginBottom: 16,
            }}>
              🔒
            </div>
            <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 600, color: '#FFFFFF', marginBottom: 8, textAlign: 'center' }}>
              Enable quick unlock?
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#717179', textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>
              Use Face ID or your fingerprint to unlock Cycle instantly next time — no password needed.
            </p>
            {/* Enable button */}
            <button
              onClick={async () => {
                const ok = await registerBiometric()
                if (ok) toast('Biometric unlock enabled ✓', 'success')
                navigate('/')
              }}
              style={{
                width: '100%', padding: '14px 0', marginBottom: 10,
                background: '#FFD166', borderRadius: 14, border: 'none',
                fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 600,
                color: '#0D0D0D', cursor: 'pointer',
                boxShadow: '0 0 20px rgba(255,209,102,0.25)',
              }}
            >
              Enable Face ID / Touch ID
            </button>
            {/* Skip */}
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#717179',
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#3A3530', letterSpacing: '0.06em' }}>
          Crafted by PGV
        </p>
      </div>
    </div>
  )
}

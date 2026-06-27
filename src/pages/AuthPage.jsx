import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Fingerprint } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import BrandLogo from '../components/branding/BrandLogo'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const MODES = {
  SIGNIN: 'signin',
  SIGNUP: 'signup',
  RESET: 'reset',
}

export default function AuthPage() {
  const navigate = useNavigate()
  const { signIn, signUp, resetPassword, biometricAvailable, biometricEnabled, authenticateWithBiometric } = useAuth()
  const toast = useToast()

  const [mode, setMode] = useState(MODES.SIGNIN)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
  })

  const [errors, setErrors] = useState({})

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: null }))
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
        navigate('/')
      } else if (mode === MODES.SIGNUP) {
        await signUp(form.email, form.password, form.fullName)
        toast('Account created! Check your email to confirm.', 'success', 5000)
        setMode(MODES.SIGNIN)
      } else if (mode === MODES.RESET) {
        await resetPassword(form.email)
        toast('Reset link sent to your email.', 'success', 5000)
        setMode(MODES.SIGNIN)
      }
    } catch (err) {
      toast(err.message || 'Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometric() {
    setLoading(true)
    try {
      const success = await authenticateWithBiometric()
      if (success) {
        toast('Welcome back!', 'success')
        navigate('/')
      } else {
        toast('Biometric authentication failed', 'error')
      }
    } catch {
      toast('Biometric not available', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg flex flex-col items-center justify-center px-6 py-12 animate-fade-in">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <BrandLogo size={72} />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gold tracking-widest uppercase">Cycle</h1>
          <p className="text-xs text-muted mt-1 tracking-widest uppercase">Budget</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-bg-surface rounded-3xl border border-border p-6 shadow-card">
        {/* Mode tabs */}
        {mode !== MODES.RESET && (
          <div className="flex bg-bg-elevated rounded-xl p-1 mb-6">
            {[MODES.SIGNIN, MODES.SIGNUP].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}) }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95
                  ${mode === m ? 'bg-bg-card text-text-primary shadow-sm' : 'text-muted'}`}
              >
                {m === MODES.SIGNIN ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        {/* Reset mode header */}
        {mode === MODES.RESET && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Reset Password</h2>
            <p className="text-sm text-muted mt-1">We'll send a reset link to your email.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Full name (signup only) */}
          {mode === MODES.SIGNUP && (
            <Input
              label="Full Name"
              placeholder="Your name"
              value={form.fullName}
              onChange={e => setField('fullName', e.target.value)}
              error={errors.fullName}
              autoComplete="name"
            />
          )}

          {/* Email */}
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setField('email', e.target.value)}
            error={errors.email}
            autoComplete="email"
            inputMode="email"
          />

          {/* Password */}
          {mode !== MODES.RESET && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  autoComplete={mode === MODES.SIGNUP ? 'new-password' : 'current-password'}
                  className={`
                    w-full bg-bg-elevated border rounded-xl px-4 py-3 pr-12 text-sm
                    text-text-primary placeholder:text-muted
                    focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20
                    transition-all duration-200
                    ${errors.password ? 'border-danger' : 'border-border'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger">{errors.password}</p>}
            </div>
          )}

          {/* Forgot password link */}
          {mode === MODES.SIGNIN && (
            <button
              type="button"
              onClick={() => setMode(MODES.RESET)}
              className="text-xs text-muted hover:text-gold text-right transition-colors"
            >
              Forgot password?
            </button>
          )}

          {/* Submit */}
          <Button
            type="submit"
            loading={loading}
            fullWidth
            size="lg"
            className="mt-2"
          >
            {mode === MODES.SIGNIN ? 'Sign In' : mode === MODES.SIGNUP ? 'Create Account' : 'Send Reset Link'}
          </Button>

          {/* Biometric */}
          {mode === MODES.SIGNIN && biometricEnabled && (
            <button
              type="button"
              onClick={handleBiometric}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border bg-bg-elevated text-sm text-text-secondary tappable"
            >
              <Fingerprint size={20} className="text-gold" />
              Use Biometric Login
            </button>
          )}
        </form>

        {/* Back to sign in (reset mode) */}
        {mode === MODES.RESET && (
          <button
            onClick={() => setMode(MODES.SIGNIN)}
            className="mt-4 text-xs text-muted hover:text-gold w-full text-center transition-colors"
          >
            ← Back to sign in
          </button>
        )}
      </div>

      <p className="mt-8 text-2xs text-muted text-center">
        Cycle v1.0 · Schurco Slurry SA
      </p>
    </div>
  )
}

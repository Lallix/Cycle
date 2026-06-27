import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]                       = useState(null)
  const [profile, setProfile]                 = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled]     = useState(false)

  useEffect(() => { checkBiometric() }, [])

  async function checkBiometric() {
    try {
      if (window.PublicKeyCredential) {
        const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        setBiometricAvailable(ok)
        setBiometricEnabled(ok && localStorage.getItem('cycle-biometric-enabled') === 'true')
      }
    } catch { setBiometricAvailable(false) }
  }

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted && session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        }
      } catch (e) { console.error('Auth init:', e) }
      finally { if (mounted) setLoading(false) }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null); setProfile(null)
      }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).single()
      if (error) throw error
      setProfile(data)
      return data
    } catch (e) { console.error('Profile fetch:', e); return null }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } }
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    localStorage.removeItem('cycle-biometric-credential')
    localStorage.removeItem('cycle-biometric-enabled')
    localStorage.removeItem('cycle-biometric-credential-id')
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/Cycle/`
    })
    if (error) throw error
  }

  // Does NOT send updated_at — GEM profiles table has no such column
  async function updateProfile(updates) {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', user.id).select().single()
    if (error) throw error
    setProfile(data)
    return data
  }

  async function registerBiometric() {
    if (!biometricAvailable || !user) return false
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Cycle', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email,
            displayName: profile?.full_name || user.email,
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000,
        }
      })
      if (cred) {
        localStorage.setItem('cycle-biometric-enabled', 'true')
        localStorage.setItem('cycle-biometric-credential-id',
          btoa(String.fromCharCode(...new Uint8Array(cred.rawId))))
        setBiometricEnabled(true)
        return true
      }
    } catch (e) { console.error('Biometric reg:', e) }
    return false
  }

  async function authenticateWithBiometric() {
    if (!biometricEnabled) return false
    try {
      const stored = localStorage.getItem('cycle-biometric-credential-id')
      if (!stored) return false
      const credId    = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge, rpId: window.location.hostname,
          allowCredentials: [{ id: credId, type: 'public-key' }],
          userVerification: 'required', timeout: 60000,
        }
      })
      return !!assertion
    } catch (e) { console.error('Biometric auth:', e); return false }
  }

  function disableBiometric() {
    localStorage.removeItem('cycle-biometric-enabled')
    localStorage.removeItem('cycle-biometric-credential-id')
    setBiometricEnabled(false)
  }

  const refreshProfile = useCallback(() => { if (user) fetchProfile(user.id) }, [user])

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      biometricAvailable, biometricEnabled,
      signIn, signUp, signOut, resetPassword,
      updateProfile, refreshProfile,
      registerBiometric, authenticateWithBiometric, disableBiometric,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability()
  }, [])

  async function checkBiometricAvailability() {
    try {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        setBiometricAvailable(available)
        const enabled = localStorage.getItem('cycle-biometric-enabled') === 'true'
        setBiometricEnabled(enabled && available)
      }
    } catch {
      setBiometricAvailable(false)
    }
  }

  // Initialize auth session
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          }
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
      return data
    } catch (err) {
      console.error('Profile fetch error:', err)
      return null
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    localStorage.removeItem('cycle-biometric-credential')
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  }

  async function updateProfile(updates) {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  /**
   * Register biometric credential for this device
   * Stores credentials in localStorage (device-local)
   */
  async function registerBiometric() {
    if (!biometricAvailable || !user) return false

    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Cycle Budget App', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email,
            displayName: profile?.full_name || user.email,
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        }
      })

      if (credential) {
        localStorage.setItem('cycle-biometric-enabled', 'true')
        localStorage.setItem('cycle-biometric-credential-id',
          btoa(String.fromCharCode(...new Uint8Array(credential.rawId))))
        setBiometricEnabled(true)
        return true
      }
    } catch (err) {
      console.error('Biometric registration error:', err)
    }
    return false
  }

  /**
   * Authenticate with biometric (then sign in via stored session)
   */
  async function authenticateWithBiometric() {
    if (!biometricEnabled) return false

    try {
      const storedId = localStorage.getItem('cycle-biometric-credential-id')
      if (!storedId) return false

      const credId = Uint8Array.from(atob(storedId), c => c.charCodeAt(0))
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{ id: credId, type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000,
        }
      })

      return !!assertion
    } catch (err) {
      console.error('Biometric auth error:', err)
      return false
    }
  }

  function disableBiometric() {
    localStorage.removeItem('cycle-biometric-enabled')
    localStorage.removeItem('cycle-biometric-credential-id')
    setBiometricEnabled(false)
  }

  const refreshProfile = useCallback(() => {
    if (user) return fetchProfile(user.id)
  }, [user])

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      biometricAvailable,
      biometricEnabled,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updateProfile,
      refreshProfile,
      registerBiometric,
      authenticateWithBiometric,
      disableBiometric,
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

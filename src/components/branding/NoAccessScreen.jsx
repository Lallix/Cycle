import { useAuth } from '../../context/AuthContext'
import BrandLogo from './BrandLogo'

// Shown to someone who can sign in (the login is shared with GEM Planner)
// but hasn't been given Cycle. The database refuses their data anyway; this
// just says so instead of showing empty pages.
export default function NoAccessScreen() {
  const { user, signOut } = useAuth()
  return (
    <div style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
      background: 'rgb(var(--c-bg))', fontFamily: 'Inter, sans-serif',
    }}>
      <BrandLogo size={64} fill={0.3} />
      <h1 style={{ margin: '24px 0 8px', fontSize: 20, fontWeight: 700, color: 'rgb(var(--c-text))' }}>
        No access to Cycle
      </h1>
      <p style={{ margin: 0, maxWidth: 320, fontSize: 14, lineHeight: 1.5, color: 'rgb(var(--c-text-2))' }}>
        You're signed in as <strong>{user?.email}</strong>, but this account hasn't been given Cycle.
        Ask Gideon to give you access.
      </p>
      <button onClick={signOut} style={{
        marginTop: 28, padding: '10px 22px', borderRadius: 20, border: 0, cursor: 'pointer',
        fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
        background: 'rgb(var(--c-accent))', color: 'rgb(var(--c-on-accent))',
      }}>
        Sign out
      </button>
    </div>
  )
}

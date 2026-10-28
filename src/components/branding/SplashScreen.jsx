import { useEffect, useState } from 'react'
import BrandLogo, { Backdrop } from './BrandLogo'

// Startup: the ring fills, then the wordmark rises in. App.jsx decides how
// long it shows (visible → false), then this fades out and calls onDone.
export default function SplashScreen({ visible, onDone }) {
  const [textIn, setTextIn] = useState(false)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setTextIn(true), 650)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (visible) return
    setOpacity(0)
    const t = setTimeout(onDone, 400)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden',
      background: 'rgb(var(--c-bg))',
      opacity, transition: 'opacity 0.4s ease',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <Backdrop />

      <BrandLogo size={136} fill={0.75} animate="fill" label="R" />

      <div style={{
        position: 'relative', marginTop: 26, textAlign: 'center',
        opacity: textIn ? 1 : 0, transform: textIn ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(.2,.8,.2,1)',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: 'rgb(var(--c-text))' }}>
          cycle
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgb(var(--c-text-2))', marginTop: 8 }}>
          your money, rn
        </div>
      </div>

      <p style={{
        position: 'absolute', bottom: 'max(env(safe-area-inset-bottom), 28px)',
        fontFamily: 'Inter, sans-serif', fontSize: 11, letterSpacing: '0.12em', color: 'rgb(var(--c-text-4))',
        opacity: textIn ? 1 : 0, transition: 'opacity 0.6s ease',
      }}>
        crafted by PGV
      </p>
    </div>
  )
}

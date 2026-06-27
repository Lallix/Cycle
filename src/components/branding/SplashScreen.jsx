/**
 * SplashScreen — V1 Placeholder
 * ─────────────────────────────────────────────────────────
 * Isolated branding component. Replace in Version 2.
 * Component API:
 *   <SplashScreen visible={boolean} onDone={() => void} />
 * ─────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react'
import BrandLogo from './BrandLogo'

export default function SplashScreen({ visible, onDone }) {
  const [phase, setPhase] = useState('in') // 'in' | 'hold' | 'out' | 'done'

  useEffect(() => {
    if (!visible) return

    // Fade in → hold → fade out
    const hold = setTimeout(() => setPhase('hold'), 600)
    const fadeOut = setTimeout(() => setPhase('out'), 1400)
    const done = setTimeout(() => {
      setPhase('done')
      onDone?.()
    }, 1800)

    return () => {
      clearTimeout(hold)
      clearTimeout(fadeOut)
      clearTimeout(done)
    }
  }, [visible])

  if (phase === 'done' || !visible) return null

  return (
    <div
      className="fixed inset-0 bg-bg z-[99999] flex flex-col items-center justify-center"
      style={{
        opacity: phase === 'in' ? 0 : phase === 'out' ? 0 : 1,
        transition: 'opacity 0.5s ease',
        animation: phase === 'in' ? 'fadeIn 0.5s ease forwards' : undefined,
      }}
    >
      {/* Centered brand mark */}
      <div className="flex flex-col items-center gap-6">
        <BrandLogo size={96} />
        <div className="flex flex-col items-center gap-1">
          <span
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: '1.75rem',
              color: '#D4AF37',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Cycle
          </span>
          <span
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.7rem',
              color: '#888888',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
            }}
          >
            Budget
          </span>
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.7rem', color: '#444444', letterSpacing: '0.2em' }}>
          EVERY CYCLE COUNTS
        </span>
      </div>
    </div>
  )
}

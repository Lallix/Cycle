// The Cycle mark: the dashboard's ring. A track with a lime arc (how far
// through the cycle) around a clay core. Used on the splash, sign-in, lock
// and loading screens.
//
//   fill      0–1, how much of the ring is lit
//   animate   'fill' — the arc sweeps from empty to `fill` once (splash)
//             'spin' — a lit arc keeps turning (loading)
//   label     optional text in the core (e.g. "R")
export default function BrandLogo({ size = 48, fill = 0.75, animate = null, label = null, className = '' }) {
  const stroke = size * 0.12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const lit = circ * Math.min(1, Math.max(0, fill))

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes cycleArcFill { from { stroke-dashoffset: ${circ} } to { stroke-dashoffset: ${circ - lit} } }
        @keyframes cycleArcSpin { to { transform: rotate(360deg) } }
        @media (prefers-reduced-motion: reduce) { .cycle-arc { animation: none !important } }
      `}</style>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true"
        style={{ overflow: 'visible', animation: animate === 'spin' ? 'cycleArcSpin 1.1s linear infinite' : 'none' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--vibe-track)" strokeWidth={stroke} />
        <circle className="cycle-arc" cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgb(var(--c-accent))" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - lit}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            filter: 'drop-shadow(0 0 6px rgb(var(--c-accent) / 0.55))',
            animation: animate === 'fill' ? 'cycleArcFill 1.3s cubic-bezier(.2,.8,.2,1) both' : 'none',
          }} />
      </svg>
      {/* Clay core */}
      <div className="absolute rounded-full flex items-center justify-center" style={{
        width: size * 0.62, height: size * 0.62,
        background: 'var(--vibe-ring-core)',
        boxShadow: 'inset 0 2px 0 var(--vibe-inset-light), inset 0 -4px 8px var(--vibe-inset-dark), 0 6px 16px var(--vibe-drop-soft)',
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size * 0.22, color: 'rgb(var(--c-text))',
      }}>
        {label}
      </div>
    </div>
  )
}

// The soft colour glows behind the startup screens (same as the app background)
export function Backdrop() {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `radial-gradient(360px 360px at 0% 0%, var(--vibe-blob-1), transparent 70%),
        radial-gradient(320px 320px at 100% 50%, var(--vibe-blob-2), transparent 70%),
        radial-gradient(280px 280px at 20% 100%, var(--vibe-blob-3), transparent 70%)`,
    }} />
  )
}

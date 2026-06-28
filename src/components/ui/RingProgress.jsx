import { useEffect, useState, useRef } from 'react'

// Ring progress component — design bible section 9
// States: static | loading | progress | success
// Animates from 0 to target percentage on mount

const SIZE        = 200   // SVG viewBox size
const STROKE      = 14    // Ring stroke width
const RADIUS      = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getRingColor(pct, isOver) {
  if (isOver)   return { stroke: '#EF4444', glow: 'rgba(239,68,68,0.35)' }
  if (pct >= 90) return { stroke: '#FFD166', glow: 'rgba(255,209,102,0.5)' }
  if (pct >= 70) return { stroke: '#E6BB45', glow: 'rgba(230,187,69,0.4)' }
  return           { stroke: '#FFD166', glow: 'rgba(255,209,102,0.35)' }
}

export default function RingProgress({
  percentage = 0,     // 0–100 — how much of budget is SPENT
  daysRemaining = 0,
  daysTotal = 30,
  isOver = false,
  size = 200,
  animated = true,
}) {
  const [displayPct, setDisplayPct] = useState(0)
  const rafRef = useRef(null)

  // Scale everything proportionally
  const scale = size / SIZE
  const r     = RADIUS
  const circ  = CIRCUMFERENCE
  const clampedPct = Math.min(percentage, 100)

  useEffect(() => {
    if (!animated) { setDisplayPct(clampedPct); return }

    const start = performance.now()
    const duration = 900
    const startVal = 0
    const endVal   = clampedPct

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayPct(startVal + (endVal - startVal) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [clampedPct, animated])

  const strokeDashoffset = circ - (displayPct / 100) * circ
  const colors = getRingColor(displayPct, isOver)

  // Day progress arc (thin inner ring)
  const dayPct = daysTotal > 0 ? ((daysTotal - daysRemaining) / daysTotal) * 100 : 0
  const dayOffset = circ - (dayPct / 100) * circ
  const innerR = r - 22

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="ringGlowStrong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Track — background ring */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {/* Glow layer — slightly thicker, blurred */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          fill="none"
          stroke={colors.glow}
          strokeWidth={STROKE + 8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          strokeOpacity={0.4}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          filter="url(#ringGlowStrong)"
          style={{ transition: animated ? 'none' : 'stroke-dashoffset 0.6s ease' }}
        />

        {/* Main progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          filter="url(#ringGlow)"
          style={{ transition: animated ? 'none' : 'stroke-dashoffset 0.6s ease' }}
        />

        {/* Day progress — thin inner ring */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={innerR}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={3}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={innerR}
          fill="none"
          stroke="rgba(255,209,102,0.25)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * innerR}
          strokeDashoffset={2 * Math.PI * innerR - (dayPct / 100) * 2 * Math.PI * innerR}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />

        {/* Spark dot at end of arc */}
        {displayPct > 2 && displayPct < 100 && (
          <circle
            cx={SIZE / 2 + r * Math.cos((Math.PI * 2 * displayPct / 100) - Math.PI / 2)}
            cy={SIZE / 2 + r * Math.sin((Math.PI * 2 * displayPct / 100) - Math.PI / 2)}
            r={STROKE / 2 + 1}
            fill={colors.stroke}
            filter="url(#ringGlow)"
          />
        )}
      </svg>

      {/* Centre content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            color: '#717179',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 2,
          }}
        >
          Cycle
        </span>
        <span
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: 32,
            fontWeight: 300,
            color: isOver ? '#EF4444' : '#FFD166',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {Math.round(displayPct)}%
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            color: '#A1A1AA',
            marginTop: 4,
          }}
        >
          {daysRemaining}d remaining
        </span>
      </div>
    </div>
  )
}

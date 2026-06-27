/**
 * BrandLogo — V1 Placeholder
 * ─────────────────────────────────────────────────────────
 * This is a temporary placeholder for Version 1.
 * In Version 2, replace this entire file with your production logo.
 * The component API is:
 *   <BrandLogo size={number} animated={boolean} className={string} />
 * ─────────────────────────────────────────────────────────
 */

export default function BrandLogo({ size = 48, animated = false, className = '' }) {
  const strokeWidth = size < 60 ? 2.5 : 2
  const innerSize = size * 0.5
  const fontSize = size * 0.22

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer gold ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={animated ? 'animate-pulse-gold' : ''}
      >
        {/* Glow effect */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2 - 1}
          stroke="#D4AF37"
          strokeWidth={strokeWidth}
          fill="none"
          filter="url(#glow)"
        />

        {/* Inner subtle ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth * 3}
          stroke="rgba(212,175,55,0.2)"
          strokeWidth={1}
          fill="none"
        />
      </svg>

      {/* Letter mark */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: fontSize, color: '#D4AF37' }}
      >
        C
      </div>
    </div>
  )
}

// Ring mark — used in loading screens, settings footer, etc.
// No letter inside — the ring IS the logo (design bible section 4)

export default function BrandLogo({ size = 48, animated = false, className = '' }) {
  const s = size
  const stroke = Math.max(1.5, s * 0.03)

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: s, height: s }}
    >
      {animated && (
        <style>{`
          @keyframes blSpinCW  { from { transform: rotate(0deg) }   to { transform: rotate(360deg) } }
          @keyframes blSpinCCW { from { transform: rotate(0deg) }   to { transform: rotate(-360deg) } }
        `}</style>
      )}

      {/* Outer ring CW */}
      <div
        className="absolute rounded-full"
        style={{
          width: s * 0.94, height: s * 0.94,
          border: `${stroke}px solid transparent`,
          borderTopColor: '#E8C36A',
          borderRightColor: '#E8C36A',
          borderBottomColor: '#2A2010',
          borderLeftColor: '#2A2010',
          animation: animated ? 'blSpinCW 4s linear infinite' : 'none',
          filter: 'drop-shadow(0 0 0 0 transparent)',
        }}
      />

      {/* Inner ring CCW */}
      <div
        className="absolute rounded-full"
        style={{
          width: s * 0.68, height: s * 0.68,
          border: `${stroke}px solid transparent`,
          borderTopColor: '#F3DDA0',
          borderLeftColor: '#F3DDA0',
          borderBottomColor: '#1A1508',
          borderRightColor: '#1A1508',
          animation: animated ? 'blSpinCCW 2.5s linear infinite' : 'none',
        }}
      />

      {/* Centre fill */}
      <div
        className="absolute rounded-full"
        style={{
          width: s * 0.36, height: s * 0.36,
          background: '#0E0E10',
        }}
      />
    </div>
  )
}

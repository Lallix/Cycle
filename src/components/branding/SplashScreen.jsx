import { useEffect, useState } from 'react'

// Portal ring — the Cycle brand mark
// Matches the Doctor Strange sling ring aesthetic from the design bible
function PortalRing() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>

      {/* Ambient glow behind everything */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,209,102,0.06) 0%, transparent 70%)',
          animation: 'glowPulse 3s ease-in-out infinite',
        }}
      />

      {/* Ring 1 — outermost, slow CW */}
      <div
        className="absolute rounded-full"
        style={{
          width: 188, height: 188,
          border: '2px solid transparent',
          borderTopColor: '#FFD166',
          borderRightColor: '#FFD166',
          borderBottomColor: '#3A2E10',
          borderLeftColor: '#3A2E10',
          animation: 'spinCW 4s linear infinite',
          filter: 'drop-shadow(0 0 6px rgba(255,209,102,0.5))',
        }}
      />

      {/* Ring 2 — CCW, slightly smaller */}
      <div
        className="absolute rounded-full"
        style={{
          width: 160, height: 160,
          border: '2.5px solid transparent',
          borderTopColor: '#FFE8A3',
          borderLeftColor: '#FFE8A3',
          borderBottomColor: '#2A2010',
          borderRightColor: '#2A2010',
          animation: 'spinCCW 2.8s linear infinite',
          filter: 'drop-shadow(0 0 8px rgba(255,232,163,0.4))',
        }}
      />

      {/* Ring 3 — CW fast, broken */}
      <div
        className="absolute rounded-full"
        style={{
          width: 128, height: 128,
          border: '2px solid transparent',
          borderTopColor: '#FFD166',
          borderBottomColor: '#FFD166',
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          animation: 'spinCW 1.6s linear infinite',
          filter: 'drop-shadow(0 0 5px rgba(255,209,102,0.45))',
        }}
      />

      {/* Ring 4 — CCW inner accent */}
      <div
        className="absolute rounded-full"
        style={{
          width: 100, height: 100,
          border: '1.5px solid transparent',
          borderTopColor: '#E6BB45',
          borderRightColor: '#E6BB45',
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
          animation: 'spinCCW 1.2s linear infinite',
          opacity: 0.8,
        }}
      />

      {/* Sparks orbiting outer ring */}
      <div
        className="absolute rounded-full"
        style={{ width: 188, height: 188, animation: 'spinCW 3s linear infinite' }}
      >
        {[
          { top: '-2px', left: '50%', ml: '-2px', size: 4 },
          { top: '50%',  right: '-2px', mt: '-2px', size: 3 },
          { bottom: '5px', left: '28%', size: 4 },
          { top: '18%', left: '-1px', size: 3 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: s.size, height: s.size,
              background: '#FFE87A',
              top: s.top, right: s.right, bottom: s.bottom, left: s.left,
              marginLeft: s.ml, marginTop: s.mt,
              boxShadow: '0 0 4px #FFE87A, 0 0 8px rgba(255,232,122,0.5)',
              animation: `sparkFlicker ${0.8 + i * 0.3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Sparks orbiting inner ring CCW */}
      <div
        className="absolute rounded-full"
        style={{ width: 160, height: 160, animation: 'spinCCW 2s linear infinite' }}
      >
        {[
          { top: '-2px', left: '40%', size: 3 },
          { bottom: '-2px', right: '35%', size: 4 },
          { top: '45%', left: '-1px', size: 3 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: s.size, height: s.size,
              background: '#FFD166',
              top: s.top, right: s.right, bottom: s.bottom, left: s.left,
              boxShadow: '0 0 4px #FFD166',
              animation: `sparkFlicker ${0.6 + i * 0.4}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Centre — clean black circle, no letter */}
      <div
        className="absolute flex items-center justify-center rounded-full"
        style={{
          width: 64, height: 64,
          background: '#0D0D0D',
          border: '1px solid rgba(255,209,102,0.15)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
        }}
      />

    </div>
  )
}

export default function SplashScreen({ visible, onDone }) {
  const [phase, setPhase] = useState('ring')   // ring → text → fade
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (!visible && phase !== 'fade') {
      setPhase('fade')
      const t = setTimeout(() => {
        setOpacity(0)
        setTimeout(onDone, 400)
      }, 50)
      return () => clearTimeout(t)
    }
  }, [visible])

  // Text appears after ring spins for 0.8s
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 800)
    return () => clearTimeout(t1)
  }, [])

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes spinCW  { from { transform: rotate(0deg) }   to { transform: rotate(360deg) } }
        @keyframes spinCCW { from { transform: rotate(0deg) }   to { transform: rotate(-360deg) } }
        @keyframes glowPulse {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.12); }
        }
        @keyframes sparkFlicker {
          0%,100% { opacity: 0.5; transform: scale(0.8); }
          50%     { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bgArcPulse {
          0%,100% { opacity: 0.2; transform: scale(1); }
          50%     { opacity: 0.5; transform: scale(1.04); }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0D0D0D',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          opacity,
          transition: 'opacity 0.4s ease',
        }}
      >
        {/* Background ambient arcs */}
        {[280, 340, 400].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size, height: size,
              border: '0.5px solid rgba(255,209,102,0.04)',
              animation: `bgArcPulse ${4 + i}s ${i * 0.5}s ease-in-out infinite`,
            }}
          />
        ))}

        {/* Portal ring */}
        <PortalRing />

        {/* Wordmark + tagline — fade in after ring */}
        <div
          style={{
            marginTop: 28,
            textAlign: 'center',
            opacity: phase === 'ring' ? 0 : 1,
            transform: phase === 'ring' ? 'translateY(10px)' : 'translateY(0)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          <div
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: 28,
              fontWeight: 300,
              letterSpacing: '0.3em',
              color: '#FFD166',
              textTransform: 'uppercase',
            }}
          >
            CYCLE
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              color: '#717179',
              letterSpacing: '0.12em',
              marginTop: 4,
            }}
          >
            Your budget. Your cycle.
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 10,
              color: '#4A4540',
              letterSpacing: '0.1em',
              marginTop: 6,
            }}
          >
            Crafted by PGV
          </div>
        </div>

        {/* Loading dots */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 32,
            opacity: phase === 'ring' ? 0 : 1,
            transition: 'opacity 0.5s 0.2s ease',
          }}
        >
          {[0, 0.2, 0.4].map((delay, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 4, height: 4,
                background: '#FFD166',
                animation: `sparkFlicker 1.4s ${delay}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}

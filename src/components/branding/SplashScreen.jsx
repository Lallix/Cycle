import { useEffect, useState, useRef } from 'react'

export default function SplashScreen({ visible, onDone }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const [phase, setPhase]     = useState('ring')
  const [opacity, setOpacity] = useState(1)

  // Text fade-in after ring spins for 0.8s
  useEffect(() => {
    const t = setTimeout(() => setPhase('text'), 800)
    return () => clearTimeout(t)
  }, [])

  // Fade out when parent signals
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

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cx = canvas.getContext('2d')
    let W, H, t = 0, frame = 0

    function resize() {
      const r = canvas.parentElement?.getBoundingClientRect()
      if (!r) return
      canvas.width  = r.width  * devicePixelRatio
      canvas.height = r.height * devicePixelRatio
      cx.scale(devicePixelRatio, devicePixelRatio)
      W = r.width; H = r.height
    }
    resize()

    const RX = () => W / 2
    const RY = () => H * 0.38   // ring sits in upper third
    const RING_R = Math.min(W, H) * 0.27

    // Stars — upper portion only (above ring + a bit each side)
    const STARS = Array.from({length: 300}, () => ({
      x: Math.random(),
      y: Math.random() * 0.62,   // 0 to 62% of screen height — above CYCLE text
      r: Math.random() < 0.12 ? 1.4 + Math.random() * 0.8 : 0.3 + Math.random() * 0.9,
      a: 0.3 + Math.random() * 0.7,
      tw: Math.random() * Math.PI * 2,
      spd: 0.4 + Math.random() * 0.9,
    }))

    const TRAILS = Array.from({length: 22}, (_, i) => ({
      angle: (i / 22) * Math.PI * 2 + Math.random() * 0.3,
      r0: RING_R * 0.55 + Math.random() * (RING_R * 0.18),
      r1: RING_R * 0.88 + Math.random() * (RING_R * 0.22),
      a: 0.05 + Math.random() * 0.14,
      w: 0.2 + Math.random() * 0.5,
      spd: (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.35),
      ph: Math.random() * Math.PI * 2,
    }))

    const SPARKS = Array.from({length: 36}, () => ({
      a:   Math.random() * Math.PI * 2,
      r:   RING_R + (Math.random() - 0.5) * 14,
      sz:  0.4 + Math.random() * 1.6,
      al:  0.5 + Math.random() * 0.5,
      spd: (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 1.0),
      ph:  Math.random() * Math.PI * 2,
    }))

    function drawBg() {
      // Pure black throughout — no warm tint at bottom
      cx.fillStyle = '#000000'
      cx.fillRect(0, 0, W, H)
    }

    function drawStars() {
      STARS.forEach(s => {
        const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.spd + s.tw))
        const dx = s.x * W - RX(), dy = s.y * H - RY()
        const d  = Math.sqrt(dx * dx + dy * dy)
        cx.beginPath()
        cx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
        cx.fillStyle = d < RING_R
          ? `rgba(255,220,140,${s.a * tw * 1.5})`
          : `rgba(200,210,255,${s.a * tw * 0.65})`
        cx.fill()
      })
    }

    function drawPortalSpace() {
      // Deep space inside the ring
      const ig = cx.createRadialGradient(RX(), RY(), 0, RX(), RY(), RING_R - 6)
      ig.addColorStop(0,   'rgba(0,1,8,0.98)')
      ig.addColorStop(0.65,'rgba(1,2,12,0.95)')
      ig.addColorStop(1,   'rgba(6,4,1,0.0)')
      cx.beginPath()
      cx.arc(RX(), RY(), RING_R - 6, 0, Math.PI * 2)
      cx.fillStyle = ig
      cx.fill()
    }

    function drawRing() {
      const pulse = 0.92 + 0.08 * Math.sin(t * 1.1)
      const rx = RX(), ry = RY()

      // Wide outer halo
      const g1 = cx.createRadialGradient(rx, ry, RING_R - 30, rx, ry, RING_R + 30)
      g1.addColorStop(0,    'rgba(255,140,0,0)')
      g1.addColorStop(0.35, `rgba(255,185,30,${0.22 * pulse})`)
      g1.addColorStop(0.5,  `rgba(255,210,60,${0.34 * pulse})`)
      g1.addColorStop(0.65, `rgba(255,185,30,${0.22 * pulse})`)
      g1.addColorStop(1,    'rgba(255,120,0,0)')
      cx.beginPath(); cx.arc(rx, ry, RING_R + 30, 0, Math.PI * 2)
      cx.fillStyle = g1; cx.fill()

      // Tight glow ring
      const g2 = cx.createRadialGradient(rx, ry, RING_R - 12, rx, ry, RING_R + 12)
      g2.addColorStop(0,   'rgba(255,160,10,0)')
      g2.addColorStop(0.4, `rgba(255,200,50,${0.5 * pulse})`)
      g2.addColorStop(0.5, `rgba(255,225,80,${0.72 * pulse})`)
      g2.addColorStop(0.6, `rgba(255,200,50,${0.5 * pulse})`)
      g2.addColorStop(1,   'rgba(255,160,10,0)')
      cx.beginPath(); cx.arc(rx, ry, RING_R + 12, 0, Math.PI * 2)
      cx.fillStyle = g2; cx.fill()

      // Core ring — thin and bright
      cx.beginPath(); cx.arc(rx, ry, RING_R, 0, Math.PI * 2)
      cx.strokeStyle = `rgba(255,238,165,${0.98 * pulse})`
      cx.lineWidth = 2.2
      cx.setLineDash([])
      cx.shadowColor = 'rgba(255,200,60,0.9)'
      cx.shadowBlur  = 20
      cx.stroke()
      cx.shadowBlur = 0

      // Inner ghost line
      cx.beginPath(); cx.arc(rx, ry, RING_R - 4, 0, Math.PI * 2)
      cx.strokeStyle = `rgba(255,250,200,${0.3 * pulse})`
      cx.lineWidth = 0.7; cx.stroke()

      // Outer ghost line
      cx.beginPath(); cx.arc(rx, ry, RING_R + 4, 0, Math.PI * 2)
      cx.strokeStyle = `rgba(255,200,60,${0.2 * pulse})`
      cx.lineWidth = 0.7; cx.stroke()
    }

    function drawTrails() {
      TRAILS.forEach(tr => {
        const a    = tr.angle + t * tr.spd * 0.5
        const fade = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + tr.ph))
        const x0   = RX() + Math.cos(a) * tr.r0, y0 = RY() + Math.sin(a) * tr.r0
        const x1   = RX() + Math.cos(a) * tr.r1, y1 = RY() + Math.sin(a) * tr.r1
        const g    = cx.createLinearGradient(x0, y0, x1, y1)
        g.addColorStop(0,    'rgba(255,180,30,0)')
        g.addColorStop(0.45, `rgba(255,210,80,${tr.a * fade})`)
        g.addColorStop(1,    'rgba(255,230,120,0)')
        cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1)
        cx.strokeStyle = g; cx.lineWidth = tr.w
        cx.setLineDash([]); cx.stroke()
      })
    }

    function drawSparks() {
      SPARKS.forEach(sp => {
        const a     = sp.a + t * sp.spd * 0.5
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.4 + sp.ph))
        const x     = RX() + Math.cos(a) * sp.r
        const y     = RY() + Math.sin(a) * sp.r
        cx.beginPath(); cx.arc(x, y, sp.sz * pulse, 0, Math.PI * 2)
        cx.fillStyle = `rgba(255,240,160,${sp.al * pulse})`; cx.fill()
        cx.beginPath(); cx.arc(x, y, sp.sz * pulse * 3.5, 0, Math.PI * 2)
        cx.fillStyle = `rgba(255,200,60,${sp.al * pulse * 0.12})`; cx.fill()
      })
    }

    function drawGroundGlow() {
      const gy = RY() + RING_R + 14
      const gx = RX()

      // Wide bloom
      const g1 = cx.createRadialGradient(gx, gy, 0, gx, gy + 20, 112)
      g1.addColorStop(0,    'rgba(255,160,20,0.58)')
      g1.addColorStop(0.25, 'rgba(255,130,10,0.28)')
      g1.addColorStop(0.55, 'rgba(200,90,5,0.10)')
      g1.addColorStop(1,    'rgba(0,0,0,0)')
      cx.beginPath(); cx.ellipse(gx, gy + 10, 108, 50, 0, 0, Math.PI * 2)
      cx.fillStyle = g1; cx.fill()

      // Hot centre spot
      const g2 = cx.createRadialGradient(gx, gy, 0, gx, gy, 46)
      g2.addColorStop(0,   'rgba(255,225,110,0.75)')
      g2.addColorStop(0.3, 'rgba(255,180,40,0.36)')
      g2.addColorStop(1,   'rgba(255,140,0,0)')
      cx.beginPath(); cx.ellipse(gx, gy, 46, 17, 0, 0, Math.PI * 2)
      cx.fillStyle = g2; cx.fill()

      // Horizon line
      const hl = cx.createLinearGradient(gx - 108, gy, gx + 108, gy)
      hl.addColorStop(0,   'rgba(255,180,40,0)')
      hl.addColorStop(0.5, 'rgba(255,215,85,0.70)')
      hl.addColorStop(1,   'rgba(255,180,40,0)')
      cx.beginPath(); cx.moveTo(gx - 108, gy); cx.lineTo(gx + 108, gy)
      cx.strokeStyle = hl; cx.lineWidth = 0.8
      cx.setLineDash([]); cx.stroke()

      // Long floor fade into black
      const g3 = cx.createLinearGradient(0, gy, 0, gy + 100)
      g3.addColorStop(0,   'rgba(110,55,0,0.12)')
      g3.addColorStop(0.5, 'rgba(60,25,0,0.04)')
      g3.addColorStop(1,   'rgba(0,0,0,0)')
      cx.fillStyle = g3; cx.fillRect(gx - 130, gy, 260, 100)
    }

    function draw() {
      t = frame * 0.016; frame++
      cx.clearRect(0, 0, W, H)
      drawBg()
      drawStars()
      drawPortalSpace()
      drawTrails()
      drawRing()
      drawSparks()
      drawGroundGlow()
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <>
      <style>{`
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashDot {
          0%,100% { opacity: 0.2; transform: scale(0.7); }
          50%     { opacity: 1;   transform: scale(1); }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        background: '#000000',
        zIndex: 9999,
        opacity,
        transition: 'opacity 0.4s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 'max(env(safe-area-inset-bottom), 64px)',
      }}>
        {/* Canvas fills full screen */}
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />

        {/* Text — fades in after ring */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          opacity: phase === 'ring' ? 0 : 1,
          transform: phase === 'ring' ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          {/* CYCLE wordmark — Cinzel */}
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 'clamp(44px, 14vw, 58px)',
            fontWeight: 700,
            letterSpacing: '0.22em',
            paddingRight: '0.22em',
            background: 'linear-gradient(180deg, #FFFBF0 0%, #FFE680 18%, #FFD166 40%, #E6A817 68%, #B8780A 88%, #8A5500 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 16px rgba(255,185,40,0.75)) drop-shadow(0 0 38px rgba(255,140,0,0.4))',
            lineHeight: 1,
          }}>
            CYCLE
          </div>

          {/* Divider + PGV */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 11,
          }}>
            <div style={{ width: 38, height: 0.5, background: 'linear-gradient(to right, transparent, rgba(255,185,40,0.5))' }} />
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 9, fontWeight: 300,
              letterSpacing: '0.26em',
              color: 'rgba(255,185,40,0.55)',
              textTransform: 'uppercase',
            }}>
              A product of PGV
            </span>
            <div style={{ width: 38, height: 0.5, background: 'linear-gradient(to left, transparent, rgba(255,185,40,0.5))' }} />
          </div>

          {/* Loading dots */}
          <div style={{ display: 'flex', gap: 5, marginTop: 20 }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <div key={i} style={{
                width: 4, height: 4, borderRadius: '50%',
                background: '#FFD166',
                animation: `splashDot 1.4s ${delay}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

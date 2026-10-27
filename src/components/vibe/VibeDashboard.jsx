import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudget } from '../../context/BudgetContext'
import { normaliseType } from '../../lib/totals'

// Vibe look: the dashboard pieces from the 3D concept, on live data.
// Clay surfaces and the tilt come from .clay / .tilt in styles/globals.css.

// Whole rands, no space after R, so the big number never wraps: −R2 177
const R = v => `${v < 0 ? '−' : ''}R${Math.round(Math.abs(v)).toLocaleString('en-ZA').replace(/[,\s]/g, ' ')}`
const Rk = v => `${v < 0 ? '−' : ''}R${(Math.abs(v) / 1000).toFixed(1)}k`
const display = { fontFamily: 'var(--font-display)' }

// Tilt a card towards the mouse. Cards sit flat; on a phone the tilt only
// follows a finger that is pressed on the card, and springs back on lift,
// cancel or scroll (touch scrolling often never sends "leave").
function useTilt() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const FLAT = 'perspective(700px) rotateX(0deg) rotateY(0deg)'
    el.style.transform = FLAT
    let pressed = false
    const tiltTo = e => {
      const r = el.getBoundingClientRect()
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -8
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 10
      el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`
    }
    const flat = () => { pressed = false; el.style.transform = FLAT }
    const move = e => { if (e.pointerType === 'mouse' || pressed) tiltTo(e) }
    const down = e => { if (e.pointerType !== 'mouse') { pressed = true; tiltTo(e) } }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerdown', down)
    ;['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, flat))
    window.addEventListener('scroll', flat, true)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerdown', down)
      ;['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.removeEventListener(t, flat))
      window.removeEventListener('scroll', flat, true)
    }
  }, [])
  return ref
}

export function VibeHeader({ firstName, right }) {
  const { cycle } = useBudget()
  return (
    <div className="flex items-center justify-between px-4 pb-3" style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}>
      <div>
        <p style={{ fontSize: 13, color: 'rgb(var(--c-text-2))' }}>
          hey {firstName} 👋{cycle ? ` · day ${cycle.dayOfCycle} of ${cycle.totalDays}` : ''}
        </p>
        <h1 style={{ ...display, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>your money, rn</h1>
      </div>
      {right}
    </div>
  )
}

export function VibeHero() {
  const { totals, cycle } = useBudget()
  const ref = useTilt()
  const committed = totals.spent + totals.fixedDue
  const used = totals.income > 0 ? committed / totals.income : 0
  const left = totals.remaining
  const daysLeft = Math.max(1, cycle?.daysRemaining || 1)
  const deg = Math.min(used, 1) * 360
  const mood = left < 0 ? '😬' : used > 0.85 ? '😅' : '😌'

  return (
    <div className="px-4">
      <div ref={ref} className="clay vibe-hero tilt" style={{ padding: '20px 20px 22px', position: 'relative', overflow: 'hidden' }}>
        <div className="flex items-center gap-4" style={{ position: 'relative', zIndex: 1 }}>
          <div className="vibe-ring" style={{
            background: `conic-gradient(from -90deg, rgb(var(--c-accent)) 0deg, rgb(var(--c-unplanned)) ${deg * 0.45}deg, rgb(var(--c-negative)) ${deg}deg, var(--vibe-track) ${deg}deg 360deg)`,
          }}>
            <span className="vibe-ring-emoji">{mood}</span>
            <span className="vibe-gloss" />
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgb(var(--c-text-2))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>left this cycle</p>
            <p style={{ ...display, fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{R(left)}</p>
            <p style={{ fontSize: 13, color: 'rgb(var(--c-text-2))', marginTop: 6 }}>
              {left < 0
                ? <>you're <b style={{ color: 'rgb(var(--c-negative))' }}>{R(-left)}</b> over, {daysLeft} days to payday</>
                : <>that's <b style={{ color: 'rgb(var(--c-accent))' }}>{R(left / daysLeft)}/day</b> for {daysLeft} days</>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4" style={{ position: 'relative', zIndex: 1 }}>
          <Pill tone="accent">💰 in {R(totals.income)}</Pill>
          <Pill tone="unplanned">⏳ {daysLeft} days to payday</Pill>
          {totals.fixedDue > 0 && <Pill tone="negative">🧾 {Rk(totals.fixedDue)} bills still due</Pill>}
        </div>
      </div>
    </div>
  )
}

function Pill({ tone, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: `rgb(var(--c-${tone}) / 0.14)`, color: `rgb(var(--c-${tone}))`,
    }}>{children}</span>
  )
}

const BLOCKS = [
  { key: 'fixed', label: 'fixed', spent: 'fixedSpent', plan: 'fixedPlanned', grad: 'linear-gradient(145deg,#C9B8FF,#A88BFF)', note: () => 'locked in 🔒' },
  { key: 'predicted', label: 'predicted', spent: 'predictedSpent', plan: 'predictedBudget', grad: 'linear-gradient(145deg,#FFE27A,#FFB36B)', note: (s, p) => (s > p ? 'over 💀' : 'on track') },
  { key: 'unplanned', label: 'unplanned', spent: 'unplannedSpent', plan: 'unplannedBudget', grad: 'linear-gradient(145deg,#9BEBFF,#5CCBFF)', note: (s, p) => (s > p ? 'oops 🫠' : 'chill 🧊') },
]

export function VibeBlocks() {
  const { totals } = useBudget()
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-3 gap-2.5 px-4 mt-3.5">
      {BLOCKS.map(b => {
        const s = totals[b.spent] || 0, p = totals[b.plan] || 0
        return (
          <button key={b.key} onClick={() => navigate('/budget')} className="vibe-block tappable" style={{ background: b.grad, textAlign: 'left' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7 }}>{b.label}</span>
            <span style={{ ...display, display: 'block', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>{Rk(s)}</span>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.75, marginTop: 2 }}>of {Rk(p)} · {b.note(s, p)}</span>
            <span className="vibe-meter"><i style={{ width: `${p > 0 ? Math.min(100, (s / p) * 100) : 0}%` }} /></span>
          </button>
        )
      })}
    </div>
  )
}

const TILE_GRADS = [
  'linear-gradient(145deg,#FFB3D9,#FF5CAB)', 'linear-gradient(145deg,#FFD39B,#FFB36B)', 'linear-gradient(145deg,#D7C9FF,#A88BFF)',
  'linear-gradient(145deg,#FFF3A0,#FFE14D)', 'linear-gradient(145deg,#B8F4FF,#5CCBFF)', 'linear-gradient(145deg,#E5FFB0,#C8FF3D)',
]
const vibe = p => (p >= 150 ? ['absolutely cooked 💀', 'negative']
  : p >= 100 ? ['over the limit 😬', 'warning']
  : p >= 80 ? ['close one 👀', 'unplanned']
  : ['valid, keep going ✅', 'accent'])

export function VibeTiles() {
  const { categories, getCategorySpent } = useBudget()
  const navigate = useNavigate()
  const tiles = categories
    .filter(c => ['predicted', 'unplanned'].includes(normaliseType(c.type)) && parseFloat(c.budget_amount) > 0)
    .map(c => ({ ...c, spent: getCategorySpent(c.id), budget: parseFloat(c.budget_amount) }))
    .filter(c => c.spent > 0)
    .map(c => ({ ...c, pct: (c.spent / c.budget) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8)
  if (!tiles.length) return null

  return (
    <>
      <div className="flex items-baseline justify-between px-4" style={{ margin: '24px 0 10px' }}>
        <h2 style={{ ...display, fontSize: 19, fontWeight: 800 }}>vibe check ✨</h2>
        <span style={{ fontSize: 12, color: 'rgb(var(--c-text-3))' }}>swipe →</span>
      </div>
      <div className="vibe-scroller px-4">
        {tiles.map((t, i) => {
          const [msg, tone] = vibe(t.pct)
          const over = t.pct >= 100
          return (
            <button key={t.id} onClick={() => navigate('/budget')} className="clay vibe-tile tappable" style={{ textAlign: 'left' }}>
              <span className="vibe-icon" style={{ background: TILE_GRADS[i % TILE_GRADS.length] }}>{t.icon || '💳'}</span>
              <span style={{ ...display, display: 'block', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 12,
                color: over ? `rgb(var(--c-${tone}))` : 'rgb(var(--c-text))' }}>{Math.round(t.pct)}%</span>
              <span style={{ display: 'block', fontSize: 13, color: 'rgb(var(--c-text-2))' }}>{t.name}</span>
              <span style={{ display: 'block', fontSize: 11, color: 'rgb(var(--c-text-3))' }}>{Rk(t.spent)} / {Rk(t.budget)}</span>
              <span className="vibe-bar"><i style={{ width: `${Math.min(100, t.pct)}%`,
                background: over ? 'linear-gradient(90deg,#FF8FC6,#FF5CAB)' : 'linear-gradient(90deg,#E2FF8A,#C8FF3D)' }} /></span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: `rgb(var(--c-${tone}))` }}>{msg}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

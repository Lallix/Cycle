import { useEffect, useRef, useState } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { formatMoney } from '../../lib/format'
import { calcDailySafeSpend } from '../../lib/cycle'
import RingProgress from '../ui/RingProgress'

function useCountUp(target, duration = 800, delay = 200) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!target) { setValue(0); return }

    const timer = setTimeout(() => {
      const start = performance.now()
      const startVal = 0

      function tick(now) {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(startVal + target * eased)
        if (progress < 1) rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }, delay)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafRef.current)
    }
  }, [target])

  return value
}

function StatCard({ label, amount, color, delay = 0 }) {
  const animated = useCountUp(Math.abs(amount), 900, delay)

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center py-4"
      style={{ borderRight: '0.5px solid #2A2A2A' }}
    >
      <span style={{
        fontSize: 10,
        fontFamily: 'Inter, sans-serif',
        color: '#717179',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'Poppins, sans-serif',
        fontSize: 14,
        fontWeight: 500,
        color,
        letterSpacing: '-0.01em',
      }}>
        {formatMoney(animated, true)}
      </span>
    </div>
  )
}

export default function HeroCard() {
  const { cycle, totals } = useBudget()

  const dailySafe  = calcDailySafeSpend(totals.remaining, cycle?.daysRemaining || 1)
  const spentPct   = totals.income > 0 ? (totals.spent / totals.income) * 100 : 0
  const isOver     = totals.remaining < 0
  const animatedDS = useCountUp(Math.abs(dailySafe), 900, 300)

  return (
    <div
      className="mx-4 mb-4 overflow-hidden"
      style={{
        background: '#1B1B1B',
        borderRadius: 24,
        border: '0.5px solid #2A2A2A',
      }}
    >
      {/* Ring + daily safe spend */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-3">

        {/* Ring */}
        <RingProgress
          percentage={spentPct}
          daysRemaining={cycle?.daysRemaining || 0}
          daysTotal={cycle?.totalDays || 30}
          isOver={isOver}
          size={140}
          animated
        />

        {/* Right side — daily safe spend */}
        <div className="flex-1 min-w-0">
          <p style={{
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
            color: '#717179',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 4,
          }}>
            Daily safe spend
          </p>

          <div style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: 30,
            fontWeight: 300,
            color: isOver ? '#EF4444' : '#FFD166',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}>
            <span style={{ fontSize: 16, marginRight: 2 }}>R</span>
            {animatedDS.toLocaleString('en-ZA', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          {isOver && (
            <span style={{
              display: 'inline-block',
              marginTop: 4,
              fontSize: 10,
              fontFamily: 'Inter, sans-serif',
              color: '#EF4444',
              background: 'rgba(239,68,68,0.1)',
              padding: '2px 8px',
              borderRadius: 6,
            }}>
              Over budget
            </span>
          )}

          {cycle && (
            <p style={{
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
              color: '#717179',
              marginTop: 8,
            }}>
              {cycle.shortLabel}
            </p>
          )}
        </div>
      </div>

      {/* 3-column stat strip */}
      <div
        style={{ borderTop: '0.5px solid #2A2A2A', display: 'flex' }}
      >
        <StatCard label="Income"  amount={totals.income}    color="#22C55E" delay={100} />
        <StatCard label="Spent"   amount={totals.spent}     color="#EF4444" delay={200} />
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <span style={{
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
            color: '#717179',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 4,
          }}>
            Remaining
          </span>
          <span style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: 14,
            fontWeight: 500,
            color: isOver ? '#EF4444' : '#FFD166',
            letterSpacing: '-0.01em',
          }}>
            {formatMoney(Math.abs(totals.remaining), true)}
          </span>
        </div>
      </div>
    </div>
  )
}

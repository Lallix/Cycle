import { useBudget } from '../../context/BudgetContext'
import { useAuth } from '../../context/AuthContext'
import { formatMoney, getGreeting, getProgressColor } from '../../lib/format'
import { calcDailySafeSpend } from '../../lib/cycle'
import ProgressBar from '../ui/ProgressBar'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function HeroCard() {
  const { cycle, totals } = useBudget()
  const { profile } = useAuth()

  const dailySafe = calcDailySafeSpend(totals.remaining, cycle?.daysRemaining || 1)
  const spentPct = totals.income > 0 ? (totals.spent / totals.income) * 100 : 0
  const isOverBudget = totals.remaining < 0

  return (
    <div className="mx-4 mt-2 rounded-3xl overflow-hidden border border-border shadow-card"
      style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #171717 100%)' }}
    >
      {/* Cycle label */}
      {cycle && (
        <div className="px-5 pt-4 pb-2">
          <span className="text-xs text-muted font-mono">{cycle.label}</span>
        </div>
      )}

      {/* Daily safe spend — the hero number */}
      <div className="px-5 pb-4 flex items-end gap-3">
        <div className="flex-1">
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Daily safe spend</p>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-5xl font-medium leading-none ${isOverBudget ? 'text-danger' : 'text-gold'}`}>
              {formatMoney(Math.abs(dailySafe)).replace('.00', '')}
            </span>
            {isOverBudget && <span className="text-xs text-danger font-medium">over</span>}
          </div>
          <p className="text-xs text-muted mt-1">
            {cycle?.daysRemaining || 0} {cycle?.daysRemaining === 1 ? 'day' : 'days'} remaining in cycle
          </p>
        </div>

        {/* Trend icon */}
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center
          ${isOverBudget ? 'bg-danger/10' : 'bg-success/10'}`}>
          {isOverBudget
            ? <TrendingDown size={20} className="text-danger" />
            : <TrendingUp size={20} className="text-success" />
          }
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-4">
        <ProgressBar value={totals.spent} max={totals.income} size="md" />
      </div>

      {/* 3-column summary */}
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        <SummaryCell label="Income" amount={totals.income} color="#3DD598" />
        <SummaryCell label="Spent" amount={totals.spent} color="#FF6B6B" />
        <SummaryCell label="Left" amount={totals.remaining} color={isOverBudget ? '#FF6B6B' : '#D4AF37'} />
      </div>
    </div>
  )
}

function SummaryCell({ label, amount, color }) {
  return (
    <div className="flex flex-col items-center py-3 gap-0.5">
      <span className="text-2xs uppercase tracking-widest text-muted">{label}</span>
      <span className="font-mono text-sm font-medium" style={{ color }}>
        {formatMoney(Math.abs(amount), true)}
        {amount < 0 ? ' -' : ''}
      </span>
    </div>
  )
}

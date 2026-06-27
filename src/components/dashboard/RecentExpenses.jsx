import { useBudget } from '../../context/BudgetContext'
import { formatMoney, formatRelativeDate, getAccountConfig } from '../../lib/format'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../ui/EmptyState'

export default function RecentExpenses() {
  const { transactions } = useBudget()
  const navigate = useNavigate()

  const recent = transactions.slice(0, 5)

  return (
    <div className="mt-5 px-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-label">Recent</h2>
        <button
          onClick={() => navigate('/expenses')}
          className="text-xs text-gold active:opacity-70 transition-opacity"
        >
          See all →
        </button>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          icon="💳"
          title="No expenses yet"
          description="Tap + to record your first expense"
        />
      ) : (
        <div className="bg-bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {recent.map(tx => {
            const acc = getAccountConfig(tx.account)
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-4 py-3.5 tappable"
                onClick={() => navigate('/expenses')}
              >
                {/* Category icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: `${tx.cycle_cycle_categories?.colour || '#888'}22` }}
                >
                  {tx.cycle_categories?.icon || '💳'}
                </div>

                {/* Description + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{tx.description}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-2xs text-muted">{formatRelativeDate(tx.date)}</span>
                    <span className="text-2xs text-muted">·</span>
                    <span className="text-2xs px-1.5 py-0.5 rounded-md"
                      style={{ color: acc.color, backgroundColor: acc.bg, fontSize: '0.6rem' }}
                    >
                      {tx.account}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <span className="font-mono text-sm font-medium text-text-primary flex-shrink-0">
                  -{formatMoney(tx.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

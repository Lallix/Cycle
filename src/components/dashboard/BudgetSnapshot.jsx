import { useBudget } from '../../context/BudgetContext'
import { formatMoney } from '../../lib/format'
import ProgressBar from '../ui/ProgressBar'
import { useNavigate } from 'react-router-dom'

export default function BudgetSnapshot() {
  const { categories, getCategorySpent } = useBudget()
  const navigate = useNavigate()

  // Get top budgeted variable categories, sorted by spend %
  const budgeted = categories
    .filter(c => c.budget_amount != null && c.type === 'variable')
    .map(c => {
      const spent = getCategorySpent(c.id)
      const pct = (spent / parseFloat(c.budget_amount)) * 100
      return { ...c, spent, pct }
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4)

  if (!budgeted.length) return null

  return (
    <div className="mt-5 px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-label">Budget</h2>
        <button
          onClick={() => navigate('/budget')}
          className="text-xs text-gold active:opacity-70 transition-opacity"
        >
          View all →
        </button>
      </div>

      <div className="bg-bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {budgeted.map((cat, idx) => (
          <div key={cat.id} className="px-4 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{cat.icon}</span>
                <span className="text-sm font-medium text-text-primary">{cat.name}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs text-muted">
                  {formatMoney(cat.spent, 'ZAR', true)}&nbsp;
                </span>
                <span className="font-mono text-xs text-muted">/</span>
                <span className="font-mono text-xs text-text-secondary">
                  &nbsp;{formatMoney(cat.budget_amount, 'ZAR', true)}
                </span>
              </div>
            </div>
            <ProgressBar value={cat.spent} max={parseFloat(cat.budget_amount)} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

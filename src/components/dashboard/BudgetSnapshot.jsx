import { useBudget } from '../../context/BudgetContext'
import { formatMoney } from '../../lib/format'
import ProgressBar from '../ui/ProgressBar'
import { useNavigate } from 'react-router-dom'
import { isLimitType } from '../../lib/spend'

export default function BudgetSnapshot() {
  const { categories, getCategorySpent } = useBudget()
  const navigate = useNavigate()

  const budgeted = categories
    .filter(c => c.budget_amount != null && isLimitType(c.type))
    .map(c => {
      const spent = getCategorySpent(c.id)
      const pct   = (spent / parseFloat(c.budget_amount)) * 100
      return { ...c, spent, pct }
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4)

  if (!budgeted.length) return null

  return (
    <div style={{ margin: '0 16px', paddingBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#8B8B93', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Budget
        </p>
        <button
          onClick={() => navigate('/budget')}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#E8C36A', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View all →
        </button>
      </div>

      {/* Ivory card */}
      <div style={{ background: '#17171A', borderRadius: 16, border: '0.5px solid #26262B', overflow: 'hidden' }}>
        {budgeted.map((cat, i) => {
          const isOver = cat.pct >= 100
          return (
            <div
              key={cat.id}
              style={{ padding: '13px 16px', borderBottom: i < budgeted.length - 1 ? '0.5px solid #26262B' : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{cat.icon}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: '#F4F4F5' }}>
                    {cat.name}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: isOver ? '#F07A6A' : '#A1A1AA' }}>
                    {formatMoney(cat.spent, true)}
                  </span>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#8B8B93' }}>
                    {' '}/ {formatMoney(cat.budget_amount, true)}
                  </span>
                </div>
              </div>
              <ProgressBar value={cat.spent} max={parseFloat(cat.budget_amount)} size="sm" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

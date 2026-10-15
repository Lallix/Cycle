import { useBudget } from '../../context/BudgetContext'
import { formatMoney, getAccountConfig } from '../../lib/format'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

export default function RecentExpenses() {
  const { transactions } = useBudget()
  const navigate = useNavigate()
  const recent = transactions.slice(0, 5)

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#8B8B93', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Recent
        </p>
        <button
          onClick={() => navigate('/expenses')}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#E8C36A', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          See all →
        </button>
      </div>

      {recent.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>💳</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8B8B93' }}>No expenses yet</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#5A5A62', marginTop: 4 }}>Tap + to record your first expense</p>
        </div>
      ) : (
        <div style={{ background: '#17171A', borderRadius: 16, border: '0.5px solid #26262B', overflow: 'hidden' }}>
          {recent.map((tx, i) => {
            const cat    = tx.cycle_categories || tx.categories || null
            const acc    = getAccountConfig(tx.account)
            const name   = cat?.name   || (tx.category_id ? 'Category' : 'Unbudgeted')
            const icon   = cat?.icon   || '💳'
            const colour = cat?.colour || '#888'

            return (
              <div
                key={tx.id}
                onClick={() => navigate('/expenses')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < recent.length - 1 ? '0.5px solid #26262B' : 'none',
                  cursor: 'pointer',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, background: `${colour}18`,
                }}>
                  {icon}
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500,
                    color: '#F4F4F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    {tx.transaction_date && (
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#A1A1AA' }}>
                        {format(new Date(tx.transaction_date), 'd MMM')}
                      </span>
                    )}
                    <span style={{ color: '#8B8B93', fontSize: 11 }}>·</span>
                    {tx.account && (
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 500,
                        color: acc.color, background: acc.bg, fontFamily: 'Inter, sans-serif',
                      }}>
                        {acc.label}
                      </span>
                    )}
                    {tx.notes && (
                      <span style={{
                        fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#A1A1AA',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80,
                      }}>
                        {tx.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <span style={{
                  fontFamily: 'Poppins, sans-serif', fontSize: 14, fontWeight: 500,
                  color: tx.direction === 'in' ? '#5BC98B' : '#F07A6A', flexShrink: 0, letterSpacing: '-0.01em',
                }}>
                  {tx.direction === 'in' ? '+' : '-'}{formatMoney(tx.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

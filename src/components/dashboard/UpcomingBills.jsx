import { useBudget } from '../../context/BudgetContext'
import { getUpcomingDays } from '../../lib/cycle'
import { formatMoney, getAccountConfig } from '../../lib/format'
import { useToast } from '../ui/Toast'
import { CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function UpcomingBills() {
  const { recurringExpenses, cycle, toggleRecurringPaid, isRecurringPaid } = useBudget()
  const toast = useToast()

  const upcoming = getUpcomingDays(recurringExpenses, cycle, 7)
  if (!upcoming.length) return null

  async function handleToggle(expense) {
    try {
      await toggleRecurringPaid(expense.id)
      toast(isRecurringPaid(expense.id) ? 'Marked as unpaid' : 'Marked as paid ✓', 'success')
    } catch {
      toast('Failed to update', 'error')
    }
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 16px', marginBottom: 10 }}>
        Due Soon
      </p>

      <div style={{ display: 'flex', gap: 10, padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {upcoming.map(exp => {
          const acc       = getAccountConfig(exp.account)
          const paid      = isRecurringPaid(exp.id)
          const isToday   = exp.daysUntil === 0
          const isTomorrow = exp.daysUntil === 1

          return (
            <button
              key={exp.id}
              onClick={() => handleToggle(exp)}
              style={{
                flexShrink: 0, minWidth: 130,
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: '12px 14px',
                borderRadius: 14,
                border: `0.5px solid ${paid ? 'rgb(var(--c-positive) / 0.25)' : 'rgb(var(--c-border))'}`,
                background: paid ? 'rgb(var(--c-positive) / 0.05)' : 'rgb(var(--c-surface))',
                opacity: paid ? 0.7 : 1,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Due label + icon */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600,
                  color: isToday ? 'rgb(var(--c-negative))' : isTomorrow ? 'rgb(var(--c-unplanned))' : 'rgb(var(--c-text-3))',
                }}>
                  {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(exp.dueDate, 'd MMM')}
                </span>
                {paid
                  ? <CheckCircle size={13} color="rgb(var(--c-positive))" />
                  : <Clock size={13} color="rgb(var(--c-text-3))" />
                }
              </div>

              {/* Name */}
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: 'rgb(var(--c-text))', lineHeight: 1.3 }}>
                {exp.name}
              </p>

              {/* Amount + account */}
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'rgb(var(--c-text))', marginBottom: 4 }}>
                  {formatMoney(exp.amount)}
                </p>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 500,
                  padding: '2px 6px', borderRadius: 4,
                  color: acc.color, background: acc.bg,
                }}>
                  {exp.account}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

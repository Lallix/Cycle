import { useBudget } from '../../context/BudgetContext'
import { getUpcomingDays } from '../../lib/cycle'
import { formatMoney, formatOrdinal, getAccountConfig } from '../../lib/format'
import { useToast } from '../ui/Toast'
import { CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function UpcomingBills() {
  const { recurringExpenses, cycle, toggleRecurringPaid } = useBudget()
  const toast = useToast()

  const upcoming = getUpcomingDays(recurringExpenses, cycle, 7)

  if (!upcoming.length) return null

  async function handleToggle(expense) {
    try {
      await toggleRecurringPaid(expense.id)
      toast(expense.paid_this_cycle ? 'Marked as unpaid' : 'Marked as paid ✓', 'success')
    } catch (err) {
      toast('Failed to update', 'error')
    }
  }

  return (
    <div className="mt-5">
      <div className="px-4 mb-3">
        <h2 className="section-label">Due Soon</h2>
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {upcoming.map(exp => {
          const acc = getAccountConfig(exp.account)
          const isToday = exp.daysUntil === 0
          const isTomorrow = exp.daysUntil === 1

          return (
            <button
              key={exp.id}
              onClick={() => handleToggle(exp)}
              className={`
                flex-shrink-0 flex flex-col gap-2.5 p-3.5 rounded-2xl border min-w-[130px]
                transition-all duration-150 active:scale-95 text-left
                ${exp.paid_this_cycle
                  ? 'bg-bg-elevated border-success/30 opacity-60'
                  : 'bg-bg-card border-border'
                }
              `}
            >
              {/* Due label */}
              <div className="flex items-center justify-between gap-1">
                <span className={`text-2xs font-medium ${
                  isToday ? 'text-danger' : isTomorrow ? 'text-warning' : 'text-muted'
                }`}>
                  {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(exp.dueDate, 'd MMM')}
                </span>
                {exp.paid_this_cycle
                  ? <CheckCircle size={14} className="text-success" />
                  : <Clock size={14} className="text-muted" />
                }
              </div>

              {/* Name */}
              <p className="text-xs font-medium text-text-primary leading-tight">{exp.description}</p>

              {/* Amount + account */}
              <div>
                <p className="font-mono text-sm font-medium text-text-primary">
                  {formatMoney(exp.amount)}
                </p>
                <span className="text-2xs px-1.5 py-0.5 rounded-md font-medium"
                  style={{ color: acc.color, backgroundColor: acc.bg }}
                >
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

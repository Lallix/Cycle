import { useState } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney, getAccountConfig, formatOrdinal } from '../../lib/format'
import { CheckCircle, Circle } from 'lucide-react'

export default function FixedExpenseRow({ expense }) {
  const { toggleRecurringPaid, isRecurringPaid } = useBudget()
  const toast = useToast()
  const [toggling, setToggling] = useState(false)

  const acc = getAccountConfig(expense.account)
  const isPaid = isRecurringPaid(expense.id)

  async function handleToggle() {
    if (toggling) return
    setToggling(true)
    try {
      await toggleRecurringPaid(expense.id)
      toast(isPaid ? 'Marked as unpaid' : 'Marked as paid ✓', 'success')
    } catch {
      toast('Failed to update', 'error')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 tappable transition-all duration-200
        ${isPaid ? 'opacity-60' : ''}`}
      onClick={handleToggle}
    >
      {/* Status icon */}
      <div className="flex-shrink-0">
        {isPaid
          ? <CheckCircle size={22} className="text-success" />
          : <Circle size={22} className="text-warning" />
        }
      </div>

      {/* Category icon */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
        style={{ backgroundColor: `${expense.cycle_cycle_categories?.colour || '#607D8B'}22` }}
      >
        {expense.cycle_categories?.icon || '🔒'}
      </div>

      {/* Name + due date */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isPaid ? 'line-through text-muted' : 'text-text-primary'}`}>
          {expense.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-2xs text-muted">Due {formatOrdinal(expense.due_day)}</span>
          <span className="text-2xs text-muted">·</span>
          <span className="text-2xs px-1.5 py-0.5 rounded-md"
            style={{ color: acc.color, backgroundColor: acc.bg, fontSize: '0.6rem' }}
          >
            {expense.account}
          </span>
        </div>
      </div>

      {/* Amount */}
      <span className={`font-mono text-sm font-medium flex-shrink-0
        ${isPaid ? 'text-success line-through' : 'text-text-primary'}`}>
        {formatMoney(expense.amount)}
      </span>
    </div>
  )
}

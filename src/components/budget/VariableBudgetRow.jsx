import { useState } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { formatMoney, getProgressColor } from '../../lib/format'
import ProgressBar from '../ui/ProgressBar'
import BottomSheet from '../ui/BottomSheet'
import ExpenseItem from '../expenses/ExpenseItem'
import AddExpenseSheet from '../expenses/AddExpenseSheet'
import { Plus } from 'lucide-react'
import EmptyState from '../ui/EmptyState'

export default function VariableBudgetRow({ category }) {
  const { getCategorySpent, transactions, deleteTransaction } = useBudget()
  const [showDetail, setShowDetail] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const spent = getCategorySpent(category.id)
  const budget = parseFloat(category.budget_amount || 0)
  const remaining = budget - spent
  const pct = budget > 0 ? (spent / budget) * 100 : 0
  const isOver = remaining < 0

  const catTransactions = transactions.filter(t => t.category_id === category.id)

  const statusColor = getProgressColor(pct)

  async function handleDelete(id) {
    try {
      await deleteTransaction(id)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <>
      <div
        className="px-4 py-3.5 tappable"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-center gap-3 mb-2.5">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${category.colour}22` }}
          >
            {category.icon}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">{category.name}</p>
          </div>

          {/* Amounts */}
          <div className="text-right flex-shrink-0">
            <span className="font-mono text-sm font-medium" style={{ color: statusColor }}>
              {formatMoney(spent, 'ZAR', true)}
            </span>
            <span className="font-mono text-xs text-muted"> / {formatMoney(budget, 'ZAR', true)}</span>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar value={spent} max={budget} size="sm" />

        {/* Remaining */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-2xs text-muted">
            {isOver
              ? <span className="text-danger">Over by {formatMoney(Math.abs(remaining), 'ZAR', true)}</span>
              : <span className="text-muted">{formatMoney(remaining, 'ZAR', true)} remaining</span>
            }
          </span>
          <span className="text-2xs text-muted font-mono">{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Detail sheet */}
      <BottomSheet
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title={`${category.icon} ${category.name}`}
      >
        <div className="pb-safe">
          {/* Summary bar */}
          <div className="mx-5 mb-4 bg-bg-elevated rounded-2xl p-4 border border-border">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-muted">Spent</span>
              <span className="font-mono text-xs text-muted">Budget</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="font-mono text-xl font-medium" style={{ color: statusColor }}>
                {formatMoney(spent)}
              </span>
              <span className="font-mono text-xl font-medium text-text-secondary">
                {formatMoney(budget)}
              </span>
            </div>
            <ProgressBar value={spent} max={budget} size="md" />
          </div>

          {/* Add expense button */}
          <div className="px-5 mb-4">
            <button
              onClick={() => { setShowDetail(false); setTimeout(() => setShowAdd(true), 200) }}
              className="flex items-center gap-2 w-full py-3 rounded-xl border border-gold/30 bg-gold/5 text-gold text-sm font-medium tappable justify-center"
            >
              <Plus size={16} />
              Add Expense
            </button>
          </div>

          {/* Transactions */}
          {catTransactions.length === 0 ? (
            <EmptyState
              icon={category.icon}
              title="No expenses yet"
              description="Tap 'Add Expense' to record spending in this category"
            />
          ) : (
            <div className="divide-y divide-border">
              {catTransactions.map(tx => (
                <ExpenseItem
                  key={tx.id}
                  transaction={tx}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Add expense sheet pre-filled with this category */}
      <AddExpenseSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        prefillCategory={category.id}
      />
    </>
  )
}

import { useState } from 'react'
import { useBudget } from '../context/BudgetContext'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ui/Toast'
import { formatMoney } from '../lib/format'
import Button from '../components/ui/Button'
import BottomSheet from '../components/ui/BottomSheet'
import FixedExpenseRow from '../components/budget/FixedExpenseRow'
import VariableBudgetRow from '../components/budget/VariableBudgetRow'
import { Plus, ArrowLeft } from 'lucide-react'
import AccountPicker from '../components/ui/AccountPicker'
import { isLimitType } from '../lib/spend'

const BLANK_FIXED = { name: '', amount: '', account: 'Capitec', due_day: '1' }

export default function BudgetPage() {
  const { categories, recurringExpenses, totals, addRecurringExpense } = useBudget()
  const navigate = useNavigate()
  const toast = useToast()

  const [fixedOpen, setFixedOpen]   = useState(false)
  const [fixedForm, setFixedForm]   = useState(BLANK_FIXED)
  const [saving, setSaving]         = useState(false)

  const variableCategories = categories.filter(c => isLimitType(c.type))
  const unbudgetedSpent    = totals.unbudgetedSpent || 0

  async function handleAddFixed() {
    if (!fixedForm.name.trim() || !fixedForm.amount) {
      toast('Name and amount are required', 'error')
      return
    }
    setSaving(true)
    try {
      await addRecurringExpense({
        name:    fixedForm.name.trim(),
        amount:  parseFloat(fixedForm.amount),
        account: fixedForm.account,
        due_day: parseInt(fixedForm.due_day, 10),
      })
      toast('Fixed expense added', 'success')
      setFixedOpen(false)
      setFixedForm(BLANK_FIXED)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="pb-28">
      {/* Header with back button */}
      <div
        className="flex items-center gap-3 px-4 pb-2"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-2xl border border-border tappable"
          style={{ background: '#17171A' }}
        >
          <ArrowLeft size={18} className="text-subtle" />
        </button>
        <div>
          <h1 className="heading text-lg text-fg">Budget</h1>
          <p className="text-xs text-subtle" style={{ fontFamily: 'Inter, sans-serif' }}>
            Cycle total · {formatMoney(totals.income)}
          </p>
        </div>
      </div>

      <div className="px-4 space-y-6">

        {/* Payday review */}
        <button
          onClick={() => navigate('/review')}
          className="w-full flex items-center justify-between px-4 py-3 border border-border rounded-2xl tappable"
          style={{ background: '#17171A' }}
        >
          <span className="text-sm text-fg" style={{ fontFamily: 'Inter, sans-serif' }}>Review last cycle and set limits</span>
          <span className="text-xs text-gold">Open →</span>
        </button>

        {/* Fixed Expenses */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted uppercase tracking-widest">Fixed bills</p>
            <button
              onClick={() => { setFixedForm(BLANK_FIXED); setFixedOpen(true) }}
              className="flex items-center gap-1 text-xs text-gold hover:opacity-80"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {recurringExpenses.length === 0 && (
              <p className="text-sm text-muted px-4 py-4">No fixed expenses yet</p>
            )}
            {recurringExpenses.map(exp => (
              <FixedExpenseRow key={exp.id} expense={exp} />
            ))}
          </div>

          <div className="flex justify-between text-sm mt-2 px-1">
            <span className="text-muted">Fixed this cycle (paid + still due)</span>
            <span className="font-mono font-medium">{formatMoney(totals.fixedTotal)}</span>
          </div>
        </section>

        {/* Variable Budget */}
        <section>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Predicted — monthly limits</p>
          <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {variableCategories.length === 0 && (
              <p className="text-sm text-muted px-4 py-4">Add categories in Settings</p>
            )}
            {variableCategories.map(cat => (
              <VariableBudgetRow key={cat.id} category={cat} />
            ))}
          </div>

          <div className="flex justify-between text-sm mt-2 px-1">
            <span className="text-muted">Predicted total</span>
            <span className="font-mono font-medium">{formatMoney(totals.variableSpent)} / {formatMoney(totals.variableBudget)}</span>
          </div>
        </section>

        {/* Unbudgeted */}
        {unbudgetedSpent > 0 && (
          <section>
            <p className="text-xs text-muted uppercase tracking-widest mb-2">Unplanned</p>
            <div className="bg-surface-1 border border-border rounded-2xl px-4 py-3 flex justify-between">
              <span className="text-sm text-muted">Unplanned spend this cycle</span>
              <span className="font-mono text-sm text-warning">{formatMoney(unbudgetedSpent)}</span>
            </div>
          </section>
        )}

        {/* Summary */}
        <section>
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Summary</p>
          <div className="bg-surface-1 border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {[
              { label: 'Income', value: totals.income, color: 'text-success' },
              { label: 'Fixed (paid + still due)', value: -totals.fixedTotal, color: 'text-fg' },
              { label: 'Predicted spend', value: -totals.variableSpent, color: 'text-fg' },
              { label: 'Unplanned spend', value: -totals.unbudgetedSpent, color: 'text-fg' },
              { label: 'Left', value: totals.remaining, color: totals.remaining >= 0 ? 'text-success' : 'text-danger' },
            ].map(row => (
              <div key={row.label} className="flex justify-between px-4 py-3 text-sm">
                <span className="text-muted">{row.label}</span>
                <span className={`font-mono font-medium ${row.color}`}>{formatMoney(row.value)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Add Fixed Expense Sheet */}
      <BottomSheet open={fixedOpen} onClose={() => setFixedOpen(false)} title="Add Fixed Expense">
        <div className="px-5 space-y-4 pb-8">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Name</label>
            <input
              type="text"
              value={fixedForm.name}
              onChange={e => setFixedForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Rent"
              className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Amount</label>
            <div className="flex items-center gap-2 bg-surface-1 border border-border rounded-xl px-4 py-3">
              <span className="text-muted font-mono">R</span>
              <input
                type="number"
                inputMode="decimal"
                value={fixedForm.amount}
                onChange={e => setFixedForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="flex-1 bg-transparent font-mono text-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Due Day</label>
            <select
              value={fixedForm.due_day}
              onChange={e => setFixedForm(f => ({ ...f, due_day: e.target.value }))}
              className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 text-sm"
              style={{ colorScheme: 'dark' }}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Account</label>
            <AccountPicker value={fixedForm.account} onChange={(val) => setFixedForm(f => ({ ...f, account: val }))} />
          </div>

          <Button variant="primary" size="lg" onClick={handleAddFixed} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Add Fixed Expense'}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}

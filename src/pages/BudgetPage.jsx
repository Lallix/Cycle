import { useState } from 'react'
import { useBudget } from '../context/BudgetContext'
import { formatMoney } from '../lib/format'
import PageHeader from '../components/ui/PageHeader'
import FixedExpenseRow from '../components/budget/FixedExpenseRow'
import VariableBudgetRow from '../components/budget/VariableBudgetRow'
import LoadingScreen from '../components/ui/LoadingScreen'
import EmptyState from '../components/ui/EmptyState'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { Plus } from 'lucide-react'

const ACCOUNTS = ['Capitec', 'FNB', 'Cash']

export default function BudgetPage() {
  const { loading, recurringExpenses, categories, totals, addRecurring } = useBudget()
  const toast = useToast()

  const [addFixedOpen, setAddFixedOpen] = useState(false)
  const [fixedForm, setFixedForm] = useState({ description: '', amount: '', due_day: '1', account: 'FNB' })
  const [savingFixed, setSavingFixed] = useState(false)

  if (loading) return <LoadingScreen />

  const fixedExpenses = recurringExpenses.filter(e => e.active)
  const fixedPaid = fixedExpenses.filter(e => isRecurringPaid(e.id))
  const fixedUnpaid = fixedExpenses.filter(e => !isRecurringPaid(e.id))

  const variableCategories = categories.filter(c => c.type === 'variable' && c.budget_amount != null)
  const unbudgetedCategories = categories.filter(c => c.type === 'variable' && c.budget_amount == null)

  const unbudgetedSpent = totals.unbudgetedSpent

  async function handleAddFixed() {
    if (!fixedForm.description || !fixedForm.amount) return
    setSavingFixed(true)
    try {
      await addRecurring({
        description: fixedForm.description,
        amount: parseFloat(fixedForm.amount),
        due_day: parseInt(fixedForm.due_day),
        account: fixedForm.account,
      })
      toast('Recurring expense added ✓', 'success')
      setAddFixedOpen(false)
      setFixedForm({ description: '', amount: '', due_day: '1', account: 'FNB' })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSavingFixed(false)
    }
  }

  return (
    <div className="min-h-full bg-bg animate-fade-in"
      style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom) + 1rem)' }}
    >
      <PageHeader
        title="Budget"
        subtitle={`Cycle overview`}
        action={
          <button
            onClick={() => setAddFixedOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg-elevated border border-border tappable"
          >
            <Plus size={18} className="text-gold" />
          </button>
        }
      />

      {/* ── SECTION 1: Fixed Expenses ── */}
      <div className="px-4 mb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label">Fixed Expenses</h2>
          <div className="text-right">
            <span className="font-mono text-xs text-success">{formatMoney(totals.fixedPaid, 'ZAR', true)} paid</span>
            <span className="font-mono text-xs text-muted"> / {formatMoney(totals.fixedTotal, 'ZAR', true)}</span>
          </div>
        </div>

        <div className="bg-bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {fixedExpenses.length === 0 ? (
            <EmptyState
              icon="🔒"
              title="No fixed expenses"
              description="Tap + to add recurring bills"
            />
          ) : (
            fixedExpenses.map(exp => (
              <FixedExpenseRow key={exp.id} expense={exp} />
            ))
          )}
        </div>
      </div>

      {/* ── SECTION 2: Variable Budgets ── */}
      <div className="px-4 mt-5 mb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label">Variable Budgets</h2>
          <div className="text-right">
            <span className="font-mono text-xs text-warning">{formatMoney(totals.variableSpent, 'ZAR', true)} spent</span>
            <span className="font-mono text-xs text-muted"> / {formatMoney(totals.variableBudget, 'ZAR', true)}</span>
          </div>
        </div>

        <div className="bg-bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {variableCategories.length === 0 ? (
            <EmptyState icon="📊" title="No budget categories" description="Set up budget categories in Settings" />
          ) : (
            variableCategories.map(cat => (
              <VariableBudgetRow key={cat.id} category={cat} />
            ))
          )}
        </div>
      </div>

      {/* ── SECTION 3: Grand Summary ── */}
      <div className="px-4 mt-5">
        <h2 className="section-label">Cycle Summary</h2>
        <div className="bg-bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          <SummaryRow label="Total Fixed" value={totals.fixedTotal} />
          <SummaryRow label="Fixed Paid" value={totals.fixedPaid} color="#3DD598" />
          <SummaryRow label="Fixed Still to Pay" value={totals.fixedUnpaid} color="#FFB347" />
          <SummaryRow label="Variable Budget" value={totals.variableBudget} />
          <SummaryRow label="Variable Spent" value={totals.variableSpent} color="#FFB347" />
          <SummaryRow label="Unbudgeted Spend" value={unbudgetedSpent} />
          <div className="px-4 py-4 flex items-center justify-between bg-gold/5">
            <span className="text-sm font-semibold text-text-primary">Total Committed</span>
            <span className="font-mono text-sm font-semibold text-gold">
              {formatMoney(totals.spent)}
            </span>
          </div>
          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">Remaining</span>
            <span className={`font-mono text-sm font-semibold ${totals.remaining < 0 ? 'text-danger' : 'text-success'}`}>
              {formatMoney(totals.remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Add Fixed Expense Sheet */}
      <BottomSheet open={addFixedOpen} onClose={() => setAddFixedOpen(false)} title="Add Fixed Expense">
        <div className="px-5 pb-8 space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Description</label>
            <input
              type="text"
              placeholder="e.g. Internet, Gym, Insurance"
              value={fixedForm.description}
              onChange={e => setFixedForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Amount</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="R0.00"
              value={fixedForm.amount}
              onChange={e => setFixedForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Due Day</label>
            <select
              value={fixedForm.due_day}
              onChange={e => setFixedForm(f => ({ ...f, due_day: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-gold transition-all"
              style={{ colorScheme: 'dark' }}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Account</label>
            <div className="flex gap-2">
              {ACCOUNTS.map(acc => (
                <button
                  key={acc}
                  onClick={() => setFixedForm(f => ({ ...f, account: acc }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-95
                    ${fixedForm.account === acc ? 'bg-gold/10 border-gold/40 text-gold' : 'bg-bg-elevated border-border text-muted'}`}
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleAddFixed} loading={savingFixed} fullWidth size="lg" className="mt-2">
            Add Fixed Expense
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}

function SummaryRow({ label, value, color }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="font-mono text-sm font-medium" style={{ color: color || '#F5F5F5' }}>
        {formatMoney(value)}
      </span>
    </div>
  )
}

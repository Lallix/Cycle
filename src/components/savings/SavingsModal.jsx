import { useState } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney } from '../../lib/format'
import BottomSheet from '../ui/BottomSheet'
import Button from '../ui/Button'
import ProgressBar from '../ui/ProgressBar'
import { Plus, Target, ChevronRight } from 'lucide-react'
import EmptyState from '../ui/EmptyState'
import { format, differenceInDays } from 'date-fns'

export default function SavingsModal({ open, onClose }) {
  const { savingGoals, addSavingGoal, addSavingTransaction, totals } = useBudget()
  const toast = useToast()

  const [view, setView] = useState('list') // 'list' | 'add' | 'contribute'
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [loading, setLoading] = useState(false)

  // Add goal form
  const [goalForm, setGoalForm] = useState({ name: '', icon: '🎯', target: '', monthly: '', targetDate: '', })
  // Contribute form
  const [contributeAmount, setContributeAmount] = useState('')

  function resetForms() {
    setGoalForm({ name: '', icon: '🎯', target: '', monthly: '', targetDate: '' })
    setContributeAmount('')
    setSelectedGoal(null)
    setView('list')
  }

  async function handleAddGoal() {
    if (!goalForm.name || !goalForm.target) return
    setLoading(true)
    try {
      await addSavingGoal({
        name: goalForm.name,
        icon: goalForm.icon,
        target_amount: parseFloat(goalForm.target),
        monthly_contribution: parseFloat(goalForm.monthly || 0),
        target_date: goalForm.targetDate || null,
      })
      toast('Savings goal created ✓', 'success')
      resetForms()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleContribute() {
    if (!selectedGoal || !contributeAmount) return
    setLoading(true)
    try {
      await addSavingTransaction(selectedGoal.id, parseFloat(contributeAmount))
      toast(`Added ${formatMoney(contributeAmount)} to ${selectedGoal.name} ✓`, 'success')
      resetForms()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const ICONS = ['🎯', '🏠', '✈️', '🚗', '💍', '📱', '🎓', '🏖️', '💰', '🌍', '🏋️', '🎸']

  return (
    <BottomSheet
      open={open}
      onClose={() => { resetForms(); onClose() }}
      title={view === 'list' ? 'Savings Goals' : view === 'add' ? 'New Goal' : `Contribute to ${selectedGoal?.name}`}
    >
      <div className="px-5 pb-8">
        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            {/* Total savings */}
            <div className="bg-bg-elevated rounded-2xl border border-border p-4 mb-5">
              <p className="text-xs text-muted mb-1">Total Savings</p>
              <p className="font-mono text-3xl font-medium text-gold">
                {formatMoney(totals.savingsTotal)}
              </p>
            </div>

            {savingGoals.length === 0 ? (
              <EmptyState
                icon="🎯"
                title="No savings goals yet"
                description="Create your first goal to start tracking progress"
              />
            ) : (
              <div className="space-y-3 mb-5">
                {savingGoals.map(goal => {
                  const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
                  const daysLeft = goal.target_date
                    ? differenceInDays(new Date(goal.target_date), new Date())
                    : null

                  return (
                    <button
                      key={goal.id}
                      className="w-full bg-bg-card rounded-2xl border border-border p-4 text-left tappable"
                      onClick={() => { setSelectedGoal(goal); setView('contribute') }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{goal.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-text-primary">{goal.name}</p>
                          {daysLeft !== null && (
                            <p className="text-xs text-muted">{daysLeft > 0 ? `${daysLeft} days left` : 'Past target date'}</p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </div>

                      <ProgressBar value={goal.current_amount} max={goal.target_amount} size="md" colorOverride="#D4AF37" />

                      <div className="flex justify-between mt-2">
                        <span className="font-mono text-xs text-gold">{formatMoney(goal.current_amount)}</span>
                        <span className="font-mono text-xs text-muted">{formatMoney(goal.target_amount)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <Button
              onClick={() => setView('add')}
              variant="outline"
              fullWidth
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              New Goal
            </Button>
          </>
        )}

        {/* ADD GOAL VIEW */}
        {view === 'add' && (
          <div className="space-y-4">
            {/* Icon picker */}
            <div>
              <label className="text-xs text-muted uppercase tracking-widest block mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setGoalForm(f => ({ ...f, icon }))}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border transition-all active:scale-95
                      ${goalForm.icon === icon ? 'border-gold bg-gold/10' : 'border-border bg-bg-elevated'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-widest block mb-2">Goal Name</label>
              <input
                type="text"
                placeholder="Emergency fund, Holiday, etc."
                value={goalForm.name}
                onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all"
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-widest block mb-2">Target Amount</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="R0.00"
                value={goalForm.target}
                onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-widest block mb-2">Monthly Contribution</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="R0.00 (optional)"
                value={goalForm.monthly}
                onChange={e => setGoalForm(f => ({ ...f, monthly: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-widest block mb-2">Target Date (optional)</label>
              <input
                type="date"
                value={goalForm.targetDate}
                onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))}
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-gold transition-all font-mono"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setView('list')} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddGoal} loading={loading} className="flex-1">
                Create Goal
              </Button>
            </div>
          </div>
        )}

        {/* CONTRIBUTE VIEW */}
        {view === 'contribute' && selectedGoal && (
          <div className="space-y-4">
            {/* Goal summary */}
            <div className="bg-bg-elevated rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{selectedGoal.icon}</span>
                <div>
                  <p className="font-semibold text-text-primary">{selectedGoal.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {formatMoney(selectedGoal.current_amount)} / {formatMoney(selectedGoal.target_amount)}
                  </p>
                </div>
              </div>
              <ProgressBar
                value={selectedGoal.current_amount}
                max={selectedGoal.target_amount}
                size="md"
                colorOverride="#D4AF37"
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-widest block mb-2">Amount to Add</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="R0.00"
                value={contributeAmount}
                onChange={e => setContributeAmount(e.target.value)}
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all font-mono text-lg"
                autoFocus
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2">
              {[100, 250, 500, 1000].map(q => (
                <button
                  key={q}
                  onClick={() => setContributeAmount(String(q))}
                  className="quick-amount"
                >
                  R{q}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setView('list')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleContribute} loading={loading} className="flex-1">
                Add Funds
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

import { useState } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney, getAccountConfig, formatOrdinal } from '../../lib/format'
import { CheckCircle, Circle, Pencil, Trash2, RefreshCw } from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'
import AccountPicker from '../ui/AccountPicker'
import Button from '../ui/Button'

export default function FixedExpenseRow({ expense }) {
  const { toggleRecurringPaid, isRecurringPaid, updateRecurringExpense, deleteRecurringExpense } = useBudget()
  const toast = useToast()

  const [toggling, setToggling]   = useState(false)
  const [editOpen, setEditOpen]   = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({})

  const acc    = getAccountConfig(expense.account)
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

  function openEdit() {
    setForm({
      name:    expense.name || '',
      amount:  String(expense.amount || ''),
      account: expense.account || 'Capitec',
      due_day: String(expense.due_day || '1'),
    })
    setEditOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.amount) {
      toast('Name and amount are required', 'error')
      return
    }
    setSaving(true)
    try {
      await updateRecurringExpense(expense.id, {
        name:    form.name.trim(),
        amount:  parseFloat(form.amount),
        account: form.account,
        due_day: parseInt(form.due_day, 10),
      })
      toast('Updated ✓', 'success')
      setEditOpen(false)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteRecurringExpense(expense.id)
      toast('Removed', 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDeleting(false)
      setShowActions(false)
    }
  }

  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-3.5 transition-opacity
        ${isPaid ? 'opacity-60' : ''}`}>

        {/* Paid toggle */}
        <button className="flex-shrink-0" onClick={handleToggle} disabled={toggling}>
          {isPaid
            ? <CheckCircle size={22} className="text-success" />
            : <Circle size={22} className="text-muted" />
          }
        </button>

        {/* Name + due date */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate
            ${isPaid ? 'line-through text-muted' : 'text-fg'}`}>
            {expense.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-muted">
              {expense.due_day ? `Due ${formatOrdinal(expense.due_day)}` : 'No due date'}
            </span>
            {expense.account && (
              <>
                <span className="text-xs text-muted">·</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-md"
                  style={{ color: acc.color, backgroundColor: acc.bg, fontSize: '0.65rem' }}
                >
                  {acc.label}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <span className={`font-mono text-sm font-medium flex-shrink-0
          ${isPaid ? 'text-success' : 'text-fg'}`}>
          {formatMoney(expense.amount)}
        </span>

        {/* Edit button */}
        <button
          onClick={openEdit}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center"
        >
          <Pencil size={14} className="text-gold" />
        </button>
      </div>

      {/* Edit Sheet */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Fixed Expense">
        <div className="px-5 space-y-4 pb-8">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Name</label>
            <input
              type="text"
              value={form.name || ''}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
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
                value={form.amount || ''}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="flex-1 bg-transparent font-mono text-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Due Day</label>
            <select
              value={form.due_day || '1'}
              onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))}
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
            <AccountPicker value={form.account} onChange={(val) => setForm(f => ({ ...f, account: val }))} />
          </div>

          <Button variant="primary" size="lg" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full py-3 text-sm text-danger border border-danger/20 rounded-xl hover:bg-danger/5 transition-colors"
          >
            {deleting ? 'Removing…' : 'Remove this expense'}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}

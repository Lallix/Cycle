import { useState, useEffect, useRef } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney, ACCOUNT_CONFIG, QUICK_AMOUNTS, EMOJI_OPTIONS, COLOR_OPTIONS } from '../../lib/format'
import BottomSheet from '../ui/BottomSheet'
import Button from '../ui/Button'
import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react'

const ACCOUNTS = [
  'Capitec', 'FNB', 'Absa', 'Standard', 'Nedbank',
  'Investec', 'TymeBank', 'Discovery', 'African', 'Bidvest', 'Cash'
]

export default function AddExpenseSheet({ open, onClose, prefillCategory = null }) {
  const { categories, addTransaction, loadTransactions } = useBudget()
  const toast = useToast()

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [account, setAccount] = useState('Capitec')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [showMoreCats, setShowMoreCats] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const amountRef = useRef(null)

  // Variable categories (budgeted + unbudgeted)
  const varCategories = categories.filter(c => c.type === 'variable')
  const firstEight = varCategories.slice(0, 8)
  const rest = varCategories.slice(8)

  useEffect(() => {
    if (open) {
      // Reset form
      setAmount('')
      setDescription('')
      setCategoryId(prefillCategory || '')
      setAccount('Capitec')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setNotes('')
      setErrors({})
      setShowMoreCats(false)
      // Focus amount input
      setTimeout(() => amountRef.current?.focus(), 400)
    }
  }, [open, prefillCategory])

  function handleAmountInput(val) {
    // Only allow numbers and one decimal
    const cleaned = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    setAmount(cleaned)
    setErrors(e => ({ ...e, amount: null }))
  }

  function addQuickAmount(q) {
    const current = parseFloat(amount) || 0
    setAmount(String(current + q))
  }

  function validate() {
    const errs = {}
    if (!amount || parseFloat(amount) <= 0) errs.amount = 'Enter a valid amount'
    if (!description.trim()) errs.description = 'Description is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      await addTransaction({
        description: description.trim(),
        amount: parseFloat(amount),
        category_id: categoryId || null,
        account,
        date,
        notes: notes.trim() || null,
      })
      toast('Expense added ✓', 'success')
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Expense">
      <div className="px-5 pb-safe space-y-5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}>

        {/* Amount input — big and prominent */}
        <div className="bg-bg-elevated rounded-2xl border border-border px-4 py-4">
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">Amount</label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-3xl text-muted font-light">R</span>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => handleAmountInput(e.target.value)}
              className="flex-1 bg-transparent font-mono text-4xl font-medium text-text-primary focus:outline-none placeholder:text-border-light"
            />
          </div>
          {errors.amount && <p className="text-xs text-danger mt-1">{errors.amount}</p>}

          {/* Quick amounts */}
          <div className="flex gap-2 mt-3">
            {QUICK_AMOUNTS.map(q => (
              <button
                key={q}
                onClick={() => addQuickAmount(q)}
                className="quick-amount"
              >
                +{formatMoney(q, 'ZAR', true).replace('R', 'R')}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">Description</label>
          <input
            type="text"
            placeholder="What was this for?"
            value={description}
            onChange={e => { setDescription(e.target.value); setErrors(e => ({ ...e, description: null })) }}
            className={`w-full bg-bg-elevated border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all ${errors.description ? 'border-danger' : 'border-border'}`}
          />
          {errors.description && <p className="text-xs text-danger mt-1">{errors.description}</p>}
        </div>

        {/* Category grid */}
        <div>
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {firstEight.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                className={`category-btn ${cat.id === categoryId ? 'selected' : ''}`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-2xs text-center leading-tight text-text-secondary truncate w-full">
                  {cat.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>

          {rest.length > 0 && (
            <>
              <button
                onClick={() => setShowMoreCats(!showMoreCats)}
                className="flex items-center gap-1 mt-2 text-xs text-muted tappable"
              >
                <ChevronDown size={14} className={`transition-transform ${showMoreCats ? 'rotate-180' : ''}`} />
                {showMoreCats ? 'Less' : `${rest.length} more`}
              </button>
              {showMoreCats && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {rest.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                      className={`category-btn ${cat.id === categoryId ? 'selected' : ''}`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-2xs text-center leading-tight text-text-secondary truncate w-full">
                        {cat.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Account selector */}
        <div>
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">Account</label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {ACCOUNTS.map(acc => {
              const cfg = ACCOUNT_CONFIG[acc]
              const selected = account === acc
              return (
                <button
                  key={acc}
                  onClick={() => setAccount(acc)}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95 whitespace-nowrap"
                  style={selected ? {
                    backgroundColor: cfg?.bg || 'rgba(136,136,136,0.15)',
                    color: cfg?.color || '#888',
                    borderColor: cfg?.color || '#888',
                  } : {
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {cfg?.label || acc}
                </button>
              )
            })}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-gold transition-all font-mono"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Notes (optional) */}
        <div>
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">Notes <span className="text-border-light normal-case">(optional)</span></label>
          <input
            type="text"
            placeholder="Any additional notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all"
          />
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          loading={loading}
          fullWidth
          size="lg"
          className="mt-2"
        >
          Save Expense
        </Button>
      </div>
    </BottomSheet>
  )
}

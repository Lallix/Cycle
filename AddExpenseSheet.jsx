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
  const { categories, addTransaction } = useBudget()
  const toast = useToast()

  const [amount, setAmount]         = useState('')
  const [notes, setNotes]           = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [account, setAccount]       = useState('Capitec')
  const [date, setDate]             = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showMoreCats, setShowMoreCats] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [errors, setErrors]         = useState({})
  const amountRef = useRef(null)

  const varCategories = categories.filter(c => c.type === 'variable' || c.type === 'unbudgeted')
  const firstEight    = varCategories.slice(0, 8)
  const rest          = varCategories.slice(8)

  useEffect(() => {
    if (open) {
      setAmount('')
      setNotes('')
      setCategoryId(prefillCategory || '')
      setAccount('Capitec')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setErrors({})
      setShowMoreCats(false)
      setTimeout(() => amountRef.current?.focus(), 400)
    }
  }, [open, prefillCategory])

  function handleAmountInput(val) {
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
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      await addTransaction({
        amount:      parseFloat(amount),
        category_id: categoryId || null,
        account,
        date,
        notes:       notes.trim() || null,
      })
      toast('Expense added', 'success')
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Expense">
      <div className="px-5 space-y-5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}>

        {/* Amount */}
        <div className="bg-surface-1 rounded-2xl border border-border px-4 py-4">
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
              className="flex-1 bg-transparent font-mono text-3xl outline-none text-fg placeholder-muted"
            />
          </div>
          {errors.amount && (
            <p className="text-xs text-danger mt-1">{errors.amount}</p>
          )}
          {/* Quick amounts */}
          <div className="flex gap-2 mt-3">
            {QUICK_AMOUNTS.map(q => (
              <button
                key={q}
                onClick={() => addQuickAmount(q)}
                className="flex-1 py-1.5 rounded-lg text-xs font-mono border border-border text-muted hover:text-fg hover:border-border-strong transition-colors"
              >
                +{formatMoney(q)}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {firstEight.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                className={`py-2 px-1 rounded-xl text-xs border transition-all active:scale-95 flex flex-col items-center gap-1
                  ${categoryId === cat.id
                    ? 'border-gold/50 bg-gold/10 text-gold'
                    : 'border-border bg-surface-1 text-muted'}`}
              >
                <span className="text-lg">{cat.icon || '💳'}</span>
                <span className="truncate w-full text-center">{cat.name}</span>
              </button>
            ))}
          </div>
          {rest.length > 0 && (
            <>
              <button
                onClick={() => setShowMoreCats(v => !v)}
                className="flex items-center gap-1 text-xs text-muted mt-2 hover:text-fg transition-colors"
              >
                <ChevronDown size={12} className={`transition-transform ${showMoreCats ? 'rotate-180' : ''}`} />
                {showMoreCats ? 'Show less' : `${rest.length} more`}
              </button>
              {showMoreCats && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {rest.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                      className={`py-2 px-1 rounded-xl text-xs border transition-all active:scale-95 flex flex-col items-center gap-1
                        ${categoryId === cat.id
                          ? 'border-gold/50 bg-gold/10 text-gold'
                          : 'border-border bg-surface-1 text-muted'}`}
                    >
                      <span className="text-lg">{cat.icon || '💳'}</span>
                      <span className="truncate w-full text-center">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Account */}
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
            className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 text-sm text-fg"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Notes (optional) */}
        <div>
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">Notes <span className="normal-case">(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Checkers weekly shop"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3 text-sm text-fg placeholder-muted"
          />
        </div>

        {/* Save */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Saving…' : 'Add Expense'}
        </Button>

      </div>
    </BottomSheet>
  )
}

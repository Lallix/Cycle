import { useState, useEffect, useRef } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney, ACCOUNT_CONFIG, QUICK_AMOUNTS } from '../../lib/format'
import BottomSheet from '../ui/BottomSheet'
import { format } from 'date-fns'
import { ChevronDown, Smile } from 'lucide-react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

const ACCOUNTS = [
  'Capitec', 'FNB', 'Absa', 'Standard', 'Nedbank',
  'Investec', 'TymeBank', 'Discovery', 'African', 'Bidvest', 'Cash'
]

const s = {
  label: {
    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
    color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '12px 16px',
    background: '#2E2E2E', border: '0.5px solid #3A3A3A',
    borderRadius: 12, color: '#FFFFFF',
    fontFamily: 'Inter, sans-serif', fontSize: 14, outline: 'none',
  },
}

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
  const [error, setError]           = useState('')
  const amountRef = useRef(null)

  const varCats   = categories.filter(c => c.type === 'variable' || c.type === 'unbudgeted')
  const firstEight = varCats.slice(0, 8)
  const rest       = varCats.slice(8)

  useEffect(() => {
    if (open) {
      setAmount(''); setNotes(''); setError('')
      setCategoryId(prefillCategory || '')
      setAccount('Capitec')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setShowMoreCats(false)
      setTimeout(() => amountRef.current?.focus(), 450)
    }
  }, [open, prefillCategory])

  function addQuick(q) {
    setAmount(String((parseFloat(amount) || 0) + q))
    setError('')
  }

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) { setError('Enter an amount'); return }
    setLoading(true)
    try {
      await addTransaction({ amount: parseFloat(amount), category_id: categoryId || null, account, date, notes: notes.trim() || null })
      toast('Expense added ✓', 'success')
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally { setLoading(false) }
  }

  function CatButton({ cat }) {
    const sel = categoryId === cat.id
    return (
      <button
        onClick={() => setCategoryId(sel ? '' : cat.id)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '8px 4px', borderRadius: 14,
          border: `0.5px solid ${sel ? 'rgba(255,209,102,0.5)' : '#3A3A3A'}`,
          background: sel ? 'rgba(255,209,102,0.1)' : '#2E2E2E',
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: 20 }}>{cat.icon || '💳'}</span>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 10,
          color: sel ? '#FFD166' : '#A1A1AA',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          width: '100%', textAlign: 'center',
        }}>
          {cat.name}
        </span>
      </button>
    )
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Expense">
      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Amount */}
        <div style={{ background: '#FAF7F0', borderRadius: 16, padding: 16 }}>
          <label style={{ ...s.label, color: '#9A9080' }}>Amount</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 300, color: '#9A9080' }}>R</span>
            <input
              ref={amountRef}
              type="number" inputMode="decimal" placeholder="0.00"
              value={amount}
              onChange={e => { setAmount(e.target.value.replace(/[^0-9.]/g,'').replace(/(\..*)\./g,'$1')); setError('') }}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 300,
                color: '#1C1814',
              }}
            />
          </div>
          {error && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#EF4444', marginTop: 4 }}>{error}</p>}
          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {QUICK_AMOUNTS.map(q => (
              <button key={q} onClick={() => addQuick(q)} style={{
                flex: 1, padding: '6px 0', textAlign: 'center',
                background: 'rgba(28,24,20,0.06)', border: '0.5px solid rgba(28,24,20,0.12)',
                borderRadius: 8, fontFamily: 'Poppins, sans-serif', fontSize: 11,
                color: '#6B6058', cursor: 'pointer',
              }}>
                +{formatMoney(q)}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label style={s.label}>Category</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {firstEight.map(cat => <CatButton key={cat.id} cat={cat} />)}
          </div>
          {rest.length > 0 && (
            <>
              <button
                onClick={() => setShowMoreCats(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'none', border: 'none', color: '#717179', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}
              >
                <ChevronDown size={12} style={{ transform: showMoreCats ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                {showMoreCats ? 'Show less' : `${rest.length} more`}
              </button>
              {showMoreCats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                  {rest.map(cat => <CatButton key={cat.id} cat={cat} />)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Account */}
        <div>
          <label style={s.label}>Account</label>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {ACCOUNTS.map(acc => {
              const cfg = ACCOUNT_CONFIG[acc]
              const sel = account === acc
              return (
                <button key={acc} onClick={() => setAccount(acc)} style={{
                  flexShrink: 0, padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `0.5px solid ${sel ? cfg?.color : '#3A3A3A'}`,
                  background: sel ? cfg?.bg : 'transparent',
                  color: sel ? cfg?.color : '#717179',
                  fontFamily: 'Inter, sans-serif', fontSize: 12, whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}>
                  {cfg?.label || acc}
                </button>
              )
            })}
          </div>
        </div>

        {/* Date */}
        <div>
          <label style={s.label}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ ...s.input, colorScheme: 'dark' }} />
        </div>

        {/* Notes */}
        <div>
          <label style={s.label}>Notes <span style={{ textTransform: 'none', color: '#4A4A4A' }}>(optional)</span></label>
          <input type="text" placeholder="e.g. Checkers weekly shop"
            value={notes} onChange={e => setNotes(e.target.value)}
            style={s.input} />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave} disabled={loading}
          style={{
            width: '100%', padding: '15px 0',
            background: loading ? '#B8922E' : '#FFD166',
            borderRadius: 14, border: 'none',
            fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 600,
            color: '#0D0D0D', cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 0 20px rgba(255,209,102,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? 'Saving...' : 'Add Expense'}
        </button>

      </div>
    </BottomSheet>
  )
}

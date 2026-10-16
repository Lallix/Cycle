import { useState, useEffect, useRef } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney, QUICK_AMOUNTS } from '../../lib/format'
import BottomSheet from '../ui/BottomSheet'
import AccountPicker from '../ui/AccountPicker'
import { format } from 'date-fns'
import { ChevronDown, Smile } from 'lucide-react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { isEverydayType } from '../../lib/spend'

const s = {
  label: {
    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
    color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '12px 16px',
    background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))',
    borderRadius: 12, color: 'rgb(var(--c-text))',
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

  const varCats   = categories.filter(c => isEverydayType(c.type))
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
          border: `0.5px solid ${sel ? 'rgb(var(--c-accent) / 0.5)' : 'rgb(var(--c-border-strong))'}`,
          background: sel ? 'rgb(var(--c-accent) / 0.1)' : 'rgb(var(--c-surface-2))',
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: 20 }}>{cat.icon || '💳'}</span>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 10,
          color: sel ? 'rgb(var(--c-accent))' : 'rgb(var(--c-text-2))',
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
        <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 16, padding: 16 }}>
          <label style={{ ...s.label, color: 'rgb(var(--c-text-3))' }}>Amount</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 300, color: 'rgb(var(--c-text-3))' }}>R</span>
            <input
              ref={amountRef}
              type="number" inputMode="decimal" placeholder="0.00"
              value={amount}
              onChange={e => { setAmount(e.target.value.replace(/[^0-9.]/g,'').replace(/(\..*)\./g,'$1')); setError('') }}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 300,
                color: 'rgb(var(--c-text))',
              }}
            />
          </div>
          {error && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-negative))', marginTop: 4 }}>{error}</p>}
          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {QUICK_AMOUNTS.map(q => (
              <button key={q} onClick={() => addQuick(q)} style={{
                flex: 1, padding: '6px 0', textAlign: 'center',
                background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 8, fontFamily: 'var(--font-display)', fontSize: 11,
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
                style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'none', border: 'none', color: 'rgb(var(--c-text-3))', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}
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
          <AccountPicker value={account} onChange={setAccount} />
        </div>

        {/* Date */}
        <div>
          <label style={s.label}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ ...s.input, colorScheme: 'dark' }} />
        </div>

        {/* Notes */}
        <div>
          <label style={s.label}>Notes <span style={{ textTransform: 'none', color: 'rgb(var(--c-text-4))' }}>(optional)</span></label>
          <input type="text" placeholder="e.g. Checkers weekly shop"
            value={notes} onChange={e => setNotes(e.target.value)}
            style={s.input} />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave} disabled={loading}
          style={{
            width: '100%', padding: '15px 0',
            background: loading ? 'rgb(var(--c-accent-dark))' : 'rgb(var(--c-accent))',
            borderRadius: 14, border: 'none',
            fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
            color: 'rgb(var(--c-bg))', cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 0 0 0 transparent',
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? 'Saving...' : 'Add Expense'}
        </button>

      </div>
    </BottomSheet>
  )
}

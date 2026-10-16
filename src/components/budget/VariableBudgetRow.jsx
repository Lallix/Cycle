import { useState } from 'react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney, getProgressColor, QUICK_AMOUNTS } from '../../lib/format'
import ProgressBar from '../ui/ProgressBar'
import BottomSheet from '../ui/BottomSheet'
import ExpenseItem from '../expenses/ExpenseItem'
import AccountPicker from '../ui/AccountPicker'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function VariableBudgetRow({ category }) {
  const { getCategorySpent, transactions, deleteTransaction, addTransaction, accounts } = useBudget()
  const toast = useToast()

  const [showDetail, setShowDetail] = useState(false)
  const [showAdd, setShowAdd]       = useState(false)
  const [amount, setAmount]         = useState('')
  const [notes, setNotes]           = useState('')
  const [date, setDate]             = useState(format(new Date(), 'yyyy-MM-dd'))
  const [account, setAccount]       = useState(() => accounts.find(a => a.is_default)?.name || 'Capitec')
  const [saving, setSaving]         = useState(false)

  const spent     = getCategorySpent(category.id)
  const budget    = parseFloat(category.budget_amount || 0)
  const remaining = budget - spent
  const pct       = budget > 0 ? (spent / budget) * 100 : 0
  const isOver    = remaining < 0
  const statusColor = getProgressColor(pct)
  const catTx     = transactions.filter(t => t.category_id === category.id)

  async function handleDelete(id) {
    try { await deleteTransaction(id) }
    catch (e) { toast(e.message, 'error') }
  }

  function openAdd() {
    setAmount(''); setNotes('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setAccount(accounts.find(a => a.is_default)?.name || 'Capitec')
    setShowAdd(true)
  }

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) { toast('Enter an amount', 'error'); return }
    setSaving(true)
    try {
      await addTransaction({
        amount:      parseFloat(amount),
        category_id: category.id,
        account,
        date,
        notes: notes.trim() || null,
      })
      toast(`Added to ${category.name} ✓`, 'success')
      setShowAdd(false)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))',
    borderRadius: 12, color: 'rgb(var(--c-text))',
    fontFamily: 'Inter, sans-serif', fontSize: 14, outline: 'none',
  }

  const labelStyle = {
    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
    color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'block', marginBottom: 6,
  }

  return (
    <>
      {/* Row */}
      <div
        style={{ padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setShowDetail(true)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, background: `${category.colour || '#888'}18`,
          }}>
            {category.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: 'rgb(var(--c-text))' }}>
              {category.name}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500, color: statusColor }}>
              {formatMoney(spent, true)}
            </span>
            {budget > 0 && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'rgb(var(--c-text-3))' }}>
                {' '}/ {formatMoney(budget, true)}
              </span>
            )}
          </div>
        </div>

        {budget > 0 && <ProgressBar value={spent} max={budget} size="sm" />}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11 }}>
            {budget > 0
              ? isOver
                ? <span style={{ color: 'rgb(var(--c-negative))' }}>Over by {formatMoney(Math.abs(remaining), true)}</span>
                : <span style={{ color: 'rgb(var(--c-text-3))' }}>{formatMoney(remaining, true)} remaining</span>
              : <span style={{ color: 'rgb(var(--c-text-3))' }}>{formatMoney(spent, true)} spent</span>
            }
          </span>
          {budget > 0 && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'rgb(var(--c-text-3))' }}>
              {Math.round(pct)}%
            </span>
          )}
        </div>
      </div>

      {/* Detail sheet */}
      <BottomSheet
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title={`${category.icon} ${category.name}`}
      >
        <div style={{ paddingBottom: 32 }}>
          {/* Summary */}
          <div style={{ margin: '0 20px 16px', background: 'rgb(var(--c-surface-2))', borderRadius: 14, border: '0.5px solid rgb(var(--c-border-strong))', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Spent</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: statusColor }}>{formatMoney(spent)}</p>
              </div>
              {budget > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Budget</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 300, color: 'rgb(var(--c-text-3))' }}>{formatMoney(budget)}</p>
                </div>
              )}
            </div>
            {budget > 0 && <ProgressBar value={spent} max={budget} size="md" />}
          </div>

          {/* Add spend button */}
          <div style={{ padding: '0 20px 16px' }}>
            <button
              onClick={openAdd}
              style={{
                width: '100%', padding: '12px 0',
                borderRadius: 12, border: '0.5px solid rgb(var(--c-accent) / 0.3)',
                background: 'rgb(var(--c-accent) / 0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                color: 'rgb(var(--c-accent))', cursor: 'pointer',
              }}
            >
              <Plus size={15} /> Add spend to {category.name}
            </button>
          </div>

          {/* Transactions */}
          {catTx.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>{category.icon}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgb(var(--c-text-3))' }}>No expenses yet</p>
            </div>
          ) : (
            <div style={{ margin: '0 20px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Transactions
              </p>
              <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 14, border: '0.5px solid rgb(var(--c-border))', overflow: 'hidden' }}>
                {catTx.map((tx, i) => (
                  <div key={tx.id} style={{ borderBottom: i < catTx.length - 1 ? '0.5px solid rgb(var(--c-border))' : 'none' }}>
                    <ExpenseItem transaction={tx} onDelete={handleDelete} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Simplified add spend sheet — amount, account, date, notes only (no category picker) */}
      <BottomSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={`Add to ${category.name}`}
      >
        <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Amount — ivory card */}
          <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 16, padding: 16 }}>
            <label style={{ ...labelStyle, color: 'rgb(var(--c-text-3))' }}>Amount</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 300, color: 'rgb(var(--c-text-3))' }}>R</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g,'').replace(/(\..*)\./g,'$1'))}
                autoFocus
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 300, color: 'rgb(var(--c-text))',
                }}
              />
            </div>
            {/* Quick amounts */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {QUICK_AMOUNTS.map(q => (
                <button key={q} onClick={() => setAmount(String((parseFloat(amount)||0) + q))}
                  style={{
                    flex: 1, padding: '6px 0', textAlign: 'center',
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, fontFamily: 'var(--font-display)', fontSize: 11, color: '#6B6058', cursor: 'pointer',
                  }}>
                  +{formatMoney(q)}
                </button>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <label style={labelStyle}>Account</label>
            <AccountPicker value={account} onChange={setAccount} />
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes <span style={{ textTransform: 'none', color: 'rgb(var(--c-text-4))' }}>(optional)</span></label>
            <input type="text" placeholder={`e.g. Checkers, Shell garage...`}
              value={notes} onChange={e => setNotes(e.target.value)}
              style={inputStyle} />
          </div>

          {/* Save */}
          <button
            onClick={handleSave} disabled={saving}
            style={{
              width: '100%', padding: '15px 0',
              background: saving ? 'rgb(var(--c-accent-dark))' : 'rgb(var(--c-accent))',
              borderRadius: 14, border: 'none',
              fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
              color: 'rgb(var(--c-bg))', cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 0 0 0 transparent',
            }}
          >
            {saving ? 'Saving...' : `Add to ${category.name}`}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}

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
    background: '#2E2E2E', border: '0.5px solid #3A3A3A',
    borderRadius: 12, color: '#FFFFFF',
    fontFamily: 'Inter, sans-serif', fontSize: 14, outline: 'none',
  }

  const labelStyle = {
    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
    color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em',
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
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
              {category.name}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 500, color: statusColor }}>
              {formatMoney(spent, true)}
            </span>
            {budget > 0 && (
              <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#717179' }}>
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
                ? <span style={{ color: '#EF4444' }}>Over by {formatMoney(Math.abs(remaining), true)}</span>
                : <span style={{ color: '#717179' }}>{formatMoney(remaining, true)} remaining</span>
              : <span style={{ color: '#717179' }}>{formatMoney(spent, true)} spent</span>
            }
          </span>
          {budget > 0 && (
            <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#717179' }}>
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
          <div style={{ margin: '0 20px 16px', background: '#2E2E2E', borderRadius: 14, border: '0.5px solid #3A3A3A', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Spent</p>
                <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 500, color: statusColor }}>{formatMoney(spent)}</p>
              </div>
              {budget > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Budget</p>
                  <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 300, color: '#717179' }}>{formatMoney(budget)}</p>
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
                borderRadius: 12, border: '0.5px solid rgba(255,209,102,0.3)',
                background: 'rgba(255,209,102,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                color: '#FFD166', cursor: 'pointer',
              }}
            >
              <Plus size={15} /> Add spend to {category.name}
            </button>
          </div>

          {/* Transactions */}
          {catTx.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>{category.icon}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#717179' }}>No expenses yet</p>
            </div>
          ) : (
            <div style={{ margin: '0 20px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Transactions
              </p>
              <div style={{ background: '#1B1B1B', borderRadius: 14, border: '0.5px solid #2A2A2A', overflow: 'hidden' }}>
                {catTx.map((tx, i) => (
                  <div key={tx.id} style={{ borderBottom: i < catTx.length - 1 ? '0.5px solid #2A2A2A' : 'none' }}>
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
          <div style={{ background: '#FAF7F0', borderRadius: 16, padding: 16 }}>
            <label style={{ ...labelStyle, color: '#9A9080' }}>Amount</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 300, color: '#9A9080' }}>R</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g,'').replace(/(\..*)\./g,'$1'))}
                autoFocus
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 300, color: '#1C1814',
                }}
              />
            </div>
            {/* Quick amounts */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {QUICK_AMOUNTS.map(q => (
                <button key={q} onClick={() => setAmount(String((parseFloat(amount)||0) + q))}
                  style={{
                    flex: 1, padding: '6px 0', textAlign: 'center',
                    background: 'rgba(28,24,20,0.06)', border: '0.5px solid rgba(28,24,20,0.12)',
                    borderRadius: 8, fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#6B6058', cursor: 'pointer',
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
            <label style={labelStyle}>Notes <span style={{ textTransform: 'none', color: '#4A4A4A' }}>(optional)</span></label>
            <input type="text" placeholder={`e.g. Checkers, Shell garage...`}
              value={notes} onChange={e => setNotes(e.target.value)}
              style={inputStyle} />
          </div>

          {/* Save */}
          <button
            onClick={handleSave} disabled={saving}
            style={{
              width: '100%', padding: '15px 0',
              background: saving ? '#B8922E' : '#FFD166',
              borderRadius: 14, border: 'none',
              fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 600,
              color: '#0D0D0D', cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saving ? 'none' : '0 0 20px rgba(255,209,102,0.3)',
            }}
          >
            {saving ? 'Saving...' : `Add to ${category.name}`}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}

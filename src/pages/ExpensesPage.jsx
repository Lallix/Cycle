import { useState, useMemo, useEffect } from 'react'
import { useBudget } from '../context/BudgetContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { formatMoney } from '../lib/format'
import { getLastNCycles } from '../lib/cycle'
import ExpenseItem from '../components/expenses/ExpenseItem'
import ExpenseFilters from '../components/expenses/ExpenseFilters'
import CycleSelector from '../components/ui/CycleSelector'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import LoadingScreen from '../components/ui/LoadingScreen'
import { Search } from 'lucide-react'
import AccountPicker from '../components/ui/AccountPicker'
import { format } from 'date-fns'

export default function ExpensesPage() {
  const { loading, transactions, categories, deleteTransaction, updateTransaction, getTransactionsForCycle } = useBudget()
  const { profile } = useAuth()
  const toast = useToast()

  const [editOpen, setEditOpen]       = useState(false)
  const [editingTx, setEditingTx]     = useState(null)
  const [search, setSearch]           = useState('')
  const [activeFilter, setActiveFilter] = useState(null)
  const [editForm, setEditForm]       = useState({})
  const [saving, setSaving]           = useState(false)
  const [cycleIndex, setCycleIndex]   = useState(0)
  const [historyTx, setHistoryTx]     = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load transactions when navigating to a past cycle
  useEffect(() => {
    if (cycleIndex === 0) { setHistoryTx(null); return }
    const cycles = getLastNCycles(12, profile?.cycle_start_day || 25)
    const selected = cycles[cycleIndex]
    if (!selected) return
    setLoadingHistory(true)
    getTransactionsForCycle(selected.key)
      .then(data => setHistoryTx(data))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoadingHistory(false))
  }, [cycleIndex])

  if (loading) return <LoadingScreen />

  // Use current cycle transactions or historical ones
  const sourceTx = cycleIndex === 0 ? transactions : (historyTx || [])

  // Group and filter
  const filtered = useMemo(() => {
    return sourceTx.filter(tx => {
      const cat = tx.cycle_categories || tx.categories
      const matchSearch = !search ||
        (cat?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.notes || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.account || '').toLowerCase().includes(search.toLowerCase())
      const matchFilter = !activeFilter ||
        (activeFilter.type === 'category' && tx.category_id === activeFilter.id) ||
        (activeFilter.type === 'account' && tx.account === activeFilter.value)
      return matchSearch && matchFilter
    })
  }, [sourceTx, search, activeFilter])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(tx => {
      const key = tx.transaction_date
      if (!map[key]) map[key] = []
      map[key].push(tx)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const totalSpent = filtered.reduce((s, t) => s + parseFloat(t.amount || 0), 0)

  async function handleDelete(id) {
    try {
      await deleteTransaction(id)
      toast('Deleted', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  function handleEdit(tx) {
    setEditingTx(tx)
    setEditForm({
      amount:      String(tx.amount || ''),
      category_id: tx.category_id || '',
      account:     tx.account || 'Capitec',
      date:        tx.transaction_date || '',
      notes:       tx.notes || '',
    })
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      toast('Enter a valid amount', 'error'); return
    }
    setSaving(true)
    try {
      await updateTransaction(editingTx.id, {
        amount:      parseFloat(editForm.amount),
        category_id: editForm.category_id || null,
        account:     editForm.account,
        date:        editForm.date,
        notes:       editForm.notes || null,
      })
      toast('Updated ✓', 'success')
      setEditOpen(false)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    background: '#2E2E2E', border: '0.5px solid #3A3A3A',
    borderRadius: 12, color: '#FFFFFF',
    fontFamily: 'Inter, sans-serif', fontSize: 14,
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100%', background: '#0D0D0D', paddingBottom: 120 }}>

      {/* Header */}
      <div style={{ padding: 'max(env(safe-area-inset-top), 16px) 16px 12px' }}>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 600, color: '#FFFFFF' }}>
          Transactions
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#717179', marginTop: 2 }}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} · {formatMoney(totalSpent)} total
        </p>
      </div>

      {/* Cycle selector */}
      <CycleSelector cycleIndex={cycleIndex} onChange={setCycleIndex} />

      {/* Search */}
      <div style={{ margin: '0 16px 12px', position: 'relative' }}>
        <Search size={15} color="#717179" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search expenses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 38 }}
        />
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 12 }}>
        <ExpenseFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </div>

      {/* Transactions */}
      {loadingHistory ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #FFD166', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '0 16px' }}>
          <EmptyState
            icon="🔍"
            title={search ? 'No results' : cycleIndex > 0 ? 'No expenses this cycle' : 'No expenses yet'}
            description={search ? 'Try a different search term' : 'Tap + to record your first expense'}
          />
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grouped.map(([date, txs]) => (
            <div key={date}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#717179', fontWeight: 500, marginBottom: 8 }}>
                {format(new Date(date), 'EEEE, d MMMM')}
              </p>
              <div style={{ background: '#1B1B1B', borderRadius: 16, border: '0.5px solid #2A2A2A', overflow: 'hidden' }}>
                {txs.map((tx, i) => (
                  <div key={tx.id} style={{ borderBottom: i < txs.length - 1 ? '0.5px solid #2A2A2A' : 'none' }}>
                    <ExpenseItem
                      transaction={tx}
                      onDelete={handleDelete}
                      onEdit={cycleIndex === 0 ? handleEdit : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit sheet */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Expense">
        <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Poppins, sans-serif', color: '#717179' }}>R</span>
              <input type="number" inputMode="decimal" value={editForm.amount || ''} onChange={e => setEditForm(f => ({...f, amount: e.target.value}))} style={{ ...inputStyle, paddingLeft: 32 }} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Notes</label>
            <input type="text" placeholder="Optional note" value={editForm.notes || ''} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} style={inputStyle} />
          </div>

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Date</label>
            <input type="date" value={editForm.date || ''} onChange={e => setEditForm(f => ({...f, date: e.target.value}))} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Account</label>
            <AccountPicker value={editForm.account} onChange={(val) => setEditForm(f => ({...f, account: val}))} />
          </div>

          <button
            onClick={handleSaveEdit} disabled={saving}
            style={{
              width: '100%', padding: '14px 0', marginTop: 4,
              background: saving ? '#B8922E' : '#FFD166',
              borderRadius: 14, border: 'none',
              fontFamily: 'Poppins, sans-serif', fontSize: 15, fontWeight: 600,
              color: '#0D0D0D', cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

import { useState, useMemo, useEffect, useRef } from 'react'
import { useBudget } from '../context/BudgetContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { formatMoney } from '../lib/format'
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
import { useNavigate } from 'react-router-dom'
import { FileUp } from 'lucide-react'
import { spendAmount } from '../lib/spend'
import CategoryPicker, { categoryGroups } from '../components/ui/CategoryPicker'
import { supabase } from '../lib/supabase'
import { payeeKey, escapeRegex } from '../lib/import/categorise'

export default function ExpensesPage({ embedded = false, cycleIndex: cycleProp, filter, onFilterChange }) {
  const { loading, transactions, categories, archivedCategories, cycles, deleteTransaction, updateTransaction, getTransactionsForCycle, addCategory, refresh } = useBudget()
  const { profile, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const importRef = useRef(null)

  // Picking a statement here jumps straight to the import review
  function onImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) navigate('/import', { state: { file } })
  }

  const [editOpen, setEditOpen]       = useState(false)
  const [editingTx, setEditingTx]     = useState(null)
  const [search, setSearch]           = useState('')
  const [ownFilter, setOwnFilter]     = useState(null)
  const activeFilter = embedded ? filter : ownFilter
  const setActiveFilter = embedded ? onFilterChange : setOwnFilter
  const [editForm, setEditForm]       = useState({})
  const [saving, setSaving]           = useState(false)
  const [remember, setRemember]       = useState(false)   // make the picked category a payee rule
  const [ownCycle, setCycleIndex]     = useState(0)
  const cycleIndex = embedded ? cycleProp : ownCycle
  const [historyTx, setHistoryTx]     = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load transactions when navigating to a past cycle
  useEffect(() => {
    if (cycleIndex === 0) { setHistoryTx(null); return }
    const selected = cycles[cycleIndex]
    if (!selected) return
    setLoadingHistory(true)
    getTransactionsForCycle(selected.key)
      .then(data => setHistoryTx(data))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoadingHistory(false))
  }, [cycleIndex])

  // Use current cycle transactions or historical ones
  const sourceTx = cycleIndex === 0 ? transactions : (historyTx || [])

  // Group and filter
  const filtered = useMemo(() => {
    return sourceTx.filter(tx => {
      const cat = tx.cycle_categories || tx.categories
      const matchSearch = !search ||
        (cat?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.notes || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.account || '').toLowerCase().includes(search.toLowerCase())
      const matchFilter = !activeFilter ||
        (activeFilter.type === 'none' && !tx.category_id) ||
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

  const totalSpent = filtered.reduce((s, t) => s + spendAmount(t), 0)

  // After every hook: returning earlier breaks React when data reloads while open
  if (loading) return <LoadingScreen />

  async function handleDelete(id) {
    try {
      await deleteTransaction(id)
      toast('Deleted', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  // "Use this for <payee> from now on": save a payee rule, ranked above the
  // general rules (only the card-fee and income rules come first), and file
  // that payee's uncategorised lines too. Returns how many were filed.
  async function rememberPayee(description, categoryId) {
    const key = payeeKey(description)
    const pattern = escapeRegex(key)
    const { data: existing, error: rErr } = await supabase.from('cycle_payee_rules')
      .select('id').eq('user_id', user.id).eq('pattern', pattern)
    if (rErr) throw rErr
    const rule = { category_id: categoryId, priority: 8, is_active: true, notes: 'Set when editing a transaction' }
    const { error } = existing?.length
      ? await supabase.from('cycle_payee_rules').update(rule).in('id', existing.map(r => r.id))
      : await supabase.from('cycle_payee_rules').insert({ user_id: user.id, pattern, ...rule })
    if (error) throw error

    const { data: loose, error: lErr } = await supabase.from('cycle_transactions')
      .select('id, description').eq('user_id', user.id).is('category_id', null).not('description', 'is', null)
    if (lErr) throw lErr
    const ids = (loose || []).filter(t => payeeKey(t.description) === key).map(t => t.id)
    if (ids.length) {
      const { error: uErr } = await supabase.from('cycle_transactions').update({ category_id: categoryId }).in('id', ids)
      if (uErr) throw uErr
      await refresh()
    }
    return ids.length
  }

  function handleEdit(tx) {
    setRemember(false)
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
      // A statement line keeps its amount, date and account (they come from
      // the bank and are used to spot it again on the next import)
      const fromStatement = editingTx.source === 'import'
      const saved = await updateTransaction(editingTx.id, {
        amount:      fromStatement ? parseFloat(editingTx.amount) : parseFloat(editForm.amount),
        category_id: editForm.category_id || null,
        account:     fromStatement ? editingTx.account : editForm.account,
        date:        fromStatement ? editingTx.transaction_date : editForm.date,
        notes:       editForm.notes || null,
      })
      // Past cycles are loaded here, not in the shared list, so update them too
      if (historyTx) setHistoryTx(prev => prev.map(t => t.id === saved.id ? saved : t))
      const refiled = canRemember && remember ? await rememberPayee(editingTx.description, editForm.category_id) : null
      toast(refiled == null ? 'Updated ✓'
        : `Updated ✓ · future imports from this payee will use it${refiled ? ` · ${refiled} uncategorised line${refiled === 1 ? '' : 's'} filed too` : ''}`,
        'success', refiled == null ? 3000 : 5000)
      setEditOpen(false)
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  // Every active category, grouped by type. A line in a removed category
  // keeps it in the list so the current choice still shows.
  const currentArchived = archivedCategories.find(c => c.id === editingTx?.category_id)
  // The rule option shows once you pick a different category for a statement line
  const payee = editingTx?.description ? payeeKey(editingTx.description) : ''
  const canRemember = Boolean(payee && editForm.category_id && editForm.category_id !== (editingTx?.category_id || ''))
  const editCategoryGroups = categoryGroups([...categories, ...(currentArchived ? [currentArchived] : [])])

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))',
    borderRadius: 12, color: 'rgb(var(--c-text))',
    fontFamily: 'Inter, sans-serif', fontSize: 14,
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100%', background: 'rgb(var(--c-bg))', paddingBottom: 120 }}>

      {/* Header */}
      <div style={{ padding: embedded ? '0 16px 12px' : 'max(env(safe-area-inset-top), 16px) 16px 12px' }}>
        <div className="flex items-center justify-between">
          {embedded
            ? <span />
            : <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'rgb(var(--c-text))' }}>Transactions</h1>}
          <input ref={importRef} type="file" accept=".csv,text/csv,.pdf,application/pdf" onChange={onImportFile} hidden />
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 tappable"
            style={{ padding: '9px 14px', borderRadius: 12, background: 'rgb(var(--c-accent))', color: 'rgb(var(--c-bg))',
              fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', border: 'none' }}
            aria-label="Import a bank statement"
          >
            <FileUp size={16} /> Import statement
          </button>
        </div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgb(var(--c-text-3))', marginTop: 2 }}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} · {formatMoney(totalSpent)} spent
        </p>
      </div>

      {/* Cycle selector (Activity shows its own) */}
      {!embedded && <CycleSelector cycleIndex={cycleIndex} onChange={setCycleIndex} />}

      {/* Search */}
      <div style={{ margin: '0 16px 12px', position: 'relative' }}>
        <Search size={15} color="rgb(var(--c-text-3))" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
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
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgb(var(--c-accent))', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
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
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgb(var(--c-text-3))', fontWeight: 600, marginBottom: 8 }}>
                {format(new Date(date), 'EEEE, d MMMM')}
              </p>
              <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 16, border: '0.5px solid rgb(var(--c-border))', overflow: 'hidden' }}>
                {txs.map((tx, i) => (
                  <div key={tx.id} style={{ borderBottom: i < txs.length - 1 ? '0.5px solid rgb(var(--c-border))' : 'none' }}>
                    <ExpenseItem
                      transaction={tx}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit sheet */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title={editingTx?.source === 'import' ? 'Edit transaction' : 'Edit Expense'}>
        <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {editingTx?.source === 'import' && (
            <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgb(var(--c-surface-2))', fontFamily: 'Inter, sans-serif' }}>
              <p style={{ fontSize: 13, color: 'rgb(var(--c-text))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editingTx.description}</p>
              <p style={{ fontSize: 12, color: 'rgb(var(--c-text-3))', marginTop: 2 }}>
                {format(new Date(editingTx.transaction_date), 'd MMM yyyy')} · {editingTx.direction === 'in' ? '+' : '−'}{formatMoney(editingTx.amount)} · from your statement
              </p>
            </div>
          )}

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Category</label>
            <CategoryPicker
              groups={editCategoryGroups} value={editForm.category_id || null} none="No category" placeholder="No category"
              onChange={id => setEditForm(f => ({ ...f, category_id: id || '' }))}
              onCreate={async c => (await addCategory(c)).id}
              style={{ padding: '12px 16px', fontSize: 14 }}
            />
            {canRemember && (
              <label className="flex items-start gap-2.5 mt-3 cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 1, accentColor: 'rgb(var(--c-accent))', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'rgb(var(--c-text-2))', lineHeight: 1.4 }}>
                  Use this for <b style={{ color: 'rgb(var(--c-text))' }}>{payee.length > 40 ? `${payee.slice(0, 40)}…` : payee}</b> from now on
                  <span style={{ display: 'block', fontSize: 11, color: 'rgb(var(--c-text-3))', marginTop: 2 }}>
                    Future imports from this payee get this category, and its uncategorised lines are filed too.
                  </span>
                </span>
              </label>
            )}
          </div>

          {editingTx?.source !== 'import' && (<>
          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-display)', color: 'rgb(var(--c-text-3))' }}>R</span>
              <input type="number" inputMode="decimal" value={editForm.amount || ''} onChange={e => setEditForm(f => ({...f, amount: e.target.value}))} style={{ ...inputStyle, paddingLeft: 32 }} />
            </div>
          </div>

          </>)}

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Notes</label>
            <input type="text" placeholder="Optional note" value={editForm.notes || ''} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} style={inputStyle} />
          </div>

          {editingTx?.source !== 'import' && (<>

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Date</label>
            <input type="date" value={editForm.date || ''} onChange={e => setEditForm(f => ({...f, date: e.target.value}))} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Account</label>
            <AccountPicker value={editForm.account} onChange={(val) => setEditForm(f => ({...f, account: val}))} />
          </div>
          </>)}

          <button
            onClick={handleSaveEdit} disabled={saving}
            style={{
              width: '100%', padding: '14px 0', marginTop: 4,
              background: saving ? 'rgb(var(--c-accent-dark))' : 'rgb(var(--c-accent))',
              borderRadius: 14, border: 'none',
              fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
              color: 'rgb(var(--c-bg))', cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

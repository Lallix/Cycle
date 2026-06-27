import { useState, useMemo } from 'react'
import { useBudget } from '../context/BudgetContext'
import { useToast } from '../components/ui/Toast'
import { formatMoney , ACCOUNT_CONFIG} from '../lib/format'
import PageHeader from '../components/ui/PageHeader'
import ExpenseItem from '../components/expenses/ExpenseItem'
import ExpenseFilters from '../components/expenses/ExpenseFilters'
import AddExpenseSheet from '../components/expenses/AddExpenseSheet'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import LoadingScreen from '../components/ui/LoadingScreen'
import Input from '../components/ui/Input'
import { Plus, Search } from 'lucide-react'
import { format } from 'date-fns'

const ACCOUNTS = [
  'Capitec', 'FNB', 'Absa', 'Standard', 'Nedbank',
  'Investec', 'TymeBank', 'Discovery', 'African', 'Bidvest', 'Cash'
]

export default function ExpensesPage() {
  const { loading, transactions, categories, deleteTransaction, updateTransaction, totals } = useBudget()
  const toast = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [search, setSearch] = useState('')
  const [filterAccount, setFilterAccount] = useState('All')
  const [filterCategory, setFilterCategory] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  if (loading) return <LoadingScreen />

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const matchSearch = !search || tx.description.toLowerCase().includes(search.toLowerCase())
      const matchAccount = filterAccount === 'All' || tx.account === filterAccount
      const matchCat = !filterCategory || tx.category_id === filterCategory
      return matchSearch && matchAccount && matchCat
    })
  }, [transactions, search, filterAccount, filterCategory])

  // Group by date
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(tx => {
      const key = tx.transaction_date
      if (!groups[key]) groups[key] = []
      groups[key].push(tx)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  function handleEdit(tx) {
    setEditingTx(tx)
    setEditForm({
      description: tx.description,
      amount: String(tx.amount),
      category_id: tx.category_id || '',
      account: tx.account,
      date: tx.transaction_date,
      notes: tx.notes || '',
    })
    setEditOpen(true)
  }

  async function handleDelete(id) {
    try {
      await deleteTransaction(id)
      toast('Expense deleted', 'info')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleSaveEdit() {
    if (!editingTx || !editForm.description || !editForm.amount) return
    setSaving(true)
    try {
      await updateTransaction(editingTx.id, {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category_id: editForm.category_id || null,
        account: editForm.account,
        date: editForm.date,
        notes: editForm.notes || null,
      })
      toast('Expense updated ✓', 'success')
      setEditOpen(false)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const totalShown = filtered.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)

  return (
    <div className="min-h-full bg-bg animate-fade-in"
      style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom) + 5rem)' }}
    >
      <PageHeader
        title="Expenses"
        subtitle={`${filtered.length} transactions · ${formatMoney(totalShown)} total`}
      />

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search expenses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-elevated border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <ExpenseFilters
          active={filterAccount}
          onChange={setFilterAccount}
          categories={categories.filter(c => c.type === 'variable')}
          activeCategory={filterCategory}
          onCategoryChange={setFilterCategory}
        />
      </div>

      {/* Transactions grouped by date */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={search ? 'No results' : 'No expenses yet'}
          description={search ? 'Try a different search term' : 'Tap + to record your first expense'}
        />
      ) : (
        <div className="px-4 space-y-4">
          {grouped.map(([date, txs]) => (
            <div key={date}>
              <p className="text-xs text-muted font-medium mb-2">
                {format(new Date(date), 'EEEE, d MMMM')}
              </p>
              <div className="bg-bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
                {txs.map(tx => (
                  <ExpenseItem
                    key={tx.id}
                    transaction={tx}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        className="fab"
        onClick={() => setAddOpen(true)}
        aria-label="Add expense"
      >
        <Plus size={26} strokeWidth={2.5} className="text-bg" />
      </button>

      {/* Add sheet */}
      <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Edit sheet */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Expense">
        <div className="px-5 pb-8 space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Description</label>
            <input
              type="text"
              value={editForm.description || ''}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Amount</label>
            <input
              type="number"
              inputMode="decimal"
              value={editForm.amount || ''}
              onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-gold transition-all font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Category</label>
            <select
              value={editForm.category_id || ''}
              onChange={e => setEditForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-gold transition-all"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">No category</option>
              {categories.filter(c => c.type === 'variable').map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Account</label>
            <div className="flex gap-2">
              {ACCOUNTS.map(acc => (
                <button
                  key={acc}
                  onClick={() => setEditForm(f => ({ ...f, account: acc }))}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95 whitespace-nowrap"
                >
                  {acc}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">Date</label>
            <input
              type="date"
              value={editForm.date || ''}
              onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
              className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-gold transition-all font-mono"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="danger" onClick={() => { handleDelete(editingTx?.id); setEditOpen(false) }} className="flex-1">
              Delete
            </Button>
            <Button onClick={handleSaveEdit} loading={saving} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

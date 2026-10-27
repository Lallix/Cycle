import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { cyclesFromPaydays } from '../lib/cycle'
import { computeCycleTotals, spendByCategory } from '../lib/totals'
import { buildSheet } from '../lib/sheet'

const BudgetContext = createContext(null)

export function BudgetProvider({ children }) {
  const { user, profile } = useAuth()
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const [categories, setCategories]           = useState([])
  const [archivedCategories, setArchivedCategories] = useState([])   // removed, can be restored
  const [transactions, setTransactions]       = useState([])
  const [fixedPaid, setFixedPaid]             = useState([])   // cycle_fixed_paid: category ids ticked this cycle
  const [recentTx, setRecentTx]               = useState([])   // the three cycles before this one
  const [savingGoals, setSavingGoals]         = useState([])
  const [accounts, setAccounts]               = useState([])
  const [paydays, setPaydays]                 = useState(null)  // null = not loaded yet
  const [plannedItems, setPlannedItems]       = useState([])
  const [donePlannedItems, setDonePlannedItems] = useState([])   // ticked off, newest first
  const [budgetHistory, setBudgetHistory]     = useState([])   // cycle_category_budgets

  const [cycles, setCycles] = useState([])     // newest first; cycles[0] is the current one
  const [cycle, setCycle]   = useState(null)
  const [totals, setTotals] = useState(computeCycleTotals({ transactions: [], categories: [] }))

  // ── Cycles come from your paydays (cycle_paydays) ────────────
  useEffect(() => {
    if (user) loadPaydays().catch(err => { console.error(err); setPaydays([]) })
  }, [user])

  useEffect(() => {
    if (!profile || paydays === null) return
    const list = cyclesFromPaydays(paydays, profile.cycle_start_day || 25)
    setCycles(list)
    setCycle(list[0])
  }, [profile, paydays])

  useEffect(() => {
    if (user && cycle) loadAll()
    else if (!user) { resetData(); setLoading(false) }
  }, [user, cycle?.key])

  useEffect(() => {
    if (cycle) setTotals(computeCycleTotals({ transactions, categories, savingGoals }))
  }, [transactions, categories, savingGoals, cycle])

  // The plan for this cycle, laid out like the spreadsheet (lib/sheet.js)
  const sheet = useMemo(() => buildSheet({
    categories, transactions, paidTicks: new Set(fixedPaid), recent: recentTx,
  }), [categories, transactions, fixedPaid, recentTx])

  function resetData() {
    setCategories([]); setTransactions([])
    setFixedPaid([]); setRecentTx([]); setSavingGoals([]); setAccounts([])
    setPaydays(null); setPlannedItems([]); setDonePlannedItems([]); setBudgetHistory([]); setCycles([]); setCycle(null)
    setTotals(computeCycleTotals({ transactions: [], categories: [] }))
  }

  async function loadAll() {
    setLoading(true); setError(null)
    try {
      await Promise.all([
        loadCategories(), loadTransactions(), loadFixedPaid(), loadRecent(),
        loadSavingGoals(), loadAccounts(), loadPlannedItems(), loadBudgetHistory(),
      ])
    } catch (err) {
      console.error('Data load error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Loaders ──────────────────────────────────────────────────

  async function loadCategories() {
    const { data, error } = await supabase
      .from('cycle_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order')
    if (error) throw error
    setCategories((data || []).filter(c => c.is_active))
    setArchivedCategories((data || []).filter(c => !c.is_active))
    return data
  }

  async function loadTransactions() {
    if (!cycle) return
    const { data, error } = await supabase
      .from('cycle_transactions')
      .select(`*, cycle_categories(id, name, icon, colour, budget_amount, type)`)
      .eq('user_id', user.id)
      .eq('cycle_key', cycle.key)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    setTransactions(data || [])
    return data
  }

  async function loadFixedPaid() {
    if (!cycle) return
    const { data, error } = await supabase
      .from('cycle_fixed_paid')
      .select('category_id')
      .eq('user_id', user.id)
      .eq('cycle_key', cycle.key)
    if (error) throw error
    setFixedPaid((data || []).map(d => d.category_id))
    return data
  }

  // Earlier cycles' lines: when each bill usually goes off, and from where
  async function loadRecent() {
    const keys = cycles.slice(1, 4).map(c => c.key)
    if (!keys.length) { setRecentTx([]); return }
    const sets = await Promise.all(keys.map(k => getTransactionsForCycle(k)))
    setRecentTx(sets)
    return sets
  }

  async function loadPaydays() {
    const { data, error } = await supabase
      .from('cycle_paydays')
      .select('*')
      .eq('user_id', user.id)
      .order('pay_date')
    if (error) throw error
    setPaydays(data || [])
    return data
  }

  async function loadPlannedItems() {
    const { data, error } = await supabase
      .from('cycle_planned_items')
      .select('*, cycle_categories(id, name, icon, type)')
      .eq('user_id', user.id)
      .in('status', ['planned', 'done'])
      .order('expected_date')
    if (error) throw error
    const rows = data || []
    setPlannedItems(rows.filter(r => r.status === 'planned'))
    setDonePlannedItems(rows.filter(r => r.status === 'done')
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')))
    return data
  }

  async function loadBudgetHistory() {
    const { data, error } = await supabase
      .from('cycle_category_budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('effective_from')
    if (error) throw error
    setBudgetHistory(data || [])
    return data
  }

  // Change a category's monthly limit from a given cycle onwards (default: the
  // current one). Earlier cycles keep the limit that applied to them.
  async function setCategoryBudget(categoryId, amount, effectiveFrom = cycle.key) {
    const { error } = await supabase
      .from('cycle_category_budgets')
      .upsert({ user_id: user.id, category_id: categoryId, effective_from: effectiveFrom, amount },
        { onConflict: 'category_id,effective_from' })
    if (error) throw error
    if (effectiveFrom >= cycle.key) {
      const { data, error: cErr } = await supabase
        .from('cycle_categories')
        .update({ budget_amount: amount }).eq('id', categoryId).eq('user_id', user.id)
        .select().single()
      if (cErr) throw cErr
      setCategories(prev => prev.map(c => c.id === categoryId ? data : c))
    }
    await loadBudgetHistory()
  }

  async function updatePlannedItem(id, payload) {
    const { error } = await supabase
      .from('cycle_planned_items')
      .update(payload).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await loadPlannedItems()
  }

  async function loadAccounts() {
    const { data, error } = await supabase
      .from('cycle_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order')
    if (error) throw error
    setAccounts(data || [])
    return data
  }

  async function addAccount(payload) {
    const { data, error } = await supabase
      .from('cycle_accounts')
      .insert({ user_id: user.id, ...payload, sort_order: accounts.length })
      .select().single()
    if (error) throw error
    setAccounts(prev => [...prev, data])
    return data
  }

  async function updateAccount(id, payload) {
    const { data, error } = await supabase
      .from('cycle_accounts')
      .update(payload).eq('id', id).eq('user_id', user.id)
      .select().single()
    if (error) throw error
    setAccounts(prev => prev.map(a => a.id === id ? data : a))
    return data
  }

  async function deleteAccount(id) {
    const { error } = await supabase
      .from('cycle_accounts')
      .delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    setAccounts(prev => prev.filter(a => a.id !== id))
  }

  // Fetch transactions for any cycle key (used by Reports + Transactions history)
  async function getTransactionsForCycle(cycleKey) {
    const { data, error } = await supabase
      .from('cycle_transactions')
      .select(`*, cycle_categories(id, name, icon, colour, budget_amount, type)`)
      .eq('user_id', user.id)
      .eq('cycle_key', cycleKey)
      .order('transaction_date', { ascending: false })
    if (error) throw error
    return data || []
  }

  async function loadSavingGoals() {
    const { data, error } = await supabase
      .from('cycle_saving_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error
    setSavingGoals(data || [])
    return data
  }

  // ── Mutations ────────────────────────────────────────────────

  async function addTransaction(payload) {
    const { data, error } = await supabase
      .from('cycle_transactions')
      .insert({
        user_id:          user.id,
        amount:           payload.amount,
        category_id:      payload.category_id || null,
        account:          payload.account || null,
        account_id:       accounts.find(a => a.name === payload.account)?.id || null,
        notes:            payload.notes || null,
        transaction_date: payload.date || new Date().toISOString().split('T')[0],
        cycle_key:        null,   // filled by the database from your paydays
      })
      .select(`*, cycle_categories(id, name, icon, colour, budget_amount, type)`)
      .single()
    if (error) throw error
    if (data.cycle_key === cycle.key) setTransactions(prev => [data, ...prev])
    return data
  }

  async function updateTransaction(id, payload) {
    const { data, error } = await supabase
      .from('cycle_transactions')
      .update({
        amount:           payload.amount,
        category_id:      payload.category_id || null,
        account:          payload.account || null,
        notes:            payload.notes || null,
        transaction_date: payload.date,
        cycle_key:        null,   // re-derived from the (possibly new) date
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`*, cycle_categories(id, name, icon, colour, budget_amount, type)`)
      .single()
    if (error) throw error
    setTransactions(prev => data.cycle_key === cycle.key
      ? prev.map(t => t.id === id ? data : t)
      : prev.filter(t => t.id !== id))
    return data
  }

  async function deleteTransaction(id) {
    const { error } = await supabase
      .from('cycle_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  // Tick a fixed bill as paid this cycle (for when the debit is not on an
  // imported statement yet); tick again to undo.
  async function toggleFixedPaid(categoryId) {
    if (fixedPaid.includes(categoryId)) {
      const { error } = await supabase
        .from('cycle_fixed_paid')
        .delete()
        .eq('user_id', user.id).eq('category_id', categoryId).eq('cycle_key', cycle.key)
      if (error) throw error
      setFixedPaid(prev => prev.filter(id => id !== categoryId))
    } else {
      const { error } = await supabase
        .from('cycle_fixed_paid')
        .insert({ user_id: user.id, category_id: categoryId, cycle_key: cycle.key })
      if (error) throw error
      setFixedPaid(prev => [...prev, categoryId])
    }
  }

  // Net spend in a category this cycle (refunds reduce it)
  function getCategorySpent(categoryId) {
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
    return spendByCategory(transactions, catMap)[categoryId] || 0
  }

  async function addCategory(payload) {
    const { data, error } = await supabase
      .from('cycle_categories')
      .insert({
        user_id:       user.id,
        name:          payload.name,
        type:          payload.type || 'predicted',
        icon:          payload.icon || null,
        colour:        payload.colour || null,
        budget_amount: payload.budget_amount || null,
        due_day:       payload.due_day || null,
        pay_account_id: payload.pay_account_id || null,
        sort_order:    categories.length,
      })
      .select().single()
    if (error) throw error
    setCategories(prev => [...prev, data])
    if (data.budget_amount != null && cycle) {
      await supabase.from('cycle_category_budgets').upsert(
        { user_id: user.id, category_id: data.id, effective_from: cycle.key, amount: data.budget_amount },
        { onConflict: 'category_id,effective_from' })
      await loadBudgetHistory()
    }
    return data
  }

  async function updateCategory(id, payload) {
    const before = categories.find(c => c.id === id)
    const { data, error } = await supabase
      .from('cycle_categories')
      .update(payload).eq('id', id).eq('user_id', user.id)
      .select().single()
    if (error) throw error
    setCategories(prev => prev.map(c => c.id === id ? data : c))
    // A new limit applies from this cycle on; earlier cycles keep theirs
    const oldAmt = before?.budget_amount == null ? null : parseFloat(before.budget_amount)
    const newAmt = data.budget_amount == null ? null : parseFloat(data.budget_amount)
    if (newAmt != null && newAmt !== oldAmt && cycle) {
      await supabase.from('cycle_category_budgets').upsert(
        { user_id: user.id, category_id: id, effective_from: cycle.key, amount: newAmt },
        { onConflict: 'category_id,effective_from' })
      await loadBudgetHistory()
    }
    return data
  }

  // "Deleting" a category archives it: it disappears from the app but keeps its
  // transactions, budget history and payee rules, so it can be restored.
  async function deleteCategory(id) {
    const { error } = await supabase
      .from('cycle_categories')
      .update({ is_active: false }).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await loadCategories()
  }

  async function restoreCategory(id) {
    const { error } = await supabase
      .from('cycle_categories')
      .update({ is_active: true }).eq('id', id).eq('user_id', user.id)
    if (error) throw error
    await loadCategories()
  }

  async function addSavingGoal(payload) {
    const { data, error } = await supabase
      .from('cycle_saving_goals')
      .insert({ user_id: user.id, ...payload })
      .select().single()
    if (error) throw error
    setSavingGoals(prev => [...prev, data])
    return data
  }

  async function updateSavingGoal(id, payload) {
    const { data, error } = await supabase
      .from('cycle_saving_goals')
      .update(payload).eq('id', id).eq('user_id', user.id)
      .select().single()
    if (error) throw error
    setSavingGoals(prev => prev.map(g => g.id === id ? data : g))
    return data
  }

  async function contributeSavings(goalId, amount, type = 'contribution') {
    const { error } = await supabase
      .from('cycle_saving_transactions')
      .insert({
        user_id:   user.id,
        goal_id:   goalId,
        amount,
        type,
        cycle_key: cycle?.key || null,
      })
    if (error) throw error
    // Trigger will update current_amount — reload goal
    await loadSavingGoals()
  }

  const value = {
    loading, error,
    categories, transactions, sheet, recentTx, fixedPaid,
    savingGoals, accounts, cycle, cycles, paydays, plannedItems, donePlannedItems, budgetHistory, totals,
    // helpers
    getCategorySpent,
    // actions
    refresh: loadAll,
    getTransactionsForCycle,
    addTransaction, updateTransaction, deleteTransaction,
    toggleFixedPaid,
    addCategory, updateCategory, deleteCategory, restoreCategory, archivedCategories,
    addSavingGoal, updateSavingGoal, contributeSavings,
    addAccount, updateAccount, deleteAccount,
    updatePlannedItem, setCategoryBudget,
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget() {
  const ctx = useContext(BudgetContext)
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider')
  return ctx
}

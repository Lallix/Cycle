import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { getCurrentCycle, getCycleKey } from '../lib/cycle'

const BudgetContext = createContext(null)

export function BudgetProvider({ children }) {
  const { user, profile } = useAuth()
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const [categories, setCategories]           = useState([])
  const [transactions, setTransactions]       = useState([])
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [paidLog, setPaidLog]                 = useState([])   // cycle_recurring_paid_log
  const [incomeRecords, setIncomeRecords]     = useState([])
  const [savingGoals, setSavingGoals]         = useState([])

  const [cycle, setCycle]   = useState(null)
  const [totals, setTotals] = useState({
    income: 0, spent: 0, fixedTotal: 0, fixedPaid: 0,
    variableSpent: 0, variableBudget: 0, unbudgetedSpent: 0,
    remaining: 0, savingsTotal: 0,
  })

  // ── Derive cycle from profile ────────────────────────────────
  useEffect(() => {
    if (profile) {
      setCycle(getCurrentCycle(profile.cycle_start_day || 25))
    }
  }, [profile])

  useEffect(() => {
    if (user && cycle) loadAll()
    else if (!user) { resetData(); setLoading(false) }
  }, [user, cycle?.key])

  useEffect(() => {
    if (cycle) computeTotals()
  }, [transactions, recurringExpenses, paidLog, categories, incomeRecords, cycle])

  function resetData() {
    setCategories([]); setTransactions([]); setRecurringExpenses([])
    setPaidLog([]); setIncomeRecords([]); setSavingGoals([])
    setTotals({ income:0, spent:0, fixedTotal:0, fixedPaid:0,
      variableSpent:0, variableBudget:0, unbudgetedSpent:0, remaining:0, savingsTotal:0 })
  }

  async function loadAll() {
    setLoading(true); setError(null)
    try {
      await Promise.all([
        loadCategories(), loadTransactions(), loadRecurringExpenses(),
        loadPaidLog(), loadIncome(), loadSavingGoals(),
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
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error
    setCategories(data || [])
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

  async function loadRecurringExpenses() {
    const { data, error } = await supabase
      .from('cycle_recurring_expenses')
      .select(`*, cycle_categories(id, name, icon, colour)`)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error
    setRecurringExpenses(data || [])
    return data
  }

  async function loadPaidLog() {
    if (!cycle) return
    const { data, error } = await supabase
      .from('cycle_recurring_paid_log')
      .select('recurring_id, paid_at')
      .eq('user_id', user.id)
      .eq('cycle_key', cycle.key)
    if (error) throw error
    setPaidLog(data || [])
    return data
  }

  async function loadIncome() {
    const { data, error } = await supabase
      .from('cycle_income')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
    if (error) throw error
    setIncomeRecords(data || [])
    return data
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

  // ── Computed totals ──────────────────────────────────────────

  function computeTotals() {
    const income = incomeRecords.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
    const paidSet = new Set(paidLog.map(p => p.recurring_id))

    const fixedTotal = recurringExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
    const fixedPaid  = recurringExpenses
      .filter(e => paidSet.has(e.id))
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0)

    let variableSpent = 0, variableBudget = 0, unbudgetedSpent = 0

    const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

    transactions.forEach(t => {
      const amt = parseFloat(t.amount || 0)
      const cat = catMap[t.category_id]
      if (cat?.type === 'variable') variableSpent += amt
      else unbudgetedSpent += amt
    })

    categories.filter(c => c.type === 'variable').forEach(c => {
      variableBudget += parseFloat(c.budget_amount || 0)
    })

    const savingsTotal = savingGoals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0)
    const spent = variableSpent + unbudgetedSpent
    const remaining = income - fixedTotal - spent

    setTotals({ income, spent, fixedTotal, fixedPaid, variableSpent,
      variableBudget, unbudgetedSpent, remaining, savingsTotal })
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
        notes:            payload.notes || null,
        transaction_date: payload.date || new Date().toISOString().split('T')[0],
        cycle_key:        cycle.key,
      })
      .select(`*, cycle_categories(id, name, icon, colour, budget_amount, type)`)
      .single()
    if (error) throw error
    setTransactions(prev => [data, ...prev])
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
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`*, cycle_categories(id, name, icon, colour, budget_amount, type)`)
      .single()
    if (error) throw error
    setTransactions(prev => prev.map(t => t.id === id ? data : t))
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

  async function toggleRecurringPaid(expenseId) {
    const isPaid = paidLog.some(p => p.recurring_id === expenseId)

    if (isPaid) {
      const { error } = await supabase
        .from('cycle_recurring_paid_log')
        .delete()
        .eq('user_id', user.id)
        .eq('recurring_id', expenseId)
        .eq('cycle_key', cycle.key)
      if (error) throw error
      setPaidLog(prev => prev.filter(p => p.recurring_id !== expenseId))
    } else {
      const { data, error } = await supabase
        .from('cycle_recurring_paid_log')
        .insert({ user_id: user.id, recurring_id: expenseId, cycle_key: cycle.key })
        .select()
        .single()
      if (error) throw error
      setPaidLog(prev => [...prev, data])
    }
  }

  function isRecurringPaid(expenseId) {
    return paidLog.some(p => p.recurring_id === expenseId)
  }

  async function addRecurringExpense(payload) {
    const { data, error } = await supabase
      .from('cycle_recurring_expenses')
      .insert({
        user_id:     user.id,
        name:        payload.name,
        amount:      payload.amount,
        account:     payload.account || null,
        due_day:     payload.due_day || null,
        category_id: payload.category_id || null,
        notes:       payload.notes || null,
        sort_order:  recurringExpenses.length,
      })
      .select(`*, cycle_categories(id, name, icon, colour)`)
      .single()
    if (error) throw error
    setRecurringExpenses(prev => [...prev, data])
    return data
  }

  async function updateRecurringExpense(id, payload) {
    const { data, error } = await supabase
      .from('cycle_recurring_expenses')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`*, cycle_categories(id, name, icon, colour)`)
      .single()
    if (error) throw error
    setRecurringExpenses(prev => prev.map(e => e.id === id ? data : e))
    return data
  }

  async function deleteRecurringExpense(id) {
    const { error } = await supabase
      .from('cycle_recurring_expenses')
      .delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    setRecurringExpenses(prev => prev.filter(e => e.id !== id))
  }

  async function addCategory(payload) {
    const { data, error } = await supabase
      .from('cycle_categories')
      .insert({
        user_id:       user.id,
        name:          payload.name,
        type:          payload.type || 'variable',
        icon:          payload.icon || null,
        colour:        payload.colour || null,
        budget_amount: payload.budget_amount || null,
        sort_order:    categories.length,
      })
      .select().single()
    if (error) throw error
    setCategories(prev => [...prev, data])
    return data
  }

  async function updateCategory(id, payload) {
    const { data, error } = await supabase
      .from('cycle_categories')
      .update(payload).eq('id', id).eq('user_id', user.id)
      .select().single()
    if (error) throw error
    setCategories(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  async function deleteCategory(id) {
    const { error } = await supabase
      .from('cycle_categories')
      .delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  async function updateIncome(id, amount) {
    const { data, error } = await supabase
      .from('cycle_income')
      .update({ amount }).eq('id', id).eq('user_id', user.id)
      .select().single()
    if (error) throw error
    setIncomeRecords(prev => prev.map(i => i.id === id ? data : i))
    return data
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
    categories, transactions, recurringExpenses, paidLog,
    incomeRecords, savingGoals, cycle, totals,
    // helpers
    isRecurringPaid,
    // actions
    refresh: loadAll,
    addTransaction, updateTransaction, deleteTransaction,
    toggleRecurringPaid,
    addRecurringExpense, updateRecurringExpense, deleteRecurringExpense,
    addCategory, updateCategory, deleteCategory,
    updateIncome,
    addSavingGoal, updateSavingGoal, contributeSavings,
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget() {
  const ctx = useContext(BudgetContext)
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider')
  return ctx
}

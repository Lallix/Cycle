// Planned vs actual. Budgets change over time (cycle_category_budgets), so a
// cycle is always judged against the limits that applied when it started.
import { normaliseType, spendByCategory, computeCycleTotals } from './totals.js'

const num = v => parseFloat(v || 0)

// { categoryId: amount } in force for the cycle starting cycleKey
export function effectiveBudgets(categories, history, cycleKey) {
  const out = {}
  categories.forEach(c => { if (c.budget_amount != null) out[c.id] = num(c.budget_amount) })
  const latest = {}
  history
    .filter(h => h.effective_from <= cycleKey)
    .forEach(h => {
      if (!latest[h.category_id] || h.effective_from > latest[h.category_id].effective_from) latest[h.category_id] = h
    })
  Object.values(latest).forEach(h => { out[h.category_id] = num(h.amount) })
  return out
}

// Round a suggested limit up to the next R50
export const roundUp50 = v => Math.ceil(Math.max(0, v) / 50) * 50

/**
 * Review one finished cycle.
 * cycleTx: transactions of the cycle being reviewed
 * recentTx: arrays of transactions for it and the cycles before it (for suggestions)
 * Returns totals planned vs actual and one row per spending category.
 */
export function reviewCycle({ cycleTx, recentTx, categories, history, cycleKey }) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const plan = effectiveBudgets(categories, history, cycleKey)
  const actual = spendByCategory(cycleTx, catMap)
  const recent = recentTx.map(txs => spendByCategory(txs, catMap))
  const totals = computeCycleTotals({ transactions: cycleTx, categories, budgets: plan })

  const rows = categories
    .map(c => {
      const type = normaliseType(c.type)
      if (!['fixed', 'predicted', 'unplanned'].includes(type)) return null
      const planned = plan[c.id] || 0
      const spent = actual[c.id] || 0
      if (planned === 0 && Math.abs(spent) < 0.01) return null
      const avg = recent.length ? recent.reduce((s, r) => s + (r[c.id] || 0), 0) / recent.length : spent
      return {
        id: c.id, name: c.name, icon: c.icon, type,
        planned, spent, diff: planned - spent,          // + under plan, − over
        recentAverage: avg,
        suggestion: type === 'fixed' ? planned : roundUp50(avg),
      }
    })
    .filter(Boolean)

  const sumBy = (type, key) => rows.filter(r => r.type === type).reduce((s, r) => s + r[key], 0)
  const plannedSpend = ['fixed', 'predicted', 'unplanned'].reduce((s, t) => s + sumBy(t, 'planned'), 0)
  const uncategorised = actual.none || 0

  return {
    income: { planned: totals.incomeExpected, actual: totals.incomeReceived },
    byType: Object.fromEntries(['fixed', 'predicted', 'unplanned'].map(t => [t, { planned: sumBy(t, 'planned'), actual: totals[`${t}Spent`] }])),
    spend: { planned: plannedSpend, actual: totals.spent },
    left: { planned: totals.incomeExpected - plannedSpend, actual: totals.incomeReceived - totals.spent },
    onceOff: totals.onceOff, debt: totals.debt, uncategorised,
    rows: rows.sort((a, b) => a.diff - b.diff),        // biggest overspend first
  }
}

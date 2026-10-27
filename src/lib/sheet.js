// The budget sheet: the plan for one cycle, laid out like the spreadsheet.
// Money in, then fixed, predicted and unplanned spending, each row with its
// budget, what has actually happened this cycle and what is left.
// Every screen that shows a plan or a "still due" figure reads from here.
import { normaliseType, spendByCategory } from './totals.js'

const num = v => parseFloat(v || 0)
export const SHEET_SECTIONS = ['income', 'fixed', 'predicted', 'unplanned']

// Money in per income category (net: refunds out of an income category reduce it)
function incomeByCategory(transactions, catMap) {
  const out = {}
  transactions.forEach(t => {
    if (normaliseType(catMap[t.category_id]?.type) !== 'income') return
    out[t.category_id] = (out[t.category_id] || 0) + (t.direction === 'in' ? num(t.amount) : -num(t.amount))
  })
  return out
}

// Day of the month each category last went off, from earlier cycles' lines
export function lastPaidDays(recent = []) {
  const last = {}
  recent.flat().forEach(t => {
    if (!t.category_id || t.direction === 'in') return
    if (!last[t.category_id] || t.transaction_date > last[t.category_id]) last[t.category_id] = t.transaction_date
  })
  return Object.fromEntries(Object.entries(last).map(([id, d]) => [id, parseInt(d.slice(8, 10), 10)]))
}

/**
 * categories:  active cycle_categories rows
 * transactions: this cycle's transactions
 * budgets:     optional { categoryId: amount } in force (defaults to budget_amount)
 * paidTicks:   Set of fixed category ids ticked as paid this cycle
 * recent:      arrays of earlier cycles' transactions (to guess due days)
 */
export function buildSheet({ categories, transactions, budgets = null, paidTicks = new Set(), recent = [] }) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const spent = spendByCategory(transactions, catMap)
  const received = incomeByCategory(transactions, catMap)
  const guessedDay = lastPaidDays(recent)
  const lastCycle = recent[0] ? spendByCategory(recent[0], catMap) : {}   // recent[0] = the cycle before this one
  const budgetOf = c => (budgets && c.id in budgets ? num(budgets[c.id]) : num(c.budget_amount))

  const sections = Object.fromEntries(SHEET_SECTIONS.map(s => [s, { key: s, rows: [], budget: 0, actual: 0, left: 0 }]))

  categories.forEach(c => {
    const type = normaliseType(c.type)
    const sec = sections[type]
    if (!sec) return                       // once-off, debt and transfers are not part of the plan
    const budget = budgetOf(c)
    const actual = type === 'income' ? (received[c.id] || 0) : (spent[c.id] || 0)
    const row = {
      id: c.id, name: c.name, icon: c.icon, type, budget, actual,
      left: budget - actual, category: c,
    }
    if (type === 'fixed') {
      row.dueDay = c.due_day || guessedDay[c.id] || null
      row.dueDayGuessed = !c.due_day && !!guessedDay[c.id]
      row.payAccountId = c.pay_account_id || null
      row.autoPaid = budget > 0 ? actual >= budget - 1 : actual > 0
      row.ticked = paidTicks.has(c.id)
      row.paid = row.autoPaid || row.ticked
      row.stillDue = row.paid ? 0 : Math.max(0, budget - actual)
      // The bill went off at a different amount than budgeted: higher, or lower
      // and the same as last cycle (so not just the first of two halves)
      const differs = actual > 0.5 && Math.abs(actual - budget) > 1
      const steady = Math.abs((lastCycle[c.id] || 0) - actual) < 1
      row.suggest = differs && (actual > budget || steady) ? Math.round(actual * 100) / 100 : null
    }
    sec.rows.push(row)
  })

  // Spending with no category counts as unplanned
  if ((spent.none || 0) > 0.005) {
    sections.unplanned.rows.push({
      id: 'none', name: 'Uncategorised', icon: '❓', type: 'unplanned',
      budget: 0, actual: spent.none, left: -spent.none, uncategorised: true,
    })
  }

  SHEET_SECTIONS.forEach(s => {
    const sec = sections[s]
    sec.budget = sec.rows.reduce((t, r) => t + r.budget, 0)
    sec.actual = sec.rows.reduce((t, r) => t + r.actual, 0)
    sec.left = sec.budget - sec.actual
  })
  sections.fixed.stillDue = sections.fixed.rows.reduce((t, r) => t + r.stillDue, 0)

  const planned = sections.fixed.budget + sections.predicted.budget + sections.unplanned.budget
  return {
    sections,
    income: sections.income.budget,
    planned,
    toAllocate: sections.income.budget - planned,   // + room left to plan, − planned more than comes in
  }
}

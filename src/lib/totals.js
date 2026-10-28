// Cycle totals by spend type.
//
//   income     money earned this cycle (salary, fuel claims); before payday
//              lands, the income budgets (expected money in) are used instead
//   fixed      spent so far + what is still due (each fixed category's budget
//              minus what has gone off) — so "left" never counts the bond
//              as spare money just because it has not been paid yet
//   predicted  spent in limit categories (groceries, fuel …)
//   unplanned  everything else you spend, including uncategorised lines
//   onceOff    net once-off money (tax rebate in, car purchase out)
//   debt       net borrowing (+ loan in, − lump-sum repayment)
// Transfers between your own accounts are ignored. Money coming back into a
// spending category (a refund) reduces that category's spend.

export function normaliseType(type) {
  if (type === 'variable') return 'predicted'
  if (type === 'unbudgeted' || !type) return 'unplanned'
  return type
}

const num = v => parseFloat(v || 0)

// A line's type: from the category list, else from the category the line was
// loaded with (a removed category is not in the list but its history counts)
export const typeOf = (tx, catMap) =>
  normaliseType(catMap[tx.category_id]?.type ?? (tx.cycle_categories || tx.categories)?.type)

// Net spend per category id (out − refunds in), for spending categories only.
export function spendByCategory(transactions, catMap) {
  const out = {}
  transactions.forEach(t => {
    const type = typeOf(t, catMap)
    if (!['fixed', 'predicted', 'unplanned'].includes(type)) return
    const key = t.category_id || 'none'
    out[key] = (out[key] || 0) + (t.direction === 'in' ? -num(t.amount) : num(t.amount))
  })
  return out
}

export function computeCycleTotals({ transactions, categories, budgets = null, savingGoals = [] }) {
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))
  const t = { income: 0, fixed: 0, predicted: 0, unplanned: 0, onceOff: 0, debt: 0 }

  transactions.forEach(tx => {
    const type = typeOf(tx, catMap)
    const signed = tx.direction === 'in' ? num(tx.amount) : -num(tx.amount)
    if (type === 'transfer') return
    if (type === 'income') t.income += signed
    else if (type === 'once_off') t.onceOff += signed
    else if (type === 'debt') t.debt += signed
    else t[type] -= signed            // spending shown as a positive number
  })

  const byCat = spendByCategory(transactions, catMap)
  // budgets: the amounts in force for this cycle (budget history); else today's
  const amountOf = c => (budgets && c.id in budgets ? num(budgets[c.id]) : num(c.budget_amount))
  const budgetOf = type => categories
    .filter(c => normaliseType(c.type) === type)
    .reduce((s, c) => s + amountOf(c), 0)

  const fixedPlanned = budgetOf('fixed')
  const fixedDue = categories
    .filter(c => normaliseType(c.type) === 'fixed' && amountOf(c) > 0)
    .reduce((s, c) => s + Math.max(0, amountOf(c) - (byCat[c.id] || 0)), 0)

  const incomeExpected = budgetOf('income')
  const income = Math.max(t.income, incomeExpected)
  const spent = t.fixed + t.predicted + t.unplanned
  const remaining = income - spent - fixedDue

  return {
    income, incomeReceived: t.income, incomeExpected,
    spent, remaining,
    fixedSpent: t.fixed, fixedDue, fixedPlanned,
    predictedSpent: t.predicted, predictedBudget: budgetOf('predicted'),
    unplannedSpent: t.unplanned, unplannedBudget: budgetOf('unplanned'),
    onceOff: t.onceOff, debt: t.debt,
    savingsTotal: savingGoals.reduce((s, g) => s + num(g.current_amount), 0),
    // names the older screens still read
    fixedTotal: t.fixed + fixedDue, fixedPaid: t.fixed,
    variableSpent: t.predicted, variableBudget: budgetOf('predicted'),
    unbudgetedSpent: t.unplanned,
  }
}

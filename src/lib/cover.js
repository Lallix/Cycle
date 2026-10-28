// "Cover your accounts": what each bank still has to pay out this cycle
// (debit orders, bills, subscriptions) against the money sitting in it.
//
// A recurring payment is a fixed-type category. It belongs to the bank of the
// account set on it on the budget sheet, else to the bank that paid it most
// often over the last few cycles (the bond went off Capitec main
// one month and the Capitec card the next — both are Capitec). What it should
// cost is its budget, or its recent average when it has none; what is still
// to go off is that minus what has already been paid this cycle.
import { normaliseType } from './totals.js'

const num = v => parseFloat(v || 0)
const outflow = t => (t.direction === 'in' ? -num(t.amount) : num(t.amount))

// Closing balance of the latest day: several lines can share a date, so pick
// the one no other line on that day continues from (balance − amount = previous).
export function latestBalance(rows) {
  const withBal = rows.filter(r => r.balance != null)
  if (!withBal.length) return null
  const lastDate = withBal.reduce((d, r) => (r.transaction_date > d ? r.transaction_date : d), '')
  const day = withBal.filter(r => r.transaction_date === lastDate)
  const signed = r => (r.direction === 'in' ? num(r.amount) : -num(r.amount))
  const opens = new Set(day.map(r => (num(r.balance) - signed(r)).toFixed(2)))
  const end = day.find(r => !opens.has(num(r.balance).toFixed(2))) || day[day.length - 1]
  return { balance: num(end.balance), date: lastDate }
}

/**
 * accounts:   cycle_accounts rows ({ id, name, bank, kind, is_default })
 * categories: cycle_categories rows (type, budget_amount)
 * recent:     arrays of transactions for the last few finished cycles
 * current:    transactions of the running cycle
 * balances:   { accountId: { balance, date } }
 * paidTicks:  Set of category ids ticked as paid this cycle
 * Returns groups (one per bank), biggest top-up first.
 */
export function coverByBank({ accounts, categories, recent, current, balances, paidTicks = new Set() }) {
  const accById = Object.fromEntries(accounts.map(a => [a.id, a]))
  const bankOf = id => accById[id]?.bank || accById[id]?.name || null
  const fallbackBank = (accounts.find(a => a.is_default) || accounts[0])?.bank || null
  const fixed = categories.filter(c => normaliseType(c.type) === 'fixed')

  const items = fixed.map(c => {
    const hits = recent.flat().filter(t => t.category_id === c.id && t.direction !== 'in')
    const byBank = {}
    hits.forEach(t => { const b = bankOf(t.account_id); if (b) byBank[b] = (byBank[b] || 0) + 1 })
    const bank = (c.pay_account_id && bankOf(c.pay_account_id))
      || Object.entries(byBank).sort((a, b) => b[1] - a[1])[0]?.[0]
      || (num(c.budget_amount) > 0 ? fallbackBank : null)
    if (!bank) return null

    const perCycle = recent.map(txs => txs.filter(t => t.category_id === c.id).reduce((s, t) => s + outflow(t), 0))
    const used = perCycle.filter(v => v > 0)
    const average = used.length ? used.reduce((s, v) => s + v, 0) / used.length : 0
    const expected = num(c.budget_amount) > 0 ? num(c.budget_amount) : average
    if (expected < 1) return null

    const onStatement = Math.max(0, current.filter(t => t.category_id === c.id).reduce((s, t) => s + outflow(t), 0))
    // Ticked as paid but not on a statement yet: counts as paid in full
    const paid = paidTicks.has(c.id) ? Math.max(onStatement, expected) : onStatement
    const last = hits.map(t => t.transaction_date).sort().pop()
    return {
      id: c.id, name: c.name, icon: c.icon, bank, expected, paid,
      remaining: Math.max(0, expected - paid),
      dueDay: c.due_day || (last ? parseInt(last.slice(8, 10), 10) : null),
    }
  }).filter(Boolean)

  const banks = [...new Set(items.map(i => i.bank))]
  return banks.map(bank => {
    const list = items.filter(i => i.bank === bank).sort((a, b) => b.remaining - a.remaining)
    const accs = accounts.filter(a => (a.bank || a.name) === bank)
    const cash = accs.filter(a => a.kind !== 'credit_card' && a.kind !== 'loan' && a.kind !== 'home_loan')
    const cards = accs.filter(a => a.kind === 'credit_card')
    const available = cash.reduce((s, a) => s + (balances[a.id]?.balance ?? 0), 0)
    const owed = cards.reduce((s, a) => s + Math.min(0, balances[a.id]?.balance ?? 0), 0)
    const asOf = cash.map(a => balances[a.id]?.date).filter(Boolean).sort()[0] || null
    const remaining = list.reduce((s, i) => s + i.remaining, 0)
    return {
      bank, items: list, accounts: accs,
      expected: list.reduce((s, i) => s + i.expected, 0),
      paid: list.reduce((s, i) => s + Math.min(i.paid, i.expected), 0),
      remaining, available, owed, asOf,
      topUp: Math.max(0, remaining - Math.max(0, available)),
    }
  }).sort((a, b) => b.topUp - a.topUp || b.remaining - a.remaining)
}

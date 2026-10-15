// Calendar-month view of a year: money in, where it went (by spend type and
// category) and month-end account balances. Pure functions — the page loads
// the rows, these shape them.
import { normaliseType } from './totals.js'

const num = v => parseFloat(v || 0)
export const monthKey = date => String(date).slice(0, 7)          // 'YYYY-MM'
export const SPEND_TYPES = ['fixed', 'predicted', 'unplanned']

function signed(tx) {
  return tx.direction === 'in' ? num(tx.amount) : -num(tx.amount)
}

/**
 * rows: transactions with { transaction_date, amount, direction, category_id,
 *       cycle_categories: { id, name, type, icon } }
 * months: ['2026-01', …] in order
 * Returns { summary: { [month]: {...} }, categories: [{ id, name, icon, type, byMonth, total }] }
 * Spending is shown positive (refunds reduce it); income positive;
 * once-off and debt keep their sign (+ in, − out). Transfers are left out.
 */
export function summariseYear(rows, months) {
  const blank = () => ({ income: 0, fixed: 0, predicted: 0, unplanned: 0, onceOff: 0, debt: 0 })
  const summary = Object.fromEntries(months.map(m => [m, blank()]))
  const cats = new Map()

  rows.forEach(tx => {
    const m = monthKey(tx.transaction_date)
    if (!summary[m]) return
    const cat = tx.cycle_categories
    const type = normaliseType(cat?.type)
    if (type === 'transfer') return
    const s = signed(tx)
    const value = SPEND_TYPES.includes(type) ? -s : s

    if (type === 'income') summary[m].income += s
    else if (type === 'once_off') summary[m].onceOff += s
    else if (type === 'debt') summary[m].debt += s
    else summary[m][type] += value

    const id = cat?.id || 'none'
    if (!cats.has(id)) {
      cats.set(id, { id, name: cat?.name || 'Uncategorised', icon: cat?.icon || '❓', type, byMonth: {}, total: 0 })
    }
    const c = cats.get(id)
    c.byMonth[m] = (c.byMonth[m] || 0) + value
    c.total += value
  })

  months.forEach(m => {
    const r = summary[m]
    r.spent = r.fixed + r.predicted + r.unplanned
    r.leftOver = r.income - r.spent
    r.afterAll = r.leftOver + r.onceOff + r.debt
  })

  return { summary, categories: [...cats.values()] }
}

// Average over the months given (pass only complete months).
export function averageOf(values) {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0
}

/**
 * Month-end balance per account.
 * txRows: { account_id, transaction_date, amount, direction, balance } (imported lines carry a balance)
 * snapshots: cycle_account_balances rows { account_id, as_at, balance } — typed in or from statements
 * Returns { [accountId]: { [month]: balance } }, carrying the last known balance forward.
 */
export function monthEndBalances(txRows, snapshots, months) {
  const points = {}   // accountId → [{ date, balance, rank }]
  const add = (acc, date, balance, rank) => {
    if (!acc || balance == null) return
    ;(points[acc] ||= []).push({ date: String(date).slice(0, 10), balance: num(balance), rank })
  }

  // Several lines can share a date; the day's closing balance is the one no
  // other line on that day continues from (balance − its own amount = previous).
  const byDay = new Map()
  txRows.forEach(t => {
    if (t.balance == null || !t.account_id) return
    const k = `${t.account_id}|${String(t.transaction_date).slice(0, 10)}`
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k).push(t)
  })
  byDay.forEach(list => {
    const opens = new Set(list.map(t => (num(t.balance) - signed(t)).toFixed(2)))
    const end = list.find(t => !opens.has(num(t.balance).toFixed(2))) || list[list.length - 1]
    add(end.account_id, end.transaction_date, end.balance, 0)
  })
  snapshots.forEach(s => add(s.account_id, s.as_at, s.balance, 1))   // a snapshot wins on its own date

  const out = {}
  Object.entries(points).forEach(([acc, list]) => {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.rank - b.rank)
    out[acc] = {}
    let i = 0, last = null
    months.forEach(m => {
      while (i < list.length && list[i].date.slice(0, 7) <= m) last = list[i++].balance
      if (last != null) out[acc][m] = last
    })
  })
  return out
}

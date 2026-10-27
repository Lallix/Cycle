// Expenses added by hand (the + button) carry no fingerprint, so a statement
// that covers them would add them a second time. A statement line takes the
// place of a hand-added one when it is on the same account, goes the same way,
// has the same amount and is dated within a few days of it (card purchases
// often post a day or two later). Each hand-added line is matched at most
// once, to the statement line closest in date.

export const MATCH_DAYS = 3

const dayNumber = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000

export function shiftDate(iso, days) {
  return new Date((dayNumber(iso) + days) * 86400000).toISOString().slice(0, 10)
}

// A hand-added line belongs to the account being imported when it names it
// (the name is what you pick, and an edit changes only the name), or, naming
// none, is linked to it or to no account at all.
function sameAccount(m, account) {
  if (m.account) return m.account === account.name
  return !m.account_id || m.account_id === account.id
}

/**
 * lines:   statement lines { date, amount, direction } (only the new ones)
 * manual:  hand-added transactions { id, transaction_date, amount, direction, account, account_id }
 * account: the cycle_accounts row being imported into
 * Returns Map(line index → hand-added transaction it replaces).
 */
export function matchManual(lines, manual, account, days = MATCH_DAYS) {
  const pairs = []
  lines.forEach((l, i) => {
    manual.forEach(m => {
      if ((m.direction || 'out') !== l.direction) return
      if (Math.abs(parseFloat(m.amount) - l.amount) > 0.005) return
      if (!sameAccount(m, account)) return
      const gap = Math.abs(dayNumber(l.date) - dayNumber(m.transaction_date))
      if (gap <= days) pairs.push({ i, m, gap })
    })
  })

  pairs.sort((a, b) => a.gap - b.gap)
  const out = new Map()
  const used = new Set()
  pairs.forEach(({ i, m }) => {
    if (out.has(i) || used.has(m.id)) return
    out.set(i, m)
    used.add(m.id)
  })
  return out
}

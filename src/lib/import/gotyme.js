// GoTyme / TymeBank statement (PDF). The PDF is read into positioned text
// items ({ x, y, str } per page, see pdfText.js); this file turns them into
// statement lines. Layout of the transactions table:
//
//   Date (x≈27) | Details (x 79–250, wraps above and below the date line)
//   Fees (−) | Credits (+) | Debits (−) | Running balance   ← on the date line
//
// Every line is checked against the running balance and the statement's
// opening and closing balance before anything is returned.

const DATE_RE = /^(\d{2}) ([A-Z][a-z]{2}) (\d{4})$/
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 }
// The e-stamp box in the page footer overlaps the table
const STAMP_RE = /^(GoTyme Bank|e-Stamp|Branch: ?\d+|\d{2} [A-Z][a-z]{2} \d{4})$/

const money = s => (s === '-' || s === '' ? 0 : parseFloat(s.replace(/[R,\s]/g, '')))
const isoDate = s => {
  const [, d, mon, y] = s.match(DATE_RE)
  return `${y}-${String(MONTHS[mon]).padStart(2, '0')}-${d}`
}

function findValueRight(items, labelRe) {
  const lab = items.find(i => labelRe.test(i.str))
  if (!lab) return null
  const right = items
    .filter(i => Math.abs(i.y - lab.y) <= 2 && i.x > lab.x)
    .sort((a, b) => a.x - b.x)[0]
  return right?.str ?? null
}

export function isGoTymeStatement(pages) {
  const all = pages.flatMap(p => p.items)
  return all.some(i => /gotyme/i.test(i.str)) && all.some(i => i.str.trim() === 'Running Balance')
}

/**
 * pages: [{ items: [{ x, y, str }] }] in page order (y grows upwards, as in PDF space)
 * Returns { lines, pending: [], accountNumber, opening, closing, period }
 */
export function parseGoTyme(pages) {
  const first = pages[0]?.items || []
  const accountNumber = (findValueRight(first, /^Account Number:?$/) || '').replace(/\D/g, '')
  const opening = money(findValueRight(first, /^Opening balance$/) || '')
  const closing = money(findValueRight(first, /^Closing balance$/) || '')
  const period = findValueRight(first, /^Period:?$/)
  if (!accountNumber) throw new Error('Could not find the account number on this statement.')

  const lines = []
  pages.forEach(({ items }) => {
    const header = items.find(i => i.str.trim() === 'Running Balance')
    if (!header) return
    const footer = items.find(i => /^\*All bank fees/.test(i.str))
    const cols = Object.fromEntries(['Fees*(-)', 'Credits (+)', 'Debits (-)', 'Running Balance']
      .map(h => [h, items.find(i => i.str.trim() === h && Math.abs(i.y - header.y) <= 2)?.x]))
    const table = items.filter(i => i.y < header.y - 2 && (!footer || i.y > footer.y + 2) && i.str.trim())

    const anchors = table.filter(i => i.x < 60 && DATE_RE.test(i.str.trim())).sort((a, b) => b.y - a.y)
    const detailsX = items.find(i => i.str.trim() === 'Details' && Math.abs(i.y - header.y) <= 2)?.x ?? 79
    const amountX = cols['Fees*(-)'] ?? 250

    const rows = anchors.map(a => ({ anchor: a, details: [], nums: [] }))
    table.forEach(i => {
      if (anchors.includes(i)) return
      const s = i.str.trim()
      if (i.x >= amountX - 4) {
        const row = rows.find(r => Math.abs(r.anchor.y - i.y) <= 2)
        if (row) row.nums.push(i)
        return
      }
      if (i.x < detailsX - 4 || STAMP_RE.test(s) && i.x > detailsX + 100) return
      // a wrapped description line belongs to the nearest date line
      let best = null
      rows.forEach(r => { if (!best || Math.abs(r.anchor.y - i.y) < Math.abs(best.anchor.y - i.y)) best = r })
      if (best && Math.abs(best.anchor.y - i.y) <= 14) best.details.push(i)
    })

    // Column edges: halfway between neighbouring header positions
    const edges = [cols['Credits (+)'], cols['Debits (-)'], cols['Running Balance']]
    const colOf = x => (x < edges[0] - 6 ? 'fee' : x < edges[1] - 6 ? 'credit' : x < edges[2] - 6 ? 'debit' : 'balance')

    rows.forEach(r => {
      const v = { fee: 0, credit: 0, debit: 0, balance: null }
      r.nums.forEach(n => {
        const c = colOf(n.x)
        v[c] = c === 'balance' ? money(n.str) : money(n.str)
      })
      const description = r.details.sort((a, b) => b.y - a.y || a.x - b.x).map(d => d.str.trim()).join(' ')
        .replace(/\s+/g, ' ').trim()
      const net = Math.round((v.credit - v.debit - v.fee) * 100) / 100
      if (net === 0) return
      lines.push({
        seq: lines.length,
        date: isoDate(r.anchor.str.trim()),
        txTime: '',
        description,
        bankCategory: '',
        bankParent: '',
        amount: Math.abs(net),
        direction: net > 0 ? 'in' : 'out',
        balance: v.balance,
        accountNumber,
        isFee: v.fee !== 0 && v.credit === 0 && v.debit === 0,
      })
    })
  })

  // Reconcile: every line must follow from the one before, and end on the closing balance
  let bal = opening
  for (const l of lines) {
    bal = Math.round((bal + (l.direction === 'in' ? l.amount : -l.amount)) * 100) / 100
    if (l.balance == null || Math.abs(bal - l.balance) > 0.005) {
      throw new Error(`The statement did not add up at ${l.date} "${l.description.slice(0, 40)}" `
        + `(expected ${bal.toFixed(2)}, statement shows ${l.balance}). Nothing was imported.`)
    }
  }
  if (lines.length && Math.abs(bal - closing) > 0.005) {
    throw new Error(`The lines add up to ${bal.toFixed(2)} but the statement closes at ${closing.toFixed(2)}. Nothing was imported.`)
  }
  return { lines, pending: [], accountNumber, opening, closing, period }
}

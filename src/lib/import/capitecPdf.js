// Capitec statement (PDF): "Main Account Statement" or "Credit Card Transaction
// History". The PDF is read into positioned text items ({ x, y, w, str } per
// page, see pdfText.js); this file turns them into statement lines. Layout of
// the Transaction History table:
//
//   Date | Description | Category | Money In | Money Out | Fee* | Balance
//
// Description and category wrap onto the line below the date line. Amounts
// are right-aligned, so their column is found from where the text ends.
//
// The CSV export lists a fee as its own line; the PDF puts it on the same row
// as the purchase. Those rows are split in two (purchase, then fee) so the PDF
// gives the same lines as the CSV and an overlapping CSV import is recognised.
//
// Every line is checked against the running balance and the statement's
// opening and closing balance before anything is returned.

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/
const HEADERS = ['Date', 'Description', 'Category', 'Money In', 'Money Out', 'Fee*', 'Balance']

const money = s => parseFloat(String(s).replace(/[R\s,]/g, '')) || 0
const isoDate = s => {
  const [, d, m, y] = s.match(DATE_RE)
  return `${y}-${m}-${d}`
}
const round2 = v => Math.round(v * 100) / 100

function findValueRight(items, labelRe) {
  const lab = items.find(i => labelRe.test(i.str.trim()))
  if (!lab) return null
  const right = items
    .filter(i => Math.abs(i.y - lab.y) <= 2 && i.x > lab.x)
    .sort((a, b) => a.x - b.x)[0]
  return right?.str ?? null
}

export function isCapitecStatement(pages) {
  const all = pages.flatMap(p => p.items)
  return all.some(i => /Capitec Bank/i.test(i.str)) && all.some(i => i.str.trim() === 'Transaction History')
}

/**
 * pages: [{ items: [{ x, y, w, str }] }] in page order (y grows upwards, as in PDF space)
 * Returns { lines, pending: [], accountNumber, kind, opening, closing }
 */
export function parseCapitecPdf(pages) {
  const first = pages[0]?.items || []
  const accountNumber = (findValueRight(first, /^Account$/) || '').replace(/\D/g, '')
  const opening = money(findValueRight(first, /^Opening Balance:$/) || '')
  const closing = money(findValueRight(first, /^Closing Balance:$/) || '')
  const kind = first.some(i => /^Credit Card/i.test(i.str.trim())) ? 'credit_card' : 'bank'
  if (!accountNumber) throw new Error('Could not find the account number on this statement.')

  const lines = []
  pages.forEach(({ items }) => {
    const balHead = items.find(i => i.str.trim() === 'Balance'
      && items.some(j => j.str.trim() === 'Money Out' && Math.abs(j.y - i.y) <= 2))
    if (!balHead) return
    const col = Object.fromEntries(HEADERS
      .map(h => [h, items.find(i => i.str.trim() === h && Math.abs(i.y - balHead.y) <= 2)?.x]))
    const footer = items.find(i => /^\* Includes VAT/.test(i.str.trim()))
    const table = items.filter(i => i.y < balHead.y - 2 && (!footer || i.y > footer.y + 2))

    const anchors = table.filter(i => i.x < col.Description - 10 && DATE_RE.test(i.str.trim()))
      .sort((a, b) => b.y - a.y)
    const rows = anchors.map(a => ({ anchor: a, desc: [], cat: [], nums: [] }))
    table.forEach(i => {
      if (anchors.includes(i)) return
      // a wrapped line belongs to the date line on or above it
      const row = rows.filter(r => r.anchor.y >= i.y - 2).at(-1)
      if (!row || row.anchor.y - i.y > 30) return
      if (i.x < col.Category - 4) row.desc.push(i)
      else if (i.x < col['Money In'] - 4) row.cat.push(i)
      else if (Math.abs(row.anchor.y - i.y) <= 2 && /\d/.test(i.str)) row.nums.push(i)  // skips the VAT "*"
    })

    // Right edges: Money In ends before the Money Out heading, Money Out
    // before the Fee heading, Fee before the Balance heading.
    const colOf = n => {
      const end = n.x + (n.w || 0)
      return end < col['Money Out'] + 8 ? 'in' : end < col['Fee*'] - 4 ? 'out' : end < col.Balance ? 'fee' : 'balance'
    }
    const text = parts => parts.sort((a, b) => b.y - a.y || a.x - b.x).map(p => p.str.trim()).join(' ')
      .replace(/\s+/g, ' ').trim()

    rows.forEach(r => {
      const v = { in: 0, out: 0, fee: 0, balance: null }
      r.nums.forEach(n => { v[colOf(n)] = money(n.str) })
      if (v.balance == null) return                     // e.g. "Exc W/lim …" notices move no money
      const base = {
        date: isoDate(r.anchor.str.trim()), txTime: '',
        description: text(r.desc), bankCategory: text(r.cat), bankParent: '', accountNumber,
      }
      const main = round2(v.in + v.out)                 // Money Out and Fee are negative
      if (main !== 0) {
        lines.push({
          ...base, seq: lines.length, amount: Math.abs(main), direction: main > 0 ? 'in' : 'out',
          balance: round2(v.balance - v.fee), isFee: false,
        })
      }
      if (v.fee !== 0) {
        lines.push({
          ...base, seq: lines.length,
          description: main !== 0 ? `Fee: ${base.description}` : base.description,
          bankCategory: 'Fees', amount: Math.abs(v.fee), direction: v.fee > 0 ? 'in' : 'out',
          balance: v.balance, isFee: true, splitFee: main !== 0,
        })
      }
    })
  })

  // Reconcile: every line must follow from the one before, and end on the closing balance
  let bal = opening
  for (const l of lines) {
    bal = round2(bal + (l.direction === 'in' ? l.amount : -l.amount))
    if (Math.abs(bal - l.balance) > 0.005) {
      throw new Error(`The statement did not add up at ${l.date} "${l.description.slice(0, 40)}" `
        + `(expected ${bal.toFixed(2)}, statement shows ${l.balance.toFixed(2)}). Nothing was imported.`)
    }
  }
  if (lines.length && Math.abs(bal - closing) > 0.005) {
    throw new Error(`The lines add up to ${bal.toFixed(2)} but the statement closes at ${closing.toFixed(2)}. Nothing was imported.`)
  }
  return { lines, pending: [], accountNumber, kind, opening, closing }
}

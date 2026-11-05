// Nedbank statement (PDF), current or savings account. The PDF is read into
// positioned text items ({ x, y, w, str } per page, see pdfText.js); this file
// turns them into statement lines. Layout of the transactions table:
//
//   Tran list no | Date | Description | Fees (R) | Debits (R) | Credits (R) | Balance (R)
//
// Amounts are right-aligned, so their column is found from where the text
// ends. Debits and credits are printed without a sign; a fee on a row is
// split into its own "Fee: …" line, as for Capitec. The first row is the
// opening balance and the table ends with the closing balance.
//
// Every line is checked against the running balance and the statement's
// opening and closing balance (from the account summary) before anything is
// returned.

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/
const HEADERS = ['Date', 'Description', 'Fees (R)', 'Debits (R)', 'Credits (R)', 'Balance (R)']

// "12,148.59", "R12,148.59", "49.50 *", "1,234.00-" or "1,234.00 Dr" (overdrawn)
const money = s => {
  const v = parseFloat(String(s).replace(/[^\d.]/g, '')) || 0
  return /-\s*$|^\s*-|\bDr\b/i.test(s) ? -v : v
}
const isoDate = s => {
  const [, d, m, y] = s.match(DATE_RE)
  return `${y}-${m}-${d}`
}
const round2 = v => Math.round(v * 100) / 100
const same = (a, b) => Math.abs(a - b) <= 2

// Account-summary values, looked up on the first page that has the label
// (positions are only comparable within one page)
function onLabelPage(pages, labelRe, pick) {
  for (const { items } of pages) {
    const lab = items.find(i => labelRe.test(i.str.trim()))
    if (lab) return pick(items, lab) ?? null
  }
  return null
}
// The value printed below a label (same column)
const findValueBelow = (pages, labelRe) => onLabelPage(pages, labelRe, (items, lab) => items
  .filter(i => i.y < lab.y - 2 && i.y > lab.y - 30 && Math.abs(i.x - lab.x) <= 4)
  .sort((a, b) => b.y - a.y)[0]?.str)
// The value printed to the right of a label on the same line
const findValueRight = (pages, labelRe) => onLabelPage(pages, labelRe, (items, lab) => items
  .filter(i => same(i.y, lab.y) && i.x > lab.x + lab.w)
  .sort((a, b) => a.x - b.x)[0]?.str)

export function isNedbankStatement(pages) {
  const all = pages.flatMap(p => p.items)
  return all.some(i => /nedbank/i.test(i.str)) && all.some(i => i.str.trim() === 'Tran list no')
}

/**
 * pages: [{ items: [{ x, y, w, str }] }] in page order (y grows upwards, as in PDF space)
 * Returns { lines, pending: [], accountNumber, kind, opening, closing }
 */
export function parseNedbankPdf(pages) {
  const accountNumber = (findValueBelow(pages, /^Account number$/) || '').replace(/\D/g, '')
  if (!accountNumber) throw new Error('Could not find the account number on this statement.')
  const accountType = findValueBelow(pages, /^Account type$/) || ''
  const kind = /savings|investment/i.test(accountType) ? 'savings' : 'bank'
  const opening = money(findValueRight(pages, /^Opening balance$/) || '')
  const closing = money(findValueRight(pages, /^Closing balance$/) || '')

  const lines = []
  pages.forEach(({ items }) => {
    const head = items.find(i => i.str.trim() === 'Tran list no')
    if (!head) return
    const col = Object.fromEntries(HEADERS.map(h => {
      const it = items.find(i => i.str.trim() === h && same(i.y, head.y))
      return [h, it ? it.x + it.w : null]     // right edge of the heading
    }))
    if (Object.values(col).some(v => v == null)) throw new Error("This Nedbank statement's layout isn't one Cycle knows.")
    const descX = items.find(i => i.str.trim() === 'Description' && same(i.y, head.y)).x
    const dateX = items.find(i => i.str.trim() === 'Date' && same(i.y, head.y)).x

    const end = items.find(i => i.y < head.y && i.str.trim() === 'Closing balance')
    const footer = items.find(i => i.y < head.y && /^see money differently$/i.test(i.str.trim()))
    const bottom = end ? end.y + 2 : footer ? footer.y + 2 : -Infinity
    const table = items.filter(i => i.y < head.y - 2 && i.y > bottom)

    const anchors = table.filter(i => Math.abs(i.x - dateX) <= 6 && DATE_RE.test(i.str.trim()))
      .sort((a, b) => b.y - a.y)
    const rows = anchors.map(a => ({ anchor: a, desc: [], nums: [] }))
    table.forEach(i => {
      if (anchors.includes(i) || i.x < dateX - 6) return          // the "Tran list no" column
      // a wrapped description line belongs to the date line on or above it
      const row = rows.filter(r => r.anchor.y >= i.y - 2).at(-1)
      if (!row || row.anchor.y - i.y > 30) return
      if (i.x < col['Fees (R)'] - 40) row.desc.push(i)
      else if (same(row.anchor.y, i.y) && /\d/.test(i.str)) row.nums.push(i)
    })

    // Columns by where the amount ends, halfway between the headings' right edges
    const cut = (a, b) => (col[a] + col[b]) / 2
    const colOf = n => {
      const e = n.x + (n.w || 0)
      return e < cut('Fees (R)', 'Debits (R)') ? 'fee'
        : e < cut('Debits (R)', 'Credits (R)') ? 'out'
        : e < cut('Credits (R)', 'Balance (R)') ? 'in' : 'balance'
    }
    const text = parts => parts.sort((a, b) => b.y - a.y || a.x - b.x).map(p => p.str.trim()).join(' ').replace(/\s+/g, ' ').trim()

    rows.forEach(r => {
      const description = text(r.desc)
      if (/^(opening|closing) balance$/i.test(description)) return
      const v = { in: 0, out: 0, fee: 0, balance: null }
      r.nums.forEach(n => { v[colOf(n)] = money(n.str) })
      if (v.balance == null) return                      // notices that move no money
      const base = { date: isoDate(r.anchor.str.trim()), txTime: '', description, bankCategory: '', bankParent: '', accountNumber }
      const main = round2(Math.abs(v.in) - Math.abs(v.out))
      const fee = Math.abs(v.fee)
      if (main !== 0) {
        lines.push({
          ...base, seq: lines.length, amount: Math.abs(main), direction: main > 0 ? 'in' : 'out',
          balance: round2(v.balance + fee), isFee: false,
        })
      }
      if (fee !== 0) {
        lines.push({
          ...base, seq: lines.length, description: main !== 0 ? `Fee: ${description}` : description,
          bankCategory: 'Fees', amount: fee, direction: 'out',
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

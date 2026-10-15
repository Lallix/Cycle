import { csvToObjects } from './csv.js'

// Capitec "Download statement → CSV" export (main account and credit card).
// Columns: Nr, Account, Posting Date, Transaction Date, Description,
//          Original Description, Parent Category, Category,
//          Money In, Money Out, Fee, Balance
const REQUIRED = ['Account', 'Posting Date', 'Description', 'Money In', 'Money Out', 'Balance']

export function isCapitecCsv(header) {
  return REQUIRED.every(h => header.includes(h))
}

const num = v => (v === '' || v == null ? 0 : parseFloat(String(v).replace(/[\s,]/g, '')) || 0)

/**
 * Parse a Capitec CSV into statement lines.
 * Each line: { date, txTime, description, bankCategory, bankParent, amount (>0), direction,
 *              balance, accountNumber, isFee }
 * Lines that move no money (e.g. "Move to Budget" bookkeeping rows) are dropped.
 * "(Pending)" card lines have no balance yet and come back under a different
 * description once they clear, so they are returned separately and not imported.
 */
export function parseCapitecCsv(text) {
  const { header, records } = csvToObjects(text)
  if (!isCapitecCsv(header)) {
    throw new Error('This does not look like a Capitec CSV statement (missing columns: '
      + REQUIRED.filter(h => !header.includes(h)).join(', ') + ').')
  }

  const lines = [], pending = []
  records.forEach((r, i) => {
    const moneyIn = num(r['Money In'])
    const moneyOut = num(r['Money Out'])      // negative in the export
    const fee = num(r['Fee'])                 // negative in the export
    const net = Math.round((moneyIn + moneyOut + fee) * 100) / 100
    if (net === 0) return
    const target = /^\(Pending\)/i.test(r['Description']) ? pending : lines
    target.push({
      seq: i,                                 // file order — keeps same-day lines in balance order
      date: r['Posting Date'].slice(0, 10),
      txTime: r['Transaction Date'] || '',
      description: r['Description'],
      bankCategory: r['Category'] || '',
      bankParent: r['Parent Category'] || '',
      amount: Math.abs(net),
      direction: net > 0 ? 'in' : 'out',
      balance: r['Balance'] === '' ? null : num(r['Balance']),
      accountNumber: r['Account'],
      isFee: moneyIn === 0 && moneyOut === 0 && fee !== 0,
    })
  })
  return { lines, pending }
}

// Credit card numbers start with 60 in Capitec exports, and only card
// statements carry purchase-interest lines.
export function guessAccountKind(lines) {
  const n = lines[0]?.accountNumber || ''
  if (n.startsWith('60') || lines.some(l => /Interest Charged for Purchases/i.test(l.description))) {
    return 'credit_card'
  }
  return 'bank'
}

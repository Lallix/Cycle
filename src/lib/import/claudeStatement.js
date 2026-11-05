// Statements from banks Cycle has no importer for, read by Claude.
//
// The PDF is read here on the device (pdfText.js, so password-protected PDFs
// still only open in memory); only its text goes to Claude, which lists the
// transactions. Claude's list is then held to the same standard as the
// built-in importers: every line must follow from the opening balance through
// each running balance to the closing balance, or nothing is imported.

const round2 = v => Math.round(v * 100) / 100

// One printed row per line; " | " between pieces of text that sit apart
export function pagesToText(pages) {
  return pages.map((page, p) => {
    const rows = []
    ;[...page.items].sort((a, b) => b.y - a.y || a.x - b.x).forEach(item => {
      const row = rows.find(r => Math.abs(r.y - item.y) <= 2)
      if (row) row.items.push(item); else rows.push({ y: item.y, items: [item] })
    })
    const text = rows.map(r => {
      const items = r.items.sort((a, b) => a.x - b.x)
      return items.map((it, i) => {
        if (i === 0) return it.str.trim()
        const prev = items[i - 1]
        const gap = it.x - (prev.x + (prev.w || 0))
        return (gap > 6 ? ' | ' : ' ') + it.str.trim()
      }).join('')
    }).join('\n')
    return `--- Page ${p + 1} ---\n${text}`
  }).join('\n\n')
}

// Claude's reading → statement lines in the shape the import screen expects.
// Banks differ in order (oldest or newest first) and in how they sign a
// credit card's balance, so each combination is tried; only one that adds up
// end to end is accepted.
export function linesFromClaude(statement) {
  const rows = (statement.lines || []).filter(r => r && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
  if (!rows.length) throw new Error('Claude found no transactions in this statement.')
  const accountNumber = String(statement.account_number || '').replace(/\D/g, '')
  if (!accountNumber) throw new Error("Claude couldn't find the account number on this statement.")

  const orders = [rows, [...rows].reverse()]
  const signs = [1, -1]
  let best = null
  for (const order of orders) {
    for (const sign of signs) {
      const attempt = reconcile(order, sign, statement.opening_balance, statement.closing_balance)
      if (attempt.ok) { best = attempt; break }
      if (!best || attempt.matched > best.matched) best = attempt
    }
    if (best?.ok) break
  }
  if (!best.ok) {
    throw new Error(`Claude's reading of this statement didn't add up (${best.reason}). Nothing was imported. `
      + 'Try again, or try a different model in Settings.')
  }

  const kind = ['bank', 'credit_card', 'savings'].includes(statement.kind) ? statement.kind : 'bank'
  const lines = []
  best.rows.forEach(r => {
    const base = { date: r.date, txTime: '', description: String(r.description || '').replace(/\s+/g, ' ').trim(), bankCategory: '', bankParent: '', accountNumber }
    const main = round2((r.money_in || 0) - (r.money_out || 0))
    const fee = round2(r.fee || 0)
    if (main !== 0) {
      lines.push({
        ...base, seq: lines.length, amount: Math.abs(main), direction: main > 0 ? 'in' : 'out',
        balance: r.balance == null ? null : round2(r.balance + fee), isFee: false,
      })
    }
    if (fee !== 0) {
      lines.push({
        ...base, seq: lines.length, description: main !== 0 ? `Fee: ${base.description}` : base.description,
        bankCategory: 'Fees', amount: Math.abs(fee), direction: 'out',
        balance: r.balance, isFee: true, splitFee: main !== 0,
      })
    }
  })
  return { lines, pending: [], accountNumber, kind, bank: String(statement.bank || 'Bank').trim() || 'Bank', format: 'claude_pdf' }
}

function reconcile(rows, sign, opening, closing) {
  const signed = v => (v == null ? null : round2(sign * v))
  const out = rows.map(r => ({ ...r, balance: signed(r.balance) }))
  const withBalance = out.filter(r => r.balance != null).length
  let open = signed(opening)
  const close = signed(closing)

  // No opening balance printed: work it out from the first running balance
  if (open == null) {
    let delta = 0
    const first = out.find(r => { delta += (r.money_in || 0) - (r.money_out || 0) - (r.fee || 0); return r.balance != null })
    if (first) open = round2(first.balance - delta)
  }
  if (open == null || (withBalance === 0 && close == null)) {
    return { ok: false, matched: 0, reason: 'the statement shows no balances to check against' }
  }

  let bal = open, matched = 0
  for (const r of out) {
    bal = round2(bal + (r.money_in || 0) - (r.money_out || 0) - (r.fee || 0))
    if (r.balance != null) {
      if (Math.abs(bal - r.balance) > 0.005) {
        return { ok: false, matched, reason: `at ${r.date} "${String(r.description).slice(0, 30)}" the balance should be ${bal.toFixed(2)}, statement shows ${r.balance.toFixed(2)}` }
      }
      matched++
    }
  }
  if (close != null && Math.abs(bal - close) > 0.005) {
    return { ok: false, matched, reason: `the lines end at ${bal.toFixed(2)} but the statement closes at ${close.toFixed(2)}` }
  }
  return { ok: true, matched, rows: out }
}

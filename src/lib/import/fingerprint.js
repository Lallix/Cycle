// A stable fingerprint per statement line so the same statement (or an
// overlapping one) can be imported again without creating duplicates.
// Balance and time keep same-day purchases apart; the occurrence number
// keeps genuinely identical lines apart (e.g. a payment made twice and
// reversed twice within the same minute).
function lineKey(line) {
  return [
    line.accountNumber, line.date, line.txTime || '', line.direction,
    line.amount.toFixed(2), line.balance == null ? '' : line.balance.toFixed(2),
    line.description.trim().toLowerCase(),
  ].join('|')
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Returns the hashes in the same order as `lines`.
export async function hashLines(lines) {
  const seen = new Map()
  return Promise.all(lines.map(line => {
    const key = lineKey(line)
    const n = (seen.get(key) || 0) + 1
    seen.set(key, n)
    return sha256(`${key}|#${n}`)
  }))
}

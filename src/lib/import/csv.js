// Minimal RFC 4180 CSV reader — handles quoted fields, escaped quotes ("")
// and commas / newlines inside quotes. Returns an array of row arrays.
export function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  const src = text.replace(/^﻿/, '')   // strip BOM

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some(f => f !== '')) rows.push(row)
  return rows
}

// Rows → objects keyed by the header row.
export function csvToObjects(text) {
  const [header, ...rows] = parseCsv(text)
  if (!header) return { header: [], records: [] }
  const keys = header.map(h => h.trim())
  return {
    header: keys,
    records: rows.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()]))),
  }
}

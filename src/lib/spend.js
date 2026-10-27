// Which transactions count as spending: money out in fixed, predicted or
// unplanned categories. Money in, transfers between your own accounts,
// once-offs (tax rebate, car purchase) and debt moves are reported separately.
const NON_SPEND_TYPES = new Set(['income', 'transfer', 'once_off', 'debt'])

export function isSpend(tx) {
  if (tx.direction === 'in') return false
  const cat = tx.cycle_categories || tx.categories
  return !NON_SPEND_TYPES.has(cat?.type)
}

// Net spend of one line, as the dashboard counts it: money out of a spending
// category adds, money back into one (a refund) takes off. Uncategorised
// lines count as unplanned spending.
export function spendAmount(tx) {
  const cat = tx.cycle_categories || tx.categories
  if (NON_SPEND_TYPES.has(cat?.type)) return 0
  const amount = parseFloat(tx.amount || 0)
  return tx.direction === 'in' ? -amount : amount
}

// Category types. 'variable' and 'unbudgeted' are the original types; the
// statement import added the rest. Until every screen is moved over, these
// helpers let old and new types work side by side.
export const isLimitType = type => type === 'predicted' || type === 'variable'   // monthly limit categories
export const isEverydayType = type => !['income', 'transfer'].includes(type)    // pickable when adding an expense

export const TYPE_OPTIONS = [
  { value: 'predicted', label: 'Predicted' },
  { value: 'fixed',     label: 'Fixed' },
  { value: 'unplanned', label: 'Unplanned' },
  { value: 'once_off',  label: 'Once-off' },
  { value: 'debt',      label: 'Debt' },
  { value: 'income',    label: 'Income' },
  { value: 'transfer',  label: 'Transfer' },
]

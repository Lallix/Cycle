import { useBudget } from '../../context/BudgetContext'
import { getAccountConfig } from '../../lib/format'
import { isEverydayType } from '../../lib/spend'
import { normaliseType } from '../../lib/totals'

// Filter row: an "All" button that clears the filter, and one dropdown
// holding every category (grouped by type, A–Z within each group) and the
// accounts used this cycle.
// The dropdown's value is "category:<id>" or "account:<name>".

const TYPE_GROUPS = [
  ['Fixed', 'fixed'], ['Predicted', 'predicted'], ['Unplanned', 'unplanned'],
  ['Once-off', 'once_off'], ['Debt', 'debt'],
]

export default function ExpenseFilters({ activeFilter, onFilterChange }) {
  const { categories, transactions } = useBudget()

  // Derive unique accounts actually used in this cycle
  const usedAccounts = [...new Set(transactions.map(t => t.account).filter(Boolean))].sort()

  const groups = TYPE_GROUPS
    .map(([label, type]) => [label, categories.filter(c => isEverydayType(c.type) && normaliseType(c.type) === type)
      .sort((x, y) => x.name.localeCompare(y.name, 'en', { sensitivity: 'base' }))])
    .filter(([, cats]) => cats.length)

  const value = activeFilter?.type === 'category' ? `category:${activeFilter.id}`
    : activeFilter?.type === 'account' ? `account:${activeFilter.value}` : ''
  // A filter set from elsewhere (e.g. a removed category) still shows in the list
  const known = value === '' || categories.some(c => `category:${c.id}` === value) || usedAccounts.some(a => `account:${a}` === value)

  function pick(e) {
    const v = e.target.value
    if (!v) return onFilterChange(null)
    const [kind, ...rest] = v.split(':')
    const id = rest.join(':')
    onFilterChange(kind === 'category' ? { type: 'category', id } : { type: 'account', value: id })
  }

  const active = Boolean(activeFilter)
  const box = {
    borderRadius: 20, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer',
    border: `0.5px solid ${active ? 'rgb(var(--c-accent) / 0.4)' : 'rgb(var(--c-border))'}`,
    background: active ? 'rgb(var(--c-accent) / 0.1)' : 'rgb(var(--c-surface))',
    color: active ? 'rgb(var(--c-accent))' : 'rgb(var(--c-text-2))',
  }

  // Native option lists don't inherit the theme, so colour them explicitly
  const opt = { background: 'rgb(var(--c-surface))', color: 'rgb(var(--c-text))' }

  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 16px 4px', alignItems: 'center' }}>
      <button
        onClick={() => onFilterChange(null)}
        style={{
          flexShrink: 0, padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: active ? 400 : 600,
          border: `0.5px solid ${active ? 'rgb(var(--c-border))' : 'rgb(var(--c-accent) / 0.4)'}`,
          background: active ? 'rgb(var(--c-surface))' : 'rgb(var(--c-accent) / 0.1)',
          color: active ? 'rgb(var(--c-text-3))' : 'rgb(var(--c-accent))',
        }}
      >
        All
      </button>

      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <select
          value={value}
          onChange={pick}
          aria-label="Filter transactions"
          style={{ ...box, width: '100%', padding: '8px 34px 8px 14px', appearance: 'none', WebkitAppearance: 'none', outline: 'none' }}
        >
          <option value="" style={opt}>Filter by category or account…</option>
          {!known && <option value={value} style={opt}>Selected category</option>}
          {groups.map(([label, cats]) => (
            <optgroup key={label} label={label} style={opt}>
              {cats.map(c => <option key={c.id} value={`category:${c.id}`} style={opt}>{c.icon} {c.name}</option>)}
            </optgroup>
          ))}
          {usedAccounts.length > 0 && (
            <optgroup label="Accounts" style={opt}>
              {usedAccounts.map(a => <option key={a} value={`account:${a}`} style={opt}>{getAccountConfig(a).label}</option>)}
            </optgroup>
          )}
        </select>
        <span aria-hidden style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
          fontSize: 11, color: active ? 'rgb(var(--c-accent))' : 'rgb(var(--c-text-3))',
        }}>▼</span>
      </div>
    </div>
  )
}

import { useBudget } from '../../context/BudgetContext'
import { getAccountConfig } from '../../lib/format'
import { isEverydayType } from '../../lib/spend'
import CategoryPicker, { categoryGroups } from '../ui/CategoryPicker'

// Filter row: an "All" button that clears the filter, and one picker holding
// Uncategorised, every category (grouped by type, A–Z within each group) and
// the accounts used this cycle.
// The picker's value is "none", "category:<id>" or "account:<name>".

export default function ExpenseFilters({ activeFilter, onFilterChange }) {
  const { categories, transactions } = useBudget()

  // Derive unique accounts actually used in this cycle
  const usedAccounts = [...new Set(transactions.map(t => t.account).filter(Boolean))].sort()

  const groups = [
    { label: 'Needs a category', options: [{ value: 'none', label: 'Uncategorised', icon: '❓' }] },
    ...categoryGroups(categories.filter(c => isEverydayType(c.type)))
      .map(g => ({ ...g, options: g.options.map(o => ({ ...o, value: `category:${o.value}` })) })),
    ...(usedAccounts.length ? [{ label: 'Accounts', options: usedAccounts.map(a => ({ value: `account:${a}`, label: getAccountConfig(a).label })) }] : []),
  ]

  const value = activeFilter?.type === 'none' ? 'none'
    : activeFilter?.type === 'category' ? `category:${activeFilter.id}`
    : activeFilter?.type === 'account' ? `account:${activeFilter.value}` : ''
  // A filter set from elsewhere (e.g. a removed category) still shows on the button
  const known = value === '' || groups.some(g => g.options.some(o => o.value === value))
  if (!known) groups.push({ label: 'Other', options: [{ value, label: 'Selected category' }] })

  function pick(v) {
    if (!v) return onFilterChange(null)
    if (v === 'none') return onFilterChange({ type: 'none' })
    const [kind, ...rest] = v.split(':')
    const id = rest.join(':')
    onFilterChange(kind === 'category' ? { type: 'category', id } : { type: 'account', value: id })
  }

  const active = Boolean(activeFilter)
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

      <div style={{ flex: 1, minWidth: 0 }}>
        <CategoryPicker
          groups={groups} value={value} onChange={pick} title="Filter transactions"
          placeholder="Filter by category or account…"
          style={{
            borderRadius: 20, padding: '8px 14px', fontSize: 13,
            border: `0.5px solid ${active ? 'rgb(var(--c-accent) / 0.4)' : 'rgb(var(--c-border))'}`,
            background: active ? 'rgb(var(--c-accent) / 0.1)' : 'rgb(var(--c-surface))',
            color: active ? 'rgb(var(--c-accent))' : 'rgb(var(--c-text-2))',
          }}
        />
      </div>
    </div>
  )
}

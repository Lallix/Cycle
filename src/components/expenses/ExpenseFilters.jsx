import { useBudget } from '../../context/BudgetContext'
import { getAccountConfig } from '../../lib/format'
import { isEverydayType } from '../../lib/spend'

// Single combined scrollable filter row
// Order: All → categories → accounts
// Only shows the user's actual accounts (from transactions + recurring expenses)

export default function ExpenseFilters({ activeFilter, onFilterChange }) {
  const { categories, transactions, recurringExpenses } = useBudget()

  // Derive unique accounts actually used in this cycle
  const usedAccounts = [...new Set([
    ...transactions.map(t => t.account),
    ...recurringExpenses.map(e => e.account),
  ].filter(Boolean))]

  const varCategories = categories.filter(c => isEverydayType(c.type))

  const pillStyle = (active) => ({
    flexShrink: 0,
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px',
    borderRadius: 20,
    border: `0.5px solid ${active ? 'rgba(232,195,106,0.4)' : '#26262B'}`,
    background: active ? 'rgba(232,195,106,0.1)' : '#17171A',
    color: active ? '#E8C36A' : '#8B8B93',
    fontFamily: 'Inter, sans-serif',
    fontSize: 12, fontWeight: active ? 500 : 400,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  })

  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>

      {/* All */}
      <button
        style={pillStyle(!activeFilter)}
        onClick={() => onFilterChange(null)}
      >
        All
      </button>

      {/* Categories */}
      {varCategories.map(cat => (
        <button
          key={cat.id}
          style={pillStyle(activeFilter?.type === 'category' && activeFilter.id === cat.id)}
          onClick={() => onFilterChange(
            activeFilter?.type === 'category' && activeFilter.id === cat.id
              ? null
              : { type: 'category', id: cat.id }
          )}
        >
          <span style={{ fontSize: 13 }}>{cat.icon}</span>
          {cat.name}
        </button>
      ))}

      {/* Accounts */}
      {usedAccounts.map(account => {
        const cfg = getAccountConfig(account)
        const active = activeFilter?.type === 'account' && activeFilter.value === account
        return (
          <button
            key={account}
            style={{
              ...pillStyle(active),
              ...(active ? { color: cfg.color, borderColor: cfg.color, background: cfg.bg } : {}),
            }}
            onClick={() => onFilterChange(
              active ? null : { type: 'account', value: account }
            )}
          >
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}

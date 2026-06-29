import { useBudget } from '../../context/BudgetContext'
import { getAccountConfig } from '../../lib/format'

// Replaces the hardcoded 11-bank pill row everywhere in the app
// Shows only the user's actual accounts from cycle_accounts table
// Falls back to a minimal default list if no accounts loaded yet

const FALLBACK = ['Capitec', 'FNB']

export default function AccountPicker({ value, onChange, style = {} }) {
  const { accounts } = useBudget()

  const list = accounts.length > 0
    ? accounts
    : FALLBACK.map((b, i) => ({ id: b, name: b, bank: b, sort_order: i }))

  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', ...style }}>
      {list.map(acc => {
        const cfg      = getAccountConfig(acc.bank || acc.name)
        const selected = value === acc.name
        return (
          <button
            key={acc.id}
            onClick={() => onChange(acc.name)}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 10,
              border: `0.5px solid ${selected ? cfg?.color : '#3A3A3A'}`,
              background: selected ? cfg?.bg : 'transparent',
              color: selected ? cfg?.color : '#717179',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: selected ? 500 : 400,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {acc.name}
          </button>
        )
      })}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CycleSelector from '../components/ui/CycleSelector'
import ExpensesPage from './ExpensesPage'
import ReportsPage from './ReportsPage'
import YearPage from './YearPage'

// Activity: what happened with your money. Three tabs share one cycle picker:
// Transactions (the list), Overview (how the cycle went) and Year (by month).
// Tapping a category in Overview (or a vibe check tile on Home, via
// ?category=<id>) opens Transactions filtered to it.
const TABS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'overview', label: 'Overview' },
  { key: 'year', label: 'Year' },
]

export default function ActivityPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'transactions'
  const [cycleIndex, setCycleIndex] = useState(0)
  const [filter, setFilter] = useState(null)

  const categoryParam = params.get('category')
  useEffect(() => {
    if (categoryParam) setFilter({ type: 'category', id: categoryParam })
  }, [categoryParam])

  const go = key => setParams({ tab: key }, { replace: true })
  function openCategory(cat) {
    setFilter({ type: 'category', id: cat.id, name: cat.name })
    go('transactions')
  }

  return (
    <div style={{ minHeight: '100%', background: 'rgb(var(--c-bg))' }}>
      <div style={{ padding: 'max(env(safe-area-inset-top), 16px) 16px 10px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>Activity</h1>
        <div role="tablist" className="grid grid-cols-3"
          style={{ marginTop: 10, padding: 4, gap: 4, borderRadius: 14, background: 'rgb(var(--c-surface-2))' }}>
          {TABS.map(t => {
            const active = t.key === tab
            return (
              <button key={t.key} role="tab" aria-selected={active} onClick={() => go(t.key)} className="tappable"
                style={{ padding: '8px 0', borderRadius: 10, border: 0, fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
                  background: active ? 'rgb(var(--c-accent))' : 'transparent',
                  color: active ? 'rgb(var(--c-on-accent))' : 'rgb(var(--c-text-2))' }}>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {tab !== 'year' && <CycleSelector cycleIndex={cycleIndex} onChange={setCycleIndex} />}

      {tab === 'transactions' && (
        <ExpensesPage embedded cycleIndex={cycleIndex} filter={filter} onFilterChange={setFilter} />
      )}
      {tab === 'overview' && (
        <ReportsPage embedded cycleIndex={cycleIndex} onCategoryClick={openCategory} />
      )}
      {tab === 'year' && <YearPage embedded />}
    </div>
  )
}

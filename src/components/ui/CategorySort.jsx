import { useState } from 'react'

// How category lists are ordered: A–Z by name, or by amount (largest first).
// The choice is shared by the Budget sheet and Settings and remembered on
// this device.
const KEY = 'cycle-category-sort'

export function useCategorySort() {
  const [sort, setSortState] = useState(() => {
    try { return localStorage.getItem(KEY) === 'amount' ? 'amount' : 'name' } catch { return 'name' }
  })
  function setSort(v) {
    setSortState(v)
    try { localStorage.setItem(KEY, v) } catch { /* private mode: keep it for this visit */ }
  }
  return [sort, setSort]
}

// amountOf(item) gives the value to sort by when sorting by amount
export function sortCategories(list, sort, amountOf) {
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base' })
  return [...list].sort(sort === 'amount'
    ? (a, b) => (amountOf(b) || 0) - (amountOf(a) || 0) || byName(a, b)
    : byName)
}

export default function CategorySortToggle({ sort, onChange }) {
  const opts = [['name', 'A–Z'], ['amount', 'Amount']]
  return (
    <div role="group" aria-label="Sort categories" className="flex"
      style={{ padding: 2, gap: 2, borderRadius: 10, background: 'rgb(var(--c-surface-2))', flexShrink: 0 }}>
      {opts.map(([v, label]) => {
        const on = sort === v
        return (
          <button key={v} onClick={() => onChange(v)} aria-pressed={on}
            style={{
              padding: '4px 10px', borderRadius: 8, border: 0, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: on ? 700 : 500,
              background: on ? 'rgb(var(--c-accent))' : 'transparent',
              color: on ? 'rgb(var(--c-on-accent))' : 'rgb(var(--c-text-2))',
            }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

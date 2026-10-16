import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarClock, Check } from 'lucide-react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney } from '../../lib/format'

// Planned once-offs (cycle_planned_items) — e.g. the tax rebate coming in and
// what it will pay off. Tick one off when it has happened.
export default function PlannedItems() {
  const { plannedItems, updatePlannedItem } = useBudget()
  const toast = useToast()
  const [busyId, setBusyId] = useState(null)

  if (!plannedItems.length) return null

  const net = plannedItems.reduce((s, p) => s + (p.direction === 'in' ? 1 : -1) * parseFloat(p.amount || 0), 0)

  async function markDone(item) {
    setBusyId(item.id)
    try {
      await updatePlannedItem(item.id, { status: 'done' })
      toast(`${item.name} ✓`, 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Planned
        </p>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))' }}>
          Net {net >= 0 ? '+' : '−'}{formatMoney(Math.abs(net), true)}
        </span>
      </div>

      <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 16, border: '0.5px solid rgb(var(--c-border))', overflow: 'hidden' }}>
        {plannedItems.map((p, i) => {
          const isIn = p.direction === 'in'
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              borderBottom: i < plannedItems.length - 1 ? '0.5px solid rgb(var(--c-border))' : 'none',
            }}>
              <CalendarClock size={16} color={isIn ? 'rgb(var(--c-positive))' : 'rgb(var(--c-text-2))'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgb(var(--c-text))' }}>{p.name}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))' }}>
                  {p.expected_date ? `By ${format(parseISO(p.expected_date), 'd MMM')}` : 'No date'}
                  {p.cycle_categories?.name ? ` · ${p.cycle_categories.name}` : ''}
                </p>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: isIn ? 'rgb(var(--c-positive))' : 'rgb(var(--c-text))', flexShrink: 0 }}>
                {isIn ? '+' : '−'}{formatMoney(p.amount, true)}
              </span>
              <button
                onClick={() => markDone(p)}
                disabled={busyId === p.id}
                aria-label={`Mark ${p.name} done`}
                style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgb(var(--c-accent) / 0.08)', border: '0.5px solid rgb(var(--c-accent) / 0.3)',
                  opacity: busyId === p.id ? 0.4 : 1,
                }}
              >
                <Check size={14} color="rgb(var(--c-accent))" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

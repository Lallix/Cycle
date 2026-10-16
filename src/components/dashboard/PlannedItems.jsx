import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarClock, Check, ChevronDown, RotateCcw } from 'lucide-react'
import { useBudget } from '../../context/BudgetContext'
import { useToast } from '../ui/Toast'
import { formatMoney } from '../../lib/format'

// Planned once-offs (cycle_planned_items) — e.g. the tax rebate coming in and
// what it will pay off. Tick one off when it has happened. A tick can be
// undone from the message that confirms it, or later from the Done list.
const UNDO_MS = 10000
const label = { fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))' }

export default function PlannedItems() {
  const { plannedItems, donePlannedItems, updatePlannedItem } = useBudget()
  const toast = useToast()
  const [busyId, setBusyId] = useState(null)
  const [showDone, setShowDone] = useState(false)

  if (!plannedItems.length && !donePlannedItems.length) return null

  const net = plannedItems.reduce((s, p) => s + (p.direction === 'in' ? 1 : -1) * parseFloat(p.amount || 0), 0)

  async function setStatus(item, status) {
    setBusyId(item.id)
    try {
      await updatePlannedItem(item.id, { status })
      if (status === 'done') {
        toast(`${item.name} ✓`, 'success', UNDO_MS, { label: 'Undo', onClick: () => setStatus(item, 'planned') })
      } else {
        toast(`${item.name} is back in Planned`, 'info')
      }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ ...label, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Planned</p>
        {plannedItems.length > 0 && <span style={label}>Net {net >= 0 ? '+' : '−'}{formatMoney(Math.abs(net), true)}</span>}
      </div>

      <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 16, border: '0.5px solid rgb(var(--c-border))', overflow: 'hidden' }}>
        {plannedItems.length === 0 && (
          <p style={{ ...label, fontSize: 13, padding: '14px' }}>All planned items are done 🎉</p>
        )}
        {plannedItems.map((p, i) => (
          <Row key={p.id} item={p} last={i === plannedItems.length - 1 && !donePlannedItems.length}>
            <button
              onClick={() => setStatus(p, 'done')}
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
          </Row>
        ))}

        {donePlannedItems.length > 0 && (
          <>
            <button
              onClick={() => setShowDone(v => !v)}
              aria-expanded={showDone}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
                borderTop: plannedItems.length ? '0.5px solid rgb(var(--c-border))' : 'none',
              }}
            >
              <span style={{ ...label, fontSize: 12 }}>Done ({donePlannedItems.length})</span>
              <ChevronDown size={14} color="rgb(var(--c-text-3))"
                style={{ transform: showDone ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showDone && donePlannedItems.map((p, i) => (
              <Row key={p.id} item={p} done last={i === donePlannedItems.length - 1}>
                <button
                  onClick={() => setStatus(p, 'planned')}
                  disabled={busyId === p.id}
                  aria-label={`Put ${p.name} back in Planned`}
                  title="Put back in Planned"
                  style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgb(var(--c-surface-2))', border: '0.5px solid rgb(var(--c-border-strong))',
                    opacity: busyId === p.id ? 0.4 : 1,
                  }}
                >
                  <RotateCcw size={13} color="rgb(var(--c-text-2))" />
                </button>
              </Row>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function Row({ item: p, done = false, last, children }) {
  const isIn = p.direction === 'in'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', opacity: done ? 0.6 : 1,
      borderTop: '0.5px solid rgb(var(--c-border))', marginTop: -0.5,
      borderBottom: last ? 'none' : undefined,
    }}>
      <CalendarClock size={16} color={isIn ? 'rgb(var(--c-positive))' : 'rgb(var(--c-text-2))'} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgb(var(--c-text))',
          textDecoration: done ? 'line-through' : 'none' }}>{p.name}</p>
        <p style={label}>
          {done
            ? `Done${p.updated_at ? ` ${format(parseISO(p.updated_at), 'd MMM')}` : ''}`
            : p.expected_date ? `By ${format(parseISO(p.expected_date), 'd MMM')}` : 'No date'}
          {p.cycle_categories?.name ? ` · ${p.cycle_categories.name}` : ''}
        </p>
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, flexShrink: 0,
        color: isIn ? 'rgb(var(--c-positive))' : 'rgb(var(--c-text))' }}>
        {isIn ? '+' : '−'}{formatMoney(p.amount, true)}
      </span>
      {children}
    </div>
  )
}

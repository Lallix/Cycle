import { useState, useRef } from 'react'
import { formatMoney, getAccountConfig } from '../../lib/format'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'

const REVEAL = 72   // swipe distance to reveal delete button
const MAX    = 80   // max slide

export default function ExpenseItem({ transaction, onDelete, onEdit }) {
  const [offset, setOffset]   = useState(0)
  const [revealed, setRevealed] = useState(false)
  const touchX  = useRef(0)
  const touchY  = useRef(0)
  const isHoriz = useRef(false)
  const active  = useRef(false)

  const cat     = transaction.cycle_categories || transaction.categories || null
  const acc     = getAccountConfig(transaction.account)
  const catName = cat?.name   || (transaction.category_id ? 'Category' : 'Unbudgeted')
  const catIcon = cat?.icon   || '💳'
  const catColor = cat?.colour || '#888'

  function onTouchStart(e) {
    touchX.current  = e.touches[0].clientX
    touchY.current  = e.touches[0].clientY
    isHoriz.current = false
    active.current  = true
  }

  function onTouchMove(e) {
    if (!active.current) return
    const dx = touchX.current - e.touches[0].clientX
    const dy = Math.abs(touchY.current - e.touches[0].clientY)

    // Determine direction on first significant move
    if (!isHoriz.current && Math.abs(dx) < 5 && dy < 5) return
    if (!isHoriz.current) {
      isHoriz.current = Math.abs(dx) > dy
      if (!isHoriz.current) { active.current = false; return }
    }

    if (revealed) {
      // Currently revealed — swiping right (dx < 0) closes it
      const newOffset = Math.max(0, Math.min(MAX, MAX + dx))
      setOffset(newOffset)
    } else {
      // Not revealed — swiping left (dx > 0) opens it
      const newOffset = Math.max(0, Math.min(MAX, dx))
      setOffset(newOffset)
    }
  }

  function onTouchEnd() {
    active.current = false
    if (revealed) {
      // If dragged back enough, close
      if (offset < MAX * 0.5) {
        setOffset(0); setRevealed(false)
      } else {
        setOffset(MAX); setRevealed(true)
      }
    } else {
      // If dragged far enough, reveal
      if (offset > REVEAL) {
        setOffset(MAX); setRevealed(true)
      } else {
        setOffset(0); setRevealed(false)
      }
    }
  }

  function handleRowTap() {
    if (revealed) {
      // Tapping the row when delete is visible closes it
      setOffset(0); setRevealed(false)
    } else {
      onEdit?.(transaction)
    }
  }

  function handleDelete(e) {
    e.stopPropagation()
    setOffset(0); setRevealed(false)
    onDelete?.(transaction.id)
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>

      {/* Delete button behind the row */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: MAX + 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(239,68,68,0.08)',
      }}>
        <button
          onClick={handleDelete}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(239,68,68,0.2)',
            border: '0.5px solid rgba(239,68,68,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transform: `scale(${Math.min(offset / MAX, 1)})`,
            transition: 'transform 0.15s ease',
          }}
        >
          <Trash2 size={17} color="#EF4444" />
        </button>
      </div>

      {/* Main row */}
      <div
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          background: '#1B1B1B',
          transform: `translateX(-${offset}px)`,
          transition: active.current ? 'none' : 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleRowTap}
      >
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, background: `${catColor}18`,
        }}>
          {catIcon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500,
            color: '#1C1814', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {catName}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {transaction.account && (
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 500,
                color: acc.color, background: acc.bg, fontFamily: 'Inter, sans-serif',
              }}>
                {acc.label}
              </span>
            )}
            <span style={{ fontSize: 11, color: '#717179', fontFamily: 'Inter, sans-serif' }}>
              {format(new Date(transaction.transaction_date), 'd MMM')}
            </span>
            {transaction.notes && (
              <span style={{
                fontSize: 11, color: '#6B6460', fontFamily: 'Inter, sans-serif',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110,
              }}>
                · {transaction.notes}
              </span>
            )}
          </div>
        </div>

        {/* Amount */}
        <span style={{
          fontFamily: 'Poppins, sans-serif', fontSize: 14, fontWeight: 500,
          color: '#EF4444', flexShrink: 0, letterSpacing: '-0.01em',
        }}>
          -{formatMoney(transaction.amount)}
        </span>
      </div>
    </div>
  )
}

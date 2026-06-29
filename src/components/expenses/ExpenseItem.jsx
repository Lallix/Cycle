import { useState, useRef } from 'react'
import { formatMoney, getAccountConfig } from '../../lib/format'
import { Trash2, X } from 'lucide-react'
import { format } from 'date-fns'

export default function ExpenseItem({ transaction, onDelete, onEdit }) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [swiping, setSwiping]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isSwipingRef = useRef(false)
  const REVEAL_THRESHOLD  = 72   // how far to swipe to reveal the bin
  const MAX_OFFSET        = 88   // max slide distance

  const cat    = transaction.cycle_categories || transaction.categories || null
  const acc    = getAccountConfig(transaction.account)
  const catName  = cat?.name   || (transaction.category_id ? 'Category' : 'Unbudgeted')
  const catIcon  = cat?.icon   || '💳'
  const catColor = cat?.colour || '#888'

  function handleTouchStart(e) {
    if (confirmDelete) return
    touchStartX.current  = e.touches[0].clientX
    touchStartY.current  = e.touches[0].clientY
    isSwipingRef.current = false
  }

  function handleTouchMove(e) {
    if (confirmDelete) return
    const deltaX = touchStartX.current - e.touches[0].clientX
    const deltaY = Math.abs(touchStartY.current - e.touches[0].clientY)
    if (!isSwipingRef.current && deltaY > 10) return
    if (deltaX > 5 || isSwipingRef.current) {
      isSwipingRef.current = true
      setSwiping(true)
      setSwipeOffset(Math.min(Math.max(deltaX, 0), MAX_OFFSET))
    }
  }

  function handleTouchEnd() {
    if (swipeOffset > REVEAL_THRESHOLD) {
      // Snap to revealed state — wait for tap to confirm
      setSwipeOffset(MAX_OFFSET)
      setConfirmDelete(true)
    } else {
      // Snap back
      setSwipeOffset(0)
    }
    setSwiping(false)
    isSwipingRef.current = false
  }

  function handleConfirmDelete() {
    setConfirmDelete(false)
    setSwipeOffset(0)
    onDelete?.(transaction.id)
  }

  function handleCancelDelete() {
    setConfirmDelete(false)
    setSwipeOffset(0)
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>

      {/* Delete action behind row */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        borderRadius: 16,
        background: confirmDelete ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)',
        transition: 'background 0.2s ease',
      }}>
        {confirmDelete ? (
          // Confirm / cancel buttons
          <div style={{ display: 'flex', gap: 8, paddingRight: 12 }}>
            <button
              onClick={handleCancelDelete}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#2E2E2E', border: '0.5px solid #3A3A3A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} color="#A1A1AA" />
            </button>
            <button
              onClick={handleConfirmDelete}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(239,68,68,0.2)', border: '0.5px solid rgba(239,68,68,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={16} color="#EF4444" />
            </button>
          </div>
        ) : (
          <div style={{ paddingRight: 20 }}>
            <Trash2 size={17} color="#EF4444" opacity={swipeOffset / MAX_OFFSET} />
          </div>
        )}
      </div>

      {/* Main row */}
      <div
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          background: '#1B1B1B',
          borderRadius: 16,
          transform: `translateX(-${swipeOffset}px)`,
          transition: swiping ? 'none' : 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
          cursor: 'pointer',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (confirmDelete) { handleCancelDelete(); return }
          if (!swiping) onEdit?.(transaction)
        }}
      >
        {/* Category icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
          background: `${catColor}18`,
        }}>
          {catIcon}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500,
            color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
                fontSize: 11, color: '#717179', fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110,
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

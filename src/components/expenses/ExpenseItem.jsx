import { useState, useRef } from 'react'
import { formatMoney, getAccountConfig } from '../../lib/format'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'

export default function ExpenseItem({ transaction, onDelete, onEdit }) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [swiping, setSwiping]         = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isSwipingRef = useRef(false)
  const DELETE_THRESHOLD = 80

  // Join result from Supabase — could be cycle_categories or categories
  const cat = transaction.cycle_categories || transaction.categories || null
  const acc = getAccountConfig(transaction.account)

  function handleTouchStart(e) {
    touchStartX.current   = e.touches[0].clientX
    touchStartY.current   = e.touches[0].clientY
    isSwipingRef.current  = false
  }

  function handleTouchMove(e) {
    const deltaX = touchStartX.current - e.touches[0].clientX
    const deltaY = Math.abs(touchStartY.current - e.touches[0].clientY)
    if (!isSwipingRef.current && deltaY > 10) return
    if (deltaX > 5 || isSwipingRef.current) {
      isSwipingRef.current = true
      setSwiping(true)
      setSwipeOffset(Math.min(Math.max(deltaX, 0), DELETE_THRESHOLD + 20))
    }
  }

  function handleTouchEnd() {
    if (swipeOffset > DELETE_THRESHOLD) onDelete?.(transaction.id)
    setSwipeOffset(0)
    setSwiping(false)
    isSwipingRef.current = false
  }

  const catName  = cat?.name  || (transaction.category_id ? 'Category' : 'Unbudgeted')
  const catIcon  = cat?.icon  || '💳'
  const catColor = cat?.colour || '#888'

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Swipe-to-delete background */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingRight: 16,
        background: 'rgba(239,68,68,0.08)',
      }}>
        <Trash2 size={18} color="#EF4444" />
      </div>

      {/* Row */}
      <div
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          background: '#1B1B1B',
          transform: `translateX(-${swipeOffset}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease',
          cursor: 'pointer',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !swiping && onEdit?.(transaction)}
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
            {/* Bank pill */}
            {transaction.account && (
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 5, fontWeight: 500,
                color: acc.color, background: acc.bg,
                fontFamily: 'Inter, sans-serif',
              }}>
                {acc.label}
              </span>
            )}
            {/* Date */}
            <span style={{ fontSize: 11, color: '#717179', fontFamily: 'Inter, sans-serif' }}>
              {format(new Date(transaction.transaction_date), 'd MMM')}
            </span>
            {/* Notes if any */}
            {transaction.notes && (
              <span style={{
                fontSize: 11, color: '#717179', fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100,
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

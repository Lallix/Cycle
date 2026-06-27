import { useState, useRef } from 'react'
import { formatMoney, formatRelativeDate, getAccountConfig } from '../../lib/format'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'

export default function ExpenseItem({ transaction, onDelete, onEdit }) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isSwipingRef = useRef(false)

  const acc = getAccountConfig(transaction.account)
  const DELETE_THRESHOLD = 80

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isSwipingRef.current = false
  }

  function handleTouchMove(e) {
    const deltaX = touchStartX.current - e.touches[0].clientX
    const deltaY = Math.abs(touchStartY.current - e.touches[0].clientY)

    // Only horizontal swipes
    if (!isSwipingRef.current && deltaY > 10) return

    if (deltaX > 5 || isSwipingRef.current) {
      isSwipingRef.current = true
      setSwiping(true)
      const clamped = Math.min(Math.max(deltaX, 0), DELETE_THRESHOLD + 20)
      setSwipeOffset(clamped)
    }
  }

  function handleTouchEnd() {
    if (swipeOffset > DELETE_THRESHOLD) {
      onDelete?.(transaction.id)
    }
    setSwipeOffset(0)
    setSwiping(false)
    isSwipingRef.current = false
  }

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 bg-danger/10">
        <Trash2 size={18} className="text-danger" />
      </div>

      {/* Item */}
      <div
        className="relative flex items-center gap-3 px-4 py-3.5 bg-bg-surface"
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !swiping && onEdit?.(transaction)}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${transaction.categories?.color || '#888'}22` }}
        >
          {transaction.categories?.icon || '💳'}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{transaction.description}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {transaction.categories && (
              <span className="text-2xs px-1.5 py-0.5 rounded-md bg-bg-elevated text-text-secondary">
                {transaction.categories.name}
              </span>
            )}
            <span className="text-2xs px-1.5 py-0.5 rounded-md"
              style={{ color: acc.color, backgroundColor: acc.bg, fontSize: '0.6rem' }}
            >
              {transaction.account}
            </span>
            <span className="text-2xs text-muted">
              {format(new Date(transaction.transaction_date), 'd MMM')}
            </span>
          </div>
        </div>

        {/* Amount */}
        <span className="font-mono text-sm font-medium text-text-primary flex-shrink-0">
          -{formatMoney(transaction.amount)}
        </span>
      </div>
    </div>
  )
}

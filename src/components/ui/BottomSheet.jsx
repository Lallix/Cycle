import { useEffect, useRef, useState } from 'react'

export default function BottomSheet({ open, onClose, children, title, snapPoints, className = '' }) {
  const overlayRef = useRef(null)
  const sheetRef = useRef(null)
  const [dragStart, setDragStart] = useState(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  // Touch drag to dismiss
  function handleTouchStart(e) {
    setDragStart(e.touches[0].clientY)
    setDragOffset(0)
  }

  function handleTouchMove(e) {
    if (dragStart === null) return
    const delta = e.touches[0].clientY - dragStart
    if (delta > 0) setDragOffset(delta)
  }

  function handleTouchEnd() {
    if (dragOffset > 120) {
      onClose?.()
    }
    setDragOffset(0)
    setDragStart(null)
  }

  if (!visible) return null

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className={`sheet-overlay transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? 'none' : undefined,
        }}
        className={`
          sheet overflow-hidden flex flex-col
          transition-transform duration-300
          ${open ? 'translate-y-0' : 'translate-y-full'}
          ${className}
        `}
      >
        {/* Drag handle */}
        <div
          className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-border-light rounded-full mx-auto" />
        </div>

        {/* Title */}
        {title && (
          <div className="flex-shrink-0 px-5 pb-4">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  )
}

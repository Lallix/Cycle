import { useEffect, useRef, useState } from 'react'

export default function BottomSheet({ open, onClose, children, title, className = '' }) {
  const [dragOffset, setDragOffset] = useState(0)
  const [visible, setVisible]       = useState(false)
  const dragStart = useRef(null)

  useEffect(() => {
    if (open) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  function onTouchStart(e) { dragStart.current = e.touches[0].clientY }
  function onTouchMove(e) {
    if (dragStart.current === null) return
    const delta = e.touches[0].clientY - dragStart.current
    if (delta > 0) setDragOffset(delta)
  }
  function onTouchEnd() {
    if (dragOffset > 120) onClose?.()
    setDragOffset(0)
    dragStart.current = null
  }

  if (!visible) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 50,
          opacity: open ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Sheet — explicit positioning so GitHub Pages base path doesn't break it */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',           // explicit 100% not relying on inset
          maxHeight: '92svh',
          background: '#1B1B1B',
          borderRadius: '1.5rem 1.5rem 0 0',
          borderTop: '0.5px solid #2A2A2A',
          zIndex: 51,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          transform: open
            ? dragOffset > 0 ? `translateY(${dragOffset}px)` : 'translateY(0)'
            : 'translateY(100%)',
          transition: dragOffset > 0 ? 'none' : 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
        className={className}
      >
        {/* Drag handle */}
        <div
          style={{ flexShrink: 0, padding: '12px 0 8px', cursor: 'grab', textAlign: 'center' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div style={{ width: 36, height: 4, background: '#3A3A3A', borderRadius: 2, display: 'inline-block' }} />
        </div>

        {/* Title */}
        {title && (
          <div style={{ flexShrink: 0, padding: '0 20px 16px' }}>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {children}
        </div>
      </div>
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function BottomSheet({ open, onClose, children, title }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStart = useRef(null)
  const dragging  = useRef(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      document.body.style.overflow = 'hidden'
      // Small delay so the mount triggers the CSS transition
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    } else {
      setVisible(false)
      document.body.style.overflow = ''
      const t = setTimeout(() => {
        setMounted(false)
        setDragOffset(0)
      }, 320)
      return () => clearTimeout(t)
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape' && open) onClose?.() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  function onTouchStart(e) {
    dragStart.current = e.touches[0].clientY
    dragging.current  = false
  }
  function onTouchMove(e) {
    if (dragStart.current === null) return
    const delta = e.touches[0].clientY - dragStart.current
    if (delta > 0) { dragging.current = true; setDragOffset(delta) }
  }
  function onTouchEnd() {
    if (dragOffset > 110) onClose?.()
    else setDragOffset(0)
    dragStart.current = null
  }

  if (!mounted) return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 200,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          zIndex: 201,
          background: '#1B1B1B',
          borderRadius: '20px 20px 0 0',
          borderTop: '0.5px solid #2A2A2A',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
          maxHeight: '92svh',
          display: 'flex',
          flexDirection: 'column',
          transform: visible
            ? dragOffset > 0 ? `translateY(${dragOffset}px)` : 'translateY(0)'
            : 'translateY(100%)',
          transition: dragging.current ? 'none' : 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Drag handle */}
        <div
          style={{ flexShrink: 0, padding: '12px 0 0', textAlign: 'center', cursor: 'grab' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div style={{ width: 36, height: 4, background: '#3A3A3A', borderRadius: 2, display: 'inline-block' }} />
        </div>

        {/* Title */}
        {title && (
          <div style={{ flexShrink: 0, padding: '12px 20px 8px' }}>
            <h2 style={{
              fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 600,
              color: '#FFFFFF',
            }}>
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  )
}

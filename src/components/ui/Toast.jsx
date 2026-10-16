import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const icons = {
  success: <CheckCircle size={18} className="text-success" />,
  error: <XCircle size={18} className="text-danger" />,
  warning: <AlertCircle size={18} className="text-warning" />,
  info: <Info size={18} className="text-gold" />,
}

const borderColors = {
  success: 'border-success/30',
  error: 'border-danger/30',
  warning: 'border-warning/30',
  info: 'border-gold/30',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  // action (optional): { label, onClick } — shown as a button, e.g. Undo
  const toast = useCallback((message, type = 'success', duration = 3000, action = null) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type, action }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 left-0 right-0 z-[9999] flex flex-col gap-2 items-center pointer-events-none px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              flex items-center gap-3 bg-bg-elevated border rounded-2xl px-4 py-3
              shadow-card w-full max-w-sm pointer-events-auto animate-slide-down
              ${borderColors[t.type] || borderColors.info}
            `}
          >
            {icons[t.type] || icons.info}
            <p className="flex-1 text-sm text-text-primary">{t.message}</p>
            {t.action && (
              <button
                onClick={() => { dismiss(t.id); t.action.onClick() }}
                className="text-sm font-semibold text-gold px-2 py-1 rounded-lg hover:bg-gold/10 transition-colors"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted hover:text-text-primary transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx.toast
}

export function useToastDismiss() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastDismiss must be inside ToastProvider')
  return ctx.dismiss
}

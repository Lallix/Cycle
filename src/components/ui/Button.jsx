import { Loader2 } from 'lucide-react'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  fullWidth = false,
  onClick,
  type = 'button',
  ...props
}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, fontWeight: 500, transition: 'all 0.15s ease',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1,
    border: 'none', outline: 'none',
    fontFamily: 'inherit',
    width: fullWidth ? '100%' : undefined,
  }

  const sizes = {
    sm: { padding: '6px 12px',  fontSize: 12, borderRadius: 8  },
    md: { padding: '10px 16px', fontSize: 14, borderRadius: 12 },
    lg: { padding: '14px 24px', fontSize: 15, borderRadius: 14 },
    xl: { padding: '16px 32px', fontSize: 16, borderRadius: 16 },
    icon:{ padding: '10px',     fontSize: 14, borderRadius: 12 },
  }

  const variants = {
    primary: {
      background: '#FFD166',
      color: '#0D0D0D',
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
      boxShadow: '0 0 20px rgba(255,209,102,0.25)',
    },
    secondary: {
      background: '#2E2E2E',
      color: '#FFFFFF',
      border: '0.5px solid #3A3A3A',
    },
    ghost: {
      background: 'transparent',
      color: '#A1A1AA',
    },
    danger: {
      background: 'rgba(239,68,68,0.1)',
      color: '#EF4444',
      border: '0.5px solid rgba(239,68,68,0.3)',
    },
    success: {
      background: 'rgba(34,197,94,0.1)',
      color: '#22C55E',
      border: '0.5px solid rgba(34,197,94,0.3)',
    },
    outline: {
      background: 'transparent',
      color: '#FFD166',
      border: '0.5px solid rgba(255,209,102,0.5)',
    },
  }

  const style = {
    ...base,
    ...(sizes[size] || sizes.md),
    ...(variants[variant] || variants.primary),
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
      className={className}
      {...props}
    >
      {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  )
}

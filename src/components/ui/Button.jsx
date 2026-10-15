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
      background: '#E8C36A',
      color: '#0E0E10',
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 600,
      boxShadow: '0 0 0 0 transparent',
    },
    secondary: {
      background: '#1F1F23',
      color: '#F4F4F5',
      border: '0.5px solid #34343A',
    },
    ghost: {
      background: 'transparent',
      color: '#A1A1AA',
    },
    danger: {
      background: 'rgba(240,122,106,0.1)',
      color: '#F07A6A',
      border: '0.5px solid rgba(240,122,106,0.3)',
    },
    success: {
      background: 'rgba(91,201,139,0.1)',
      color: '#5BC98B',
      border: '0.5px solid rgba(91,201,139,0.3)',
    },
    outline: {
      background: 'transparent',
      color: '#E8C36A',
      border: '0.5px solid rgba(232,195,106,0.5)',
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

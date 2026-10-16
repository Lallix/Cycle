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
      background: 'rgb(var(--c-accent))',
      color: 'rgb(var(--c-bg))',
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      boxShadow: '0 0 0 0 transparent',
    },
    secondary: {
      background: 'rgb(var(--c-surface-2))',
      color: 'rgb(var(--c-text))',
      border: '0.5px solid rgb(var(--c-border-strong))',
    },
    ghost: {
      background: 'transparent',
      color: 'rgb(var(--c-text-2))',
    },
    danger: {
      background: 'rgb(var(--c-negative) / 0.1)',
      color: 'rgb(var(--c-negative))',
      border: '0.5px solid rgb(var(--c-negative) / 0.3)',
    },
    success: {
      background: 'rgb(var(--c-positive) / 0.1)',
      color: 'rgb(var(--c-positive))',
      border: '0.5px solid rgb(var(--c-positive) / 0.3)',
    },
    outline: {
      background: 'transparent',
      color: 'rgb(var(--c-accent))',
      border: '0.5px solid rgb(var(--c-accent) / 0.5)',
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

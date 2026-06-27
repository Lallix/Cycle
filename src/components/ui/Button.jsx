import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-gradient-gold text-bg font-semibold shadow-gold-sm',
  secondary: 'bg-bg-elevated border border-border text-text-primary',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary',
  danger: 'bg-danger/10 border border-danger/30 text-danger',
  success: 'bg-success/10 border border-success/30 text-success',
  outline: 'bg-transparent border border-gold/50 text-gold',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
  xl: 'px-8 py-4 text-lg rounded-2xl',
  icon: 'p-2.5 rounded-xl',
}

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
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-150 active:scale-95
        disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

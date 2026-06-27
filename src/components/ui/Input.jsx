import { forwardRef } from 'react'

const Input = forwardRef(function Input({
  label,
  error,
  hint,
  prefix,
  suffix,
  className = '',
  containerClassName = '',
  mono = false,
  ...props
}, ref) {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 text-muted text-sm pointer-events-none">
            {prefix}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-bg-elevated border rounded-xl px-4 py-3 text-sm
            text-text-primary placeholder:text-muted
            transition-all duration-200
            focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border'}
            ${prefix ? 'pl-8' : ''}
            ${suffix ? 'pr-8' : ''}
            ${mono ? 'font-mono' : ''}
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 text-muted text-sm pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
})

export default Input

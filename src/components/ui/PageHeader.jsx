import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PageHeader({ title, subtitle, back, action, className = '' }) {
  const navigate = useNavigate()

  return (
    <div className={`flex items-center gap-3 px-4 py-4 ${className}`}>
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg-elevated border border-border tappable"
        >
          <ArrowLeft size={18} className="text-text-secondary" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-semibold text-text-primary truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <div className="flex-shrink-0">{action}</div>
      )}
    </div>
  )
}

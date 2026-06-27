import { getProgressColor } from '../../lib/format'

export default function ProgressBar({
  value = 0,
  max = 100,
  showLabel = false,
  size = 'md',
  className = '',
  colorOverride,
}) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const color = colorOverride || getProgressColor(percentage)

  const heights = {
    xs: 'h-0.5',
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
    xl: 'h-3',
  }

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-bg-elevated rounded-full overflow-hidden ${heights[size] || heights.md}`}>
        <div
          className="h-full rounded-full progress-bar"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-2xs text-muted font-mono">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useBudget } from '../../context/BudgetContext'

// Shows "25 Sep – 22 Oct" with prev/next arrows — cycles run payday to payday
// index 0 = current cycle, 1 = previous, etc.
export default function CycleSelector({ cycleIndex, onChange }) {
  const { cycles } = useBudget()
  const cycle    = cycles[cycleIndex] || cycles[0]
  if (!cycle) return null
  const isLatest = cycleIndex === 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px',
      background: '#17171A',
      borderRadius: 14,
      border: '0.5px solid #26262B',
      margin: '0 16px 12px',
    }}>
      {/* Prev cycle */}
      <button
        onClick={() => onChange(Math.min(cycleIndex + 1, cycles.length - 1))}
        disabled={cycleIndex >= cycles.length - 1}
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: cycleIndex >= cycles.length - 1 ? 'transparent' : '#1F1F23',
          border: '0.5px solid #34343A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: cycleIndex >= cycles.length - 1 ? 'default' : 'pointer',
          opacity: cycleIndex >= cycles.length - 1 ? 0.3 : 1,
        }}
      >
        <ChevronLeft size={16} color="#A1A1AA" />
      </button>

      {/* Cycle label */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
          color: '#F4F4F5',
        }}>
          {format(cycle.start, 'd MMM')} – {format(cycle.end, 'd MMM')}
        </p>
        {isLatest && (
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10,
            color: '#E8C36A', marginTop: 1,
          }}>
            Current cycle · Day {cycle.dayOfCycle} of {cycle.totalDays}
          </p>
        )}
        {!isLatest && (
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10,
            color: '#8B8B93', marginTop: 1,
          }}>
            {cycleIndex} cycle{cycleIndex !== 1 ? 's' : ''} ago
          </p>
        )}
      </div>

      {/* Next cycle */}
      <button
        onClick={() => onChange(Math.max(cycleIndex - 1, 0))}
        disabled={isLatest}
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: isLatest ? 'transparent' : '#1F1F23',
          border: '0.5px solid #34343A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: isLatest ? 'default' : 'pointer',
          opacity: isLatest ? 0.3 : 1,
        }}
      >
        <ChevronRight size={16} color="#A1A1AA" />
      </button>
    </div>
  )
}

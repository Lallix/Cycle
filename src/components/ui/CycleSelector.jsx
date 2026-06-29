import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { getLastNCycles } from '../../lib/cycle'
import { useAuth } from '../../context/AuthContext'

// Shows "25 Jun – 24 Jul" with prev/next arrows
// index 0 = current cycle, 1 = previous, etc.
export default function CycleSelector({ cycleIndex, onChange }) {
  const { profile } = useAuth()
  const startDay = profile?.cycle_start_day || 25
  const cycles   = getLastNCycles(12, startDay)
  const cycle    = cycles[cycleIndex] || cycles[0]
  const isLatest = cycleIndex === 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px',
      background: '#1B1B1B',
      borderRadius: 14,
      border: '0.5px solid #2A2A2A',
      margin: '0 16px 12px',
    }}>
      {/* Prev cycle */}
      <button
        onClick={() => onChange(Math.min(cycleIndex + 1, cycles.length - 1))}
        disabled={cycleIndex >= cycles.length - 1}
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: cycleIndex >= cycles.length - 1 ? 'transparent' : '#2E2E2E',
          border: '0.5px solid #3A3A3A',
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
          color: '#FFFFFF',
        }}>
          {format(cycle.start, 'd MMM')} – {format(cycle.end, 'd MMM')}
        </p>
        {isLatest && (
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10,
            color: '#FFD166', marginTop: 1,
          }}>
            Current cycle · Day {cycle.dayOfCycle} of {cycle.totalDays}
          </p>
        )}
        {!isLatest && (
          <p style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10,
            color: '#717179', marginTop: 1,
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
          background: isLatest ? 'transparent' : '#2E2E2E',
          border: '0.5px solid #3A3A3A',
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

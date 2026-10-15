import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
import { useBudget } from '../../context/BudgetContext'
import { T } from '../../lib/theme'

// Shown for the first week after payday: a nudge to review the cycle that
// just ended and set this cycle's limits.
export default function ReviewPrompt() {
  const { cycle, cycles } = useBudget()
  const navigate = useNavigate()
  const last = cycles[1]
  if (!cycle || !last || cycle.dayOfCycle > 7) return null

  return (
    <div className="px-4 mb-4">
      <button
        onClick={() => navigate('/review')}
        className="w-full flex items-center gap-3 px-4 py-3.5 tappable"
        style={{ background: T.goldSoft, border: `0.5px solid ${T.goldLine}`, borderRadius: T.radius, textAlign: 'left' }}
      >
        <ClipboardCheck size={18} color={T.gold} />
        <div className="flex-1">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: T.text }}>Payday review</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: T.text2 }}>
            See how {format(last.start, 'd MMM')} – {format(last.end, 'd MMM')} went and set this cycle's limits
          </p>
        </div>
        <ChevronRight size={16} color={T.gold} />
      </button>
    </div>
  )
}

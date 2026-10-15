import { useNavigate } from 'react-router-dom'
import { useBudget } from '../../context/BudgetContext'
import { formatMoney } from '../../lib/format'
import ProgressBar from '../ui/ProgressBar'

// Where this cycle's money is going, by spend type:
// Fixed (paid vs planned) · Predicted (vs limits) · Unplanned (vs allowance),
// then once-offs and debt, which sit outside the normal month.
const ROWS = [
  { key: 'fixed',     label: 'Fixed',     hint: 'bond, levy, rates, school, insurance', colour: '#6C8EBF' },
  { key: 'predicted', label: 'Predicted', hint: 'groceries, electricity, fuel, takeaways', colour: '#C9A84C' },
  { key: 'unplanned', label: 'Unplanned', hint: 'repairs, gifts, once-in-a-while', colour: '#C9803A' },
]

const small = { fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#9A9080' }

export default function TypeBreakdown() {
  const { totals } = useBudget()
  const navigate = useNavigate()

  const values = {
    fixed:     { spent: totals.fixedSpent,     of: totals.fixedPlanned,    note: totals.fixedDue > 0 ? `${formatMoney(totals.fixedDue, true)} still due` : 'all paid' },
    predicted: { spent: totals.predictedSpent, of: totals.predictedBudget },
    unplanned: { spent: totals.unplannedSpent, of: totals.unplannedBudget },
  }
  const extras = [
    totals.onceOff !== 0 && { label: 'Once-off', value: totals.onceOff },
    totals.debt !== 0 && { label: 'Loans in / repaid', value: totals.debt },
  ].filter(Boolean)

  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Where it's going
        </p>
        <button
          onClick={() => navigate('/budget')}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#FFD166', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Budget →
        </button>
      </div>

      <div style={{ background: '#FAF7F0', borderRadius: 16, border: '0.5px solid #E8E0D0', overflow: 'hidden' }}>
        {ROWS.map(row => {
          const v = values[row.key]
          const over = v.of > 0 && v.spent > v.of
          return (
            <div key={row.key} style={{ padding: '12px 16px', borderBottom: '0.5px solid #E8E0D0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: '#1C1814' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: row.colour, marginRight: 8 }} />
                    {row.label}
                  </span>
                  <p style={{ ...small, marginTop: 1 }}>{v.note || row.hint}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 600, color: over ? '#C05050' : '#1C1814' }}>
                    {formatMoney(v.spent, true)}
                  </span>
                  {v.of > 0 && (
                    <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, color: '#9A9080' }}> / {formatMoney(v.of, true)}</span>
                  )}
                </div>
              </div>
              {v.of > 0 && <ProgressBar value={v.spent} max={v.of} size="sm" />}
            </div>
          )
        })}

        {extras.map(x => (
          <div key={x.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid #E8E0D0' }}>
            <span style={{ ...small, fontSize: 12, color: '#6B6460' }}>{x.label}</span>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, fontWeight: 600, color: x.value > 0 ? '#2E8B57' : '#C05050' }}>
              {x.value > 0 ? '+' : '−'}{formatMoney(Math.abs(x.value), true)}
            </span>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px' }}>
          <span style={{ ...small, fontSize: 12 }}>
            Income {totals.incomeReceived > 0 ? 'received' : 'expected'}
          </span>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, fontWeight: 600, color: '#2E8B57' }}>
            {formatMoney(totals.income, true)}
          </span>
        </div>
      </div>
    </div>
  )
}

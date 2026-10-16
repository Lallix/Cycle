import { useNavigate } from 'react-router-dom'
import { useBudget } from '../../context/BudgetContext'
import { formatMoney } from '../../lib/format'
import ProgressBar from '../ui/ProgressBar'

// Where this cycle's money is going, by spend type:
// Fixed (paid vs planned) · Predicted (vs limits) · Unplanned (vs allowance),
// then once-offs and debt, which sit outside the normal month.
const ROWS = [
  { key: 'fixed',     label: 'Fixed',     hint: 'bond, levy, rates, school, insurance', colour: 'rgb(var(--c-fixed))' },
  { key: 'predicted', label: 'Predicted', hint: 'groceries, electricity, fuel, takeaways', colour: 'rgb(var(--c-accent))' },
  { key: 'unplanned', label: 'Unplanned', hint: 'repairs, gifts, once-in-a-while', colour: 'rgb(var(--c-unplanned))' },
]

const small = { fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-3))' }

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
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Where it's going
        </p>
        <button
          onClick={() => navigate('/budget')}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgb(var(--c-accent))', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Budget →
        </button>
      </div>

      <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 16, border: '0.5px solid rgb(var(--c-border))', overflow: 'hidden' }}>
        {ROWS.map(row => {
          const v = values[row.key]
          const over = v.of > 0 && v.spent > v.of
          return (
            <div key={row.key} style={{ padding: '12px 16px', borderBottom: '0.5px solid rgb(var(--c-border))' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: 'rgb(var(--c-text))' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: row.colour, marginRight: 8 }} />
                    {row.label}
                  </span>
                  <p style={{ ...small, marginTop: 1 }}>{v.note || row.hint}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: over ? 'rgb(var(--c-negative))' : 'rgb(var(--c-text))' }}>
                    {formatMoney(v.spent, true)}
                  </span>
                  {v.of > 0 && (
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'rgb(var(--c-text-3))' }}> / {formatMoney(v.of, true)}</span>
                  )}
                </div>
              </div>
              {v.of > 0 && <ProgressBar value={v.spent} max={v.of} size="sm" />}
            </div>
          )
        })}

        {extras.map(x => (
          <div key={x.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid rgb(var(--c-border))' }}>
            <span style={{ ...small, fontSize: 12, color: 'rgb(var(--c-text-2))' }}>{x.label}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: x.value > 0 ? 'rgb(var(--c-positive))' : 'rgb(var(--c-negative))' }}>
              {x.value > 0 ? '+' : '−'}{formatMoney(Math.abs(x.value), true)}
            </span>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px' }}>
          <span style={{ ...small, fontSize: 12 }}>
            Income {totals.incomeReceived > 0 ? 'received' : 'expected'}
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: 'rgb(var(--c-positive))' }}>
            {formatMoney(totals.income, true)}
          </span>
        </div>
      </div>
    </div>
  )
}

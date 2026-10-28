import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Check, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useBudget } from '../context/BudgetContext'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { formatMoney } from '../lib/format'
import { reviewCycle } from '../lib/budgets'
import { T, TYPE_COLOUR, label } from '../lib/theme'

// Payday review: how the cycle that just ended went against its plan, and
// what to set for the cycle that is starting. Suggestions are the average of
// the last three cycles, rounded up to R50.

const money = (v, compact = true) => `${v < 0 ? '−' : ''}${formatMoney(Math.abs(v), compact)}`
const TYPE_LABEL = { fixed: 'Fixed', predicted: 'Predicted', unplanned: 'Unplanned' }
const card = { background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: T.radius, padding: 16 }

export default function ReviewPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const {
    cycles, categories, budgetHistory, getTransactionsForCycle, setCategoryBudget,
  } = useBudget()
  const finished = cycles.slice(1)                 // cycles[0] is still running
  const [idx, setIdx] = useState(0)
  const [txSets, setTxSets] = useState(null)       // [reviewed, older, older]
  const [edits, setEdits] = useState({})           // categoryId → new limit (text)
  const [saving, setSaving] = useState(false)
  const reviewed = finished[idx]

  useEffect(() => {
    if (!reviewed) return
    setTxSets(null); setEdits({})
    Promise.all(finished.slice(idx, idx + 3).map(c => getTransactionsForCycle(c.key)))
      .then(setTxSets)
      .catch(e => toast(e.message, 'error'))
  }, [reviewed?.key])

  const review = useMemo(() => txSets && reviewCycle({
    cycleTx: txSets[0], recentTx: txSets, categories, history: budgetHistory, cycleKey: reviewed.key,
  }), [txSets, categories, budgetHistory])

  if (!reviewed) {
    return (
      <div style={{ minHeight: '100%', background: T.bg }}>
        <PageHeader title="Payday review" back />
        <p className="px-4" style={{ ...label, textTransform: 'none' }}>Your first cycle is still running — come back after payday.</p>
      </div>
    )
  }

  const changed = Object.entries(edits).filter(([id, v]) => {
    const n = parseFloat(v)
    const cur = categories.find(c => c.id === id)?.budget_amount
    return !Number.isNaN(n) && n >= 0 && n !== parseFloat(cur ?? -1)
  })

  async function saveLimits() {
    setSaving(true)
    try {
      for (const [id, v] of changed) await setCategoryBudget(id, parseFloat(v), cycles[0].key)
      toast(`${changed.length} limit${changed.length > 1 ? 's' : ''} set from ${format(cycles[0].start, 'd MMM')}`, 'success')
      setEdits({})
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const over = review?.rows.filter(r => r.diff < -0.5 && r.type !== 'fixed').slice(0, 3) || []

  return (
    <div style={{ minHeight: '100%', background: T.bg, paddingBottom: changed.length ? 190 : 120 }}>
      <PageHeader title="Payday review" subtitle="How the last cycle went, and the plan for this one" back />

      {/* Cycle picker */}
      <div className="flex items-center justify-between mx-4 mb-4 px-3 py-2" style={{ ...card, padding: '8px 12px' }}>
        <button onClick={() => setIdx(i => Math.min(i + 1, finished.length - 1))} disabled={idx >= finished.length - 1}
          className="p-1.5 tappable" style={{ opacity: idx >= finished.length - 1 ? 0.3 : 1 }} aria-label="Earlier cycle">
          <ChevronLeft size={16} color={T.text2} />
        </button>
        <div className="text-center">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: T.text }}>
            {format(reviewed.start, 'd MMM')} – {format(reviewed.end, 'd MMM yyyy')}
          </p>
          <p style={{ ...label, textTransform: 'none', letterSpacing: 0, color: idx === 0 ? T.gold : T.text3 }}>
            {idx === 0 ? 'Cycle that just ended' : `${idx + 1} cycles ago`} · {reviewed.totalDays} days
          </p>
        </div>
        <button onClick={() => setIdx(i => Math.max(i - 1, 0))} disabled={idx === 0}
          className="p-1.5 tappable" style={{ opacity: idx === 0 ? 0.3 : 1 }} aria-label="Later cycle">
          <ChevronRight size={16} color={T.text2} />
        </button>
      </div>

      {!review ? (
        <p className="text-center py-10" style={{ ...label, textTransform: 'none' }}>Loading the cycle…</p>
      ) : (
        <div className="px-4 space-y-4">

          {/* Headline: left over, planned vs actual */}
          <div style={card}>
            <p style={label}>Left over</p>
            <div className="flex items-end justify-between mt-1">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', color: review.left.actual < 0 ? T.negative : T.gold }}>
                {money(review.left.actual)}
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: T.text3, marginBottom: 6 }}>
                plan {money(review.left.planned)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Mini name="Income" planned={review.income.planned} actual={review.income.actual} good={review.income.actual >= review.income.planned - 1} />
              <Mini name="Spending" planned={review.spend.planned} actual={review.spend.actual} good={review.spend.actual <= review.spend.planned} />
            </div>
            {(review.onceOff !== 0 || review.debt !== 0) && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: T.text3, marginTop: 12 }}>
                Outside the plan: once-offs {money(review.onceOff)}, loans {money(review.debt)}.
              </p>
            )}
            {review.uncategorised > 0.5 && (
              <button onClick={() => navigate('/activity?tab=transactions')} style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: T.warning, marginTop: 8, background: 'none', border: 'none', padding: 0 }}>
                {money(review.uncategorised)} has no category — sort it on Transactions →
              </button>
            )}
          </div>

          {/* By type */}
          <div style={card}>
            <p style={{ ...label, marginBottom: 12 }}>By type</p>
            <div className="space-y-3">
              {Object.entries(review.byType).map(([type, v]) => {
                const pct = v.planned > 0 ? Math.min(140, (v.actual / v.planned) * 100) : 0
                return (
                  <div key={type}>
                    <div className="flex justify-between" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
                      <span style={{ color: T.text }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: TYPE_COLOUR[type], marginRight: 8 }} />
                        {TYPE_LABEL[type]}
                      </span>
                      <span style={{ color: v.actual > v.planned + 0.5 ? T.negative : T.text2 }}>
                        {money(v.actual)} <span style={{ color: T.text3 }}>/ {money(v.planned)}</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: T.surface2, borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, pct)}%`, height: 6, borderRadius: 3, background: pct > 100 ? T.negative : TYPE_COLOUR[type] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Biggest overruns */}
          {over.length > 0 && (
            <div style={card}>
              <p style={{ ...label, marginBottom: 10 }}>Went over</p>
              {over.map(r => (
                <div key={r.id} className="flex items-center gap-3 py-1.5">
                  <span style={{ width: 22, textAlign: 'center' }}>{r.icon}</span>
                  <span className="flex-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: T.text }}>{r.name}</span>
                  <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: T.negative }}>
                    <ArrowUpRight size={13} /> {money(-r.diff)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Every category, with the limit for the next cycle */}
          <div style={card}>
            <div className="flex items-baseline justify-between mb-1">
              <p style={label}>Limits from {format(cycles[0].start, 'd MMM')}</p>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: T.text3 }}>avg of 3 cycles</span>
            </div>
            {['predicted', 'unplanned', 'fixed'].map(type => {
              const rows = review.rows.filter(r => r.type === type)
              if (!rows.length) return null
              return (
                <div key={type} className="mt-3">
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: TYPE_COLOUR[type], marginBottom: 4 }}>{TYPE_LABEL[type]}</p>
                  {rows.map(r => {
                    const current = parseFloat(categories.find(c => c.id === r.id)?.budget_amount ?? 0)
                    const value = edits[r.id] ?? String(current || '')
                    const differs = r.type !== 'fixed' && Math.abs(r.suggestion - current) >= 50
                    return (
                      <div key={r.id} className="flex items-center gap-2 py-2" style={{ borderTop: `0.5px solid ${T.border}` }}>
                        <span style={{ width: 20, textAlign: 'center' }}>{r.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate" style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: T.text }}>{r.name}</p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: T.text3 }}>
                            spent {money(r.spent)} of {money(r.planned)}
                            {r.diff < -0.5 && <span style={{ color: T.negative }}> · over {money(-r.diff)}</span>}
                            {r.diff > 0.5 && r.type !== 'fixed' && <span style={{ color: T.positive }}> · under {money(r.diff)}</span>}
                          </p>
                          {differs && edits[r.id] == null && (
                            <button onClick={() => setEdits(e => ({ ...e, [r.id]: String(r.suggestion) }))}
                              className="flex items-center gap-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: T.gold, background: 'none', border: 'none', padding: 0, marginTop: 2 }}>
                              {r.suggestion > current ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                              Use {money(r.suggestion)} (avg {money(r.recentAverage)})
                            </button>
                          )}
                        </div>
                        <input
                          inputMode="decimal"
                          value={value}
                          onChange={e => setEdits(prev => ({ ...prev, [r.id]: e.target.value.replace(/[^\d.]/g, '') }))}
                          aria-label={`Limit for ${r.name}`}
                          style={{
                            width: 92, padding: '8px 10px', textAlign: 'right', borderRadius: 10,
                            background: T.surface2, color: T.text, fontFamily: 'var(--font-display)', fontSize: 13,
                            border: `0.5px solid ${edits[r.id] != null ? T.goldLine : T.borderStrong}`,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {changed.length > 0 && (
        <div className="fixed left-0 right-0 px-4" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
          <Button fullWidth size="lg" loading={saving} onClick={saveLimits}>
            <Check size={16} /> Save {changed.length} limit{changed.length > 1 ? 's' : ''} from {format(cycles[0].start, 'd MMM')}
          </Button>
        </div>
      )}
    </div>
  )
}

function Mini({ name, planned, actual, good }) {
  return (
    <div style={{ background: T.surface2, borderRadius: 12, padding: '10px 12px' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: T.text3 }}>{name}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 500, color: good ? T.text : T.negative }}>{money(actual)}</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: T.text3 }}>plan {money(planned)}</p>
    </div>
  )
}

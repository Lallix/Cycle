import { useState, useEffect } from 'react'
import { useBudget } from '../context/BudgetContext'
import { formatMoney } from '../lib/format'
import { isSpend, spendAmount } from '../lib/spend'
import { computeCycleTotals } from '../lib/totals'
import CycleSelector from '../components/ui/CycleSelector'
import LoadingScreen from '../components/ui/LoadingScreen'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, Minus, CalendarRange } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Bar chart ──────────────────────────────────────────────────────────────
function BarChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => Math.max(d.income, d.spent)), 1)
  const H = 110

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: H + 28, paddingTop: 20 }}>
      {data.map((d, i) => {
        const incH  = Math.round((d.income / max) * H)
        const spH   = Math.round((d.spent  / max) * H)
        const over  = d.spent > d.income
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {/* Bars */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: H, width: '100%', maxWidth: 44 }}>
              {/* Income bar */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: H }}>
                <div style={{ width: '100%', background: 'rgb(var(--c-positive) / 0.25)', borderRadius: '3px 3px 0 0', height: incH, minHeight: 2 }} />
              </div>
              {/* Spent bar */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: H }}>
                <div style={{ width: '100%', background: over ? 'rgb(var(--c-negative))' : 'rgb(var(--c-accent))', borderRadius: '3px 3px 0 0', height: spH, minHeight: 2, opacity: 0.9 }} />
              </div>
            </div>
            {/* Month label */}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgb(var(--c-text-3))' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Donut chart ────────────────────────────────────────────────────────────
function DonutChart({ data }) {
  if (!data || data.length === 0) return (
    <p style={{ textAlign: 'center', padding: '20px 0', color: 'rgb(var(--c-text-3))', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
      No spend data yet
    </p>
  )
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const SIZE   = 130
  const R      = 48
  const CIRC   = 2 * Math.PI * R
  const SW     = 16
  const COLORS = ['rgb(var(--c-accent))','rgb(var(--c-positive))','#3B82F6','rgb(var(--c-negative))','#8B5CF6','#F97316','#14B8A6','#EC4899']
  let offset   = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Ring */}
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="rgb(var(--c-border))" strokeWidth={SW} />
        {data.slice(0, 8).map((d, i) => {
          const pct  = d.value / total
          const dash = pct * CIRC
          const gap  = CIRC - dash
          const el   = (
            <circle key={i}
              cx={SIZE/2} cy={SIZE/2} r={R}
              fill="none" stroke={COLORS[i % COLORS.length]}
              strokeWidth={SW} strokeLinecap="butt"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
            />
          )
          offset += dash
          return el
        })}
        <text x={SIZE/2} y={SIZE/2 - 5} textAnchor="middle"
          style={{ fontFamily: 'var(--font-display)', fontSize: 11, fill: 'rgb(var(--c-text-2))', fontWeight: 400 }}>
          spent
        </text>
        <text x={SIZE/2} y={SIZE/2 + 10} textAnchor="middle"
          style={{ fontFamily: 'var(--font-display)', fontSize: 14, fill: 'rgb(var(--c-text))', fontWeight: 500 }}>
          {formatMoney(total, true)}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
        {data.slice(0, 6).map((d, i) => {
          const pct = Math.round((d.value / total) * 100)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgb(var(--c-text-2))', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.icon} {d.name}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'rgb(var(--c-text))', flexShrink: 0, marginLeft: 4 }}>
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Shared components ──────────────────────────────────────────────────────
function Card({ children, ivory = false, style = {} }) {
  return (
    <div style={{
      background: ivory ? 'rgb(var(--c-surface))' : 'rgb(var(--c-surface))',
      borderRadius: 16,
      border: `0.5px solid ${ivory ? 'rgb(var(--c-border))' : 'rgb(var(--c-border))'}`,
      padding: 16,
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ ivory = false, children }) {
  return (
    <p style={{
      fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
      color: ivory ? 'rgb(var(--c-text-3))' : 'rgb(var(--c-text-3))',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
    }}>
      {children}
    </p>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgb(var(--c-accent))', borderTopColor: 'transparent', animation: 'rSpin 0.8s linear infinite' }} />
      <style>{`@keyframes rSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ReportsPage({ embedded = false, cycleIndex: cycleProp, onCategoryClick }) {
  const { loading, categories, transactions, cycles, getTransactionsForCycle } = useBudget()

  const [ownCycle, setCycleIndex]         = useState(0)
  const cycleIndex = embedded ? cycleProp : ownCycle
  const [cycleTx, setCycleTx]             = useState(null)
  const [loadingCycle, setLoadingCycle]   = useState(false)
  const [trendData, setTrendData]         = useState([])
  const [loadingTrend, setLoadingTrend]   = useState(true)

  const navigate  = useNavigate()
  const totalsFor = txs => computeCycleTotals({ transactions: txs, categories })

  // Build 6-cycle trend on mount
  useEffect(() => {
    if (loading || !cycles.length) return
    buildTrend()
  }, [loading, cycles.length])

  async function buildTrend() {
    setLoadingTrend(true)
    try {
      const recent  = cycles.slice(0, 6).reverse()
      const current = cycles[0]?.key
      const results = await Promise.all(
        recent.map(async (c) => {
          const txs  = c.key === current ? transactions : await getTransactionsForCycle(c.key)
          const t    = totalsFor(txs)
          return { label: format(c.start, 'MMM'), income: t.income, spent: t.spent }
        })
      )
      setTrendData(results)
    } catch (e) { console.error(e) }
    finally { setLoadingTrend(false) }
  }

  // Load past cycle transactions
  useEffect(() => {
    if (loading) return
    if (cycleIndex === 0) { setCycleTx(null); return }
    const selected = cycles[cycleIndex]
    if (!selected) return
    setLoadingCycle(true)
    getTransactionsForCycle(selected.key)
      .then(data => setCycleTx(data))
      .catch(e => console.error(e))
      .finally(() => setLoadingCycle(false))
  }, [cycleIndex, loading])

  if (loading) return <LoadingScreen />

  const activeTx  = cycleIndex === 0 ? transactions : (cycleTx || [])
  const { income, spent } = totalsFor(activeTx)
  const remaining = income - spent
  const spentPct  = income > 0 ? Math.min(Math.round((spent / income) * 100), 100) : 0
  const isOver    = remaining < 0

  // Category breakdown — net of refunds, the same as the dashboard and budget
  const catMap = {}
  activeTx.forEach(tx => {
    const cat = tx.cycle_categories || tx.categories
    const value = spendAmount(tx)
    if (!cat || value === 0) return
    if (!catMap[cat.id]) catMap[cat.id] = { ...cat, value: 0 }
    catMap[cat.id].value += value
  })
  const categoryData = Object.values(catMap).filter(c => c.value > 0).sort((a, b) => b.value - a.value)

  // Top 5 by amount
  const topTx = activeTx.filter(isSpend).sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5)

  const TrendIcon  = isOver ? TrendingUp : remaining === 0 ? Minus : TrendingDown
  const trendColor = isOver ? 'rgb(var(--c-negative))' : 'rgb(var(--c-positive))'

  return (
    <div style={{ minHeight: '100%', background: 'rgb(var(--c-bg))', paddingBottom: 120 }}>

      {/* Header (Activity shows its own) */}
      {!embedded && <div style={{ padding: 'max(env(safe-area-inset-top), 16px) 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'rgb(var(--c-text))' }}>
            Reports
          </h1>
          <button
            onClick={() => navigate('/activity?tab=year')}
            className="flex items-center gap-1.5 tappable"
            style={{ padding: '6px 12px', borderRadius: 10, background: 'rgb(var(--c-accent) / 0.1)',
              border: '0.5px solid rgb(var(--c-accent) / 0.3)', color: 'rgb(var(--c-accent))', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
          >
            <CalendarRange size={14} /> Year view
          </button>
        </div>
      </div>}

      {/* Cycle selector */}
      {!embedded && <CycleSelector cycleIndex={cycleIndex} onChange={setCycleIndex} />}

      {loadingCycle ? <Spinner /> : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Summary — ivory ── */}
          <Card ivory>
            <SectionLabel ivory>This cycle</SectionLabel>
            <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
              {[
                { label: 'Income',    value: income,    color: 'rgb(var(--c-positive))' },
                { label: 'Spent',     value: spent,     color: 'rgb(var(--c-negative))' },
                { label: 'Remaining', value: Math.abs(remaining), color: isOver ? 'rgb(var(--c-negative))' : 'rgb(var(--c-accent))' },
              ].map((s, i) => (
                <div key={s.label} style={{
                  flex: 1, textAlign: 'center', padding: '4px 0',
                  borderRight: i < 2 ? '0.5px solid rgb(var(--c-border))' : 'none',
                }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    {s.label}
                  </p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: s.color }}>
                    {formatMoney(s.value, true)}
                  </p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: 'rgb(var(--c-border))', borderRadius: 2 }}>
              <div style={{
                height: 4, borderRadius: 2,
                background: isOver ? 'rgb(var(--c-negative))' : spentPct > 80 ? 'rgb(var(--c-warning))' : 'rgb(var(--c-accent))',
                width: `${spentPct}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgb(var(--c-text-3))' }}>
                {spentPct}% spent
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: trendColor, display: 'flex', alignItems: 'center', gap: 3 }}>
                <TrendIcon size={11} />
                {isOver ? `Over by ${formatMoney(Math.abs(remaining), true)}` : 'On track'}
              </span>
            </div>
          </Card>

          {/* ── 6-cycle trend ── */}
          <Card>
            <SectionLabel>6-cycle trend</SectionLabel>
            {loadingTrend ? (
              <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgb(var(--c-text-3))' }}>Loading...</p>
              </div>
            ) : (
              <>
                <BarChart data={trendData} />
                <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgb(var(--c-positive) / 0.35)' }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgb(var(--c-text-3))' }}>Income</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgb(var(--c-accent))' }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgb(var(--c-text-3))' }}>Spent</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgb(var(--c-negative))' }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgb(var(--c-text-3))' }}>Over</span>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* ── Category breakdown ── */}
          <Card>
            <SectionLabel>By category</SectionLabel>
            <DonutChart data={categoryData} />
          </Card>

          {/* ── Every category; tap one to see its transactions ── */}
          {categoryData.length > 0 && (
            <Card style={{ padding: 0 }}>
              <div style={{ padding: '14px 16px 6px' }}><SectionLabel>Spending by category</SectionLabel></div>
              {categoryData.map(c => (
                <button key={c.id} onClick={() => onCategoryClick ? onCategoryClick(c) : navigate('/activity?tab=transactions')}
                  className="tappable"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'none', border: 0,
                    borderTop: '0.5px solid rgb(var(--c-border))', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{c.icon || '💳'}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>{formatMoney(c.value)}</span>
                  <span style={{ color: 'rgb(var(--c-text-3))', fontSize: 14 }}>›</span>
                </button>
              ))}
            </Card>
          )}

          {/* ── Largest expenses — ivory rows ── */}
          {topTx.length > 0 && (
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgb(var(--c-text-3))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 2 }}>
                Largest expenses
              </p>
              <div style={{ background: 'rgb(var(--c-surface))', borderRadius: 16, border: '0.5px solid rgb(var(--c-border))', overflow: 'hidden' }}>
                {topTx.map((tx, i) => {
                  const cat = tx.cycle_categories || tx.categories
                  return (
                    <div key={tx.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < topTx.length - 1 ? '0.5px solid rgb(var(--c-border))' : 'none',
                    }}>
                      {/* Rank */}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'rgb(var(--c-accent))', width: 16, textAlign: 'center', flexShrink: 0, fontWeight: 600 }}>
                        {i + 1}
                      </span>
                      {/* Icon */}
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{cat?.icon || '💳'}</span>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgb(var(--c-text))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cat?.name || 'Unbudgeted'}
                        </p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgb(var(--c-text-2))', marginTop: 2 }}>
                          {format(new Date(tx.transaction_date), 'd MMM')}
                          {tx.notes && <span> · {tx.notes}</span>}
                        </p>
                      </div>
                      {/* Amount */}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500, color: 'rgb(var(--c-negative))', flexShrink: 0 }}>
                        -{formatMoney(tx.amount, true)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {activeTx.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📊</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgb(var(--c-text-3))' }}>No data for this cycle</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgb(var(--c-text-4))', marginTop: 6 }}>Add expenses to see your reports</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

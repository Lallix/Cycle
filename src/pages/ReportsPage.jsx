import { useState, useEffect, useMemo } from 'react'
import { useBudget } from '../context/BudgetContext'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/format'
import { getLastNCycles } from '../lib/cycle'
import CycleSelector from '../components/ui/CycleSelector'
import LoadingScreen from '../components/ui/LoadingScreen'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// Simple bar chart using divs
function BarChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => Math.max(d.income, d.spent)), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 80 }}>
            <div style={{ flex: 1, background: 'rgba(34,197,94,0.3)', borderRadius: '3px 3px 0 0', height: `${(d.income / max) * 100}%`, minHeight: 2 }} />
            <div style={{ flex: 1, background: d.spent > d.income ? '#EF4444' : '#FFD166', borderRadius: '3px 3px 0 0', height: `${(d.spent / max) * 100}%`, minHeight: 2, opacity: 0.85 }} />
          </div>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, color: '#717179' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// Donut chart using SVG
function DonutChart({ data }) {
  if (!data || data.length === 0) return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: '#717179', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>No data</div>
  )
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const SIZE = 120, R = 44, CIRC = 2 * Math.PI * R
  const COLORS = ['#FFD166','#22C55E','#3B82F6','#EF4444','#8B5CF6','#F97316','#14B8A6','#EC4899']
  let offset = 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#2A2A2A" strokeWidth="14" />
        {data.slice(0, 8).map((d, i) => {
          const pct     = d.value / total
          const dash    = pct * CIRC
          const gap     = CIRC - dash
          const segment = (
            <circle key={i} cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
              stroke={COLORS[i % COLORS.length]} strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
            />
          )
          offset += dash
          return segment
        })}
        <text x={SIZE/2} y={SIZE/2 + 4} textAnchor="middle"
          style={{ fontFamily: 'Poppins, sans-serif', fontSize: 12, fill: '#FFFFFF', fontWeight: 500 }}>
          {data.length}
        </text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
        {data.slice(0, 5).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#A1A1AA', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.icon} {d.name}
            </span>
            <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 11, color: '#FFFFFF', flexShrink: 0 }}>
              {formatMoney(d.value, true)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#1B1B1B', borderRadius: 16, border: '0.5px solid #2A2A2A',
      padding: 16, ...style
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
      {children}
    </p>
  )
}

export default function ReportsPage() {
  const { loading, categories, incomeRecords, transactions, getTransactionsForCycle } = useBudget()
  const { profile } = useAuth()

  const [cycleIndex, setCycleIndex]   = useState(0)
  const [cycleTx, setCycleTx]         = useState(null)
  const [loadingCycle, setLoadingCycle] = useState(false)
  const [trendData, setTrendData]     = useState([])
  const [loadingTrend, setLoadingTrend] = useState(true)

  const startDay = profile?.cycle_start_day || 25
  const income   = incomeRecords.reduce((s, i) => s + parseFloat(i.amount || 0), 0)

  // Load trend data (last 6 cycles) on mount
  useEffect(() => {
    if (loading) return
    buildTrend()
  }, [loading])

  async function buildTrend() {
    setLoadingTrend(true)
    try {
      const cycles = getLastNCycles(6, startDay).reverse()
      const results = await Promise.all(
        cycles.map(async (c) => {
          const txs   = c.key === getLastNCycles(1, startDay)[0]?.key
            ? transactions  // use already-loaded current cycle
            : await getTransactionsForCycle(c.key)
          const spent = txs.reduce((s, t) => s + parseFloat(t.amount || 0), 0)
          return { label: format(c.start, 'MMM'), income, spent }
        })
      )
      setTrendData(results)
    } catch (e) { console.error(e) }
    finally { setLoadingTrend(false) }
  }

  // Load selected cycle transactions
  useEffect(() => {
    if (loading) return
    if (cycleIndex === 0) { setCycleTx(null); return }
    const cycles = getLastNCycles(12, startDay)
    const selected = cycles[cycleIndex]
    if (!selected) return
    setLoadingCycle(true)
    getTransactionsForCycle(selected.key)
      .then(data => setCycleTx(data))
      .catch(e => console.error(e))
      .finally(() => setLoadingCycle(false))
  }, [cycleIndex, loading])

  if (loading) return <LoadingScreen />

  const activeTx = cycleIndex === 0 ? transactions : (cycleTx || [])
  const spent     = activeTx.reduce((s, t) => s + parseFloat(t.amount || 0), 0)
  const remaining = income - spent
  const spentPct  = income > 0 ? Math.round((spent / income) * 100) : 0

  // Category breakdown
  const catMap = {}
  activeTx.forEach(tx => {
    const cat = tx.cycle_categories || tx.categories
    if (!cat) return
    if (!catMap[cat.id]) catMap[cat.id] = { ...cat, value: 0 }
    catMap[cat.id].value += parseFloat(tx.amount || 0)
  })
  const categoryData = Object.values(catMap).filter(c => c.value > 0).sort((a, b) => b.value - a.value)

  // Top 5 transactions
  const topTx = [...activeTx].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5)

  const TrendIcon = remaining > 0 ? TrendingDown : remaining < 0 ? TrendingUp : Minus
  const trendColor = remaining > 0 ? '#22C55E' : remaining < 0 ? '#EF4444' : '#717179'

  return (
    <div style={{ minHeight: '100%', background: '#0D0D0D', paddingBottom: 120 }}>

      {/* Header */}
      <div style={{ padding: 'max(env(safe-area-inset-top), 16px) 16px 12px' }}>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 600, color: '#FFFFFF' }}>Reports</h1>
      </div>

      {/* Cycle selector */}
      <CycleSelector cycleIndex={cycleIndex} onChange={setCycleIndex} />

      {loadingCycle ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #FFD166', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Summary */}
          <Card>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { label: 'Income', value: income, color: '#22C55E' },
                { label: 'Spent', value: spent, color: '#EF4444' },
                { label: 'Remaining', value: remaining, color: remaining >= 0 ? '#FFD166' : '#EF4444' },
              ].map((s, i) => (
                <div key={s.label} style={{
                  flex: 1, textAlign: 'center', padding: '8px 0',
                  borderRight: i < 2 ? '0.5px solid #2A2A2A' : 'none',
                }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#717179', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 500, color: s.color }}>{formatMoney(Math.abs(s.value), true)}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, height: 3, background: '#2A2A2A', borderRadius: 2 }}>
              <div style={{ height: 3, background: spentPct >= 100 ? '#EF4444' : '#FFD166', borderRadius: 2, width: `${Math.min(spentPct, 100)}%`, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#717179' }}>{spentPct}% spent</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: trendColor, display: 'flex', alignItems: 'center', gap: 3 }}>
                <TrendIcon size={11} /> {remaining >= 0 ? 'On track' : 'Over budget'}
              </span>
            </div>
          </Card>

          {/* 6-cycle trend */}
          <Card>
            <SectionLabel>6-cycle trend</SectionLabel>
            {loadingTrend ? (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#717179' }}>Loading...</p>
              </div>
            ) : (
              <>
                <BarChart data={trendData} />
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(34,197,94,0.3)' }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#717179' }}>Income</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#FFD166' }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: '#717179' }}>Spent</span>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Category breakdown */}
          <Card>
            <SectionLabel>By category</SectionLabel>
            <DonutChart data={categoryData} />
          </Card>

          {/* Top transactions */}
          {topTx.length > 0 && (
            <Card>
              <SectionLabel>Largest expenses</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topTx.map((tx, i) => {
                  const cat = tx.cycle_categories || tx.categories
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{cat?.icon || '💳'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cat?.name || 'Unbudgeted'}
                        </p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#717179' }}>
                          {format(new Date(tx.transaction_date), 'd MMM')}
                          {tx.notes && ` · ${tx.notes}`}
                        </p>
                      </div>
                      <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 13, fontWeight: 500, color: '#EF4444', flexShrink: 0 }}>
                        -{formatMoney(tx.amount, true)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

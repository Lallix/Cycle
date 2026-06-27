import { useState, useEffect } from 'react'
import { useBudget } from '../context/BudgetContext'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/format'
import { getLastNCycles, isInCycle } from '../lib/cycle'
import { SpendingTrendChart, CategoryDonut, IncomeVsExpenses } from '../components/reports/Charts'
import PageHeader from '../components/ui/PageHeader'
import LoadingScreen from '../components/ui/LoadingScreen'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function ReportsPage() {
  const { loading, categories, getTransactionsForCycles, incomeRecords, totals } = useBudget()
  const { profile } = useAuth()

  const [reportData, setReportData] = useState(null)
  const [loadingReport, setLoadingReport] = useState(true)

  useEffect(() => {
    if (!loading) buildReportData()
  }, [loading, categories])

  async function buildReportData() {
    setLoadingReport(true)
    try {
      const cycles = getLastNCycles(6, profile?.cycle_start_day || 25)
      const allTx = await getTransactionsForCycles(cycles)
      const monthlyIncome = parseFloat(profile?.monthly_income || 5360)

      // Trend data
      const trendData = cycles.reverse().map(cycle => {
        const cycleTx = allTx.filter(tx => isInCycle(tx.date, cycle))
        const spent = cycleTx.reduce((s, t) => s + parseFloat(t.amount || 0), 0)
        return {
          label: format(cycle.start, 'MMM'),
          spent,
          income: monthlyIncome,
        }
      })

      // Category breakdown (current cycle)
      const currentCycle = cycles[cycles.length - 1]
      const currentTx = allTx.filter(tx => isInCycle(tx.date, currentCycle))

      const catMap = {}
      currentTx.forEach(tx => {
        if (!tx.categories) return
        const id = tx.category_id
        if (!catMap[id]) catMap[id] = { ...tx.categories, value: 0 }
        catMap[id].value += parseFloat(tx.amount || 0)
      })

      const categoryData = Object.values(catMap)
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value)

      // Largest single expenses (current cycle)
      const largest = currentTx
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        .slice(0, 5)

      // Average spend
      const avgSpend = trendData.length
        ? trendData.reduce((s, d) => s + d.spent, 0) / trendData.length
        : 0

      const currentSpend = trendData[trendData.length - 1]?.spent || 0
      const spendTrend = avgSpend > 0 ? ((currentSpend - avgSpend) / avgSpend) * 100 : 0

      setReportData({ trendData, categoryData, largest, avgSpend, spendTrend, currentSpend })
    } catch (err) {
      console.error('Report error:', err)
    } finally {
      setLoadingReport(false)
    }
  }

  if (loading || loadingReport) return <LoadingScreen message="Building reports..." />

  const { trendData, categoryData, largest, avgSpend, spendTrend, currentSpend } = reportData || {}

  const TrendIcon = spendTrend > 5 ? TrendingUp : spendTrend < -5 ? TrendingDown : Minus
  const trendColor = spendTrend > 5 ? '#FF6B6B' : spendTrend < -5 ? '#3DD598' : '#888'

  return (
    <div className="min-h-full bg-bg animate-fade-in"
      style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom) + 1rem)' }}
    >
      <PageHeader title="Reports" subtitle="Last 6 cycles" />

      {/* Summary cards */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
        <StatCard label="This cycle" value={formatMoney(currentSpend)} sub="total spent" />
        <StatCard label="6-cycle avg" value={formatMoney(avgSpend)} sub="per cycle" />
      </div>

      {/* Spending trend */}
      <ChartCard title="Spending Trend" subtitle="vs income target">
        <SpendingTrendChart data={trendData} />
        <div className="flex items-center gap-2 mt-3">
          <TrendIcon size={16} style={{ color: trendColor }} />
          <span className="text-xs" style={{ color: trendColor }}>
            {Math.abs(spendTrend).toFixed(0)}% {spendTrend > 0 ? 'above' : spendTrend < 0 ? 'below' : 'at'} average
          </span>
        </div>
      </ChartCard>

      {/* Income vs Expenses */}
      <ChartCard title="Income vs Expenses" subtitle="Last 6 cycles">
        <IncomeVsExpenses data={trendData} />
      </ChartCard>

      {/* Category breakdown */}
      <ChartCard title="Spending by Category" subtitle="This cycle">
        <CategoryDonut data={categoryData || []} />
      </ChartCard>

      {/* Largest expenses */}
      {largest?.length > 0 && (
        <div className="px-4 mt-5">
          <h2 className="section-label mb-3">Largest Expenses This Cycle</h2>
          <div className="bg-bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {largest.map((tx, i) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="w-6 h-6 rounded-lg bg-bg-elevated flex items-center justify-center text-xs font-mono text-muted flex-shrink-0">
                  {i + 1}
                </span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: `${tx.cycle_cycle_categories?.colour || '#888'}22` }}
                >
                  {tx.cycle_categories?.icon || '💳'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{tx.description}</p>
                  <p className="text-xs text-muted">{format(new Date(tx.date), 'd MMM')}</p>
                </div>
                <span className="font-mono text-sm font-medium text-text-primary flex-shrink-0">
                  {formatMoney(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-bg-card rounded-2xl border border-border p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="font-mono text-xl font-semibold text-text-primary">{value}</p>
      <p className="text-xs text-muted mt-0.5">{sub}</p>
    </div>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="px-4 mt-5">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
      </div>
      <div className="bg-bg-card rounded-2xl border border-border p-4">
        {children}
      </div>
    </div>
  )
}

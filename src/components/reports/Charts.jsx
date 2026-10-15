import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { formatMoney } from '../../lib/format'

// Common tooltip styles
const tooltipStyle = {
  backgroundColor: '#17171A',
  border: '1px solid #26262B',
  borderRadius: '12px',
  color: '#F4F4F5',
  fontFamily: 'DM Mono, monospace',
  fontSize: '12px',
}

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="text-xs text-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-sm font-medium">
          {p.name}: {formatMoney(p.value)}
        </p>
      ))}
    </div>
  )
}

export function SpendingTrendChart({ data }) {
  if (!data?.length) return <ChartEmpty />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<MoneyTooltip />} />
        <Line
          type="monotone"
          dataKey="spent"
          name="Spent"
          stroke="#E8C36A"
          strokeWidth={2}
          dot={{ fill: '#E8C36A', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="#5BC98B"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function CategoryDonut({ data }) {
  if (!data?.length) return <ChartEmpty />

  const COLORS = ['#E8C36A', '#5BC98B', '#F07A6A', '#E9A25A', '#9B59B6', '#00BCD4', '#E91E63', '#4CAF50']

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0]
              return (
                <div style={tooltipStyle} className="px-3 py-2">
                  <p className="text-xs">{d.payload.icon} {d.name}</p>
                  <p className="text-sm font-medium" style={{ color: d.payload.fill }}>
                    {formatMoney(d.value)}
                  </p>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-text-secondary truncate">{d.icon} {d.name}</span>
            <span className="text-xs font-mono text-muted ml-auto flex-shrink-0">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function IncomeVsExpenses({ data }) {
  if (!data?.length) return <ChartEmpty />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<MoneyTooltip />} />
        <Bar dataKey="income" name="Income" fill="#5BC98B" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spent" name="Spent" fill="#E8C36A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChartEmpty() {
  return (
    <div className="h-40 flex items-center justify-center text-muted text-sm">
      Not enough data yet
    </div>
  )
}

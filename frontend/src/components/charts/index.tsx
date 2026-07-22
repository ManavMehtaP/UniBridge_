import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#16A34A', '#D97706', '#DC2626', '#DB2777', '#0D9488', '#4F46E5', '#CA8A04']
const axis = { fontSize: 11, fill: '#8DA0B4' }
const gridStroke = '#EDF2F7'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #E5EDF4',
  fontSize: 12,
  boxShadow: '0 6px 16px rgba(21,34,50,0.10)',
}

/** Single-series area/line trend (e.g. attendance over months). */
export function TrendAreaChart({
  labels = [],
  data = [],
  height = 240,
  color = '#2563EB',
}: {
  labels?: string[]
  data?: number[]
  height?: number
  color?: string
}) {
  const chartData = (labels ?? []).map((label, i) => ({ label, value: (data ?? [])[i] ?? null }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Tooltip that lists every series at the hovered point, highest first, with colour chips. */
function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number | null; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value != null).sort((a, b) => (b.value as number) - (a.value as number))
  if (rows.length === 0) return null
  return (
    <div style={{ ...tooltipStyle, background: '#fff', padding: '8px 10px' }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: '#334155' }}>{label}</div>
      {rows.map((r) => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: '18px' }}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: r.color, flex: '0 0 auto' }} />
          <span style={{ color: '#64748B', minWidth: 24 }}>{r.name}</span>
          <span style={{ fontWeight: 600, color: '#0F172A', marginLeft: 'auto' }}>{(r.value as number).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

/** Multi-series line chart (e.g. attendance trend per batch). Auto-zooms the Y-axis to
 *  the data range so clustered lines separate, and dims the others when you hover one. */
export function MultiLineChart({
  labels = [],
  series = [],
  height = 300,
}: {
  labels?: string[]
  series?: { name: string; data: (number | null)[] }[]
  height?: number
}) {
  const [active, setActive] = useState<string | null>(null)

  const chartData = (labels ?? []).map((label, i) => {
    const row: Record<string, number | string | null> = { label }
    ;(series ?? []).forEach((s) => (row[s.name] = s.data?.[i] ?? null))
    return row
  })

  // Zoom the axis to the actual values (padded, snapped to 5) instead of a flat 0–100,
  // which is what made every batch look identical.
  const values = (series ?? []).flatMap((s) => s.data ?? []).filter((v): v is number => typeof v === 'number')
  const lo = values.length ? Math.max(0, Math.floor((Math.min(...values) - 4) / 5) * 5) : 0
  const hi = values.length ? Math.min(100, Math.ceil((Math.max(...values) + 4) / 5) * 5) : 100

  const colorFor = (i: number) => COLORS[i % COLORS.length]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} padding={{ left: 10, right: 10 }} />
        <YAxis tick={axis} axisLine={false} tickLine={false} domain={[lo, hi]} width={40} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8, cursor: 'pointer' }}
          onMouseEnter={(e: { value?: string }) => setActive(e.value ?? null)}
          onMouseLeave={() => setActive(null)}
        />
        {(series ?? []).map((s, i) => {
          const dim = active !== null && active !== s.name
          const isActive = active === s.name
          return (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={colorFor(i)}
              strokeWidth={isActive ? 3.25 : 2}
              strokeOpacity={dim ? 0.16 : 1}
              dot={isActive ? { r: 3, fill: colorFor(i), strokeWidth: 0 } : false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              connectNulls
              onMouseEnter={() => setActive(s.name)}
              onMouseLeave={() => setActive(null)}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Simple vertical bar chart from {label,value} pairs. */
export function SimpleBarChart({
  data = [],
  height = 240,
  color = '#2563EB',
  domainMax = 100,
}: {
  data?: { label: string; value: number | null }[]
  height?: number
  color?: string
  domainMax?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} domain={[0, domainMax]} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(37,99,235,0.05)' }} />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Donut/pie chart from {label,value} pairs. */
export function DonutChart({
  data = [],
  height = 240,
}: {
  data?: { label: string; value: number }[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data ?? []}
          dataKey="value"
          nameKey="label"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/** Radar comparing two series across subjects. */
export function RadarCompareChart({
  subjects = [],
  topAvg = [],
  bottomAvg = [],
  height = 300,
}: {
  subjects?: string[]
  topAvg?: number[]
  bottomAvg?: number[]
  height?: number
}) {
  const data = (subjects ?? []).map((s, i) => ({ subject: s, Top: (topAvg ?? [])[i], Bottom: (bottomAvg ?? [])[i] }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke={gridStroke} />
        <PolarAngleAxis dataKey="subject" tick={axis} />
        <Radar name="Top 10" dataKey="Top" stroke="#16A34A" fill="#16A34A" fillOpacity={0.25} />
        <Radar name="Bottom 10" dataKey="Bottom" stroke="#DC2626" fill="#DC2626" fillOpacity={0.2} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export { COLORS as CHART_COLORS }

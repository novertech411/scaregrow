'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartDomain, type MeasurementPoint } from '@/lib/dashboard/overview'
import { formatMeasurement, formatTimestamp, type Measurement } from '@/lib/measurements'

export function MoistureChart({ points, metric }: { points: MeasurementPoint[]; metric: Measurement }) {
  if (!points.some((point) => point.value !== null)) return <p className="flex h-56 items-center justify-center text-sm text-slate-500">No measurements for this metric in this period.</p>
  return (
    <div className="h-64 min-w-0" role="img" aria-label={`${metric.label} over time, ${points.length} readings. Recent exact values are available in the readings table.`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 16, right: 12, left: -10, bottom: 4 }}>
          <defs><linearGradient id="overview-moisture-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#25865a" stopOpacity={0.18} /><stop offset="100%" stopColor="#25865a" stopOpacity={0.01} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#edf1ef" />
          <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} tickLine={false} axisLine={false} minTickGap={48} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value: number) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))} />
          <YAxis domain={chartDomain(metric.key)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip labelFormatter={(value) => formatTimestamp(new Date(Number(value)).toISOString())} formatter={(value) => [formatMeasurement(typeof value === 'number' ? value : null, metric.key), metric.label]} contentStyle={{ borderRadius: 12, border: '1px solid #d7e8dc', fontSize: 12 }} />
          <Area type="linear" dataKey="value" stroke="#25865a" strokeWidth={2} fill="url(#overview-moisture-fill)" connectNulls={false} isAnimationActive={false} dot={points.length < 30 ? { r: 3, fill: '#25865a' } : false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

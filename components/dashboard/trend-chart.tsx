'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'


export function TrendChart({ trendData }: { trendData: { day: string; moisture: number }[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">7-Day Soil Moisture Trend</h2>
          <p className="mt-1 text-xs text-slate-400">North Field A1 · Soil moisture</p>
        </div>
        <select aria-label="Trend date range" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none">
          <option>7 days</option>
          <option>30 days</option>
          <option>90 days</option>
        </select>
      </div>
      <div className="mt-5 h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="moistureFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43a878" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#43a878" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#edf1ef" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis domain={[20, 40]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(value) => `${value}%`} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,.08)', fontSize: 12 }} formatter={(value) => [`${value}%`, 'Soil moisture']} />
            <Area type="monotone" dataKey="moisture" stroke="#25865a" strokeWidth={2.5} fill="url(#moistureFill)" dot={{ r: 3, fill: '#25865a', strokeWidth: 2, stroke: '#fff' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

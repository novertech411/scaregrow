'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, ComposedChart, Line, Legend, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, X } from 'lucide-react'
import type { Reading } from '@/lib/types'
import { getReadings, getReadingsCount, getReadingFarms, getReadingPlots, getReadingDevices, getReadingsForExport, READINGS_PAGE_SIZE, type ReadingFilters } from '@/lib/services/readings'
import { allMetricsChart, readingSeries as series, toPageReading, readingsCsv, readingsCsvFilename, type PageReading, type Parameter } from '@/lib/readings-view'
import { ReadingsAssistant } from '@/components/assistant/readings-assistant'

function Status({ status }: { status: Reading['status'] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${status === 'Online' ? 'border-[#b9e5c7] bg-[#d8f2b1] text-[#245e3e]' : 'border-[#f3d6a0] bg-[#ffe4a8] text-[#9a5b08]'}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid gap-1.5 text-[11px] font-semibold text-[#587568]">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none focus:border-[#7dbb98] focus:ring-2 focus:ring-[#dcefe3]">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

export function ReadingsPage() {
  const [readings, setReadings] = useState<PageReading[]>([])
  const [loadError, setLoadError] = useState('')
  const [farm, setFarm] = useState('All farms')
  const [plot, setPlot] = useState('All plots')
  useEffect(() => { setPlot(new URLSearchParams(window.location.search).get('plot') ?? 'All plots') }, [])
  const [device, setDevice] = useState('All devices')
  const [parameter, setParameter] = useState<Parameter | 'All'>('All')
  const [range, setRange] = useState('Last 7 days')
  const [selected, setSelected] = useState<PageReading | null>(null)

  const [farms, setFarms] = useState<string[]>([])
  const [plots, setPlots] = useState<string[]>([])
  const [devices, setDevices] = useState<string[]>([])
  const [farmError, setFarmError] = useState('')
  const [plotError, setPlotError] = useState('')
  const [deviceError, setDeviceError] = useState('')
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [pagination, setPagination] = useState<{ filters: ReadingFilters | null; page: number }>({ filters: null, page: 1 })
  const [retry, setRetry] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const generation = useRef(0)
  const exportPending = useRef(false)
  const farmName = farm === 'All farms' ? undefined : farm
  const plotName = plot === 'All plots' ? undefined : plot
  // Keep a fixed date window while paging/exporting to avoid shifting offsets.
  const filters = useMemo<ReadingFilters>(() => {
    const days = range === 'Last 24 hours' ? 1 : range === 'Last 30 days' ? 30 : 7
    const now = Date.now()
    return { farmName, plotName, deviceId: device === 'All devices' ? undefined : device,
      from: new Date(now - days * 86400000).toISOString(), to: new Date(now).toISOString() }
  }, [farmName, plotName, device, range])

  const page = pagination.filters === filters ? pagination.page : 1
  const totalPages = totalCount == null ? null : Math.max(1, Math.ceil(totalCount / READINGS_PAGE_SIZE))

  useEffect(() => {
    let active = true
    getReadingFarms().then((values) => { if (active) { setFarms(values); setFarmError('') } })
      .catch((error) => { if (active) setFarmError(error.message) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setPlots([])
    setPlotError('')
    getReadingPlots(farmName).then((values) => { if (active) setPlots(values) })
      .catch((error) => { if (active) setPlotError(error.message) })
    return () => { active = false }
  }, [farmName])

  useEffect(() => {
    let active = true
    setDevices([])
    setDeviceError('')
    getReadingDevices(farmName, plotName).then((values) => { if (active) setDevices(values) })
      .catch((error) => { if (active) setDeviceError(error.message) })
    return () => { active = false }
  }, [farmName, plotName])

  useEffect(() => {
    const controller = new AbortController()
    const request = ++generation.current
    setLoading(true)
    setReadings([])
    setSelected(null)
    setTotalCount(null)
    setLoadError('')
    setExportError('')
    Promise.all([
      getReadings({ ...filters, offset: (page - 1) * READINGS_PAGE_SIZE, signal: controller.signal }),
      getReadingsCount({ ...filters, signal: controller.signal }),
    ]).then(([rows, count]) => {
        if (request !== generation.current) return
        setReadings(rows.map(toPageReading))
        setTotalCount(count)
        const lastPage = Math.max(1, Math.ceil(count / READINGS_PAGE_SIZE))
        if (page > lastPage) setPagination({ filters, page: lastPage })
      })
      .catch((error) => { if (request === generation.current) setLoadError(error.message) })
      .finally(() => {
        if (request === generation.current) setLoading(false)
      })
    return () => { generation.current++; controller.abort() }
  }, [filters, page, retry])

  const filtered = readings
  const current = filtered[0]
  const chart = parameter === 'All' ? null : series[parameter]
  const chartData = allMetricsChart(filtered).map((point) => ({ ...point, value: chart ? point.reading[chart.value] : null }))

  async function exportCsv() {
    if (exportPending.current) return
    exportPending.current = true
    setExporting(true)
    setExportError('')
    try {
      const rows = await getReadingsForExport(filters)
      const blob = new Blob([readingsCsv(rows)], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = readingsCsvFilename()
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Unable to export readings.')
    } finally {
      exportPending.current = false
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {[loadError, farmError, plotError, deviceError, exportError].filter(Boolean).map((error, index) => <p key={index} role="alert" className="text-sm text-red-700">{error}</p>)}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Reading detail</h2>
                <p className="mt-1 text-xs text-slate-500">{selected.recorded ?? selected.updated}</p>
              </div>
              <button aria-label="Close reading detail" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-[#f4faef] p-3 text-sm">
              <p className="font-semibold text-slate-900">{selected.farm}</p>
              <p className="mt-1 text-xs text-slate-500">{selected.plot} · {selected.device}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[['Soil moisture', `${selected.moisture ?? '—'}%`], ['Soil temperature', `${selected.temperature ?? '—'}°C`], ['pH', (selected.ph ?? '—')], ['EC', `${selected.ec ?? '—'} µS/cm`]].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 p-3">
                  <p className="text-[11px] text-slate-400">{label}</p>
                  <p className="mt-1 font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">Device status at reading</span>
              <Status status={selected.status} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Readings</h1>
          <p className="mt-1 text-sm text-slate-500">Explore sensor measurements across your farms.</p>
        </div>
        <button onClick={exportCsv} disabled={exporting || loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f7a52] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#156b43]">
          <Download className="size-4" />{exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#d7e8dc] bg-white/70 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select label="Farm" value={farm} onChange={(value) => { setFarm(value); setPlot('All plots'); setDevice('All devices') }} options={['All farms', ...farms]} />
        <Select label="Plot" value={plot} onChange={(value) => { setPlot(value); setDevice('All devices') }} options={Array.from(new Set(['All plots', ...(plotName ? [plotName] : []), ...plots]))} />
        <Select label="Device" value={device} onChange={setDevice} options={['All devices', ...devices]} />
        <Select label="Parameter" value={parameter} onChange={(value) => setParameter(value as Parameter | 'All')} options={['All', 'Moisture', 'Temperature', 'pH', 'EC']} />
        <Select label="Date range" value={range} onChange={setRange} options={['Last 24 hours', 'Last 7 days', 'Last 30 days']} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['SOIL MOISTURE', current?.moisture != null ? `${current.moisture}%` : "—", current?.updated ?? 'No reading', 'text-[#1f7a52]'], ['SOIL TEMPERATURE', current?.temperature != null ? `${current.temperature}°C` : "—", current?.updated ?? 'No reading', 'text-amber-700'], ['pH', current?.ph != null ? current.ph : "—", current?.updated ?? 'No reading', 'text-indigo-700'], ['EC', current?.ec != null ? `${current.ec} µS/cm` : "—", current?.updated ?? 'No reading', 'text-purple-700']].map(([label, value, detail, tone], index) => (
          <div key={label} aria-label={`${label}${parameter === (['Moisture', 'Temperature', 'pH', 'EC'][index]) ? ' (selected)' : ''}`} className={`rounded-2xl border border-[#d7e8dc] bg-gradient-to-br from-white via-white to-[#eff9e8] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${parameter === (['Moisture', 'Temperature', 'pH', 'EC'][index]) ? 'ring-2 ring-[#7dbb98]' : ''}`}>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
            <p className="mt-1 text-xs text-slate-400">{detail}</p>
          </div>
        ))}
      </div>

      <ReadingsAssistant
        selection={{ ...filters, page, parameter }}
        label={`${farm} · ${plot} · ${device} · ${range} · ${parameter} · page ${page}${loading ? '' : ` · ${readings.length} readings`}`}
        disabled={loading || Boolean(loadError)}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Sensor Trends</h2>
            <p className="mt-1 text-xs text-slate-400">Track how measurements change over time · {chart ? `${parameter} (${chart.unit || 'pH'})` : 'All · normalized per metric (0–100), current page'}</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-[#f4faef] p-1">
            {(['All', 'Moisture', 'Temperature', 'pH', 'EC'] as const).map((item) => (
              <button key={item} aria-pressed={parameter === item} onClick={() => setParameter(item)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${parameter === item ? 'bg-[#b9e878] text-[#123d2d]' : 'text-[#587568]'}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 12, bottom: 0 }}>
              {chart && <defs>
                <linearGradient id="readingsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chart.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={chart.color} stopOpacity={0.03} />
                </linearGradient>
              </defs>}
              <CartesianGrid vertical={false} stroke="#edf1ef" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis key={parameter} domain={chart ? [...chart.domain] : [0, 100]} width={76} label={{ value: chart ? (chart.unit ? `${parameter} (${chart.unit})` : parameter) : 'Normalized (0–100)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(value) => `${value}${chart?.unit ?? ''}`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #d7e8dc', fontSize: 12 }} formatter={(value, name, item) => {
                if (chart) return [`${value}${chart.unit}`, parameter]
                const metric = series[name as Parameter]
                const raw = item.payload.reading[metric.value]
                return [raw == null ? '—' : `${raw}${metric.unit}`, name]
              }} />
              {chart ? <Area type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2.5} fill="url(#readingsFill)" dot={{ r: 3, fill: chart.color, strokeWidth: 2, stroke: '#fff' }} /> : (
                <>
                  <Legend />
                  {(Object.keys(series) as Parameter[]).map((metric) => <Line key={metric} name={metric} dataKey={`normalized.${metric}`} type="monotone" stroke={series[metric].color} strokeWidth={2.5} dot={{ r: 3 }} />)}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Latest Readings</h2>
          <p className="mt-1 text-xs text-slate-400">Recorded sensor measurements, newest first.</p>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f4faef] text-[11px] uppercase tracking-[0.12em] text-[#587568]">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-3 py-3">Farm / plot</th>
                <th className="px-3 py-3">Device</th>
                <th className="px-3 py-3">Moisture</th>
                <th className="px-3 py-3">Temp.</th>
                <th className="px-3 py-3">pH</th>
                <th className="px-3 py-3">EC</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((reading) => (
                <tr key={reading.key} onClick={() => setSelected(reading)} className="cursor-pointer hover:bg-[#fbfdf9]">
                  <td className="px-5 py-3.5 text-xs text-slate-500">{reading.timestamp ?? reading.updated}</td>
                  <td className="px-3 py-3.5">
                    <p className="font-medium text-slate-800">{reading.farm}</p>
                    <p className="text-xs text-slate-400">{reading.plot}</p>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-slate-600">{reading.device}</td>
                  <td className="px-3 py-3.5 font-semibold text-slate-700">{reading.moisture ?? '—'}%</td>
                  <td className="px-3 py-3.5 text-slate-700">{reading.temperature ?? '—'}°C</td>
                  <td className="px-3 py-3.5 text-slate-700">{reading.ph ?? '—'}</td>
                  <td className="px-3 py-3.5 text-slate-700">{reading.ec ?? '—'} µS/cm</td>
                  <td className="px-5 py-3.5"><Status status={reading.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {filtered.map((reading) => (
            <button key={reading.key} onClick={() => setSelected(reading)} className="rounded-xl border border-slate-100 bg-white p-4 text-left">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{reading.timestamp ?? reading.updated}</p>
                  <p className="mt-1 text-xs text-slate-500">{reading.plot} · {reading.device}</p>
                </div>
                <Status status={reading.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
                <span>Moisture <b>{reading.moisture ?? '—'}%</b></span>
                <span>Temperature <b>{reading.temperature ?? '—'}°C</b></span>
                <span>pH <b>{reading.ph ?? '—'}</b></span>
                <span>EC <b>{reading.ec ?? '—'} µS/cm</b></span>
              </div>
            </button>
          ))}
        </div>
        {!loading && !loadError && filtered.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-800">No readings available</p>
            <p className="mt-1 text-sm text-slate-500">No sensor measurements match your current filters.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p role="status" className="text-xs text-slate-500">{loading ? 'Loading readings…' : `${filtered.length} readings shown`}</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setPagination({ filters, page: page - 1 })} disabled={loading || page <= 1} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#1f7a52] hover:bg-[#f4faef] disabled:opacity-50">Previous</button>
            <span aria-live="polite" className="text-xs text-slate-500">Page {page} of {totalPages ?? '…'}</span>
            <button type="button" onClick={() => setPagination({ filters, page: page + 1 })} disabled={loading || totalPages == null || page >= totalPages} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#1f7a52] hover:bg-[#f4faef] disabled:opacity-50">Next</button>
            {loadError && <button type="button" onClick={() => setRetry((value) => value + 1)} disabled={loading} className="text-xs font-semibold text-[#1f7a52]">Try again</button>}
          </div>
        </div>
      </section>
    </div>
  )
}

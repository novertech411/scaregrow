'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useGreenerSession } from '@/components/session/greener-session'
import { DeviceHistoryChart } from '@/components/dashboard/device-history-chart'
import { PageLoading } from '@/components/ui/page-loading'
import { getReadingCount, getReadingHistory, listMyReadingDevices } from '@/lib/data/sensor-readings'
import { CSV_LIMIT_MESSAGE, exportReadingsCsv, readingsCsvFilename } from '@/lib/data/readings-csv'
import { ownedDevices } from '@/lib/session/owned-devices'
import { HISTORY_PAGE_SIZE, customWindow, dateInput, freezeWindow, parseReadingsState, readingDevices, readingFilters, readingsSearch, type HistoryRange, type HistoryState, type ReadingDevice } from '@/lib/readings/filters'
import { formatMeasurement, formatTimestamp, measurementsFor } from '@/lib/measurements'
import type { ReadingDeviceRow, SensorReadingRow } from '@/lib/supabase/database.types'

const input = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#4d9b6b] focus:ring-2 focus:ring-[#dff1c3]'
const messageOf = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to load readings. Please try again.'
export function ReadingsPage() {
  return <Suspense fallback={<PageLoading />}><ReadingHistory /></Suspense>
}
function ReadingHistory() {
  const session = useGreenerSession()
  const [past, setPast] = useState<ReadingDeviceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lookupRetry, setLookupRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void listMyReadingDevices(controller.signal).then((rows) => { if (!controller.signal.aborted) { setPast(rows); setError('') } }).catch((cause) => { if (!controller.signal.aborted) setError(messageOf(cause)) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [session.user?.id, lookupRetry])
  const devices = readingDevices(ownedDevices(session.devices, session.user?.id), past)
  if (loading) return <PageLoading />
  return <div className="space-y-5">
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => setLookupRetry((value) => value + 1)} className="mt-2 font-semibold underline">Retry device history</button></div>}
    {!devices.length ? <section className="rounded-2xl border border-[#d7e8dc] bg-white p-8"><h1 className="text-2xl font-semibold text-[#123d2d]">Readings</h1><p className="mt-3 text-sm text-slate-500">{error ? 'Device history is unavailable.' : 'No reading devices available yet.'}</p></section> : <HistoryContent devices={devices} />}
  </div>
}
export function HistoryContent({ devices, title = 'Readings', description = 'Explore measurements received during your ownership.' }: { devices: ReadingDevice[]; title?: string; description?: string }) {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const initialNow = useRef(new Date())
  const state = parseReadingsState(new URLSearchParams(params.toString()), devices, initialNow.current)
  const selected = devices.find((device) => device.device_id === state.deviceId)!
  const [refresh, setRefresh] = useState(0)
  const search = readingsSearch(state)
  function replace(next: HistoryState) { router.replace(`${pathname}?${readingsSearch(next)}`, { scroll: false }) }
  useEffect(() => { if (params.toString() !== search) router.replace(`${pathname}?${search}`, { scroll: false }) }, [params, search, pathname, router])
  const filterKey = `${state.deviceId}:${state.range}:${state.from}:${state.to}:${state.packet}`
  function reload() {
    replace({ ...state, ...(state.range === 'custom' ? {} : freezeWindow(state.range)), page: 1 })
    setRefresh((value) => value + 1)
  }
  return <>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight text-[#123d2d]">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div><button type="button" onClick={reload} className="rounded-xl border border-[#d7e8dc] bg-white px-4 py-2.5 text-sm font-semibold text-[#1f7a52]">Refresh</button></div>
    <HistoryFilters key={filterKey} state={state} devices={devices} onApply={replace} />
    <DeviceHistoryChart deviceId={state.deviceId} hardwareVersion={selected.hardwareVersion} window={{ from: state.from, to: state.to }} refreshKey={refresh} />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Received {formatTimestamp(state.from)} – {formatTimestamp(state.to)}</p><ExportButton key={filterKey} state={state} /></div>
    <HistoryTable key={`${filterKey}:${state.page}:${refresh}`} state={state} hardwareVersion={selected.hardwareVersion} onPage={(page) => replace({ ...state, page })} />
  </>
}
function HistoryFilters({ state, devices, onApply }: { state: HistoryState; devices: ReadingDevice[]; onApply: (next: HistoryState) => void }) {
  const [deviceId, setDeviceId] = useState(state.deviceId)
  const [range, setRange] = useState<HistoryRange>(state.range)
  const [packet, setPacket] = useState(state.packet)
  const [from, setFrom] = useState(dateInput(state.from))
  const [to, setTo] = useState(dateInput(state.to))
  const [error, setError] = useState('')
  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try { const window = range === 'custom' ? customWindow(from, to) : freezeWindow(range); onApply({ deviceId, range, packet, ...window, page: 1 }); setError('') }
    catch (cause) { setError(messageOf(cause)) }
  }
  return <form onSubmit={apply} className="space-y-3 rounded-2xl border border-[#d7e8dc] bg-white p-4"><div className="flex flex-wrap items-end gap-3">
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs text-slate-500">Device<select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className={input}>{devices.map((device) => <option key={device.device_id} value={device.device_id}>{device.name}{device.name !== device.device_id ? ` (${device.device_id})` : ''}{device.past ? ' (past device)' : ''}</option>)}</select></label>
    <label className="flex flex-col gap-1.5 text-xs text-slate-500">Date range<select value={range} onChange={(event) => setRange(event.target.value as HistoryRange)} className={input}><option value="24h">24 h</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="custom">Custom</option></select></label>
    {range === 'custom' && <><label className="flex flex-col gap-1.5 text-xs text-slate-500">From<input required type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={input} /></label><label className="flex flex-col gap-1.5 text-xs text-slate-500">To<input required type="date" value={to} onChange={(event) => setTo(event.target.value)} className={input} /></label></>}
    <label className="flex flex-col gap-1.5 text-xs text-slate-500">Packet type<select value={packet} onChange={(event) => setPacket(event.target.value as HistoryState['packet'])} className={input}><option value="sensor">Full sensor</option><option value="moisture">Moisture only</option><option value="all">All</option></select></label>
    <button type="submit" className="h-10 rounded-xl bg-[#123d2d] px-4 text-sm font-semibold text-white hover:bg-[#1f7a52]">Apply filters</button>
  </div>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</form>
}
function HistoryTable({ state, hardwareVersion, onPage }: { state: HistoryState; hardwareVersion: string | null; onPage: (page: number) => void }) {
  const [result, setResult] = useState<{ rows: SensorReadingRow[]; count: number } | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const filters = readingFilters(state)
    void Promise.all([getReadingHistory({ ...filters, limit: HISTORY_PAGE_SIZE, offset: (state.page - 1) * HISTORY_PAGE_SIZE }, controller.signal), getReadingCount(filters, controller.signal)]).then(([rows, count]) => { if (!controller.signal.aborted) { setResult({ rows, count }); setError(''); if (state.page > Math.max(1, Math.ceil(count / HISTORY_PAGE_SIZE))) onPage(Math.max(1, Math.ceil(count / HISTORY_PAGE_SIZE))) } }).catch((cause) => { if (!controller.signal.aborted) setError(messageOf(cause)) })
    return () => controller.abort()
  }, [retry])
  if (error) return <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 font-semibold underline">Retry readings</button></div>
  if (!result) return <PageLoading />
  const catalog = measurementsFor(hardwareVersion)
  const start = result.count ? (state.page - 1) * HISTORY_PAGE_SIZE + 1 : 0
  const end = result.count ? Math.min(state.page * HISTORY_PAGE_SIZE, result.count) : 0
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-[#d7e8dc] bg-white shadow-sm">
    {!result.rows.length ? <p className="px-5 py-10 text-center text-sm text-slate-500">No readings in this period.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-xs"><thead className="bg-[#f4faef] text-[#587568]"><tr>{['Received', 'Measured', 'Packet', ...catalog.map((metric) => `${metric.label} (${metric.unit})`)].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-[#edf3ee]">{result.rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-4 py-3">{formatTimestamp(row.received_at)}</td><td className="whitespace-nowrap px-4 py-3">{row.measured_at ? formatTimestamp(row.measured_at) : '—'}</td><td className="whitespace-nowrap px-4 py-3">{row.packet_type === 'sensor' ? 'Full sensor' : 'Moisture only'}</td>{catalog.map((metric) => <td key={metric.key} className="whitespace-nowrap px-4 py-3 tabular-nums">{formatMeasurement(row[metric.key], metric.key)}</td>)}</tr>)}</tbody></table></div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3ee] px-5 py-4 text-xs text-slate-500"><p>Showing {start.toLocaleString()}–{end.toLocaleString()} of {result.count.toLocaleString()}</p><div className="flex gap-3"><button type="button" disabled={state.page <= 1} onClick={() => onPage(state.page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={state.page * HISTORY_PAGE_SIZE >= result.count} onClick={() => onPage(state.page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div></div>
  </section>
}
function ExportButton({ state }: { state: HistoryState }) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function start() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setProgress(0)
    setError('')
    setNotice('')
    try {
      const result = await exportReadingsCsv(readingFilters(state), { signal: controller.signal, onProgress: (count) => { if (!controller.signal.aborted) setProgress(count) } })
      controller.signal.throwIfAborted()
      const url = URL.createObjectURL(new Blob([result.csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = readingsCsvFilename(state.deviceId)
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      if (result.limited) setNotice(CSV_LIMIT_MESSAGE)
    } catch (cause) { if (!controller.signal.aborted) setError(messageOf(cause)) }
    finally { if (request.current === controller) request.current = null; if (!controller.signal.aborted) setProgress(null) }
  }
  return <div className="space-y-2"><div className="flex items-center gap-3"><button type="button" disabled={progress !== null} onClick={() => { void start() }} className="rounded-xl border border-[#d7e8dc] bg-white px-4 py-2 text-xs font-semibold text-[#1f7a52] disabled:opacity-50">{progress === null ? 'Export CSV' : `Exporting… (${progress.toLocaleString()} rows)`}</button>{progress !== null && <button type="button" onClick={() => { request.current?.abort(); request.current = null; setProgress(null) }} className="text-xs text-slate-500 underline">Cancel export</button>}</div>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}{notice && <p role="status" className="max-w-md text-xs text-amber-800">{notice}</p>}</div>
}

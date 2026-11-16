'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { PanelLoading } from '@/components/ui/page-loading'
import { loadChartHistory, type ChartSnapshot } from '@/lib/dashboard/load-overview'
import { measurementPoints, type OverviewRange } from '@/lib/dashboard/overview'
import { pollChartHistory } from '@/lib/dashboard/poll-chart-history'
import { measurementsFor, type Measurement, type MeasurementKey } from '@/lib/measurements'

const MoistureChart = dynamic(() => import('./moisture-chart').then((module) => module.MoistureChart), { ssr: false, loading: () => <PanelLoading label="Loading chart…" /> })
export function DeviceHistoryChart({ deviceId, hardwareVersion, window, refreshKey = 0 }: { deviceId: string; hardwareVersion: string | null; window?: { from: string; to: string }; refreshKey?: number }) {
  const [range, setRange] = useState<OverviewRange>('24h')
  const [metricKey, setMetricKey] = useState<MeasurementKey>('soil_moisture_pct')
  const catalog = measurementsFor(hardwareVersion)
  const metric = catalog.find((item) => item.key === metricKey) ?? catalog[0]
  return <section className="min-w-0 rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-sm font-semibold text-slate-900">{metric.label}</h2><p className="mt-1 text-xs text-slate-500">Full readings received {window ? 'in the selected period' : range === '24h' ? 'in the last 24 hours' : 'in the last 7 days'}. Measurement time shown when available.</p></div>
      <label className="flex flex-col gap-1 text-xs text-slate-500">Chart metric<select value={metric.key} onChange={(event) => setMetricKey(event.target.value as MeasurementKey)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus-visible:outline-2 focus-visible:outline-[#1f7a52]">{catalog.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.unit})</option>)}</select></label>
      {!window && <div role="group" aria-label="Chart date range" className="flex rounded-lg bg-[#f0f5ed] p-1">{(['24h', '7d'] as const).map((value) => <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)} className={`rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-[#1f7a52] ${range === value ? 'bg-white text-[#123d2d] shadow-sm' : 'text-slate-500 hover:text-[#123d2d]'}`}>{value === '24h' ? 'Last 24h' : '7 days'}</button>)}</div>}
    </div>
    <HistoryPlot key={`${deviceId}:${window?.from ?? range}:${window?.to ?? ""}:${metric.key}:${refreshKey}`} deviceId={deviceId} range={window ?? range} metric={metric} />
  </section>
}

function HistoryPlot({ deviceId, range, metric }: { deviceId: string; range: OverviewRange | { from: string; to: string }; metric: Measurement }) {
  const [snapshot, setSnapshot] = useState<ChartSnapshot | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const load = (signal: AbortSignal) => loadChartHistory(deviceId, range, signal)
    const callbacks = {
      onData: (next: ChartSnapshot) => { setSnapshot(next); setError('') },
      onError: (cause: unknown) => setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Unable to load chart history.'),
    }
    if (typeof range === 'string') return pollChartHistory(load, callbacks)
    const controller = new AbortController()
    void load(controller.signal).then((next) => { if (!controller.signal.aborted) callbacks.onData(next) }).catch((error) => { if (!controller.signal.aborted) callbacks.onError(error) })
    return () => controller.abort()
  // Frozen windows are keyed by their ISO boundaries above, never by table page.
  }, [deviceId, typeof range === 'string' ? range : range.from, typeof range === 'string' ? '' : range.to])
  return <>
    {error && <p role="alert" className="mt-3 text-xs text-red-700">{error} {snapshot ? 'Showing previously fetched chart data.' : ''} {typeof range === 'string' ? 'Chart refreshes every five minutes while visible.' : 'Use Refresh to try again.'}</p>}
    {!snapshot ? !error && <PanelLoading label="Loading chart history…" /> : <>
      {snapshot.historyTruncated && <p className="mt-3 text-xs text-amber-800">Showing the latest 1,000 readings in this period.</p>}
      <MoistureChart points={measurementPoints(snapshot.history, metric.key)} metric={metric} />
    </>}
  </>
}

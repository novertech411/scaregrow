'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Droplets, RefreshCw } from 'lucide-react'
import { MeasurementGroups, RecentReadings } from '@/components/dashboard/reading-panels'
import { ChangeDeviceFarm } from '@/components/change-device-farm'
import { useGreenerSession } from '@/components/session/greener-session'
import { DeviceHistoryChart } from '@/components/dashboard/device-history-chart'
import { DeviceNotFound } from '@/components/dashboard/device-not-found'
import { DeviceStatusBanner } from '@/components/dashboard/device-status-banner'
import { ownedDevices, pickDevice } from '@/lib/session/owned-devices'
import { PageLoading } from '@/components/ui/page-loading'
import { toDeviceView } from '@/lib/data/presenters'
import { loadOverview, type OverviewSnapshot } from '@/lib/dashboard/load-overview'
import { pollOverview } from '@/lib/dashboard/poll-overview'
import { latestMoisture } from '@/lib/dashboard/overview'
import { formatMeasurement, formatRelative, formatTimestamp } from '@/lib/measurements'

export function OverviewPage() {
  return <Suspense fallback={<PageLoading />}><OverviewSelector /></Suspense>
}

function OverviewSelector() {
  const { devices, user } = useGreenerSession()
  const owned = ownedDevices(devices, user?.id)
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const requestedId = params.get('device')
  const selected = pickDevice(owned, requestedId)
  const selectedId = selected?.device_id ?? null
  useEffect(() => {
    if (selectedId === requestedId) return
    const next = new URLSearchParams(params.toString())
    if (selectedId) next.set('device', selectedId)
    else next.delete('device')
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false })
  }, [selectedId, requestedId, params, pathname, router])
  function selectDevice(deviceId: string) {
    const next = new URLSearchParams(params.toString())
    next.set('device', deviceId)
    router.replace(`${pathname}?${next}`, { scroll: false })
  }
  if (!selected) return <section className="rounded-2xl border border-[#d7e8dc] bg-white px-6 py-12 text-center"><h1 className="text-xl font-semibold text-[#123d2d]">No devices available</h1><p className="mt-2 text-sm text-slate-500">Connect a device to start receiving soil measurements.</p><Link href="/connect-device" className="mt-5 inline-block rounded-xl bg-[#123d2d] px-4 py-2 text-sm font-semibold text-white">Connect a device</Link></section>
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight text-[#123d2d]">Overview</h1><p className="mt-1 text-sm text-slate-500">Measurements from your field.</p></div>
      <label className="flex w-full flex-col gap-1.5 text-xs font-medium text-slate-500 sm:w-auto sm:min-w-64">
        Device
        <select value={selected.device_id} onChange={(event) => selectDevice(event.target.value)} className="h-11 max-w-full rounded-xl border border-[#d7e8dc] bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#4d9b6b] focus:ring-2 focus:ring-[#dff1c3]">
          {owned.map((device) => <option key={device.device_id} value={device.device_id}>{device.display_name ? `${device.display_name} (${device.device_id})` : device.device_id}</option>)}
        </select>
      </label>
    </div>
    <DeviceOverview key={`${user?.id}:${selected.device_id}`} deviceId={selected.device_id} />
  </div>
}

export function DeviceOverview({ deviceId }: { deviceId: string }) {
  const { devices, user } = useGreenerSession()
  if (!ownedDevices(devices, user?.id).some((device) => device.device_id === deviceId)) return <DeviceNotFound />
  return <OverviewReadings key={`${user?.id}:${deviceId}`} deviceId={deviceId} userId={user!.id} />
}

function OverviewReadings({ deviceId, userId }: { deviceId: string; userId: string }) {
  const [snapshot, setSnapshot] = useState<OverviewSnapshot | null>(null)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [retry, setRetry] = useState(0)
  const [notFound, setNotFound] = useState(false)
  useEffect(() => pollOverview((signal) => loadOverview(deviceId, signal), {
    onUpdating: setUpdating,
    onData: (next) => {
      if (!ownedDevices([next.device], userId).length) { setSnapshot(null); setNotFound(true); return }
      setNotFound(false)
      setSnapshot(next)
      setError('')
    },
    onError: (cause) => setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Unable to load measurements. Please try again.'),
  }), [deviceId, userId, retry])

  const errorNotice = error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><div><p className="font-semibold">We couldn't refresh your measurements</p><p className="mt-1">{error}</p>{snapshot && <p className="mt-1 text-xs">Showing data fetched {formatRelative(snapshot.fetchedAt)}.</p>}</div><button type="button" disabled={updating} onClick={() => setRetry((value) => value + 1)} className="rounded-lg border border-red-200 px-3 py-2 font-semibold disabled:opacity-50">Try again</button></div>
  if (notFound) return <DeviceNotFound />
  if (!snapshot) return <>{errorNotice}{!error && <PageLoading />}</>
  const device = toDeviceView(snapshot.device)
  const live = latestMoisture(snapshot.full, snapshot.moisture)
  return <>
    {errorNotice}
    <section className="rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-base font-semibold text-slate-900">{device.name}</h2><p className="mt-1 text-sm text-slate-500">Farm: <span className="font-medium text-slate-700">{device.farmName}</span>{device.farmLocation ? ` · ${device.farmLocation}` : ''}</p></div>
        <button type="button" disabled={updating} onClick={() => setRetry((value) => value + 1)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className="size-3.5" />{updating ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <p className="mt-3 text-xs text-slate-500"><span className="font-semibold text-[#1f7a52]">{device.hardwareVersion?.toUpperCase() || 'Hardware version unavailable'}</span> · Last data received <time dateTime={device.lastDataReceived ?? undefined} title={formatTimestamp(device.lastDataReceived)}>{formatRelative(device.lastDataReceived)}</time></p>
      <ChangeDeviceFarm deviceId={deviceId} farmId={snapshot.device.farm_id} />
      <DeviceStatusBanner enabled={device.enabled} archivedAt={snapshot.device.archived_at} />
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#eff7e9] px-4 py-3 text-[#245e3e]">
        <Droplets aria-hidden="true" className="size-5" /><p className="text-sm font-medium">Live moisture <span className="ml-1 text-lg font-semibold tabular-nums">{formatMeasurement(live?.soil_moisture_pct, 'soil_moisture_pct')}</span></p>
        <p className="text-xs text-[#587568]">{live ? <><time dateTime={live.received_at} title={formatTimestamp(live.received_at)}>Received {formatRelative(live.received_at)}</time>{live.measured_at && <> · Measured {formatTimestamp(live.measured_at)}</>}</> : 'No moisture data received yet'}</p>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Receipt time indicates the latest data, not a confirmed live connection.</p>
    </section>

    <MeasurementGroups full={snapshot.full} hardwareVersion={device.hardwareVersion} />

    <DeviceHistoryChart deviceId={deviceId} hardwareVersion={device.hardwareVersion} />
    <RecentReadings rows={snapshot.recent} hardwareVersion={device.hardwareVersion} />
  </>
}


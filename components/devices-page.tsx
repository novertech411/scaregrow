'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Lock, Plus } from 'lucide-react'
import { ChangeDeviceFarm } from '@/components/change-device-farm'
import { useGreenerSession } from '@/components/session/greener-session'
import { DeviceOverview } from '@/components/dashboard/overview-page'
import { DeviceNotFound } from '@/components/dashboard/device-not-found'
import { DeviceStatusBanner } from '@/components/dashboard/device-status-banner'
import { ownedDevices } from '@/lib/session/owned-devices'
import { renameDevice } from '@/lib/dashboard/rename-device'
import { toDeviceView } from '@/lib/data/presenters'
import { formatRelative, formatTimestamp } from '@/lib/measurements'
import type { DeviceWithFarm } from '@/lib/data/devices'

export function DevicesPage({ selectedDeviceId }: { selectedDeviceId?: string }) {
  const session = useGreenerSession()
  const devices = ownedDevices(session.devices, session.user?.id)
  if (selectedDeviceId !== undefined) {
    if (!devices.some((device) => device.device_id === selectedDeviceId)) return <DeviceNotFound />
    return <div className="space-y-5"><Link href="/devices" className="inline-block text-sm font-semibold text-[#1f7a52] hover:underline">← All devices</Link><DeviceOverview key={selectedDeviceId} deviceId={selectedDeviceId} /></div>
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight text-[#123d2d]">Devices</h1><p className="mt-1 text-sm text-slate-500">Your field devices and their latest data.</p></div><Link href="/connect-device" className="inline-flex items-center gap-2 rounded-xl bg-[#123d2d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1f7a52]"><Plus className="size-4" />Add device</Link></div>
    {devices.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{devices.map((device) => <DeviceCard key={device.device_id} device={device} />)}</div> : <section className="rounded-2xl border border-dashed border-[#d7e8dc] bg-white px-6 py-12 text-center"><h2 className="text-lg font-semibold text-[#123d2d]">No devices connected yet</h2><p className="mt-2 text-sm text-slate-500">Connect a device to start receiving measurements.</p><Link href="/connect-device" className="mt-4 inline-block text-sm font-semibold text-[#1f7a52] hover:underline">Add device</Link></section>}
  </div>
}

export function DeviceCard({ device }: { device: DeviceWithFarm }) {
  const session = useGreenerSession()
  const view = toDeviceView(device)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(device.display_name ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setError('')
    try {
      await renameDevice(device.device_id, name, session.refresh, controller.signal)
      if (!controller.signal.aborted) setEditing(false)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Unable to save the device name.')
    } finally {
      request.current = null
      if (!controller.signal.aborted) setPending(false)
    }
  }
  const StatusIcon = device.enabled ? CheckCircle2 : Lock
  return <article className="rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-base font-semibold text-slate-900">{view.name}</h2><p className="mt-1 text-xs text-slate-500">{view.id}</p></div><span className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${device.enabled ? 'text-[#1f7a52]' : 'text-amber-800'}`}><StatusIcon aria-hidden="true" className="size-3.5" />{device.enabled ? 'Active' : 'Locked'}</span></div>
    <p className="mt-4 text-sm text-slate-600">{view.farmName}</p><p className="mt-1 text-xs text-slate-500">{view.hardwareVersion?.toUpperCase() || 'Hardware version unavailable'}</p>
    <p className="mt-3 text-xs text-slate-500">Last data received <time dateTime={view.lastDataReceived ?? undefined} title={formatTimestamp(view.lastDataReceived)}>{formatRelative(view.lastDataReceived)}</time></p>
    <DeviceStatusBanner enabled={device.enabled} archivedAt={device.archived_at} />
    {editing ? <form onSubmit={save} className="mt-4 space-y-2"><label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">Device name<input value={name} disabled={pending} onChange={(event) => setName(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#4d9b6b] focus:ring-2 focus:ring-[#dff1c3]" /></label><div className="flex gap-3"><button type="submit" disabled={pending} className="rounded-lg bg-[#123d2d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save name'}</button><button type="button" disabled={pending} onClick={() => { setEditing(false); setError('') }} className="px-2 py-2 text-xs text-slate-600">Cancel</button></div></form> : <div className="mt-4 flex items-center justify-between border-t border-[#edf3ee] pt-4"><button type="button" onClick={() => { setName(device.display_name ?? ''); setEditing(true); setError('') }} className="text-xs font-semibold text-[#1f7a52] hover:underline">Rename</button><Link href={`/devices/${encodeURIComponent(device.device_id)}`} className="text-xs font-semibold text-[#1f7a52] hover:underline">View →</Link></div>}
    <ChangeDeviceFarm deviceId={device.device_id} farmId={device.farm_id} />
    {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
  </article>
}

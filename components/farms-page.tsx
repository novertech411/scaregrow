'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useGreenerSession } from '@/components/session/greener-session'
import { useOwnedFarms } from '@/components/farms/use-owned-farms'
import { DeviceCard } from '@/components/devices-page'
import { PageLoading } from '@/components/ui/page-loading'
import { ownedDevices } from '@/lib/session/owned-devices'
import { saveFarmDetails } from '@/lib/data/farm-edits'
import type { DeviceWithFarm } from '@/lib/data/devices'
import type { FarmRow } from '@/lib/supabase/database.types'

export function FarmsPage({ farmId }: { farmId?: string }) {
  const session = useGreenerSession()
  const { farms, loading, error, reload } = useOwnedFarms()
  const devices = ownedDevices(session.devices, session.user?.id)
  if (loading && !farms.length) return <PageLoading />
  if (error) return <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => { void reload().catch(() => {}) }} className="mt-2 underline">Retry farms</button></div>
  const farm = farms.find((item) => item.id === farmId)
  if (farmId !== undefined && !farm) return <section className="rounded-2xl border border-[#d7e8dc] bg-white p-8 text-center"><h1 className="text-xl font-semibold text-[#123d2d]">Farm not found</h1><Link href="/farms" className="mt-4 inline-block text-sm font-semibold text-[#1f7a52]">← All farms</Link></section>
  async function saved() { await reload(); await session.refresh() }
  return <div className="space-y-5">
    {farmId && <Link href="/farms" className="inline-block text-sm font-semibold text-[#1f7a52] hover:underline">← All farms</Link>}
    <div><h1 className="text-2xl font-semibold tracking-tight text-[#123d2d]">{farm ? farm.name : 'Farms'}</h1><p className="mt-1 text-sm text-slate-500">Your farms and their field devices.</p></div>
    {!farms.length ? <p className="rounded-2xl border border-[#d7e8dc] bg-white px-6 py-12 text-center text-sm text-slate-500">No farms yet — farms are created when you connect a device with a farm name.</p> : <div className={farm ? '' : 'grid gap-4 md:grid-cols-2'}>{(farm ? [farm] : farms).map((item) => <FarmPanel key={item.id} farm={item} devices={devices.filter((device) => device.farm_id === item.id)} onSaved={saved} />)}</div>}
    {farm && <section className="space-y-4"><h2 className="text-sm font-semibold text-slate-900">Devices</h2>{devices.some((device) => device.farm_id === farm.id) ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{devices.filter((device) => device.farm_id === farm.id).map((device) => <DeviceCard key={device.device_id} device={device} />)}</div> : <p className="text-sm text-slate-500">No devices assigned to this farm.</p>}</section>}
  </div>
}
function FarmPanel({ farm, devices, onSaved }: { farm: FarmRow; devices: DeviceWithFarm[]; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(farm.name)
  const [location, setLocation] = useState(farm.location ?? '')
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
      await saveFarmDetails(farm.id, name, location, controller.signal)
      controller.signal.throwIfAborted()
      await onSaved()
      if (!controller.signal.aborted) setEditing(false)
    } catch (cause) { if (!controller.signal.aborted) setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Unable to save farm.') }
    finally { if (request.current === controller) request.current = null; if (!controller.signal.aborted) setPending(false) }
  }
  return <article className="rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-sm"><h2 className="text-base font-semibold text-slate-900"><Link href={`/farms/${encodeURIComponent(farm.id)}`} className="hover:text-[#1f7a52]">{farm.name}</Link></h2><p className="mt-2 text-sm text-slate-500">{farm.location || 'No location'}</p><p className="mt-3 text-xs font-medium text-[#587568]">{devices.length} owned {devices.length === 1 ? 'device' : 'devices'}</p><ul className="mt-2 space-y-1">{devices.map((device) => <li key={device.device_id}><Link href={`/devices/${encodeURIComponent(device.device_id)}`} className="text-sm text-[#1f7a52] hover:underline">{device.display_name || device.device_id}</Link></li>)}</ul>
    {editing ? <form onSubmit={save} className="mt-4 space-y-3"><fieldset disabled={pending} className="space-y-3"><label className="flex flex-col gap-1.5 text-xs text-slate-600">Farm name<input required value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /></label><label className="flex flex-col gap-1.5 text-xs text-slate-600">Location<input value={location} onChange={(event) => setLocation(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /></label></fieldset><div className="flex gap-3"><button type="submit" disabled={pending} className="rounded-lg bg-[#123d2d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save farm'}</button><button type="button" disabled={pending} onClick={() => { setEditing(false); setError('') }} className="px-2 py-2 text-xs text-slate-500">Cancel</button></div></form> : <button type="button" onClick={() => { setName(farm.name); setLocation(farm.location ?? ''); setEditing(true); setError('') }} className="mt-4 text-xs font-semibold text-[#1f7a52] hover:underline">Edit farm</button>}
    {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
  </article>
}

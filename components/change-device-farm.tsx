'use client'

import { useEffect, useRef, useState } from 'react'
import { useGreenerSession } from '@/components/session/greener-session'
import { useOwnedFarms } from '@/components/farms/use-owned-farms'
import { ownedDevices } from '@/lib/session/owned-devices'
import { pairDevice } from '@/lib/data/pairing'

export function ChangeDeviceFarm({ deviceId, farmId }: { deviceId: string; farmId: string | null }) {
  const { devices, user } = useGreenerSession()
  const [open, setOpen] = useState(false)
  if (!ownedDevices(devices, user?.id).some((device) => device.device_id === deviceId)) return null
  return <div className="mt-4 border-t border-[#edf3ee] pt-4">{open ? <FarmAssignment deviceId={deviceId} farmId={farmId} onClose={() => setOpen(false)} /> : <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-[#1f7a52] hover:underline">Change farm</button>}</div>
}
function FarmAssignment({ deviceId, farmId, onClose }: { deviceId: string; farmId: string | null; onClose: () => void }) {
  const session = useGreenerSession()
  const { farms, loading, error: loadError, reload } = useOwnedFarms()
  const [selectedId, setSelectedId] = useState(farmId ?? '')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const existingId = farms.some((farm) => farm.id === selectedId) ? selectedId : ''
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.current || loading || loadError) return
    setError('')
    if (!existingId && !name.trim()) { setError('Enter a farm name.'); return }
    const controller = new AbortController()
    request.current = controller
    setPending(true)
    try {
      await pairDevice({ deviceId, ...(existingId ? { farmId: existingId } : { farmName: name, farmLocation: location }) }, controller.signal)
      controller.signal.throwIfAborted()
      await session.refresh()
      if (!controller.signal.aborted) onClose()
    } catch (cause) { if (!controller.signal.aborted) setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Unable to change farm.') }
    finally { if (request.current === controller) request.current = null; if (!controller.signal.aborted) setPending(false) }
  }
  return <form onSubmit={submit} className="space-y-3"><fieldset disabled={loading || pending} className="space-y-3">
    <label className="flex flex-col gap-1.5 text-xs text-slate-600">Farm<select value={existingId} onChange={(event) => setSelectedId(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">New farm</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}{farm.location ? ` · ${farm.location}` : ''}</option>)}</select></label>
    {!existingId && <><label className="flex flex-col gap-1.5 text-xs text-slate-600">Farm name<input required value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /></label><label className="flex flex-col gap-1.5 text-xs text-slate-600">Location (optional)<input value={location} onChange={(event) => setLocation(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm" /></label></>}
  </fieldset><p className="text-xs text-slate-500">A device can't be removed from a farm here. Blank values keep the current assignment.</p>
    {loading && <p role="status" className="text-xs text-slate-500">Loading farms…</p>}{loadError && <p role="alert" className="text-xs text-red-700">{loadError} <button type="button" onClick={() => { void reload().catch(() => {}) }} className="underline">Retry</button></p>}{error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <div className="flex gap-3"><button type="submit" disabled={pending || loading || Boolean(loadError)} className="rounded-lg bg-[#123d2d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? 'Changing farm…' : 'Save farm'}</button><button type="button" disabled={pending} onClick={onClose} className="px-2 py-2 text-xs text-slate-600">Cancel</button></div>
  </form>
}

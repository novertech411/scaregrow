'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Archive, CheckCircle2, CircleUser, Lock } from 'lucide-react'
import { useGreenerSession } from '@/components/session/greener-session'
import { listAllDevices, listAllUsers } from '@/lib/data/admin'
import { deviceAdminStatus } from '@/lib/data/presenters'
import { allowedActions, ownerLabel } from '@/lib/admin/presenters'
import { performAdminAction, type AdminOperation } from '@/lib/admin/actions'
import { formatRelative, formatTimestamp } from '@/lib/measurements'
import { useAdminFeedback } from '@/components/admin/feedback'
import { useAdminResource } from '@/components/admin/use-admin-resource'
import { AdminEmpty, AdminLoadState, AdminPager, AdminTable, AdminTitle, DirectoryNotice, ReasonDialog, adminButton, adminInput } from '@/components/admin/shared'
import type { DeviceAction, HardwareVersion } from '@/lib/supabase/database.types'
import type { DeviceWithFarm } from '@/lib/data/devices'

export type DeviceOperation = { kind: 'register' } | { kind: 'rename'; device: DeviceWithFarm } | { kind: 'manage'; device: DeviceWithFarm; action: DeviceAction } | { kind: 'bulk'; locked: boolean }
const labels: Record<DeviceAction, string> = { lock: 'Lock', unlock: 'Unlock', release: 'Release', archive: 'Remove (Archive)', restore: 'Restore' }
export function AdminDevices() {
  const session = useGreenerSession()
  const feedback = useAdminFeedback()
  const resource = useAdminResource(async (signal) => { const [devices, directory] = await Promise.all([listAllDevices(signal), listAllUsers(signal)]); return { devices, users: directory.users, truncated: directory.truncated } })
  const [operation, setOperation] = useState<DeviceOperation | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(0)
  const filtered = resource.data?.devices.filter((device) => `${device.device_id} ${device.display_name ?? ''} ${device.farm?.name ?? ''} ${ownerLabel(device.owner_user_id, resource.data!.users)}`.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || deviceAdminStatus(device) === status)) ?? []
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 50) - 1))
  function begin(operation: DeviceOperation) { feedback.clear(); setOperation(operation) }
  async function changed() { await resource.reload(); await session.refresh() }
  return <div className="space-y-5">
    <AdminTitle title="All devices" description="Manage registered devices, ownership, and cloud data access."><button type="button" onClick={() => begin({ kind: 'register' })} className={adminButton}>+ Register device</button><button type="button" onClick={() => begin({ kind: 'bulk', locked: true })} className={adminButton}>Lock all</button><button type="button" onClick={() => begin({ kind: 'bulk', locked: false })} className={adminButton}>Unlock all</button><button type="button" disabled={resource.loading} onClick={() => { void resource.reload().catch(() => {}) }} className={adminButton}>Refresh</button></AdminTitle>
    <div className="flex flex-wrap gap-3"><label className="flex flex-1 flex-col gap-1.5 text-xs text-slate-500">Search device, owner, or farm<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} className={adminInput} /></label><label className="flex flex-col gap-1.5 text-xs text-slate-500">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0) }} className={adminInput}>{['all', 'Archived', 'Locked', 'Unclaimed', 'Claimed'].map((value) => <option key={value} value={value}>{value === 'all' ? 'All statuses' : value}</option>)}</select></label></div>
    <AdminLoadState error={resource.error} loading={resource.loading} hasData={Boolean(resource.data)} retry={resource.reload} />
    {resource.data && <DirectoryNotice truncated={resource.data.truncated} />}
    {resource.data && (filtered.length ? <><AdminTable headings={['Device', 'Status', 'Owner', 'Farm', 'Last data received', 'Actions']}>{filtered.slice(currentPage * 50, currentPage * 50 + 50).map((device) => {
      return <tr key={device.device_id}><td><Link href={`/admin/devices/${encodeURIComponent(device.device_id)}`} className="font-semibold text-slate-900 hover:text-[#1f7a52] hover:underline">{device.display_name || device.device_id}</Link><p className="mt-1 text-slate-500">{device.device_id} · {device.hardware_version?.toUpperCase() || 'Unavailable'}</p><Link href={`/admin/readings?${new URLSearchParams({ device: device.device_id })}`} className="mt-2 inline-block text-[#1f7a52] underline">View readings</Link></td><td><DeviceAdminStatus device={device} /></td><td className="max-w-64 break-words">{ownerLabel(device.owner_user_id, resource.data!.users)}</td><td>{device.farm?.name || 'No farm assigned'}</td><td><time dateTime={device.last_received_at ?? undefined} title={formatTimestamp(device.last_received_at)}>{formatRelative(device.last_received_at)}</time></td><td><DeviceActionButtons device={device} onAction={begin} /></td></tr>
    })}</AdminTable><AdminPager page={currentPage} next={(currentPage + 1) * 50 < filtered.length} total={filtered.length} onPage={setPage} /></> : <AdminEmpty text="No devices match these filters." />)}
    {operation && <DeviceMutation key={operation.kind === 'manage' ? `${operation.device.device_id}:${operation.action}` : operation.kind} operation={operation} onSaved={changed} onClose={() => setOperation(null)} />}
  </div>
}
export function DeviceMutation({ operation, onSaved, onClose }: { operation: DeviceOperation; onSaved: () => Promise<unknown>; onClose: () => void }) {
  const session = useGreenerSession()
  const feedback = useAdminFeedback()
  const [deviceId, setDeviceId] = useState('')
  const [name, setName] = useState(operation.kind === 'rename' ? operation.device.display_name ?? '' : '')
  const [hardwareVersion, setHardwareVersion] = useState<HardwareVersion>('v2')
  const managementText: Record<DeviceAction, string> = {
    lock: 'Locking blocks cloud ingestion and new claims. It does not stop local valves or MQTT connections.',
    unlock: 'Unlocking allows cloud ingestion and claims when the device is otherwise available.',
    release: 'Confirm release: this clears the owner, farm assignment, and labels. It does not unlock the device.',
    archive: 'Confirm removal: this archives the device. There is no permanent delete.',
    restore: 'Restore this archived device. It will remain locked.',
  }
  const title = operation.kind === 'register' ? 'Register device' : operation.kind === 'rename' ? `Rename ${operation.device.device_id}` : operation.kind === 'bulk' ? `${operation.locked ? 'Lock' : 'Unlock'} all devices` : `${labels[operation.action]} · ${operation.device.device_id}`
  const description = operation.kind === 'register' ? 'Pre-register a device so a farmer can connect it. Device IDs are permanent and case-sensitive.' : operation.kind === 'rename' ? 'Change the display name. An empty name uses the permanent device ID.' : operation.kind === 'bulk' ? `Confirm ${operation.locked ? 'locking' : 'unlocking'} all devices. Locking blocks cloud ingestion and new claims; it does not stop local valves or MQTT connections.` : managementText[operation.action]
  const fields = <>{operation.kind === 'register' && <><label className="flex flex-col gap-1.5 text-xs text-slate-600">Device ID<input required autoCapitalize="none" autoCorrect="off" spellCheck={false} value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className={adminInput} /></label><label className="flex flex-col gap-1.5 text-xs text-slate-600">Hardware version<select value={hardwareVersion} onChange={(event) => setHardwareVersion(event.target.value as HardwareVersion)} className={adminInput}><option value="v1">V1</option><option value="v2">V2</option></select></label></>}{(operation.kind === 'register' || operation.kind === 'rename') && <label className="flex flex-col gap-1.5 text-xs text-slate-600">Display name (optional)<input value={name} onChange={(event) => setName(event.target.value)} className={adminInput} /></label>}</>
  return <ReasonDialog onSaved={onSaved} onClose={onClose} mutation={{ title, description, submitLabel: operation.kind === 'manage' ? labels[operation.action] : 'Confirm', fields, save: async (reason, signal) => { const action: AdminOperation = operation.kind === 'register' ? { kind: 'register', deviceId, hardwareVersion, name } : operation.kind === 'rename' ? { kind: 'rename', deviceId: operation.device.device_id, name } : operation.kind === 'manage' ? { kind: 'manage', deviceId: operation.device.device_id, action: operation.action } : operation
    const result = await performAdminAction(action, reason, session, signal)
    signal.throwIfAborted()
    feedback.succeed(action, result)
    return result
  } }} />
}

export function DeviceAdminStatus({ device }: { device: DeviceWithFarm }) {
  const status = deviceAdminStatus(device)
  const Icon = status === 'Archived' ? Archive : status === 'Locked' ? Lock : status === 'Unclaimed' ? CircleUser : CheckCircle2
  return <span className="inline-flex items-center gap-1.5 font-medium"><Icon aria-hidden="true" className="size-3.5" />{status}</span>
}
export function DeviceActionButtons({ device, onAction }: { device: DeviceWithFarm; onAction: (operation: DeviceOperation) => void }) {
  return <div className="flex min-w-64 flex-wrap gap-2">{allowedActions(device).map((action) => <button type="button" key={action} onClick={() => onAction(action === 'rename' ? { kind: 'rename', device } : { kind: 'manage', device, action })} className={adminButton}>{action === 'rename' ? 'Rename' : labels[action]}</button>)}{!device.archived_at && <button type="button" disabled title="Assigning a device to a farmer is coming soon" className={adminButton}>Assign to farmer · coming soon</button>}</div>
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getDevice } from '@/lib/data/devices'
import { listAllUsers } from '@/lib/data/admin'
import { ownerLabel } from '@/lib/admin/presenters'
import { formatRelative, formatTimestamp } from '@/lib/measurements'
import { useGreenerSession } from '@/components/session/greener-session'
import { useAdminResource } from '@/components/admin/use-admin-resource'
import { useAdminFeedback } from '@/components/admin/feedback'
import { ActivityLog } from '@/components/admin/activity'
import { DeviceActionButtons, DeviceAdminStatus, DeviceMutation, type DeviceOperation } from '@/components/admin/devices'
import { AdminLoadState, AdminTitle, DirectoryNotice, adminButton } from '@/components/admin/shared'

export function AdminDeviceDetail({ deviceId }: { deviceId: string }) {
  const session = useGreenerSession()
  const feedback = useAdminFeedback()
  const resource = useAdminResource(async (signal) => {
    const [device, directory] = await Promise.all([getDevice(deviceId, signal), listAllUsers(signal)])
    return { device, users: directory.users, truncated: directory.truncated }
  }, deviceId)
  const [operation, setOperation] = useState<DeviceOperation | null>(null)
  function begin(next: DeviceOperation) { feedback.clear(); setOperation(next) }
  async function changed() { await resource.reload(); await session.refresh() }
  const device = resource.data?.device
  return <div className="space-y-5">
    <Link href="/admin/devices" className="inline-block text-sm font-semibold text-[#1f7a52] hover:underline">← All devices</Link>
    <AdminLoadState error={resource.error} loading={resource.loading} hasData={Boolean(resource.data)} retry={resource.reload} />
    {resource.data && (!device ? <section className="rounded-2xl border border-[#d7e8dc] bg-white p-8 text-center"><h1 className="text-xl font-semibold text-[#123d2d]">Device not found</h1><p className="mt-2 text-sm text-slate-500">No registered device matches this ID.</p></section> : <>
      <AdminTitle title={device.display_name || device.device_id} description={device.device_id}><Link href={`/admin/readings?${new URLSearchParams({ device: device.device_id })}`} className={adminButton}>View readings</Link><button type="button" disabled={resource.loading} onClick={() => { void resource.reload().catch(() => {}) }} className={adminButton}>Refresh</button></AdminTitle>
      <DirectoryNotice truncated={resource.data.truncated} />
      <section className="space-y-5 rounded-2xl border border-[#d7e8dc] bg-white p-5"><dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Fact label="Device ID">{device.device_id}</Fact><Fact label="Display name">{device.display_name || 'Unavailable'}</Fact><Fact label="Hardware version">{device.hardware_version?.toUpperCase() || 'Unavailable'}</Fact>
        <Fact label="Status"><DeviceAdminStatus device={device} /></Fact><Fact label="Owner">{ownerLabel(device.owner_user_id, resource.data.users)}</Fact><Fact label="Farm">{device.farm?.name || 'No farm assigned'}</Fact>
        <Fact label="Claimed at">{formatTimestamp(device.claimed_at)}</Fact><Fact label="Created at">{formatTimestamp(device.created_at)}</Fact><Fact label="Last data received"><time dateTime={device.last_received_at ?? undefined} title={formatTimestamp(device.last_received_at)}>{formatRelative(device.last_received_at)}</time></Fact>
      </dl><DeviceActionButtons device={device} onAction={begin} /></section>
      <ActivityLog directory={{ users: resource.data.users, truncated: resource.data.truncated, devices: [device] }} targetId={device.device_id} pageSize={20} embedded />
    </>)}
    {operation && <DeviceMutation key={operation.kind === 'manage' ? `${operation.device.device_id}:${operation.action}` : operation.kind} operation={operation} onSaved={changed} onClose={() => setOperation(null)} />}
  </div>
}
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 break-words text-sm font-medium text-slate-900">{children}</dd></div>
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { listAuditLog, listAllUsers, listAllDevices } from '@/lib/data/admin'
import { auditJson, ownerLabel } from '@/lib/admin/presenters'
import { formatTimestamp } from '@/lib/measurements'
import { useAdminResource } from '@/components/admin/use-admin-resource'
import { AdminEmpty, AdminLoadState, AdminPager, AdminTable, AdminTitle, DirectoryNotice, adminButton } from '@/components/admin/shared'
import type { AdminUserRow } from '@/lib/supabase/database.types'
import type { DeviceWithFarm } from '@/lib/data/devices'

export type ActivityDirectory = { users: AdminUserRow[]; devices: DeviceWithFarm[]; truncated: boolean }
export function AdminActivity() {
  // This resource has no page key: paging the log never reloads the directory.
  const directory = useAdminResource(async (signal) => {
    const [users, devices] = await Promise.all([listAllUsers(signal), listAllDevices(signal)])
    return { users: users.users, truncated: users.truncated, devices }
  })
  return <div className="space-y-5"><AdminTitle title="Activity" description="Recorded admin actions, reasons, and before/after values." /><AdminLoadState error={directory.error} loading={directory.loading} hasData={Boolean(directory.data)} retry={directory.reload} />{directory.data && <ActivityLog directory={directory.data} />}</div>
}
export function ActivityLog({ directory, targetId, pageSize = 50, embedded = false }: { directory: ActivityDirectory; targetId?: string; pageSize?: number; embedded?: boolean }) {
  const [page, setPage] = useState(0)
  const resource = useAdminResource((signal) => listAuditLog({ limit: pageSize, offset: page * pageSize, targetId }, signal), `${targetId ?? ''}:${page}:${pageSize}`)
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-900">{embedded ? 'Device activity' : 'Admin actions'}</h2><button type="button" disabled={resource.loading} onClick={() => { void resource.reload().catch(() => {}) }} className={adminButton}>Refresh activity</button></div>
    <DirectoryNotice truncated={directory.truncated && !embedded} />
    <AdminLoadState error={resource.error} loading={resource.loading} hasData={Boolean(resource.data)} retry={resource.reload} />
    {resource.data && <>{resource.data.length ? <AdminTable headings={['When', 'Who', 'Action', 'Target', 'Reason', 'Before → After']}>{resource.data.map((row, index) => <tr key={`${row.created_at}:${row.actor_user_id}:${row.action}:${row.target_id}:${page * pageSize + index}`}>
      <td className="whitespace-nowrap">{formatTimestamp(row.created_at)}</td><td className="max-w-60 break-words">{row.actor_user_id ? ownerLabel(row.actor_user_id, directory.users) : 'Unavailable'}</td><td>{row.action}</td>
      <td className="max-w-48 break-words">{row.target_id && directory.devices.some((device) => device.device_id === row.target_id) ? <Link href={`/admin/devices/${encodeURIComponent(row.target_id)}`} className="text-[#1f7a52] underline">{row.target_id}</Link> : row.target_id || 'Unavailable'}</td>
      <td className="max-w-64 break-words">{row.reason || 'Unavailable'}</td><td><details><summary className="cursor-pointer whitespace-nowrap font-semibold text-[#1f7a52] focus-visible:outline-2 focus-visible:outline-[#1f7a52]">Before → After</summary><div className="mt-3 grid gap-3 lg:grid-cols-2"><section><h3 className="mb-1 text-xs font-semibold text-slate-600">Before</h3><pre className="max-h-72 min-w-56 max-w-sm overflow-auto rounded-lg bg-slate-50 p-3 text-[11px]">{auditJson(row.before_data)}</pre></section><section><h3 className="mb-1 text-xs font-semibold text-slate-600">After</h3><pre className="max-h-72 min-w-56 max-w-sm overflow-auto rounded-lg bg-slate-50 p-3 text-[11px]">{auditJson(row.after_data)}</pre></section></div></details></td>
    </tr>)}</AdminTable> : <AdminEmpty text={page ? 'No more activity.' : 'No admin activity recorded yet.'} />}<AdminPager page={page} next={resource.data.length === pageSize} onPage={setPage} /></>}
  </section>
}

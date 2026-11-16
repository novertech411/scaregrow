'use client'

import { useState } from 'react'
import { listUsers } from '@/lib/data/admin'
import { formatTimestamp } from '@/lib/measurements'
import { useAdminResource } from '@/components/admin/use-admin-resource'
import { AdminEmpty, AdminLoadState, AdminPager, AdminTable, AdminTitle, adminButton } from '@/components/admin/shared'

export function AdminUsers() {
  const [page, setPage] = useState(0)
  const resource = useAdminResource((signal) => listUsers({ limit: 50, offset: page * 50 }, signal), String(page))
  return <div className="space-y-5"><AdminTitle title="Users" description="Accounts, join dates, and device ownership."><button type="button" disabled={resource.loading} onClick={() => { void resource.reload().catch(() => {}) }} className={adminButton}>Refresh</button></AdminTitle><p className="text-xs text-slate-500">Roles are managed by the backend team.</p><AdminLoadState error={resource.error} loading={resource.loading} hasData={Boolean(resource.data)} retry={resource.reload} />{resource.data && <>{resource.data.length ? <AdminTable headings={['Name', 'Email', 'Joined', 'Devices']}>{resource.data.map((user) => <tr key={user.user_id}><td><p className="font-medium text-slate-900">{user.full_name || 'Unavailable'}</p><p className="mt-1 text-[10px] text-slate-500">{user.user_id}</p></td><td>{user.email || 'Unavailable'}</td><td>{formatTimestamp(user.created_at)}</td><td className="tabular-nums">{user.device_count.toLocaleString()}</td></tr>)}</AdminTable> : <AdminEmpty text={page ? 'No more accounts.' : 'No accounts available.'} />}<AdminPager page={page} next={resource.data.length === 50} onPage={setPage} /></>}</div>
}

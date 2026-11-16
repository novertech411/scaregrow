'use client'

import { useState } from 'react'
import { listAllFarms, listAllUsers, listAllDevices } from '@/lib/data/admin'
import { ownerLabel } from '@/lib/admin/presenters'
import { performAdminAction } from '@/lib/admin/actions'
import { useGreenerSession } from '@/components/session/greener-session'
import { useAdminFeedback } from '@/components/admin/feedback'
import { useAdminResource } from '@/components/admin/use-admin-resource'
import { AdminEmpty, AdminLoadState, AdminPager, AdminTable, AdminTitle, DirectoryNotice, ReasonDialog, adminButton, adminInput } from '@/components/admin/shared'
import type { FarmRow } from '@/lib/supabase/database.types'

export function AdminFarms() {
  const session = useGreenerSession()
  const feedback = useAdminFeedback()
  const resource = useAdminResource(async (signal) => { const [farms, directory, devices] = await Promise.all([listAllFarms(signal), listAllUsers(signal), listAllDevices(signal)]); return { farms, users: directory.users, truncated: directory.truncated, devices } })
  const [editing, setEditing] = useState<FarmRow | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const farms = resource.data?.farms.filter((farm) => `${farm.name} ${farm.location ?? ''} ${ownerLabel(farm.owner_user_id, resource.data!.users)}`.toLowerCase().includes(search.toLowerCase())) ?? []
  const currentPage = Math.min(page, Math.max(0, Math.ceil(farms.length / 50) - 1))
  async function saved() { await resource.reload(); await session.refresh() }
  return <div className="space-y-5"><AdminTitle title="All farms" description="Every farm, its owner, and its location."><button type="button" disabled={resource.loading} onClick={() => { void resource.reload().catch(() => {}) }} className={adminButton}>Refresh</button></AdminTitle><label className="flex max-w-lg flex-col gap-1.5 text-xs text-slate-500">Search farm or owner<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} className={adminInput} /></label><AdminLoadState error={resource.error} loading={resource.loading} hasData={Boolean(resource.data)} retry={resource.reload} />{resource.data && <><DirectoryNotice truncated={resource.data.truncated} />{farms.length ? <AdminTable headings={['Farm', 'Location', 'Owner', 'Devices', 'Actions']}>{farms.slice(currentPage * 50, currentPage * 50 + 50).map((farm) => <tr key={farm.id}><td><p className="font-medium text-slate-900">{farm.name}</p><p className="mt-1 text-[10px] text-slate-500">{farm.id}</p></td><td>{farm.location || 'No location'}</td><td>{ownerLabel(farm.owner_user_id, resource.data!.users)}</td><td className="tabular-nums">{resource.data!.devices.filter((device) => device.farm_id === farm.id).length}</td><td><button type="button" onClick={() => { feedback.clear(); setEditing(farm) }} className={adminButton}>Edit name/location</button></td></tr>)}</AdminTable> : <AdminEmpty text="No farms match this search." />}<AdminPager page={currentPage} next={(currentPage + 1) * 50 < farms.length} total={farms.length} onPage={setPage} /></>}{editing && <FarmMutation key={editing.id} farm={editing} onSaved={saved} onClose={() => setEditing(null)} />}</div>
}
function FarmMutation({ farm, onSaved, onClose }: { farm: FarmRow; onSaved: () => Promise<unknown>; onClose: () => void }) {
  const session = useGreenerSession()
  const feedback = useAdminFeedback()
  const [name, setName] = useState(farm.name)
  const [location, setLocation] = useState(farm.location ?? '')
  return <ReasonDialog onSaved={onSaved} onClose={onClose} mutation={{ title: `Edit ${farm.name}`, description: 'Update the farm name and location. Devices linked to this farm will use these details.', submitLabel: 'Save farm', fields: <><label className="flex flex-col gap-1.5 text-xs text-slate-600">Farm name<input required value={name} onChange={(event) => setName(event.target.value)} className={adminInput} /></label><label className="flex flex-col gap-1.5 text-xs text-slate-600">Location<input value={location} onChange={(event) => setLocation(event.target.value)} className={adminInput} /></label></>, save: async (reason, signal) => { const action = { kind: 'farm' as const, farmId: farm.id, name, location }; const result = await performAdminAction(action, reason, session, signal); signal.throwIfAborted(); feedback.succeed(action, result); return result } }} />
}

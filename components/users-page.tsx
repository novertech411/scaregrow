'use client'

import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Search, UserPlus, X } from 'lucide-react'
import type { Role, UserRecord, UserStatus } from '@/lib/types'
import { getUsers } from '@/lib/services/users'
import { toUser } from '@/lib/services/presenters'

const roleOptions: Role[] = ['Administrator', 'Farm Manager', 'Agronomist', 'Technician', 'Viewer']
const statusOptions: UserStatus[] = ['Active', 'Pending', 'Suspended']

const roleStyle = (role: Role) =>
  role === 'Administrator'
    ? 'bg-[#eeeaff] text-[#5b4bb7]'
    : role === 'Farm Manager'
    ? 'bg-[#e6f4d8] text-[#1f7a52]'
    : role === 'Agronomist'
    ? 'bg-[#e5f2fa] text-[#2a6481]'
    : role === 'Technician'
    ? 'bg-[#fff1dc] text-[#9a650e]'
    : 'bg-slate-100 text-slate-600'

const statusStyle = (status: UserStatus) =>
  status === 'Active'
    ? 'border-[#cce5d2] bg-[#eff9f0] text-[#27734a]'
    : status === 'Pending'
    ? 'border-[#f2d8a6] bg-[#fff8e9] text-[#9a650e]'
    : 'border-[#f1c3bb] bg-[#fff1ef] text-[#b64232]'

function UserFields({ draft, setDraft }: { draft: UserRecord; setDraft: (next: UserRecord) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
        Full name
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-10 rounded-xl border border-[#cfe4d2] px-3 text-sm font-normal outline-none focus:border-[#1f7a52]" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
        Email address
        <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="h-10 rounded-xl border border-[#cfe4d2] px-3 text-sm font-normal outline-none focus:border-[#1f7a52]" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Role
          <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })} className="h-10 rounded-xl border border-[#cfe4d2] bg-white px-3 text-sm font-normal outline-none">
            {roleOptions.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
          Farm access
          <select value={draft.access} onChange={(e) => setDraft({ ...draft, access: e.target.value })} className="h-10 rounded-xl border border-[#cfe4d2] bg-white px-3 text-sm font-normal outline-none">
            <option>All farms</option>
            <option>Green Eden Farm</option>
            <option>North Valley Farm</option>
            <option>Sunrise Demonstration Farm</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
        Account status
        <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as UserStatus })} className="h-10 rounded-xl border border-[#cfe4d2] bg-white px-3 text-sm font-normal outline-none">
          {statusOptions.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  useEffect(() => { getUsers().then((rows) => setUsers(rows.map(toUser))).catch((error) => setNotice(error.message)) }, [])
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('All roles')
  const [status, setStatus] = useState('All statuses')
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const filtered = useMemo(() =>
    users.filter((user) =>
      (!query || `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())) &&
      (role === 'All roles' || user.role === role) &&
      (status === 'All statuses' || user.status === status)
    ),
  [users, query, role, status])

  const [invite, setInvite] = useState<UserRecord>({ id: '', name: '', email: '', role: 'Viewer', access: 'Green Eden Farm', status: 'Pending', lastActive: 'Not active yet', initials: '' })

  const saveInvite = () => {
    const name = invite.name.trim()
    if (!name || !invite.email.trim()) return
    setInviteOpen(false)
    setNotice('User invitations require authentication and are not available yet.')
    setInvite({ id: '', name: '', email: '', role: 'Viewer', access: 'Green Eden Farm', status: 'Pending', lastActive: 'Not active yet', initials: '' })
    setTimeout(() => setNotice(''), 3000)
  }

  const saveEdit = () => {
    if (!editing) return
    setEditing(null)
    setNotice('User changes require authentication and are not available yet.')
    setTimeout(() => setNotice(''), 3000)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#2b8b61]">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Users</h1>
          <p className="mt-1 text-sm text-slate-500">Manage people who have access to Greener.</p>
        </div>
        <button onClick={() => setInviteOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#1f7a52] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#176b46]">
          <UserPlus className="size-4" />Invite User
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Users', users.length],
          ['Administrators', users.filter((u) => u.role === 'Administrator').length],
          ['Farm Managers', users.filter((u) => u.role === 'Farm Manager').length],
          ['Active Users', users.filter((u) => u.status === 'Active').length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[#d7e8dc] bg-gradient-to-br from-white via-white to-[#eff9e8] p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#d7e8dc] bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" placeholder="Search users..." className="h-9 w-full rounded-xl border border-[#cfe4d2] bg-[#fbfdf9] pl-9 pr-3 text-sm outline-none focus:border-[#1f7a52]" />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role" className="h-9 rounded-xl border border-[#cfe4d2] bg-[#fbfdf9] px-3 text-xs font-medium text-slate-600">
          <option>All roles</option>
          {roleOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="h-9 rounded-xl border border-[#cfe4d2] bg-[#fbfdf9] px-3 text-xs font-medium text-slate-600">
          <option>All statuses</option>
          {statusOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cfe4d2] bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-800">No users found</p>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#d7e8dc] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#f4faef] text-[11px] uppercase tracking-[0.12em] text-[#587568]">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Farm access</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Last active</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3ee]">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-[#fbfdf9]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-[#dbeee2] text-xs font-bold text-[#256d4a]">{user.initials}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${roleStyle(user.role)}`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{user.access}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(user.status)}`}>{user.status}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{user.lastActive}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => setEditing(user)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1f7a52] hover:bg-[#e6f4d8]">
                        View / Edit
                      </button>
                      <button aria-label={`More actions for ${user.name}`} className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 p-3 md:hidden">
            {filtered.map((user) => (
              <article key={user.id} className="rounded-xl border border-[#edf3ee] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#dbeee2] text-xs font-bold text-[#256d4a]">{user.initials}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <span className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${statusStyle(user.status)}`}>{user.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400">Role</p>
                    <p className={`mt-1 inline-block rounded-lg px-2 py-1 font-semibold ${roleStyle(user.role)}`}>{user.role}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Farm access</p>
                    <p className="mt-1 font-medium text-slate-700">{user.access}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Last active</p>
                    <p className="mt-1 font-medium text-slate-700">{user.lastActive}</p>
                  </div>
                </div>
                <button onClick={() => setEditing(user)} className="mt-4 w-full rounded-xl border border-[#cfe4d2] px-3 py-2.5 text-xs font-semibold text-[#1f7a52]">
                  View / Edit
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {notice && (
        <div role="status" className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#123d2d] px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {notice}
        </div>
      )}

      {(inviteOpen || editing) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#123d2d]/30 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="user-dialog-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="user-dialog-title" className="text-lg font-semibold text-slate-900">{inviteOpen ? 'Invite User' : 'Edit User'}</h2>
                <p className="mt-1 text-sm text-slate-500">{inviteOpen ? 'Give someone access to Greener.' : 'Update this user’s access and account status.'}</p>
              </div>
              <button aria-label="Close dialog" onClick={() => { setInviteOpen(false); setEditing(null) }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5">
              <UserFields draft={inviteOpen ? invite : editing!} setDraft={inviteOpen ? setInvite : setEditing} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { setInviteOpen(false); setEditing(null) }} className="rounded-xl border border-[#cfe4d2] px-4 py-2.5 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button onClick={inviteOpen ? saveInvite : saveEdit} className="rounded-xl bg-[#1f7a52] px-4 py-2.5 text-xs font-semibold text-white">
                {inviteOpen ? 'Send Invitation' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

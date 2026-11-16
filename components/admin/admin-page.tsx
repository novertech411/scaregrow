'use client'

import Link from 'next/link'
import { useGreenerSession } from '@/components/session/greener-session'
import { PageLoading } from '@/components/ui/page-loading'
import { canAccessAdmin, type AdminSection } from '@/lib/admin/navigation'
import { AdminSuccess } from '@/components/admin/feedback'
import { AdminDeviceDetail } from '@/components/admin/device-detail'
import { AdminDevices } from '@/components/admin/devices'
import { AdminUsers } from '@/components/admin/users'
import { AdminFarms } from '@/components/admin/farms'
import { AdminReadings } from '@/components/admin/readings'
import { AdminActivity } from '@/components/admin/activity'

export function AdminGate({ children }: { children: React.ReactNode }) {
  const session = useGreenerSession()
  if (session.status === 'loading') return <PageLoading />
  if (!canAccessAdmin(session)) return <section role="alert" className="rounded-2xl border border-[#d7e8dc] bg-white p-8 text-center"><h1 className="text-xl font-semibold text-[#123d2d]">Super admin access required</h1><p className="mt-2 text-sm text-slate-500">You don't have access to this section.</p><Link href="/" className="mt-4 inline-block text-sm font-semibold text-[#1f7a52]">Back to overview</Link></section>
  return children
}
export function AdminPage({ section, deviceId }: { section: AdminSection; deviceId?: string }) {
  return <AdminGate><AdminSuccess />{section === 'devices' ? deviceId !== undefined ? <AdminDeviceDetail key={deviceId} deviceId={deviceId} /> : <AdminDevices /> : section === 'users' ? <AdminUsers /> : section === 'farms' ? <AdminFarms /> : section === 'readings' ? <AdminReadings /> : <AdminActivity />}</AdminGate>
}

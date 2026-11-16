'use client'

import { Suspense } from 'react'
import { listAllDevices } from '@/lib/data/admin'
import { readingDevices } from '@/lib/readings/filters'
import { HistoryContent } from '@/components/readings-page'
import { PageLoading } from '@/components/ui/page-loading'
import { useAdminResource } from '@/components/admin/use-admin-resource'
import { AdminEmpty, AdminLoadState, AdminTitle } from '@/components/admin/shared'

export function AdminReadings() {
  const resource = useAdminResource((signal) => listAllDevices(signal))
  return <div className="space-y-5"><AdminLoadState error={resource.error} loading={resource.loading} hasData={Boolean(resource.data)} retry={resource.reload} />{resource.data && (resource.data.length ? <Suspense fallback={<PageLoading />}><HistoryContent devices={readingDevices(resource.data, [])} title="All readings" description="History for any device across ownership periods, with CSV export." /></Suspense> : <><AdminTitle title="All readings" description="History for every registered device." /><AdminEmpty text="No registered devices are available." /></>)}</div>
}

import { AlertTriangle, Lock } from 'lucide-react'

export function DeviceStatusBanner({ enabled, archivedAt }: { enabled: boolean; archivedAt: string | null }) {
  if (!archivedAt && enabled) return null
  const Icon = archivedAt ? AlertTriangle : Lock
  return <div role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p>{archivedAt ? 'This device has been archived.' : "This device is locked by an administrator. New data isn't being recorded."}</p></div>
}

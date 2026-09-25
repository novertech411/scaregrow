import type { Status } from '@/lib/types'

export function statusStyles(status: Status) {
  if (status === 'Online' || status === 'Resolved') return 'bg-[#d8f2b1] text-[#245e3e] ring-4 ring-[#eef9de] border-emerald-100'
  if (status === 'Warning' || status === 'Syncing') return 'bg-[#ffe4a8] text-[#9a5b08] ring-4 ring-[#fff4d7] border-amber-100'
  if (status === 'Critical') return 'bg-red-50 text-red-700 border-red-100'
  return 'bg-[#dbe8e4] text-[#356b59] ring-4 ring-[#f0f6f2] border-slate-200'
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles(status)}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

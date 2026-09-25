import type { Activity } from 'lucide-react'

export function MetricCard({ title, value, subtitle, icon: Icon, tone }: { title: string; value: string; subtitle: string; icon: typeof Activity; tone: string }) {
  return (
    <div className="rounded-2xl border border-[#d7e8dc] bg-gradient-to-br from-white via-white to-[#eff9e8] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-[27px] font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`flex size-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="size-[18px]" strokeWidth={1.8} />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
    </div>
  )
}

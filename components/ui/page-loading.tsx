export function PanelLoading({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 p-6 ${className}`}>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}

export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true" className="space-y-5">
        <div className="h-8 w-48 rounded-lg bg-slate-200/70" />
        <div className="h-4 w-64 max-w-full rounded bg-slate-200/50" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 rounded-2xl border border-slate-200 bg-white/80" />
          ))}
        </div>
        <div className="h-80 rounded-2xl border border-slate-200 bg-white/80" />
      </div>
    </div>
  )
}

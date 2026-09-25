'use client'


import { AlertTriangle } from 'lucide-react'
import type { PageKey } from '@/lib/types'
import type { Alert } from '@/lib/types'
import { StatusBadge } from '@/components/ui/status-badge'

export function AlertsPanel({ onNavigate, alerts }: { onNavigate: (page: PageKey, path: string) => void; alerts: Alert[] }) {

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Recent Alerts</h2>
          <p className="mt-1 text-xs text-slate-400">Prioritized by severity and time</p>
        </div>
        <button onClick={() => onNavigate('Alerts', '/alerts')} className="text-xs font-medium text-[#1f7a52] hover:underline">
          View all
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {alerts.map((alert) => {
          const isAck = alert.status !== 'Open'
          return (
            <div key={alert.id} className={`rounded-xl border p-3 transition ${isAck ? 'border-slate-100 bg-slate-50 opacity-70' : 'border-slate-100 bg-white'}`}>
              <div className="flex gap-3">
                <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${alert.severity === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{alert.type}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">{alert.plot}</p>
                    </div>
                    <StatusBadge status={isAck ? 'Resolved' : alert.severity === 'Critical' ? 'Critical' : 'Warning'} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#587568]">{alert.current ? `${alert.current} · threshold ${alert.threshold}` : 'Condition requires review'}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{alert.triggered}</span>
                    {!isAck && (
                      <button onClick={() => onNavigate('Alerts', `/alerts/${alert.id}`)} className="text-[11px] font-semibold text-[#1f7a52] hover:underline">
                        View alert
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

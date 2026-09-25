'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronRight, Search, ShieldAlert } from 'lucide-react'
import type { Alert, AlertStatus, Severity } from '@/lib/types'
import { getAlerts, getAlertById } from '@/lib/services/alerts'
import { toAlert } from '@/lib/services/presenters'

const statusStyle = (status: AlertStatus) =>
  status === 'Open'
    ? 'border-[#f1c3bb] bg-[#fff1ef] text-[#b64232]'
    : status === 'Acknowledged'
    ? 'border-[#f2d8a6] bg-[#fff8e9] text-[#9a650e]'
    : 'border-[#cce5d2] bg-[#eff9f0] text-[#27734a]'

const severityStyle = (severity: Severity) =>
  severity === 'Critical' ? 'bg-[#fff0ee] text-[#b64232]' : 'bg-[#fff7e5] text-[#9a650e]'

function AlertRow({ alert, onStatusChange, onSelectAlert }: { alert: Alert; onStatusChange: (id: string, status: AlertStatus) => void; onSelectAlert?: (id: string) => void }) {
  return (
    <tr className="border-t border-[#edf3ee] hover:bg-[#fbfdf9]">
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${severityStyle(alert.severity)}`}>
          <span aria-hidden="true">●</span>{alert.severity}
        </span>
      </td>
      <td className="px-4 py-4">
        {onSelectAlert ? (
          <button onClick={() => onSelectAlert(alert.id)} className="text-left font-semibold text-slate-900 hover:text-[#1f7a52]">
            {alert.type}
          </button>
        ) : (
          <Link href={`/alerts/${alert.id}`} className="font-semibold text-slate-900 hover:text-[#1f7a52]">
            {alert.type}
          </Link>
        )}
        <p className="mt-1 text-xs text-slate-500">{alert.current ? `${alert.current} · threshold ${alert.threshold}` : 'Condition requires review'}</p>
      </td>
      <td className="px-4 py-4">
        <p className="text-sm font-medium text-slate-800">{alert.farm}</p>
        <p className="mt-1 text-xs text-slate-500">{alert.plot}</p>
      </td>
      <td className="px-4 py-4 text-xs font-medium text-slate-600">{alert.device}</td>
      <td className="px-4 py-4 text-xs text-slate-500">{alert.triggered}</td>
      <td className="px-4 py-4">
        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(alert.status)}`}>{alert.status}</span>
      </td>
      <td className="px-4 py-4 text-xs text-slate-500">{alert.updated}</td>
      <td className="px-5 py-4 text-right">
        {alert.status === 'Open' ? (
          <button onClick={() => onStatusChange(alert.id, 'Acknowledged')} className="rounded-lg bg-[#e6f4d8] px-2.5 py-1.5 text-xs font-semibold text-[#1f7a52] hover:bg-[#d4edb8]">
            Acknowledge
          </button>
        ) : alert.status === 'Acknowledged' ? (
          <button onClick={() => onStatusChange(alert.id, 'Resolved')} className="rounded-lg bg-[#e6f4d8] px-2.5 py-1.5 text-xs font-semibold text-[#1f7a52] hover:bg-[#d4edb8]">
            Resolve
          </button>
        ) : onSelectAlert ? (
          <button onClick={() => onSelectAlert(alert.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1f7a52]">
            View <ChevronRight className="size-3.5" />
          </button>
        ) : (
          <Link href={`/alerts/${alert.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1f7a52]">
            View <ChevronRight className="size-3.5" />
          </Link>
        )}
      </td>
    </tr>
  )
}

function AlertCard({ alert, onStatusChange, onSelectAlert }: { alert: Alert; onStatusChange: (id: string, status: AlertStatus) => void; onSelectAlert?: (id: string) => void }) {
  return (
    <article className="rounded-2xl border border-[#d7e8dc] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${severityStyle(alert.severity)}`}>{alert.severity}</span>
          {onSelectAlert ? (
            <button onClick={() => onSelectAlert(alert.id)} className="mt-3 block text-left text-base font-semibold text-slate-900 hover:text-[#1f7a52]">
              {alert.type}
            </button>
          ) : (
            <Link href={`/alerts/${alert.id}`} className="mt-3 block text-base font-semibold text-slate-900 hover:text-[#1f7a52]">
              {alert.type}
            </Link>
          )}
        </div>
        <span className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${statusStyle(alert.status)}`}>{alert.status}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-400">Farm / plot</p>
          <p className="mt-1 font-medium text-slate-700">{alert.farm}<br />{alert.plot}</p>
        </div>
        <div>
          <p className="text-slate-400">Device</p>
          <p className="mt-1 font-medium text-slate-700">{alert.device}</p>
        </div>
        <div>
          <p className="text-slate-400">Current</p>
          <p className="mt-1 font-semibold text-slate-800">{alert.current ?? 'No reading'}</p>
        </div>
        <div>
          <p className="text-slate-400">Triggered</p>
          <p className="mt-1 font-medium text-slate-700">{alert.triggered}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {alert.status === 'Open' && (
          <button onClick={() => onStatusChange(alert.id, 'Acknowledged')} className="flex-1 rounded-xl bg-[#e6f4d8] px-3 py-2.5 text-xs font-semibold text-[#1f7a52]">
            Acknowledge
          </button>
        )}
        {alert.status === 'Acknowledged' && (
          <button onClick={() => onStatusChange(alert.id, 'Resolved')} className="flex-1 rounded-xl bg-[#e6f4d8] px-3 py-2.5 text-xs font-semibold text-[#1f7a52]">
            Resolve
          </button>
        )}
        {onSelectAlert ? (
          <button onClick={() => onSelectAlert(alert.id)} className="flex flex-1 items-center justify-center rounded-xl border border-[#cfe4d2] px-3 py-2.5 text-xs font-semibold text-[#356b59]">
            View alert
          </button>
        ) : (
          <Link href={`/alerts/${alert.id}`} className="flex flex-1 items-center justify-center rounded-xl border border-[#cfe4d2] px-3 py-2.5 text-xs font-semibold text-[#356b59]">
            View alert
          </Link>
        )}
      </div>
    </article>
  )
}

export function AlertsPage({ onSelectAlert }: { onSelectAlert?: (id: string) => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadError, setLoadError] = useState('')
  useEffect(() => { getAlerts().then((rows) => setAlerts(rows.map(toAlert))).catch((error) => setLoadError(error.message)) }, [])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [severity, setSeverity] = useState('All')
  const [type, setType] = useState('All types')
  const [farm, setFarm] = useState('All farms')

  const filtered = useMemo(() =>
    alerts.filter((alert) =>
      (!query || `${alert.type} ${alert.farm} ${alert.plot} ${alert.device}`.toLowerCase().includes(query.toLowerCase())) &&
      (status === 'All' || alert.status === status) &&
      (severity === 'All' || alert.severity === severity) &&
      (type === 'All types' || alert.type === type) &&
      (farm === 'All farms' || alert.farm === farm)
    ).sort((a, b) => Number(a.status === 'Resolved') - Number(b.status === 'Resolved') || Number(a.severity === 'Warning') - Number(b.severity === 'Warning')),
  [alerts, query, status, severity, type, farm])

  const updateStatus = (_id: string, _next: AlertStatus) => setLoadError('Sign in is required to change alert status.')

  const open = alerts.filter((alert) => alert.status === 'Open').length
  const critical = alerts.filter((alert) => alert.status !== 'Resolved' && alert.severity === 'Critical').length
  const warning = alerts.filter((alert) => alert.status !== 'Resolved' && alert.severity === 'Warning').length

  return (
    <div className="flex flex-col gap-5">
      {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#2b8b61]">Operational center</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Alerts</h1>
            <p className="mt-1 text-sm text-slate-500">Monitor conditions that require attention across your farms.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#d7e8dc] bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Open Alerts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{open}</p>
        </div>
        <div className="rounded-2xl border border-[#f1c3bb] bg-[#fff8f6] p-4">
          <p className="text-xs font-medium text-[#9b5548]">Critical</p>
          <p className="mt-2 text-2xl font-semibold text-[#b64232]">{critical}</p>
        </div>
        <div className="rounded-2xl border border-[#f2d8a6] bg-[#fffaf0] p-4">
          <p className="text-xs font-medium text-[#9a650e]">Warning</p>
          <p className="mt-2 text-2xl font-semibold text-[#9a650e]">{warning}</p>
        </div>
        <div className="rounded-2xl border border-[#cce5d2] bg-[#f4fbf1] p-4">
          <p className="text-xs font-medium text-[#477558]">Resolved Today</p>
          <p className="mt-2 text-2xl font-semibold text-[#27734a]">{alerts.filter((alert) => alert.status === "Resolved").length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#d7e8dc] bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search alerts..." aria-label="Search alerts" className="h-9 w-full rounded-xl border border-[#cfe4d2] bg-[#fbfdf9] pl-9 pr-3 text-sm outline-none focus:border-[#1f7a52]" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status" className="h-9 rounded-xl border border-[#cfe4d2] bg-[#fbfdf9] px-3 text-xs font-medium text-slate-600">
          <option>All</option>
          <option>Open</option>
          <option>Acknowledged</option>
          <option>Resolved</option>
        </select>
        <select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter by severity" className="h-9 rounded-xl border border-[#cfe4d2] bg-[#fbfdf9] px-3 text-xs font-medium text-slate-600">
          <option>All</option>
          <option>Critical</option>
          <option>Warning</option>
        </select>
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by alert type" className="h-9 rounded-xl border border-[#cfe4d2] bg-[#fbfdf9] px-3 text-xs font-medium text-slate-600">
          <option>All types</option>
          {Array.from(new Set(alerts.map((alert) => alert.type))).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={farm} onChange={(event) => setFarm(event.target.value)} aria-label="Filter by farm" className="h-9 rounded-xl border border-[#cfe4d2] bg-[#fbfdf9] px-3 text-xs font-medium text-slate-600">
          <option>All farms</option>
          {Array.from(new Set(alerts.map((alert) => alert.farm))).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#d7e8dc] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-[#f4faef]">
              <tr className="text-[11px] uppercase tracking-[0.12em] text-[#587568]">
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Alert</th>
                <th className="px-4 py-3.5">Farm / Plot</th>
                <th className="px-4 py-3.5">Device</th>
                <th className="px-4 py-3.5">Triggered</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Last updated</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onStatusChange={updateStatus} onSelectAlert={onSelectAlert} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:hidden">
        {filtered.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onStatusChange={updateStatus} onSelectAlert={onSelectAlert} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-[#d7e8dc] bg-white px-6 py-12 text-center">
          <ShieldAlert className="mx-auto size-8 text-[#75a986]" />
          <p className="mt-3 text-sm font-semibold text-slate-800">No alerts match your current filters.</p>
          <p className="mt-1 text-xs text-slate-500">Clear a filter to see more alert history.</p>
        </div>
      )}
    </div>
  )
}

export function AlertDetail({ alertId, onBack }: { alertId: string; onBack?: () => void }) {
  const [alert, setAlert] = useState<Alert | null>(null)
  const [loadError, setLoadError] = useState('')
  useEffect(() => { getAlertById(alertId).then((row) => setAlert(toAlert(row))).catch((error) => setLoadError(error.message)) }, [alertId])
  if (loadError) return <p role="alert" className="text-sm text-red-700">{loadError}</p>
  if (!alert) return <p className="text-sm text-slate-500">Loading alert…</p>

  return (
    <div className="flex flex-col gap-5">
      {onBack ? (
        <button onClick={onBack} className="w-fit text-sm font-semibold text-[#1f7a52] hover:underline">
          ← Back to alerts
        </button>
      ) : (
        <Link href="/alerts" className="w-fit text-sm font-semibold text-[#1f7a52] hover:underline">
          ← Back to alerts
        </Link>
      )}
      <div className="rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${severityStyle(alert.severity)}`}>{alert.severity}</span>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">{alert.type}</h1>
            <p className="mt-1 text-sm text-slate-500">{alert.farm} · {alert.plot} · {alert.device}</p>
          </div>
          <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${statusStyle(alert.status)}`}>{alert.status}</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Current value</p>
            <p className="mt-1 font-semibold text-slate-800">{alert.current ?? 'No reading'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Configured threshold</p>
            <p className="mt-1 font-semibold text-slate-800">{alert.threshold ?? 'Configured offline window'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Triggered</p>
            <p className="mt-1 font-semibold text-slate-800">{alert.triggered}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Last updated</p>
            <p className="mt-1 font-semibold text-slate-800">{alert.updated}</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Alert timeline</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="mt-1 size-2 rounded-full bg-[#1f7a52]" />
            <div>
              <p className="text-sm font-medium text-slate-800">Alert created</p>
              <p className="text-xs text-slate-500">{alert.triggered}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="mt-1 size-2 rounded-full bg-[#b9e878]" />
            <div>
              <p className="text-sm font-medium text-slate-800">Notification sent</p>
              <p className="text-xs text-slate-500">Monitoring service</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useMemo } from 'react'
import { AlertTriangle, MapPin, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import type { Farm, FarmStatus } from '@/lib/types'
import { getFarms } from '@/lib/services/farms'
import { toFarm } from '@/lib/services/presenters'

function statusColor(status: FarmStatus) {
  if (status === 'Online') return 'bg-[#d8f2b1] text-[#245e3e] border-[#b9e5c7]'
  if (status === 'Warning') return 'bg-[#ffe4a8] text-[#9a5b08] border-[#f3d6a0]'
  if (status === 'Critical') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-[#dbe8e4] text-[#356b59] border-[#cfe4d2]'
}

function FarmsTable({ farms }: { farms: Farm[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7e8dc] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead className="bg-[#f4faef]">
            <tr className="border-b border-[#dfeee1] text-[11px] uppercase tracking-[0.12em] text-[#587568]">
              <th className="px-5 py-3.5 font-semibold">Farm</th>
              <th className="px-4 py-3.5 font-semibold">Status</th>
              <th className="px-4 py-3.5 font-semibold">Plots</th>
              <th className="px-4 py-3.5 font-semibold">Devices</th>
              <th className="px-4 py-3.5 font-semibold">Alerts</th>
              <th className="px-4 py-3.5 font-semibold">Last update</th>
              <th className="px-5 py-3.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf3ee]">
            {farms.map((farm) => (
              <tr key={farm.id} className="group transition-colors hover:bg-[#fbfdf9]">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-[#e6f4d8] text-[#1f7a52]">
                      <MapPin className="size-4" strokeWidth={2.4} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{farm.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{farm.location}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${statusColor(farm.status)}`}>
                    {farm.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-800">{farm.plots}</td>
                <td className="px-4 py-4">
                  <p className="text-sm font-semibold text-slate-800">{farm.totalDevices}</p>
                  <p className="mt-0.5 text-xs text-[#1f7a52]">
                    {farm.onlineDevices} online <span className="text-slate-400">/ {farm.offlineDevices} offline</span>
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className={`size-4 ${farm.openAlerts > 0 ? 'text-amber-600' : 'text-slate-300'}`} strokeWidth={2.3} />
                    <span className="text-sm font-semibold text-slate-800">{farm.openAlerts}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-slate-500">{farm.lastUpdate}</td>
                <td className="px-5 py-4 text-right">
                  <Link href={`/farms/${farm.id}`} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1f7a52] transition hover:bg-[#e6f4d8]">
                    View farm
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [loadError, setLoadError] = useState('')
  useEffect(() => { getFarms().then((rows) => setFarms(rows.map(toFarm))).catch((error) => setLoadError(error.message)) }, [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FarmStatus | 'All'>('All')

  const filtered = useMemo(() => {
    return farms.filter((farm) => {
      const matchesSearch = farm.name.toLowerCase().includes(search.toLowerCase()) || farm.location.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || farm.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [farms, search, statusFilter])

  return (
    <div className="flex flex-col gap-6">
      {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Farms</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor and manage your farms and their connected devices.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-[#1f7a52] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#156b43] sm:whitespace-nowrap">
          <Plus className="size-4" />
          Add Farm
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search farms by name or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farms, locations..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm outline-none transition focus:border-[#7dbb98] focus:bg-white focus:ring-2 focus:ring-[#dcefe3]"
          />
        </div>
        <div className="flex gap-2">
          {(['All', 'Online', 'Warning', 'Offline'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                statusFilter === status
                  ? 'border-[#1f7a52] bg-[#f0faf6] text-[#1f7a52]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
          <h3 className="text-sm font-semibold text-slate-600">No farms found</h3>
          <p className="mt-1 text-xs text-slate-500">Adjust your search or filters to find farms.</p>
        </div>
      ) : (
        <FarmsTable farms={filtered} />
      )}
    </div>
  )
}

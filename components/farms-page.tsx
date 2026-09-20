'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, ChevronRight, Clock, MapPin, Plus, Search, Wifi, X } from 'lucide-react'

type FarmStatus = 'Online' | 'Warning' | 'Critical' | 'Offline'

type Farm = {
  id: string
  name: string
  location: string
  plots: number
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  openAlerts: number
  lastUpdate: string
  status: FarmStatus
}

const farmsData: Farm[] = [
  { id: 'gef', name: 'Green Eden Farm', location: 'Jos, Plateau State', plots: 12, totalDevices: 8, onlineDevices: 7, offlineDevices: 1, openAlerts: 3, lastUpdate: '2 min ago', status: 'Warning' },
  { id: 'nvf', name: 'North Valley Farm', location: 'Kaduna, Kaduna State', plots: 8, totalDevices: 6, onlineDevices: 6, offlineDevices: 0, openAlerts: 0, lastUpdate: '1 min ago', status: 'Online' },
  { id: 'sdf', name: 'Sunrise Demonstration Farm', location: 'Kano, Kano State', plots: 15, totalDevices: 10, onlineDevices: 9, offlineDevices: 1, openAlerts: 1, lastUpdate: '5 min ago', status: 'Warning' },
  { id: 'jrp', name: 'Jos Research Plot', location: 'Jos, Plateau State', plots: 6, totalDevices: 4, onlineDevices: 4, offlineDevices: 0, openAlerts: 0, lastUpdate: '3 min ago', status: 'Online' },
]

function statusColor(status: FarmStatus) {
  if (status === 'Online') return 'bg-[#d8f2b1] text-[#245e3e] border-[#b9e5c7]'
  if (status === 'Warning') return 'bg-[#ffe4a8] text-[#9a5b08] border-[#f3d6a0]'
  if (status === 'Critical') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-[#dbe8e4] text-[#356b59] border-[#cfe4d2]'
}

function FarmCard({ farm }: { farm: Farm }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{farm.name}</h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="size-3.5" />
            {farm.location}
          </div>
        </div>
        <div className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${statusColor(farm.status)}`}>
          {farm.status}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <div>
          <p className="text-2xl font-semibold text-slate-900">{farm.plots}</p>
          <p className="mt-0.5 text-xs text-slate-500">Plots</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-900">{farm.totalDevices}</p>
          <p className="mt-0.5 text-xs text-slate-500">Devices</p>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold text-slate-900">{farm.onlineDevices}</span>
            <span className="text-xs text-slate-500">online</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-lg font-semibold text-slate-900">{farm.offlineDevices}</span>
            <span className="text-xs text-slate-500">offline</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <AlertTriangle className={`size-4 ${farm.openAlerts > 0 ? 'text-amber-600' : 'text-slate-300'}`} />
            <span className="text-lg font-semibold text-slate-900">{farm.openAlerts}</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Alerts</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="size-3.5" />
          {farm.lastUpdate}
        </div>
        <button className="text-xs font-semibold text-[#1f7a52] hover:text-[#156b43] transition">
          View Farm <ChevronRight className="ml-1 inline size-3.5" />
        </button>
      </div>
    </div>
  )
}

export function FarmsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FarmStatus | 'All'>('All')

  const filtered = useMemo(() => {
    return farmsData.filter((farm) => {
      const matchesSearch = farm.name.toLowerCase().includes(search.toLowerCase()) || farm.location.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || farm.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter])

  return (
    <div className="flex flex-col gap-6">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {filtered.map((farm) => (
            <FarmCard key={farm.id} farm={farm} />
          ))}
        </div>
      )}
    </div>
  )
}

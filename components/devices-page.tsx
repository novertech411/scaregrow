'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BatteryMedium, Check, ChevronRight, MoreHorizontal, Plus, Search, SlidersHorizontal, Wifi, X } from 'lucide-react'
import type { Device, DeviceStatus } from '@/lib/types'
import { getDevices } from '@/lib/services/devices'
import { toDevice } from '@/lib/services/presenters'

function statusStyle(status: DeviceStatus) {
  if (status === 'Online') return 'border-[#b9e5c7] bg-[#d8f2b1] text-[#245e3e]'
  if (status === 'Warning') return 'border-[#f3d6a0] bg-[#ffe4a8] text-[#9a5b08]'
  if (status === 'Sensor fault') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-[#cfe4d2] bg-[#dbe8e4] text-[#356b59]'
}

function StatusBadge({ status }: { status: DeviceStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(status)}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>
}

function Battery({ value }: { value: number }) {
  return <div className="flex items-center gap-2"><BatteryMedium className={`size-4 ${value < 40 ? 'text-amber-600' : 'text-[#1f7a52]'}`} strokeWidth={2.3} /><span className={`text-sm font-semibold ${value < 40 ? 'text-amber-700' : 'text-slate-800'}`}>{Number.isFinite(value) ? `${value}%` : '—'}</span></div>
}

function AddDeviceModal({ onClose, onAdd }: { onClose: () => void; onAdd: (device: Device) => void }) {
  const [id, setId] = useState('')
  const [farm, setFarm] = useState('Green Eden Farm')
  const [plot, setPlot] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim() || !plot.trim()) return
    onAdd({
      id: id.trim(),
      farm,
      plot: plot.trim(),
      status: 'Online',
      battery: 100,
      signal: '-75 dBm',
      firmware: 'v1.0.0',
      lastSeen: 'Just now',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="add-device-title" className="w-full max-w-md rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="add-device-title" className="text-lg font-semibold text-slate-900">Add Device</h2>
            <p className="mt-1 text-sm text-slate-500">Connect a Greener field monitoring node.</p>
          </div>
          <button aria-label="Close add device dialog" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-3">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
            Device ID
            <input required value={id} onChange={(e) => setId(e.target.value)} placeholder="SG-JOS-005" className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-[#7dbb98] focus:ring-2 focus:ring-[#dcefe3]" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
            Farm
            <select value={farm} onChange={(e) => setFarm(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#7dbb98]">
              <option>Green Eden Farm</option>
              <option>North Valley Farm</option>
              <option>Sunrise Demonstration Farm</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
            Plot
            <input required value={plot} onChange={(e) => setPlot(e.target.value)} placeholder="North Field A1" className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-[#7dbb98] focus:ring-2 focus:ring-[#dcefe3]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Firmware
              <input defaultValue="v1.0.0" className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Interval
              <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none">
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>60 minutes</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-xl bg-[#1f7a52] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#156b43]">Add Device</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeviceTable({ items, onSelect }: { items: Device[]; onSelect: (id: string) => void }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-[#d7e8dc] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse text-left">
          <thead className="bg-[#f4faef]">
            <tr className="border-b border-[#dfeee1] text-[11px] uppercase tracking-[0.12em] text-[#587568]">
              <th className="px-5 py-3.5">Device</th>
              <th className="px-4 py-3.5">Farm / plot</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Battery</th>
              <th className="px-4 py-3.5">Signal</th>
              <th className="px-4 py-3.5">Firmware</th>
              <th className="px-4 py-3.5">Last seen</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf3ee]">
            {items.map((device) => (
              <tr key={device.id} onClick={() => onSelect(device.id)} className="cursor-pointer transition-colors hover:bg-[#fbfdf9]">
                <td className="px-5 py-4">
                  <span className="font-semibold text-slate-900 hover:text-[#1f7a52]">{device.id}</span>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm font-medium text-slate-800">{device.farm}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{device.plot}</p>
                </td>
                <td className="px-4 py-4"><StatusBadge status={device.status} /></td>
                <td className="px-4 py-4"><Battery value={device.battery} /></td>
                <td className="px-4 py-4 text-sm text-slate-600">{device.signal}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{device.firmware}</td>
                <td className="px-4 py-4 text-xs text-slate-500">{device.lastSeen}</td>
                <td className="px-5 py-4 text-right">
                  <button aria-label={`Actions for ${device.id}`} onClick={(e) => { e.stopPropagation(); onSelect(device.id); }} className="rounded-lg p-2 text-slate-400 hover:bg-[#e6f4d8] hover:text-[#1f7a52]">
                    <MoreHorizontal className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DeviceCards({ items, onSelect }: { items: Device[]; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:hidden">
      {items.map((device) => (
        <div key={device.id} onClick={() => onSelect(device.id)} className="cursor-pointer rounded-2xl border border-[#d7e8dc] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#7dbb98]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{device.id}</p>
              <p className="mt-1 text-xs text-slate-500">{device.farm}</p>
              <p className="text-xs text-slate-500">{device.plot}</p>
            </div>
            <StatusBadge status={device.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <p className="text-[11px] text-slate-400">Battery</p>
              <Battery value={device.battery} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Last seen</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{device.lastSeen}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Signal</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{device.signal}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Firmware</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{device.firmware}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end text-xs font-semibold text-[#1f7a52]">
            View device <ChevronRight className="ml-1 size-3.5" />
          </div>
        </div>
      ))}
    </div>
  )
}

function DeviceDetailView({ device, onBack }: { device: Device; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="w-fit text-sm font-semibold text-[#1f7a52] hover:underline">
        ← Back to devices
      </button>
      <div className="rounded-2xl border border-[#d7e8dc] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{device.id}</h1>
              <StatusBadge status={device.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{device.farm} · {device.plot}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              Calibrate Sensors
            </button>
            <button className="rounded-xl bg-[#1f7a52] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#156b43]">
              Device Settings
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="text-xs text-slate-400">Battery Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{Number.isFinite(device.battery) ? `${device.battery}%` : '—'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="text-xs text-slate-400">Signal Strength</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{device.signal}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="text-xs text-slate-400">Firmware Version</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{device.firmware}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="text-xs text-slate-400">Last Telemetry</p>
            <p className="mt-2 text-lg font-semibold text-slate-800">{device.lastSeen}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DevicesPage({ selectedDeviceId, onSelectDevice }: { selectedDeviceId?: string; onSelectDevice?: (id: string | null) => void }) {
  const [deviceList, setDeviceList] = useState<Device[]>([])
  const [loadError, setLoadError] = useState('')
  useEffect(() => { getDevices().then((rows) => setDeviceList(rows.map(toDevice))).catch((error) => setLoadError(error.message)) }, [])
  const [search, setSearch] = useState('')
  const [farm, setFarm] = useState('All')
  const [status, setStatus] = useState('All')
  const [battery, setBattery] = useState('All')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(selectedDeviceId ?? null)

  const activeSelectedId = selectedDeviceId ?? localSelectedId

  const handleSelect = (id: string | null) => {
    if (onSelectDevice) {
      onSelectDevice(id)
    } else {
      setLocalSelectedId(id)
    }
  }

  const selectedDevice = useMemo(() => deviceList.find((d) => d.id === activeSelectedId), [deviceList, activeSelectedId])

  const filtered = useMemo(() => deviceList.filter((device) =>
    [device.id, device.farm, device.plot].join(' ').toLowerCase().includes(search.toLowerCase()) &&
    (farm === 'All' || device.farm === farm) &&
    (status === 'All' || device.status === status) &&
    (battery === 'All' || (battery === 'Low' ? Number.isFinite(device.battery) && device.battery < 40 : Number.isFinite(device.battery) && device.battery >= 40))
  ), [deviceList, search, farm, status, battery])

  const online = deviceList.filter((device) => device.status === 'Online').length
  const offline = deviceList.filter((device) => device.status === 'Offline').length
  const lowBattery = deviceList.filter((device) => Number.isFinite(device.battery) && device.battery < 40).length

  if (selectedDevice) {
    return <DeviceDetailView device={selectedDevice} onBack={() => handleSelect(null)} />
  }

  return (
    <div className="flex flex-col gap-6">
      {isAddOpen && <AddDeviceModal onClose={() => setIsAddOpen(false)} onAdd={() => { setIsAddOpen(false); setLoadError('Device provisioning is not available yet.') }} />}{loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Devices</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor the health and connectivity of your Greener field devices.</p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#1f7a52] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#156b43] sm:whitespace-nowrap">
          <Plus className="size-4" />Add Device
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard title="Total Devices" value={deviceList.length} tone="bg-[#e6f4d8] text-[#1f7a52]" icon={Wifi} />
        <SummaryCard title="Online" value={online} tone="bg-[#d8f2b1] text-[#245e3e]" icon={Check} />
        <SummaryCard title="Offline" value={offline} tone="bg-[#dbe8e4] text-[#356b59]" icon={Wifi} />
        <SummaryCard title="Low Battery" value={lowBattery} tone="bg-[#ffe4a8] text-[#9a5b08]" icon={BatteryMedium} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#d7e8dc] bg-white/70 p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search devices" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search devices..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm outline-none focus:border-[#7dbb98] focus:bg-white focus:ring-2 focus:ring-[#dcefe3]" />
        </div>
        <select aria-label="Filter by farm" value={farm} onChange={(event) => setFarm(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none">
          <option>All</option>
          <option>Green Eden Farm</option>
          <option>North Valley Farm</option>
          <option>Sunrise Demonstration Farm</option>
        </select>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none">
          <option>All</option>
          <option>Online</option>
          <option>Warning</option>
          <option>Offline</option>
          <option>Sensor fault</option>
        </select>
        <select aria-label="Filter by battery" value={battery} onChange={(event) => setBattery(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none">
          <option>All</option>
          <option>Low</option>
          <option>Normal</option>
        </select>
      </div>

      {filtered.length ? (
        <>
          <DeviceTable items={filtered} onSelect={handleSelect} />
          <DeviceCards items={filtered} onSelect={handleSelect} />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
          <h3 className="text-sm font-semibold text-slate-700">No devices connected yet.</h3>
          <p className="mt-1 text-xs text-slate-500">Add a Greener field device to start monitoring soil conditions.</p>
          <button onClick={() => setIsAddOpen(true)} className="mt-4 rounded-xl bg-[#1f7a52] px-4 py-2 text-xs font-semibold text-white">Add Device</button>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, tone, icon: Icon }: { title: string; value: number; tone: string; icon: typeof Wifi }) {
  return (
    <div className="rounded-2xl border border-[#d7e8dc] bg-gradient-to-br from-white via-white to-[#eff9e8] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`flex size-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="size-[18px]" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  )
}

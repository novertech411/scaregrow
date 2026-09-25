'use client'

import dynamic from 'next/dynamic'
import { PanelLoading } from '@/components/ui/page-loading'
import { ChevronRight, Map, X } from 'lucide-react'
import type { PageKey, Reading } from '@/lib/types'
import type { MapDevice } from '@/lib/services/map-devices'

const FarmMapLeaflet = dynamic(() => import('./farm-map-leaflet'), {
  ssr: false,
  loading: () => <PanelLoading label="Loading map…" className="h-full min-h-[430px]" />,
})

export function FarmMap({ readings, devices, selectedPlot, setSelectedPlot, onNavigate }: {
  readings: Reading[]
  devices: MapDevice[]
  selectedPlot: Reading | null
  setSelectedPlot: (reading: Reading | null) => void
  onNavigate: (page: PageKey, path: string) => void
}) {
  return (
    <section className="relative isolate z-0 min-h-[430px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="absolute inset-0 z-0"><FarmMapLeaflet devices={devices} onSelectDevice={(id) => setSelectedPlot(readings.find((reading) => reading.device === id) ?? null)} /></div>
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
        <Map className="size-3.5 text-[#1f7a52]" />
        Green Eden Farm
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
        <span className="font-semibold text-slate-800">{new Set(devices.map((device) => device.plot?.name).filter(Boolean)).size} plots</span>
        <span className="mx-2 text-slate-300">•</span>
        <span>{devices.length} devices</span>
      </div>
      {selectedPlot && (
        <div className="absolute bottom-4 right-4 w-[min(290px,calc(100%-32px))] rounded-2xl border border-white/60 bg-slate-950/80 p-4 text-white shadow-xl backdrop-blur-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">{selectedPlot.plot}</p>
              <p className="mt-0.5 text-[11px] text-white/60">{selectedPlot.crop} · {selectedPlot.device}</p>
            </div>
            <button aria-label="Close plot details" className="text-white/60 hover:text-white" onClick={() => setSelectedPlot(null)}><X className="size-4" /></button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/10 py-3">
            <div><p className="text-lg font-semibold">{selectedPlot.moisture}%</p><p className="text-[10px] text-white/55">Moisture</p></div>
            <div><p className="text-lg font-semibold">{selectedPlot.temperature}°</p><p className="text-[10px] text-white/55">Temperature</p></div>
            <div><p className="text-lg font-semibold">{selectedPlot.ph}</p><p className="text-[10px] text-white/55">pH level</p></div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]"><span className="text-white/55">Last update</span><span>{selectedPlot.updated}</span></div>
          <button onClick={() => onNavigate('Readings', '/readings')} className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-emerald-50">
            View Plot Details <ChevronRight className="ml-1 inline size-3.5" />
          </button>
        </div>
      )}
    </section>
  )
}

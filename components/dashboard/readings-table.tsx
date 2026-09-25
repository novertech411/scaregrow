'use client'

import { SlidersHorizontal } from 'lucide-react'
import type { Reading } from '@/lib/types'
import { StatusBadge } from '@/components/ui/status-badge'

export function ReadingsTable({ rows, onSelect }: { rows: Reading[]; onSelect: (reading: Reading) => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Latest Readings</h2>
          <p className="mt-1 text-xs text-slate-400">Current conditions from connected devices</p>
        </div>
        <button className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:flex">
          <SlidersHorizontal className="size-3.5" />Filter
        </button>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3">Farm / Plot</th>
              <th className="px-3 py-3">Crop</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Moisture</th>
              <th className="px-3 py-3">Temp.</th>
              <th className="px-3 py-3">pH</th>
              <th className="px-3 py-3">EC</th>
              <th className="px-5 py-3 text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.device} onClick={() => onSelect(row)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-[#f7fbf8]">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-slate-800">{row.plot}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{row.device}</p>
                </td>
                <td className="px-3 py-3.5 text-slate-600">{row.crop}</td>
                <td className="px-3 py-3.5"><StatusBadge status={row.status} /></td>
                <td className={`px-3 py-3.5 font-medium ${row.moisture < 25 ? 'text-amber-700' : 'text-slate-700'}`}>{row.moisture}%</td>
                <td className="px-3 py-3.5 text-slate-700">{row.temperature}°C</td>
                <td className="px-3 py-3.5 text-slate-700">{row.ph}</td>
                <td className="px-3 py-3.5 text-slate-700">{row.ec} <span className="text-xs text-slate-400">µS</span></td>
                <td className="px-5 py-3.5 text-right text-xs text-slate-400">{row.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 p-3 md:hidden">
        {rows.map((row) => (
          <button key={row.device} onClick={() => onSelect(row)} className="rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">{row.plot}</p>
                <p className="mt-0.5 text-xs text-slate-400">{row.crop} · {row.device}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-xs">
              <div>
                <p className="text-slate-400">Moisture</p>
                <p className="mt-1 font-semibold text-slate-700">{row.moisture}%</p>
              </div>
              <div>
                <p className="text-slate-400">Temp.</p>
                <p className="mt-1 font-semibold text-slate-700">{row.temperature}°C</p>
              </div>
              <div>
                <p className="text-slate-400">pH</p>
                <p className="mt-1 font-semibold text-slate-700">{row.ph}</p>
              </div>
              <div>
                <p className="text-slate-400">Updated</p>
                <p className="mt-1 font-semibold text-slate-700">{row.updated}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

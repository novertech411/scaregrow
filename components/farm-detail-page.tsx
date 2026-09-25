'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getFarmById } from '@/lib/services/farms'

type FarmDetail = {
  id: string
  name: string
  location: string | null
  owner?: string | null
  plots?: { id: string; name: string; crop: string | null; soil_profile: string | null; planting_date: string | null }[]
  devices?: { id: string; plot_id: string | null; status: string | null; last_seen: string | null }[]
}

export function FarmDetailPage({ farmId }: { farmId: string }) {
  const [farm, setFarm] = useState<FarmDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getFarmById(farmId)
      .then((data) => { if (active) { setFarm(data as FarmDetail); setError('') } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load farm.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [farmId])

  if (loading) return <p className="text-sm text-slate-500">Loading farm…</p>
  if (error) return <div><Link href="/farms" className="text-sm font-semibold text-[#1f7a52] hover:underline">← Back to farms</Link><p role="alert" className="mt-4 text-sm text-red-700">{error}</p></div>
  if (!farm) return <p className="text-sm text-slate-500">Farm not found.</p>

  return (
    <div className="flex flex-col gap-5">
      <Link href="/farms" className="w-fit text-sm font-semibold text-[#1f7a52] hover:underline">← Back to farms</Link>
      <section className="rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{farm.name}</h1>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div><p className="text-xs text-slate-400">Location</p><p className="mt-1 font-medium text-slate-800">{farm.location || 'Not recorded'}</p></div>
          <div><p className="text-xs text-slate-400">Owner</p><p className="mt-1 font-medium text-slate-800">{farm.owner || 'Not recorded'}</p></div>
        </div>
      </section>
      <section className="rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Plots</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(farm.plots ?? []).map((plot) => (
            <div key={plot.id} className="rounded-xl border border-[#edf3ee] bg-[#fbfdf9] p-4">
              <h3 className="font-semibold text-slate-900">{plot.name}</h3>
              <dl className="mt-3 grid gap-2 text-xs text-slate-600">
                <div><dt className="text-slate-400">Crop</dt><dd>{plot.crop || 'Not recorded'}</dd></div>
                <div><dt className="text-slate-400">Soil profile</dt><dd>{plot.soil_profile || 'Not recorded'}</dd></div>
                <div><dt className="text-slate-400">Planting date</dt><dd>{plot.planting_date ? new Date(plot.planting_date).toLocaleDateString() : 'Not recorded'}</dd></div>
              </dl>
              <Link href={`/readings?plot=${encodeURIComponent(plot.name)}`} className="mt-3 inline-block text-xs font-semibold text-[#1f7a52] hover:underline">View readings →</Link>
            </div>
          ))}
        </div>
        {!farm.plots?.length && <p className="mt-4 text-sm text-slate-500">No plots are assigned to this farm.</p>}
      </section>
      <section className="rounded-2xl border border-[#d7e8dc] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Devices</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(farm.devices ?? []).map((device) => (
            <Link key={device.id} href={`/devices/${encodeURIComponent(device.id)}`} className="rounded-xl border border-[#edf3ee] bg-[#fbfdf9] p-4 hover:border-[#7dbb98]">
              <p className="font-semibold text-slate-900">{device.id}</p>
              <p className="mt-1 text-xs text-slate-500">{farm.plots?.find((plot) => plot.id === device.plot_id)?.name ?? 'Unknown plot'} · {device.status ?? 'Unknown status'}</p>
              <p className="mt-3 text-xs font-semibold text-[#1f7a52]">View device →</p>
            </Link>
          ))}
        </div>
        {!farm.devices?.length && <p className="mt-4 text-sm text-slate-500">No devices are assigned to this farm.</p>}
      </section>
    </div>
  )
}

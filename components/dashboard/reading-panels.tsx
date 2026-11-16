import type { SensorReadingRow } from '@/lib/supabase/database.types'
import { readingTime } from '@/lib/dashboard/overview'
import { formatMeasurement, formatRelative, formatTimestamp, measurementsFor } from '@/lib/measurements'

const groups = [{ key: 'soil', label: 'Soil' }, { key: 'nutrients', label: 'Nutrients' }, { key: 'air', label: 'Air / light' }, { key: 'estimates', label: 'Estimates' }] as const

export function MeasurementGroups({ full, hardwareVersion }: { full: SensorReadingRow | null; hardwareVersion: string | null }) {
  return (
    <section aria-label="Latest full sensor reading" className="overflow-hidden rounded-2xl border border-[#d7e8dc] bg-white shadow-sm">
      <div className="border-b border-[#edf3ee] px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Latest full reading</h2><p className="mt-1 text-xs text-slate-500">{full ? <>Measured {formatTimestamp(readingTime(full))}{!full.measured_at && ' (receipt time)'} · Received {formatRelative(full.received_at)}</> : 'No full sensor reading received yet. Measurements are unavailable.'}</p></div>
      {groups.map((group) => {
        const metrics = measurementsFor(hardwareVersion).filter((metric) => metric.group === group.key)
        if (!metrics.length) return null
        return <section key={group.key} aria-label={group.label} className="grid gap-3 border-b border-[#edf3ee] px-5 py-5 last:border-0 lg:grid-cols-[110px_1fr]">
          <div><h3 className="pt-1 text-xs font-semibold uppercase tracking-wider text-[#587568]">{group.label}</h3>{group.key === 'estimates' && <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-[#1f7a52]">ⓘ Estimated</summary><ul className="mt-2 space-y-2">{metrics.map((metric) => <li key={metric.key}>{metric.shortLabel}: {metric.formulaNote}</li>)}</ul></details>}</div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">{metrics.map((metric) => <div key={metric.key} className="min-w-0"><dt className="text-xs text-slate-500">{metric.isEstimate ? metric.label : metric.group === 'nutrients' ? `${metric.shortLabel} · ${metric.label}` : metric.key === 'soil_ec_us_cm' ? 'EC' : metric.label}</dt><dd className="mt-2 break-words text-lg font-semibold tracking-tight text-slate-900 tabular-nums sm:text-xl">{formatMeasurement(full?.[metric.key], metric.key)}</dd></div>)}</dl>
        </section>
      })}
    </section>
  )
}

export function RecentReadings({ rows, hardwareVersion }: { rows: SensorReadingRow[]; hardwareVersion: string | null }) {
  const columns = measurementsFor(hardwareVersion)
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-[#d7e8dc] bg-white shadow-sm">
    <div className="border-b border-[#edf3ee] px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Last 10 readings</h2><p className="mt-1 text-xs text-slate-500">Full sensor readings, newest received first.</p></div>
    {rows.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">No readings received yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-xs"><caption className="sr-only">Last 10 readings. Measurement time is shown when available; otherwise receipt time.</caption><thead className="bg-[#f4faef] text-[#587568]"><tr><th scope="col" className="px-5 py-3 font-medium">Measurement time</th><th scope="col" className="px-3 py-3 font-medium">Packet</th>{columns.map((metric) => <th key={metric.key} scope="col" className="px-3 py-3 font-medium">{metric.shortLabel}</th>)}</tr></thead><tbody className="divide-y divide-[#edf3ee]">{rows.map((row) => <tr key={row.id} className="text-slate-700 hover:bg-[#fbfdf9]"><td className="px-5 py-3.5"><time dateTime={readingTime(row)}>{formatTimestamp(readingTime(row))}</time>{!row.measured_at && <span className="mt-1 block text-[10px] text-slate-500">Receipt time</span>}</td><td className="px-3 py-3.5">{row.packet_type === 'sensor' ? 'Full sensor' : 'Moisture'}</td>{columns.map((metric) => <td key={metric.key} className="whitespace-nowrap px-3 py-3.5 font-medium tabular-nums">{formatMeasurement(row[metric.key], metric.key)}</td>)}</tr>)}</tbody></table></div>}
  </section>
}

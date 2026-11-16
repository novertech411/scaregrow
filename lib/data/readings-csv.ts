import { measurements } from '@/lib/measurements'
import { getReadingHistory, type ReadingFilters } from '@/lib/data/sensor-readings'
import type { SensorReadingRow } from '@/lib/supabase/database.types'

export const CSV_EXPORT_LIMIT = 50000
export const CSV_LIMIT_MESSAGE = 'Export limited to the first 50,000 rows — narrow the date range.'
export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
export function readingsCsv(rows: readonly SensorReadingRow[]): string {
  const header = ['received_at', 'measured_at', 'device_id', 'packet_type', 'cycle', ...measurements.map((metric) => `${metric.key} (${metric.unit})`)]
  return '\uFEFF' + [header, ...rows.map((row) => [row.received_at, row.measured_at, row.device_id, row.packet_type, row.cycle, ...measurements.map((metric) => row[metric.key])])].map((cells) => cells.map(csvCell).join(',')).join('\r\n')
}
export function readingsCsvFilename(deviceId: string, date = new Date()): string {
  const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  return `greener-${deviceId.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')}-${day}.csv`
}
export async function exportReadingsCsv(filters: ReadingFilters, { signal, onProgress }: { signal?: AbortSignal; onProgress?: (rows: number) => void } = {}) {
  const rows: SensorReadingRow[] = []
  signal?.throwIfAborted()
  onProgress?.(0)
  while (rows.length < CSV_EXPORT_LIMIT) {
    const limit = Math.min(1000, CSV_EXPORT_LIMIT - rows.length)
    const page = await getReadingHistory({ ...filters, limit, offset: rows.length, ascending: true }, signal)
    signal?.throwIfAborted()
    rows.push(...page.slice(0, limit))
    onProgress?.(rows.length)
    if (page.length < limit) break
  }
  return { csv: readingsCsv(rows), rowCount: rows.length, limited: rows.length === CSV_EXPORT_LIMIT }
}

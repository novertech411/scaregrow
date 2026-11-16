import { measurements, type MeasurementKey } from '@/lib/measurements'
import type { SensorReadingRow } from '@/lib/supabase/database.types'

export type OverviewRange = '24h' | '7d'
export function overviewWindow(range: OverviewRange, now = new Date()) {
  return { from: new Date(now.getTime() - (range === '7d' ? 7 : 1) * 86400000).toISOString(), to: now.toISOString() }
}
export function latestMoisture(full: SensorReadingRow | null, moisture: SensorReadingRow | null): SensorReadingRow | null {
  if (!full) return moisture
  if (!moisture) return full
  const difference = Date.parse(moisture.received_at) - Date.parse(full.received_at)
  return difference > 0 || (difference === 0 && moisture.id > full.id) ? moisture : full
}
export function readingTime(row: SensorReadingRow): string {
  return row.measured_at && Number.isFinite(Date.parse(row.measured_at)) ? row.measured_at : row.received_at
}
export const CHART_REFRESH_MS = 5 * 60 * 1000
export function shouldRefreshChart(lastFetchedAt: number | null, now: number): boolean {
  return lastFetchedAt === null || now - lastFetchedAt >= CHART_REFRESH_MS
}
export type MeasurementPoint = { id: number; time: number; value: number | null; receivedAt: string }
export function measurementPoints(rows: SensorReadingRow[], key: MeasurementKey): MeasurementPoint[] {
  return rows.map((row) => ({
    id: row.id, time: Date.parse(readingTime(row)), receivedAt: row.received_at,
    value: row[key] != null && Number.isFinite(row[key]) ? row[key] : null,
  })).filter((point) => Number.isFinite(point.time))
}
export function chartDomain(key: MeasurementKey): [number, number] | ['auto', 'auto'] {
  if (key === 'soil_ph') return [0, 14]
  return measurements.find((metric) => metric.key === key)?.unit.startsWith('%') ? [0, 100] : ['auto', 'auto']
}

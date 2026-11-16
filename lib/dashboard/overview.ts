import type { SensorReadingRow } from '@/lib/supabase/database.types'

export type OverviewRange = '24h' | '7d'
export type MoisturePoint = { id: number; time: number; moisture: number | null; receivedAt: string }
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
export function moisturePoints(rows: SensorReadingRow[]): MoisturePoint[] {
  return rows.map((row) => ({
    id: row.id, time: Date.parse(readingTime(row)), receivedAt: row.received_at,
    moisture: row.soil_moisture_pct !== null && Number.isFinite(row.soil_moisture_pct) ? row.soil_moisture_pct : null,
  })).filter((point) => Number.isFinite(point.time)).sort((a, b) => a.time - b.time || a.id - b.id)
}

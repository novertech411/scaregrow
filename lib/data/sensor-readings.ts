import { createClient } from '@/lib/supabase/client'
import type { SensorReadingRow } from '@/lib/supabase/database.types'

export type ReadingFilters = { deviceId: string; from?: string; to?: string; packetType?: SensorReadingRow['packet_type'] }
export type ReadingHistoryOptions = ReadingFilters & { limit: number; offset: number; ascending?: boolean }
function filtered(filters: ReadingFilters, count = false) {
  let query = createClient().from('sensor_readings').select('*', count ? { count: 'exact', head: true } : {}).eq('device_id', filters.deviceId)
  if (filters.from) query = query.gte('received_at', filters.from)
  if (filters.to) query = query.lte('received_at', filters.to)
  if (filters.packetType) query = query.eq('packet_type', filters.packetType)
  return query
}
async function latest(deviceId: string, packetType: SensorReadingRow['packet_type'], signal?: AbortSignal) {
  let query = filtered({ deviceId, packetType }).order('received_at', { ascending: false }).order('id', { ascending: false }).limit(1)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}
export function getLatestFullReading(deviceId: string, signal?: AbortSignal) { return latest(deviceId, 'sensor', signal) }
export function getLatestMoistureReading(deviceId: string, signal?: AbortSignal) { return latest(deviceId, 'moisture', signal) }
export async function getReadingHistory(options: ReadingHistoryOptions, signal?: AbortSignal) {
  const { limit, offset, ascending = false } = options
  let query = filtered(options).order('received_at', { ascending }).order('id', { ascending }).range(offset, offset + limit - 1)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
export async function getReadingCount(filters: ReadingFilters, signal?: AbortSignal) {
  let query = filtered(filters, true)
  if (signal) query = query.abortSignal(signal)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}
export async function listMyReadingDevices(signal?: AbortSignal) {
  let query = createClient().rpc('my_reading_devices')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

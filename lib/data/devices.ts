import { createClient } from '@/lib/supabase/client'
import type { DeviceRow, FarmRow } from '@/lib/supabase/database.types'

export type DeviceWithFarm = DeviceRow & { farm: Pick<FarmRow, 'id' | 'name' | 'location'> | null }
const select = '*, farm:farms!devices_farm_id_fkey(id,name,location)'

export async function listMyDevices(signal?: AbortSignal): Promise<DeviceWithFarm[]> {
  let query = createClient().from('devices').select(select).order('device_id')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getDevice(deviceId: string, signal?: AbortSignal): Promise<DeviceWithFarm | null> {
  let query = createClient().from('devices').select(select).eq('device_id', deviceId)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export async function updateDeviceDisplayName(deviceId: string, name: string | null, signal?: AbortSignal): Promise<DeviceRow | null> {
  let query = createClient().from('devices').update({ display_name: name }).eq('device_id', deviceId).select('*')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

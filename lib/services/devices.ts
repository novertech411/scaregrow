import { createClient } from '@/lib/supabase/client'

export async function getDevices() {
  const { data, error } = await createClient().from('devices').select('*, id:device_id, farm:farms (id, name), plot:plots (id, name)').order('device_id')
  if (error) throw error
  return data
}

export async function getDeviceById(deviceId: string) {
  const { data, error } = await createClient().from('devices').select('*, id:device_id, farm:farms (id, name, location), plot:plots (id, name, crop)').eq('device_id', deviceId).single()
  if (error) throw error
  return data
}

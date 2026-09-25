import { createClient } from '@/lib/supabase/client'

export async function getDevices() {
  const { data, error } = await createClient().from('devices').select('*, farm:farms (id, name), plot:plots (id, name)').order('id')
  if (error) throw error
  return data
}

export async function getDeviceById(deviceId: string) {
  const { data, error } = await createClient().from('devices').select('*, farm:farms (id, name, location), plot:plots (id, name, crop)').eq('id', deviceId).single()
  if (error) throw error
  return data
}

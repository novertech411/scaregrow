import { createClient } from '@/lib/supabase/client'

export type MapDevice = {
  id: string
  status: string
  farm: { name: string; latitude: number | null; longitude: number | null } | null
  plot: { name: string } | null
}

export async function getMapDevices(): Promise<MapDevice[]> {
  const { data, error } = await createClient()
    .from('devices')
    .select('id:device_id, status, farm:farms (name, latitude, longitude), plot:plots (name)')
    .order('device_id')
  if (error) throw error
  return data as MapDevice[]
}

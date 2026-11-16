import { createClient } from '@/lib/supabase/client'

export async function getFarms() {
  const { data, error } = await createClient().from('farms').select('*, plots (*), devices (*, id:device_id), alerts (id, status)').order('name')
  if (error) throw error
  return data
}

export async function getFarmById(farmId: string) {
  const { data, error } = await createClient().from('farms').select('*, plots (*, threshold_configurations (*)), devices (*, id:device_id)').eq('id', farmId).single()
  if (error) throw error
  return data
}

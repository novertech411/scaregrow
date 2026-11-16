import { createClient } from '@/lib/supabase/client'
import type { FarmRow } from '@/lib/supabase/database.types'

export async function listMyFarms(signal?: AbortSignal): Promise<FarmRow[]> {
  let query = createClient().from('farms').select('*').order('name')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function updateFarm(id: string, updates: { name?: string; location?: string | null }, signal?: AbortSignal): Promise<FarmRow | null> {
  const patch: { name?: string; location?: string | null } = {}
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.location !== undefined) patch.location = updates.location
  let query = createClient().from('farms').update(patch).eq('id', id).select('*')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

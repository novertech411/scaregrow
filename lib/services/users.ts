import { createClient } from '@/lib/supabase/client'
export async function getUsers() {
  const { data, error } = await createClient().from('user_profiles').select('*').order('full_name')
  if (error) throw error
  return data
}

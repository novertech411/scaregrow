import { createClient } from '@/lib/supabase/client'

export type CurrentProfile = { name: string; role: string }

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) return null
  const { data, error } = await supabase.from('user_profiles').select('full_name, role').eq('id', user.id).maybeSingle()
  if (error) throw error
  const row = data as { full_name?: string | null; role?: string | null } | null
  const role = row?.role === 'admin' ? 'Administrator' : row?.role?.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? 'No role assigned'
  return { name: row?.full_name || user.email || 'User', role }
}

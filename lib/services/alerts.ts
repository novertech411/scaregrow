import { createClient } from '@/lib/supabase/client'

export async function getAlerts(options?: { status?: 'open' | 'acknowledged' | 'resolved'; limit?: number }) {
  let query = createClient().from('alerts').select('*, device:devices (id:device_id), farm:farms (id, name), plot:plots (id, name)').order('triggered_at', { ascending: false })
  if (options?.status) query = query.eq('status', options.status)
  if (options?.limit) query = query.limit(options.limit)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAlertById(alertId: string) {
  const { data, error } = await createClient().from('alerts').select('*, device:devices (id:device_id, farm:farms(name), plot:plots(name)), history:alert_history (id, from_status, to_status, note, created_at, user:user_profiles (full_name))').eq('id', alertId).single()
  if (error) throw error
  return data
}

// Alert lifecycle writes need an authenticated actor and an atomic database operation.
// They are deferred to the authentication step; direct browser writes would lose history on partial failure.
export async function acknowledgeAlert(_alertId: string, _userId: string): Promise<never> {
  throw new Error('Sign in is required to acknowledge alerts.')
}

export async function resolveAlert(_alertId: string, _userId: string, _note: string): Promise<never> {
  throw new Error('Sign in is required to resolve alerts.')
}

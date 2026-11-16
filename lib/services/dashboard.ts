import { createClient } from '@/lib/supabase/client'

export async function getDashboardSummary() {
  const supabase = createClient()
  const results = await Promise.all([
    supabase.from('devices').select('*', { count: 'exact', head: true }).eq('status', 'online'),
    supabase.from('devices').select('*', { count: 'exact', head: true }).eq('status', 'offline'),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'open').eq('severity', 'critical'),
  ])
  for (const result of results) if (result.error) throw result.error
  const [online, offline, alerts, critical] = results
  return { onlineDevices: online.count ?? 0, offlineDevices: offline.count ?? 0, openAlerts: alerts.count ?? 0, criticalAlerts: critical.count ?? 0, lowBatteryDevices: null as number | null }
}

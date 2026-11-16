import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { ReadingRow } from '@/lib/services/readings'
import { READINGS_PAGE_SIZE } from '@/lib/readings-constants'
import type { ReadingAssistantContext, ReadingAssistantSelection } from './types'

const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
const text = (value: unknown) => typeof value === 'string' ? value : null
const scalar = (value: unknown) => text(value) ?? numeric(value)
const entity = (value: unknown): { id: string; name: string } | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.name === 'string' ? { id: row.id, name: row.name } : null
}

// The authenticated server client preserves Supabase RLS; never use a service-role key here.
export async function buildReadingContext(client: SupabaseClient<Database>, selection: ReadingAssistantSelection): Promise<ReadingAssistantContext> {
  const { farmName, plotName, deviceId, from, to, page } = selection
  let query = client.from('readings').select(`device_id, sequence, measured_at, moisture_pct, soil_temp_c, ph, ec_us_cm,
    device:devices${farmName || plotName ? '!inner' : ''}(id:device_id, status,
      farm:farms${farmName ? '!inner' : ''}(id, name), plot:plots${plotName ? '!inner' : ''}(id, name, crop))`, { count: 'exact' })
    .eq('is_valid', true)
  if (farmName) query = query.eq('device.farm.name', farmName)
  if (plotName) query = query.eq('device.plot.name', plotName)
  if (deviceId) query = query.eq('device_id', deviceId)
  query = query.gte('measured_at', from!).lte('measured_at', to!)
  const offset = (page - 1) * READINGS_PAGE_SIZE
  const { data, error, count } = await query.order('measured_at', { ascending: false }).order('device_id').order('sequence')
    .range(offset, offset + READINGS_PAGE_SIZE - 1).returns<ReadingRow[]>()
  if (error || count == null) throw new Error('Unable to load readings context. Please try again.')
  const rows = data ?? []
  const farms = [...new Map(rows.flatMap((row) => row.device?.farm ? [[row.device.farm.id, row.device.farm] as const] : [])).values()]
  const plots = [...new Map(rows.flatMap((row) => row.device?.plot ? [[row.device.plot.id, { id: row.device.plot.id, name: row.device.plot.name }] as const] : [])).values()]

  // Only configurations for plots represented in this page are relevant to its measurements.
  const thresholdRequest = plots.length ? client.from('plots').select('id, threshold_configurations(*)').in('id', plots.map((plot) => plot.id)).returns<Record<string, unknown>[]>() : null
  let alertQuery = client.from('alerts').select(`id, device_id, type, severity, status, triggered_at, current_value, threshold_value,
    farm:farms${farmName ? '!inner' : ''}(id, name), plot:plots${plotName ? '!inner' : ''}(id, name)`)
    .eq('status', 'open').order('triggered_at', { ascending: false }).limit(51)
  if (farmName) alertQuery = alertQuery.eq('farm.name', farmName)
  if (plotName) alertQuery = alertQuery.eq('plot.name', plotName)
  if (deviceId) alertQuery = alertQuery.eq('device_id', deviceId)
  const [thresholdResult, alertResult] = await Promise.all([
    thresholdRequest ?? Promise.resolve({ data: [], error: null }), alertQuery.returns<Record<string, unknown>[]>(),
  ])
  return {
    selection, farms, plots, dateRange: { from: from!, to: to! }, page, totalReadings: count,
    readings: rows.map((row) => ({ deviceId: row.device_id, sequence: row.sequence,
      farmId: row.device?.farm?.id, plotId: row.device?.plot?.id, measuredAt: row.measured_at,
      moisture: numeric(row.moisture_pct), temperature: numeric(row.soil_temp_c), ph: numeric(row.ph), ec: numeric(row.ec_us_cm) })),
    thresholds: thresholdResult.error ? [] : (thresholdResult.data ?? []).map((row) => ({ plotId: String(row.id), configurations: row.threshold_configurations })),
    openAlerts: alertResult.error ? [] : (alertResult.data ?? []).slice(0, 50).map((row) => ({
      id: String(row.id), deviceId: text(row.device_id), type: text(row.type), severity: text(row.severity), status: text(row.status),
      farm: entity(row.farm), plot: entity(row.plot),
      triggeredAt: text(row.triggered_at), currentValue: scalar(row.current_value), thresholdValue: scalar(row.threshold_value),
    })),
    availability: { thresholds: thresholdResult.error ? 'unavailable' : 'available', openAlerts: alertResult.error ? 'unavailable' : 'available', alertsMayBeTruncated: (alertResult.data?.length ?? 0) > 50 },
  }
}

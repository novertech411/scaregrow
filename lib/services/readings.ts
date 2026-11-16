import { createClient } from '@/lib/supabase/client'
import { READINGS_PAGE_SIZE } from '@/lib/readings-constants'

export { READINGS_PAGE_SIZE }

export type ReadingFilters = {
  farmName?: string
  plotName?: string
  deviceId?: string
  from?: string
  to?: string
}

export type ReadingRow = {
  device_id: string
  sequence: number
  measured_at: string
  moisture_pct: number | null
  soil_temp_c: number | null
  ph: number | null
  ec_us_cm: number | null
  device: {
    id: string
    status: string
    farm: { id: string; name: string } | null
    plot: { id: string; name: string; crop: string | null } | null
  } | null
}

function readingsQuery(options: ReadingFilters, countOnly = false) {
  // Inner joins at every filtered level exclude nonmatching parent readings.
  const deviceJoin = options.farmName || options.plotName ? 'devices!inner' : 'devices'
  const farmJoin = options.farmName ? 'farms!inner' : 'farms'
  const plotJoin = options.plotName ? 'plots!inner' : 'plots'
  let query = createClient().from('readings')
    .select(countOnly && !options.farmName && !options.plotName ? '*' : `*, device:${deviceJoin} (id:device_id, status, farm:${farmJoin} (id, name), plot:${plotJoin} (id, name, crop))`, countOnly ? { count: 'exact', head: true } : {})
    .eq('is_valid', true)
  if (options.farmName) query = query.eq('device.farm.name', options.farmName)
  if (options.plotName) query = query.eq('device.plot.name', options.plotName)
  if (options.deviceId) query = query.eq('device_id', options.deviceId)
  if (options.from) query = query.gte('measured_at', options.from)
  if (options.to) query = query.lte('measured_at', options.to)
  return query
}

export async function getReadingsCount(options: ReadingFilters & { signal?: AbortSignal } = {}) {
  let query = readingsQuery(options, true)
  if (options.signal) query = query.abortSignal(options.signal)
  const { count, error } = await query
  if (error) throw error
  if (count == null) throw new Error('Unable to determine the number of readings.')
  return count
}

export async function getReadings(options: ReadingFilters & { limit?: number; offset?: number; signal?: AbortSignal } = {}) {
  let query = readingsQuery(options).order('measured_at', { ascending: false }).order('device_id').order('sequence')
  const limit = options.limit ?? READINGS_PAGE_SIZE
  const offset = options.offset ?? 0
  query = query.range(offset, offset + limit - 1)
  if (options.signal) query = query.abortSignal(options.signal)
  const { data, error } = await query.returns<ReadingRow[]>()
  if (error) throw error
  return data ?? []
}

// Read every lookup page so dropdowns aren't limited to the API's row cap.
async function lookupValues(
  fetchPage: (offset: number) => PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>,
  column: string,
) {
  const values = new Set<string>()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await fetchPage(offset)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      if (typeof row[column] === 'string') values.add(row[column] as string)
    }
    if (!data || data.length < 1000) break
  }
  return [...values].sort((a, b) => a.localeCompare(b))
}

export function getReadingFarms() {
  return lookupValues((offset) => createClient().from('farms').select('name').order('name').order('id').range(offset, offset + 999), 'name')
}

export function getReadingPlots(farmName?: string) {
  return lookupValues((offset) => {
    let query = createClient().from('plots').select(farmName ? 'name, farm:farms!inner(name)' : 'name').order('name').order('id')
    if (farmName) query = query.eq('farm.name', farmName)
    return query.range(offset, offset + 999).returns<Record<string, unknown>[]>()
  }, 'name')
}

export function getReadingDevices(farmName?: string, plotName?: string) {
  return lookupValues((offset) => {
    let query = createClient().from('devices')
      .select(`id:device_id, farm:farms${farmName ? '!inner' : ''}(name), plot:plots${plotName ? '!inner' : ''}(name)`)
      .order('device_id')
    if (farmName) query = query.eq('farm.name', farmName)
    if (plotName) query = query.eq('plot.name', plotName)
    return query.range(offset, offset + 999).returns<Record<string, unknown>[]>()
  }, 'id')
}

export async function getReadingsForExport(filters: ReadingFilters) {
  const rows: ReadingRow[] = []
  for (let offset = 0; ; offset += READINGS_PAGE_SIZE) {
    const page = await getReadings({ ...filters, offset })
    rows.push(...page)
    if (page.length < READINGS_PAGE_SIZE) return rows
  }
}

export async function getLatestReadingPerDevice() {
  const { data, error } = await createClient().rpc('get_latest_readings')
  if (error) throw error
  return data
}

export async function getMoistureTrend(deviceId: string, days = 7) {
  const from = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await createClient().from('readings').select('measured_at, moisture_pct').eq('device_id', deviceId).eq('is_valid', true).gte('measured_at', from).order('measured_at')
  if (error) throw error
  return data
}

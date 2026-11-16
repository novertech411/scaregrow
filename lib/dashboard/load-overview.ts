import { getDevice } from '@/lib/data/devices'
import { getLatestFullReading, getLatestMoistureReading, getReadingHistory } from '@/lib/data/sensor-readings'
import type { SensorReadingRow } from '@/lib/supabase/database.types'
import { overviewWindow, type OverviewRange } from '@/lib/dashboard/overview'

export const OVERVIEW_HISTORY_LIMIT = 10000
async function chartHistory(deviceId: string, range: OverviewRange, signal?: AbortSignal) {
  const dates = overviewWindow(range)
  const rows: SensorReadingRow[] = []
  while (rows.length <= OVERVIEW_HISTORY_LIMIT) {
    signal?.throwIfAborted()
    const limit = Math.min(1000, OVERVIEW_HISTORY_LIMIT + 1 - rows.length)
    const page = await getReadingHistory({ deviceId, ...dates, limit, offset: rows.length }, signal)
    rows.push(...page)
    if (page.length < limit || rows.length > OVERVIEW_HISTORY_LIMIT) break
  }
  return { history: rows.slice(0, OVERVIEW_HISTORY_LIMIT), historyTruncated: rows.length > OVERVIEW_HISTORY_LIMIT }
}
export async function loadOverview(deviceId: string, range: OverviewRange, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const [device, full, moisture, recent, chart] = await Promise.all([
    getDevice(deviceId, signal), getLatestFullReading(deviceId, signal), getLatestMoistureReading(deviceId, signal),
    getReadingHistory({ deviceId, limit: 10, offset: 0 }, signal), chartHistory(deviceId, range, signal),
  ])
  signal?.throwIfAborted()
  if (!device) throw new Error('This device is no longer available to your account.')
  return { device, full, moisture, recent, ...chart, fetchedAt: new Date().toISOString() }
}
export type OverviewSnapshot = Awaited<ReturnType<typeof loadOverview>>

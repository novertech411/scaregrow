import { getDevice } from '@/lib/data/devices'
import { getLatestFullReading, getLatestMoistureReading, getReadingHistory } from '@/lib/data/sensor-readings'
import { overviewWindow, type OverviewRange } from '@/lib/dashboard/overview'

export const OVERVIEW_HISTORY_LIMIT = 1000
export async function loadChartHistory(deviceId: string, range: OverviewRange | { from: string; to: string }, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const rows = await getReadingHistory({ deviceId, ...(typeof range === 'string' ? overviewWindow(range) : range), packetType: 'sensor', limit: OVERVIEW_HISTORY_LIMIT, offset: 0 }, signal)
  signal?.throwIfAborted()
  return { history: rows.slice().reverse(), historyTruncated: rows.length === OVERVIEW_HISTORY_LIMIT }
}
export async function loadOverview(deviceId: string, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const [device, full, moisture, recent] = await Promise.all([
    getDevice(deviceId, signal), getLatestFullReading(deviceId, signal), getLatestMoistureReading(deviceId, signal),
    getReadingHistory({ deviceId, packetType: 'sensor', limit: 10, offset: 0 }, signal),
  ])
  signal?.throwIfAborted()
  if (!device) throw new Error('This device is no longer available to your account.')
  return { device, full, moisture, recent, fetchedAt: new Date().toISOString() }
}
export type OverviewSnapshot = Awaited<ReturnType<typeof loadOverview>>
export type ChartSnapshot = Awaited<ReturnType<typeof loadChartHistory>>

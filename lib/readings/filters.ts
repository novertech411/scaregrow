import type { ReadingFilters } from '@/lib/data/sensor-readings'

export const HISTORY_PAGE_SIZE = 25
export type HistoryRange = '24h' | '7d' | '30d' | 'custom'
export type HistoryState = { deviceId: string; range: HistoryRange; from: string; to: string; packet: 'sensor' | 'moisture' | 'all'; page: number }
export type ReadingDevice = { device_id: string; name: string; hardwareVersion: string | null; past: boolean }
const DAY = 86400000
function validBoundary(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value) || !Number.isFinite(Date.parse(value))) return false
  const day = value.slice(0, 10)
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day
}
export function validateCustomRange(from: string, to: string): string | null {
  if (!validBoundary(from) || !validBoundary(to)) return 'Choose valid start and end dates.'
  if (Date.parse(from) > Date.parse(to)) return 'The start date must be before or equal to the end date.'
  if (Date.parse(to) - Date.parse(from) > 92 * DAY) return 'Choose a date range of 92 days or less.'
  return null
}
function localDate(value: string, end: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose valid start and end dates.')
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error('Choose valid start and end dates.')
  if (end) date.setHours(23, 59, 59, 999)
  return date.toISOString()
}
export function customWindow(from: string, to: string) {
  const window = { from: localDate(from, false), to: localDate(to, true) }
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY + 1
  const error = validateCustomRange(window.from, window.to)
  if (error || days > 92) throw new Error(error || 'Choose a date range of 92 days or less.')
  return window
}
export function freezeWindow(range: Exclude<HistoryRange, 'custom'>, now = new Date()) {
  return { from: new Date(now.getTime() - ({ '24h': 1, '7d': 7, '30d': 30 }[range]) * DAY).toISOString(), to: now.toISOString() }
}
export function parseReadingsState(params: URLSearchParams, devices: readonly { device_id: string }[], now = new Date()): HistoryState {
  const requested = params.get('device')
  const deviceId = devices.find((device) => device.device_id === requested)?.device_id ?? devices[0]?.device_id ?? ''
  const candidate = params.get('range')
  let range: HistoryRange = candidate === '7d' || candidate === '30d' || candidate === 'custom' ? candidate : '24h'
  let window = freezeWindow(range === 'custom' ? '24h' : range, now)
  const from = params.get('from')
  const to = params.get('to')
  if (from && to) {
    try {
      if (validateCustomRange(from, to)) throw new Error('Invalid window')
      const supplied = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) ? customWindow(from, to) : { from: new Date(from).toISOString(), to: new Date(to).toISOString() }
      if (validateCustomRange(supplied.from, supplied.to)) throw new Error('Invalid window')
      if (range !== 'custom' && Date.parse(supplied.to) - Date.parse(supplied.from) !== Date.parse(window.to) - Date.parse(window.from)) throw new Error('Invalid preset')
      window = supplied
    } catch { if (range === 'custom') range = '24h' }
  } else if (range === 'custom') range = '24h'
  const packet = params.get('packet')
  const pageText = params.get('page') ?? '1'
  const page = /^\d+$/.test(pageText) ? Number(pageText) : 1
  return { deviceId, range, ...window, packet: packet === 'moisture' || packet === 'all' ? packet : 'sensor', page: Number.isSafeInteger(page) && page >= 1 && page <= Math.floor(Number.MAX_SAFE_INTEGER / HISTORY_PAGE_SIZE) ? page : 1 }
}
export function readingsSearch(state: HistoryState): string {
  return new URLSearchParams({ device: state.deviceId, range: state.range, from: state.from, to: state.to, packet: state.packet, page: String(state.page) }).toString()
}
export function readingFilters(state: HistoryState): ReadingFilters {
  return { deviceId: state.deviceId, from: state.from, to: state.to, ...(state.packet === 'all' ? {} : { packetType: state.packet }) }
}
export function readingDevices(owned: readonly { device_id: string; display_name: string | null; hardware_version: string }[], past: readonly { device_id: string; [key: string]: unknown }[]): ReadingDevice[] {
  const devices: ReadingDevice[] = owned.map((device) => ({ device_id: device.device_id, name: device.display_name || device.device_id, hardwareVersion: device.hardware_version, past: false }))
  const seen = new Set(devices.map((device) => device.device_id))
  for (const row of past) {
    if (typeof row.device_id !== 'string' || !row.device_id || seen.has(row.device_id)) continue
    seen.add(row.device_id)
    devices.push({ device_id: row.device_id, name: typeof row.display_name === 'string' && row.display_name ? row.display_name : row.device_id, hardwareVersion: row.hardware_version === 'v1' || row.hardware_version === 'v2' ? row.hardware_version : null, past: true })
  }
  return devices
}
export function dateInput(iso: string): string {
  const date = new Date(iso)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

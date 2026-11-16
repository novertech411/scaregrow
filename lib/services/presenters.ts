import type { Alert, Device, Farm, Reading, UserRecord, NotificationItem } from '@/lib/types'

type Row = Record<string, any>
const related = (value: any): Row => Array.isArray(value) ? (value[0] ?? {}) : (value ?? {})
const label = (value: unknown, fallback = 'Unknown') => typeof value === 'string' && value ? value : fallback
const since = (value: unknown) => {
  if (!value) return 'Never'
  const date = new Date(String(value))
  if (Number.isNaN(date.valueOf())) return 'Unknown'
  const minutes = Math.max(0, Math.floor((Date.now() - date.valueOf()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
  return date.toLocaleDateString()
}
const deviceStatus = (value: unknown): Device['status'] => {
  const key = String(value ?? '').toLowerCase().replaceAll('_', ' ')
  return key === 'online' ? 'Online' : key === 'warning' ? 'Warning' : key === 'sensor fault' ? 'Sensor fault' : 'Offline'
}
export function toDevice(row: Row): Device {
  return { id: String(row.id), farm: label(related(row.farm).name), plot: label(related(row.plot).name), status: deviceStatus(row.status), battery: row.battery_pct == null ? Number.NaN : Number(row.battery_pct), signal: row.signal_dbm == null ? 'Unavailable' : `${row.signal_dbm} dBm`, firmware: label(row.firmware, '—'), lastSeen: since(row.last_seen) }
}
export function toReading(row: Row): Reading {
  const device = related(row.device)
  const date = new Date(String(row.measured_at))
  return { farm: label(related(device.farm).name), plot: label(related(device.plot).name), crop: label(related(device.plot).crop, '—'), device: String(row.device_id), status: deviceStatus(device.status) === 'Sensor fault' ? 'Warning' : deviceStatus(device.status) as Reading['status'], moisture: Number(row.moisture_pct ?? 0), temperature: Number(row.soil_temp_c ?? 0), ph: Number(row.ph ?? 0), ec: Number(row.ec_us_cm ?? 0), updated: since(row.measured_at), battery: Number(row.battery_v ?? 0), signal: row.signal_dbm == null ? 'Unavailable' : `${row.signal_dbm} dBm`, timestamp: Number.isNaN(date.valueOf()) ? '—' : date.toLocaleTimeString(), recorded: Number.isNaN(date.valueOf()) ? '—' : date.toLocaleString() }
}
export function toAlert(row: Row): Alert {
  const type = String(row.type ?? '').toLowerCase().replaceAll('_', ' ')
  const types: Record<string, Alert['type']> = { 'low soil moisture': 'Low soil moisture', 'high soil temperature': 'High soil temperature', 'ph out of range': 'pH outside range', 'high ec': 'High EC', 'low battery': 'Low battery', 'device offline': 'Device offline', 'sensor fault': 'Sensor fault' }
  const status = String(row.status ?? '').toLowerCase()
  return { id: String(row.id), severity: String(row.severity).toLowerCase() === 'critical' ? 'Critical' : 'Warning', type: types[type] ?? 'Sensor fault', farm: label(related(row.farm).name), plot: label(related(row.plot).name), device: String(related(row.device).id ?? row.device_id ?? '—'), triggered: since(row.triggered_at), updated: since(row.updated_at ?? row.triggered_at), status: status === 'resolved' ? 'Resolved' : status === 'acknowledged' ? 'Acknowledged' : 'Open', current: row.current_value == null ? undefined : String(row.current_value), threshold: row.threshold_value == null ? undefined : String(row.threshold_value) }
}
export function toFarm(row: Row): Farm {
  const devices: Row[] = row.devices ?? []
  const plots: Row[] = row.plots ?? []
  const onlineDevices = devices.filter((d) => d.status === 'online').length
  const offlineDevices = devices.filter((d) => d.status === 'offline').length
  const latest = devices.map((d) => d.last_seen).filter(Boolean).sort().at(-1)
  return { id: String(row.id), name: label(row.name), location: label(row.location, '—'), plots: plots.length, totalDevices: devices.length, onlineDevices, offlineDevices, openAlerts: (row.alerts ?? []).filter((alert: Row) => alert.status === 'open').length, lastUpdate: since(latest), status: offlineDevices ? 'Warning' : 'Online' }
}
export function toNotification(row: Row): NotificationItem {
  return { id: String(row.id), title: label(row.title, 'Notification'), meta: label(row.meta, ''), description: label(row.message ?? row.description, ''), time: since(row.created_at), tone: 'text-amber-600', href: row.alert_id ? `/alerts/${row.alert_id}` : '/alerts' }
}
export function toUser(row: Row): UserRecord {
  const name = label(row.full_name, 'Unnamed user')
  const role = String(row.role ?? '').toLowerCase()
  return { id: String(row.id), name, email: label(row.email, '—'), role: role === 'admin' || role === 'administrator' ? 'Administrator' : role === 'farm_manager' ? 'Farm Manager' : role === 'agronomist' ? 'Agronomist' : role === 'technician' ? 'Technician' : 'Viewer', access: 'All farms', status: 'Active', lastActive: since(row.last_active), initials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() }
}

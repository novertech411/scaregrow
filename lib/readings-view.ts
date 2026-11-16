import type { ReadingRow } from '@/lib/services/readings'


export type Parameter = 'Moisture' | 'Temperature' | 'pH' | 'EC'

export const readingSeries = {
  Moisture: { value: 'moisture', unit: '%', color: '#25865a', domain: [0, 100] },
  Temperature: { value: 'temperature', unit: '°C', color: '#b7791f', domain: ['auto', 'auto'] },
  pH: { value: 'ph', unit: '', color: '#6571c8', domain: [0, 14] },
  EC: { value: 'ec', unit: 'µS/cm', color: '#8b5e8e', domain: [0, 'auto'] },
} as const

// Legacy presentation is kept locally for the Phase 5 assistant and existing tests.
function legacyReading(row: ReadingRow) {
  const label = (value: string | null | undefined, fallback = 'Unknown') => value || fallback
  const key = String(row.device?.status ?? '').toLowerCase().replaceAll('_', ' ')
  const status = key === 'online' ? 'Online' : ['warning', 'sensor fault'].includes(key) ? 'Warning' : 'Offline'
  const date = new Date(row.measured_at)
  const invalid = Number.isNaN(date.valueOf())
  const minutes = Math.max(0, Math.floor((Date.now() - date.valueOf()) / 60000))
  const updated = !row.measured_at ? 'Never' : invalid ? 'Unknown' : minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : date.toLocaleDateString()
  const extras = row as ReadingRow & { battery_v?: number; signal_dbm?: number }
  return { farm: label(row.device?.farm?.name), plot: label(row.device?.plot?.name), crop: label(row.device?.plot?.crop, '—'), device: String(row.device_id), status,
    moisture: Number(row.moisture_pct ?? 0), temperature: Number(row.soil_temp_c ?? 0), ph: Number(row.ph ?? 0), ec: Number(row.ec_us_cm ?? 0), updated,
    battery: Number(extras.battery_v ?? 0), signal: extras.signal_dbm == null ? 'Unavailable' : `${extras.signal_dbm} dBm`, timestamp: invalid ? '—' : date.toLocaleTimeString(), recorded: invalid ? '—' : date.toLocaleString() }
}

export function toPageReading(row: ReadingRow) {
  return {
    ...legacyReading(row),
    key: `${row.device_id}:${row.sequence}`,
    recorded: row.measured_at,
    timestamp: new Date(row.measured_at).toLocaleString(),
    moisture: row.moisture_pct,
    temperature: row.soil_temp_c,
    ph: row.ph,
    ec: row.ec_us_cm,
  }
}

export type PageReading = ReturnType<typeof toPageReading>

export function readingsCsv(rows: ReadingRow[]) {
  const header = ['Timestamp', 'Farm', 'Plot', 'Device', 'Moisture (%)', 'Temperature (°C)', 'pH', 'EC (µS/cm)', 'Status']
  const escape = (value: unknown) => {
    let text = value == null ? '' : String(value)
    // Keep database text from being interpreted as a spreadsheet formula.
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  return '\uFEFF' + [header, ...rows.map((row) => {
    const reading = toPageReading(row)
    return [reading.recorded, reading.farm, reading.plot, reading.device, reading.moisture, reading.temperature, reading.ph, reading.ec, reading.status]
  })].map((cells) => cells.map(escape).join(',')).join('\r\n')
}

export function readingsCsvFilename(date = new Date()) {
  const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  return `greener-readings-${day}.csv`
}

// Normalize each metric over the displayed page; tooltips retain original units.
export function allMetricsChart(readings: PageReading[]) {
  const parameters = Object.keys(readingSeries) as Parameter[]
  const bounds = Object.fromEntries(parameters.map((parameter) => {
    const values = readings.map((row) => row[readingSeries[parameter].value]).filter((value): value is number => value != null && Number.isFinite(value))
    return [parameter, [Math.min(...values), Math.max(...values)]]
  }))
  return [...readings].reverse().map((reading) => ({
    day: reading.timestamp,
    reading,
    normalized: Object.fromEntries(parameters.map((parameter) => {
      const value = reading[readingSeries[parameter].value]
      const [min, max] = bounds[parameter]
      return [parameter, value == null || !Number.isFinite(value) ? null : max === min ? 50 : (value - min) / (max - min) * 100]
    })),
  }))
}

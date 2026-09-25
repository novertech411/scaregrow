import type { ReadingRow } from '@/lib/services/readings'
import { toReading } from '@/lib/services/presenters'

export type Parameter = 'Moisture' | 'Temperature' | 'pH' | 'EC'

export const readingSeries = {
  Moisture: { value: 'moisture', unit: '%', color: '#25865a', domain: [0, 100] },
  Temperature: { value: 'temperature', unit: '°C', color: '#b7791f', domain: ['auto', 'auto'] },
  pH: { value: 'ph', unit: '', color: '#6571c8', domain: [0, 14] },
  EC: { value: 'ec', unit: 'µS/cm', color: '#8b5e8e', domain: [0, 'auto'] },
} as const

export function toPageReading(row: ReadingRow) {
  return {
    ...toReading(row),
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

import type { HardwareVersion } from '@/lib/supabase/database.types'

export type MeasurementKey = 'soil_moisture_pct' | 'soil_temperature_c' | 'soil_ph' | 'soil_ec_us_cm' | 'nitrogen_mg_kg' | 'phosphorus_mg_kg' | 'potassium_mg_kg' | 'air_temperature_c' | 'air_humidity_pct' | 'illuminance_lux' | 'salinity_est_g_l' | 'tds_est_mg_l' | 'irradiance_est_w_m2'
export type Measurement = { key: MeasurementKey; label: string; shortLabel: string; unit: string; group: 'soil' | 'nutrients' | 'air' | 'estimates'; isEstimate: boolean; formulaNote?: string; versions: HardwareVersion[]; decimals: number }
export const measurements: readonly Measurement[] = [
  { key: 'soil_moisture_pct', label: 'Soil moisture', shortLabel: 'Moisture', unit: '%', group: 'soil', isEstimate: false, versions: ['v1', 'v2'], decimals: 1 },
  { key: 'soil_temperature_c', label: 'Soil temperature', shortLabel: 'Soil temp', unit: '°C', group: 'soil', isEstimate: false, versions: ['v1', 'v2'], decimals: 1 },
  { key: 'soil_ph', label: 'Soil pH', shortLabel: 'pH', unit: 'pH', group: 'soil', isEstimate: false, versions: ['v1', 'v2'], decimals: 2 },
  { key: 'soil_ec_us_cm', label: 'Electrical conductivity', shortLabel: 'EC', unit: 'µS/cm', group: 'soil', isEstimate: false, versions: ['v1', 'v2'], decimals: 0 },
  { key: 'nitrogen_mg_kg', label: 'Nitrogen', shortLabel: 'N', unit: 'mg/kg', group: 'nutrients', isEstimate: false, versions: ['v1', 'v2'], decimals: 1 },
  { key: 'phosphorus_mg_kg', label: 'Phosphorus', shortLabel: 'P', unit: 'mg/kg', group: 'nutrients', isEstimate: false, versions: ['v1', 'v2'], decimals: 1 },
  { key: 'potassium_mg_kg', label: 'Potassium', shortLabel: 'K', unit: 'mg/kg', group: 'nutrients', isEstimate: false, versions: ['v1', 'v2'], decimals: 1 },
  { key: 'air_temperature_c', label: 'Ambient air temperature', shortLabel: 'Air temp', unit: '°C', group: 'air', isEstimate: false, versions: ['v2'], decimals: 1 },
  { key: 'air_humidity_pct', label: 'Ambient relative humidity', shortLabel: 'Humidity', unit: '% RH', group: 'air', isEstimate: false, versions: ['v2'], decimals: 1 },
  { key: 'illuminance_lux', label: 'Illuminance', shortLabel: 'Light', unit: 'lx', group: 'air', isEstimate: false, versions: ['v2'], decimals: 0 },
  { key: 'salinity_est_g_l', label: 'Estimated salinity', shortLabel: 'Salinity (est.)', unit: 'g/L', group: 'estimates', isEstimate: true, formulaNote: 'EC × 0.55 / 1000', versions: ['v2'], decimals: 3 },
  { key: 'tds_est_mg_l', label: 'Estimated total dissolved solids', shortLabel: 'TDS (est.)', unit: 'mg/L', group: 'estimates', isEstimate: true, formulaNote: 'EC × 0.50', versions: ['v2'], decimals: 1 },
  { key: 'irradiance_est_w_m2', label: 'Estimated irradiance', shortLabel: 'Irradiance (est.)', unit: 'W/m²', group: 'estimates', isEstimate: true, formulaNote: 'lux × 0.0079', versions: ['v2'], decimals: 2 },
]
export function measurementsFor(hardwareVersion?: string | null): readonly Measurement[] {
  return hardwareVersion === 'v1' || hardwareVersion === 'v2' ? measurements.filter((entry) => entry.versions.includes(hardwareVersion)) : measurements
}
export function formatMeasurement(value: number | null | undefined, key: MeasurementKey): string {
  if (value == null || !Number.isFinite(value)) return 'Unavailable'
  const metric = measurements.find((entry) => entry.key === key)!
  return `${Number(value.toFixed(metric.decimals))} ${metric.unit}`
}
function dateOf(iso?: string | null) {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isFinite(date.getTime()) ? date : null
}
export function formatTimestamp(iso?: string | null): string {
  const date = dateOf(iso)
  return date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Unavailable'
}
export function formatRelative(iso?: string | null): string {
  const date = dateOf(iso)
  if (!date) return 'Unavailable'
  const seconds = (date.getTime() - Date.now()) / 1000
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]] as const) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit)
  }
  return formatter.format(Math.round(seconds), 'second')
}

// Hand-written from docs/backend-contract.md; replace with `supabase gen types` when CLI access exists.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type HardwareVersion = 'v1' | 'v2'
export type DeviceAction = 'lock' | 'unlock' | 'release' | 'archive' | 'restore'
export type ProfileRow = { id: string; full_name: string | null; created_at: string }
export type FarmRow = { id: string; owner_user_id: string; name: string; location: string | null; created_at: string }
export type DeviceRow = {
  device_id: string
  hardware_version: HardwareVersion
  owner_user_id: string | null
  display_name: string | null
  farm_id: string | null
  farm_name: string | null
  location: string | null
  enabled: boolean
  archived_at: string | null
  created_at: string
  claimed_at: string | null
  last_received_at: string | null
}
export type SensorReadingRow = {
  // Contract does not specify the SQL identity type; confirm with generated types.
  id: number
  device_id: string
  node_id: string | null
  source: 'emqx' | 'thingspeak'
  packet_type: 'sensor' | 'moisture'
  cycle: number | null
  source_message_id: string | null
  received_at: string
  measured_at: string | null
  farm_id_at_receipt: string | null
  raw_payload: Json
  soil_moisture_pct: number | null
  soil_temperature_c: number | null
  soil_ph: number | null
  soil_ec_us_cm: number | null
  nitrogen_mg_kg: number | null
  phosphorus_mg_kg: number | null
  potassium_mg_kg: number | null
  salinity_est_g_l: number | null
  tds_est_mg_l: number | null
  irradiance_est_w_m2: number | null
  air_temperature_c: number | null
  air_humidity_pct: number | null
  illuminance_lux: number | null
}
export type AuditLogRow = {
  actor_user_id: string | null
  action: string
  target_id: string | null
  reason: string | null
  before_data: Json
  after_data: Json
  created_at: string
}
export type AdminUserRow = { user_id: string; email: string | null; full_name: string | null; created_at: string; device_count: number }
// TODO: Backend must confirm the extra columns returned by my_reading_devices (§10).
export type ReadingDeviceRow = { device_id: string; [key: string]: unknown }
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>, Relationships extends unknown[] = []> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: Relationships
}
type Rpc<Args, Returns> = { Args: Args; Returns: Returns }
// LEGACY compatibility for obsolete columns and joins used by existing UI queries.
// These are not claims about the contracted schema and must be removed with that UI.
type LegacyFarmColumns = { latitude: number | null; longitude: number | null }
type LegacyDeviceColumns = { status: string | null; plot_id: string | null; last_seen: string | null }
type LegacyPlotRow = Record<string, unknown> & { id: string; name: string; crop: string | null; soil_profile: string | null; planting_date: string | null }
type LegacyDevicePlotRelation = {
  foreignKeyName: 'legacy_devices_plot_id_fkey'; columns: ['plot_id']; isOneToOne: false; referencedRelation: 'plots'; referencedColumns: ['id']
}
type LegacyPlotFarmRelation = {
  foreignKeyName: 'legacy_plots_farm_id_fkey'; columns: ['farm_id']; isOneToOne: false; referencedRelation: 'farms'; referencedColumns: ['id']
}
type LegacyTable = Table<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>
export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, { id: string; full_name?: string | null; created_at?: string }, { full_name?: string | null }>
      farms: Table<FarmRow & LegacyFarmColumns, Partial<FarmRow> & Pick<FarmRow, 'owner_user_id' | 'name'>, { name?: string; location?: string | null }>
      devices: Table<DeviceRow & LegacyDeviceColumns, Partial<DeviceRow> & Pick<DeviceRow, 'device_id' | 'hardware_version'>, { display_name?: string | null }, [{
        foreignKeyName: 'devices_farm_id_fkey'; columns: ['farm_id']; isOneToOne: false; referencedRelation: 'farms'; referencedColumns: ['id']
      }, LegacyDevicePlotRelation]>
      sensor_readings: Table<SensorReadingRow, never, never, [{
        foreignKeyName: 'sensor_readings_device_id_fkey'; columns: ['device_id']; isOneToOne: false; referencedRelation: 'devices'; referencedColumns: ['device_id']
      }]>
      admin_audit_log: Table<AuditLogRow, never, never>
      // LEGACY — not present in the backend contract.
      readings: LegacyTable
      alerts: LegacyTable
      plots: Table<LegacyPlotRow, Record<string, unknown>, Record<string, unknown>, [LegacyPlotFarmRelation]>
      notifications: LegacyTable
      user_profiles: LegacyTable
      alert_history: LegacyTable
      threshold_configurations: LegacyTable
    }
    Views: Record<string, never>
    Functions: {
      pair_device: Rpc<{ p_device_id: string; p_device_name?: string | null; p_farm_name?: string | null; p_farm_location?: string | null; p_farm_id?: string }, string>
      claim_farm_device: Rpc<{ p_device_id: string }, string>
      my_reading_devices: Rpc<Record<string, never>, ReadingDeviceRow[]>
      is_super_admin: Rpc<Record<string, never>, boolean>
      // Return payloads are unspecified in §8.2; do not assume row shapes.
      admin_register_device: Rpc<{ p_device_id: string; p_hardware_version: HardwareVersion; p_display_name: string | null; p_reason: string }, unknown>
      admin_manage_device: Rpc<{ p_device_id: string; p_action: DeviceAction; p_reason: string }, unknown>
      // TODO: Confirm bulk-lock count return shape (§10).
      admin_set_all_devices_locked: Rpc<{ p_locked: boolean; p_reason: string }, unknown>
      admin_update_device_name: Rpc<{ p_device_id: string; p_display_name: string | null; p_reason: string }, unknown>
      admin_update_farm: Rpc<{ p_farm_id: string; p_name: string | null; p_location: string | null; p_reason: string }, unknown>
      admin_list_users: Rpc<{ p_limit?: number; p_offset?: number }, AdminUserRow[]>
      // LEGACY — old UI only.
      get_latest_readings: Rpc<Record<string, never>, Record<string, unknown>[]>
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

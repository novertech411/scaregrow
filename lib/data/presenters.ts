import type { DeviceRow } from '@/lib/supabase/database.types'
import type { DeviceWithFarm } from '@/lib/data/devices'

export function toDeviceView(row: DeviceWithFarm) {
  return {
    id: row.device_id,
    name: row.display_name || row.device_id,
    farmName: row.farm?.name || 'No farm assigned',
    farmLocation: row.farm?.location ?? null,
    hardwareVersion: row.hardware_version,
    enabled: row.enabled,
    archived: Boolean(row.archived_at),
    lastDataReceived: row.last_received_at,
    claimedAt: row.claimed_at,
  }
}
export function deviceAdminStatus(row: Pick<DeviceRow, 'archived_at' | 'enabled' | 'owner_user_id'>): 'Archived' | 'Locked' | 'Unclaimed' | 'Claimed' {
  if (row.archived_at) return 'Archived'
  if (!row.enabled) return 'Locked'
  if (!row.owner_user_id) return 'Unclaimed'
  return 'Claimed'
}

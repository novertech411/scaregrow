import type { DeviceWithFarm } from '@/lib/data/devices'

export function ownedDevices<T extends Pick<DeviceWithFarm, 'device_id' | 'display_name' | 'owner_user_id'>>(devices: readonly T[], userId: string | null | undefined): T[] {
  if (!userId) return []
  return devices.filter((device) => device.owner_user_id === userId).sort((a, b) => (a.display_name || a.device_id).localeCompare(b.display_name || b.device_id) || a.device_id.localeCompare(b.device_id))
}

export function pickDevice<T extends { device_id: string }>(owned: readonly T[], requestedId?: string | null): T | null {
  return owned.find((device) => device.device_id === requestedId) ?? owned[0] ?? null
}

export function ownedFarms<T extends { id: string; name: string; owner_user_id: string }>(farms: readonly T[], userId: string | null | undefined): T[] {
  if (!userId) return []
  return farms.filter((farm) => farm.owner_user_id === userId).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

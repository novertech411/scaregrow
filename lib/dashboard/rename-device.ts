import { updateDeviceDisplayName } from '@/lib/data/devices'

export async function renameDevice(deviceId: string, name: string, refresh: () => Promise<void>, signal?: AbortSignal) {
  const row = await updateDeviceDisplayName(deviceId, name.trim() || null, signal)
  if (!row) throw new Error('The device name could not be saved. Please try again.')
  signal?.throwIfAborted()
  await refresh()
  return row
}

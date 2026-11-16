import { manageDevice, registerDevice, setAllDevicesLocked, updateDeviceName, updateFarmAsAdmin } from '@/lib/data/admin'
import { canAccessAdmin } from '@/lib/admin/navigation'
import type { DeviceAction, HardwareVersion } from '@/lib/supabase/database.types'

export type AdminOperation =
  | { kind: 'register'; deviceId: string; hardwareVersion: HardwareVersion; name: string }
  | { kind: 'manage'; deviceId: string; action: DeviceAction }
  | { kind: 'bulk'; locked: boolean }
  | { kind: 'rename'; deviceId: string; name: string }
  | { kind: 'farm'; farmId: string; name: string; location: string }
export async function performAdminAction(operation: AdminOperation, reason: string, session: { status: string; isAdmin: boolean }, signal?: AbortSignal) {
  if (!canAccessAdmin(session)) throw new Error('Super admin access is required.')
  if (!reason.trim()) throw new Error('A reason is required.')
  signal?.throwIfAborted()
  const why = reason.trim()
  if (operation.kind === 'bulk') return setAllDevicesLocked(operation.locked, why, signal)
  if (operation.kind === 'farm') {
    if (!operation.name.trim()) throw new Error('Farm name is required.')
    return updateFarmAsAdmin(operation.farmId, operation.name.trim(), operation.location.trim() || null, why, signal)
  }
  const deviceId = operation.deviceId.trim()
  if (!deviceId) throw new Error('Device ID is required.')
  if (operation.kind === 'register') {
    if (!['v1', 'v2'].includes(operation.hardwareVersion)) throw new Error('Choose V1 or V2 hardware.')
    return registerDevice(deviceId, operation.hardwareVersion, operation.name.trim() || null, why, signal)
  }
  if (operation.kind === 'rename') return updateDeviceName(deviceId, operation.name.trim() || null, why, signal)
  return manageDevice(deviceId, operation.action, why, signal)
}

export function successMessage(operation: AdminOperation, result: unknown): string {
  if (operation.kind === 'bulk') return typeof result === 'number' && Number.isFinite(result) ? `${operation.locked ? 'Locked' : 'Unlocked'} ${result} devices.` : 'Done'
  if (operation.kind === 'farm') return `${operation.name.trim()} updated.`
  const id = operation.deviceId.trim()
  if (operation.kind === 'register') return `${id} registered.`
  if (operation.kind === 'rename') return `${id} renamed.`
  const verbs = { lock: 'locked', unlock: 'unlocked', release: 'released', archive: 'archived', restore: 'restored' }
  return `${id} ${verbs[operation.action]}.`
}

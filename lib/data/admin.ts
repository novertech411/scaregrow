import { createClient } from '@/lib/supabase/client'
import type { Database, DeviceAction, HardwareVersion } from '@/lib/supabase/database.types'
import { listMyDevices } from '@/lib/data/devices'
import { listMyFarms } from '@/lib/data/farms'

type Functions = Database['public']['Functions']
type AdminRpc = 'admin_register_device' | 'admin_manage_device' | 'admin_set_all_devices_locked' | 'admin_update_device_name' | 'admin_update_farm'
function requiredReason(reason: string) {
  const trimmed = reason.trim()
  if (!trimmed) throw new Error('A reason is required')
  return trimmed
}
async function call<Name extends AdminRpc>(name: Name, args: Functions[Name]['Args'], signal?: AbortSignal) {
  let query = createClient().rpc(name, args)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data
}
export async function isSuperAdmin(signal?: AbortSignal): Promise<boolean> {
  let query = createClient().rpc('is_super_admin')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data === true
}
export async function registerDevice(deviceId: string, hardwareVersion: HardwareVersion, displayName: string | null, reason: string, signal?: AbortSignal) {
  return call('admin_register_device', { p_device_id: deviceId, p_hardware_version: hardwareVersion, p_display_name: displayName, p_reason: requiredReason(reason) }, signal)
}
export async function manageDevice(deviceId: string, action: DeviceAction, reason: string, signal?: AbortSignal) {
  return call('admin_manage_device', { p_device_id: deviceId, p_action: action, p_reason: requiredReason(reason) }, signal)
}
export async function setAllDevicesLocked(locked: boolean, reason: string, signal?: AbortSignal) {
  return call('admin_set_all_devices_locked', { p_locked: locked, p_reason: requiredReason(reason) }, signal)
}
export async function updateDeviceName(deviceId: string, displayName: string | null, reason: string, signal?: AbortSignal) {
  return call('admin_update_device_name', { p_device_id: deviceId, p_display_name: displayName, p_reason: requiredReason(reason) }, signal)
}
export async function updateFarmAsAdmin(farmId: string, name: string | null, location: string | null, reason: string, signal?: AbortSignal) {
  return call('admin_update_farm', { p_farm_id: farmId, p_name: name, p_location: location, p_reason: requiredReason(reason) }, signal)
}
export async function listUsers({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}, signal?: AbortSignal) {
  const p_limit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.trunc(limit))) : 50
  let query = createClient().rpc('admin_list_users', { p_limit, p_offset: offset })
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
// RLS grants super admins all rows; use the same public browser client.
export function listAllDevices(signal?: AbortSignal) { return listMyDevices(signal) }
export function listAllFarms(signal?: AbortSignal) { return listMyFarms(signal) }
export async function listAuditLog({ limit, offset }: { limit: number; offset: number }, signal?: AbortSignal) {
  let query = createClient().from('admin_audit_log').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

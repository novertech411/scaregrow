import { createClient } from '@/lib/supabase/client'
import type { Database, DeviceAction, HardwareVersion } from '@/lib/supabase/database.types'
import type { DeviceWithFarm } from '@/lib/data/devices'
import type { FarmRow, AdminUserRow } from '@/lib/supabase/database.types'

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
// Admin directories page through every row rather than relying on the API row cap.
export async function listAllDevices(signal?: AbortSignal): Promise<DeviceWithFarm[]> {
  const rows: DeviceWithFarm[] = []
  for (let offset = 0; ; offset += 1000) {
    signal?.throwIfAborted()
    let query = createClient().from('devices').select('*, farm:farms!devices_farm_id_fkey(id,name,location)').order('device_id').range(offset, offset + 999)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    if (error) throw error
    rows.push(...data ?? [])
    if (!data || data.length < 1000) return rows
  }
}
export async function listAllFarms(signal?: AbortSignal): Promise<FarmRow[]> {
  const rows: FarmRow[] = []
  for (let offset = 0; ; offset += 1000) {
    signal?.throwIfAborted()
    let query = createClient().from('farms').select('*').order('name').order('id').range(offset, offset + 999)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    if (error) throw error
    rows.push(...data ?? [])
    if (!data || data.length < 1000) return rows
  }
}
export const USER_DIRECTORY_LIMIT = 5000
export type UserDirectory = { users: AdminUserRow[]; truncated: boolean }
export async function listAllUsers(signal?: AbortSignal): Promise<UserDirectory> {
  const users: AdminUserRow[] = []
  for (let offset = 0; offset < USER_DIRECTORY_LIMIT; offset += 100) {
    signal?.throwIfAborted()
    const page = await listUsers({ limit: Math.min(100, USER_DIRECTORY_LIMIT - offset), offset }, signal)
    users.push(...page.slice(0, USER_DIRECTORY_LIMIT - users.length))
    if (page.length < 100) return { users, truncated: false }
  }
  return { users, truncated: true }
}
export async function listAuditLog({ limit, offset, targetId }: { limit: number; offset: number; targetId?: string }, signal?: AbortSignal) {
  let query = createClient().from('admin_audit_log').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (targetId !== undefined) query = query.eq('target_id', targetId)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

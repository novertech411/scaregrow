import type { DeviceRow, AdminUserRow, Json } from '@/lib/supabase/database.types'

export function ownerLabel(id: string | null, users: readonly AdminUserRow[]): string {
  if (!id) return 'Unclaimed'
  const user = users.find((item) => item.user_id === id)
  return user ? [user.full_name, user.email].filter(Boolean).join(' · ') || id : id
}
export function allowedActions(device: Pick<DeviceRow, 'enabled' | 'archived_at' | 'owner_user_id'>) {
  return device.archived_at ? ['restore'] as const : ['rename', device.enabled ? 'lock' : 'unlock', ...(device.owner_user_id ? ['release'] as const : []), 'archive'] as const
}
export function auditJson(value: Json): string { return value === null ? 'Unavailable' : JSON.stringify(value, null, 2) }

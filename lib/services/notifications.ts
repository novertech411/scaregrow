import { createClient } from '@/lib/supabase/client'

export async function getNotifications(userId: string, limit = 20) {
  const { data, error } = await createClient().from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data
}

export async function getUnreadCount(userId: string) {
  const { count, error } = await createClient().from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null)
  if (error) throw error
  return count ?? 0
}

export async function markAsRead(notificationId: string) {
  const { error } = await createClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId)
  if (error) throw error
}

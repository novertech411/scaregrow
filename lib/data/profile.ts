import { createClient } from '@/lib/supabase/client'

export function ensureMyProfile(fullName?: string, signal?: AbortSignal) {
  return saveMyProfile(fullName, false, signal)
}

export function createMyProfileIfMissing(fullName?: string, signal?: AbortSignal) {
  return saveMyProfile(fullName, true, signal)
}

async function saveMyProfile(fullName: string | undefined, createOnly: boolean, signal?: AbortSignal) {
  fullName = fullName?.trim() || undefined
  signal?.throwIfAborted()
  const client = createClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sign in to create a profile')
  signal?.throwIfAborted()
  let query = client.from('profiles').select('*').eq('id', user.id)
  if (signal) query = query.abortSignal(signal)
  const { data: existing, error } = await query.maybeSingle()
  if (error) throw error
  if (existing && (createOnly || fullName === undefined)) return existing
  let write = existing
    ? client.from('profiles').update({ full_name: fullName }).eq('id', user.id).select('*')
    : client.from('profiles').insert({ id: user.id, full_name: fullName ?? null }).select('*')
  if (signal) write = write.abortSignal(signal)
  const { data, error: writeError } = await write.single()
  if (writeError) throw writeError
  return data
}

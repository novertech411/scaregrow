import type { User } from '@supabase/supabase-js'
import type { ProfileRow } from '@/lib/supabase/database.types'
import type { DeviceWithFarm } from '@/lib/data/devices'

export type GreenerSessionState = {
  status: 'loading' | 'ready' | 'error' | 'signed-out'
  user: User | null
  isAdmin: boolean
  profile: ProfileRow | null
  devices: DeviceWithFarm[]
  error: Error | null
  profileError: Error | null
}
type Dependencies = {
  createProfile: (fullName?: string, signal?: AbortSignal) => Promise<ProfileRow>
  checkAdmin: (signal?: AbortSignal) => Promise<boolean>
  listDevices: (signal?: AbortSignal) => Promise<DeviceWithFarm[]>
}
export function emptySession(status: GreenerSessionState['status']): GreenerSessionState {
  return { status, user: null, isAdmin: false, profile: null, devices: [], error: null, profileError: null }
}
function asError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to load your account. Please try again.')
}

// Kept separate from React to test auth races and cancellation without a browser.
export function createSessionController(deps: Dependencies, publish: (state: GreenerSessionState) => void) {
  let state = emptySession('loading')
  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  const emit = (next: GreenerSessionState) => { state = next; if (!disposed) publish(next) }
  function cancel() {
    controller?.abort()
    controller = null
    clearTimeout(timer)
    timer = undefined
  }
  async function load(user: User, request: AbortController) {
    const signal = request.signal
    signal.throwIfAborted()
    const fullName = typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : undefined
    const [profile, admin, devices] = await Promise.allSettled([
      deps.createProfile(fullName, signal), deps.checkAdmin(signal), deps.listDevices(signal),
    ])
    signal.throwIfAborted()
    if (disposed || controller !== request) throw new DOMException('Session changed', 'AbortError')
    const error = admin.status === 'rejected' ? asError(admin.reason) : devices.status === 'rejected' ? asError(devices.reason) : null
    emit({
      status: error ? 'error' : 'ready', user: state.user, isAdmin: admin.status === 'fulfilled' && admin.value === true,
      profile: profile.status === 'fulfilled' ? profile.value : null,
      profileError: profile.status === 'rejected' ? asError(profile.reason) : null,
      devices: devices.status === 'fulfilled' ? devices.value : [], error,
    })
    if (error) throw error
  }
  function setUser(user: User | null) {
    if (disposed) return
    if (!user) { cancel(); emit(emptySession('signed-out')); return }
    if (state.user?.id === user.id) { emit({ ...state, user }); return }
    cancel()
    const request = new AbortController()
    controller = request
    emit({ ...emptySession('loading'), user })
    // Supabase auth callbacks hold an auth lock. Start queries after it releases.
    timer = setTimeout(() => { timer = undefined; void load(user, request).catch(() => {}) }, 0)
  }
  async function refresh() {
    if (disposed || !state.user) throw new Error('Please sign in to continue.')
    const user = state.user
    cancel()
    const request = new AbortController()
    controller = request
    emit({ ...emptySession('loading'), user })
    await load(user, request)
  }
  function fail(error: unknown) {
    if (disposed) return
    cancel()
    emit({ ...emptySession('error'), error: asError(error) })
  }
  function dispose() { disposed = true; cancel() }
  return { setUser, refresh, fail, dispose }
}

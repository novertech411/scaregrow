export type LandingOptions = {
  status: 'loading' | 'ready' | 'error' | 'signed-out'
  isAdmin: boolean
  deviceCount: number
  pathname: string
}

// UX only: Supabase RLS remains the access control boundary.
export function resolveLanding({ status, isAdmin, deviceCount, pathname }: LandingOptions): '/connect-device' | null {
  if (['/login', '/signup', '/auth/callback', '/connect-device', '/readings'].includes(pathname)) return null
  return status === 'ready' && !isAdmin && deviceCount === 0 ? '/connect-device' : null
}

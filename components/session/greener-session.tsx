'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createMyProfileIfMissing } from '@/lib/data/profile'
import { isSuperAdmin } from '@/lib/data/admin'
import { listMyDevices } from '@/lib/data/devices'
import { createSessionController, emptySession, type GreenerSessionState } from '@/lib/session/controller'

type GreenerSession = GreenerSessionState & { refresh: () => Promise<void> }
const Context = createContext<GreenerSession | null>(null)

export function GreenerSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GreenerSessionState>(() => emptySession('loading'))
  const controller = useRef<ReturnType<typeof createSessionController> | null>(null)
  const refresh = useCallback(async () => {
    if (!controller.current) throw new Error('Session is still loading.')
    await controller.current.refresh()
  }, [])

  useEffect(() => {
    const client = createClient()
    const session = createSessionController({ createProfile: createMyProfileIfMissing, checkAdmin: isSuperAdmin, listDevices: listMyDevices }, setState)
    controller.current = session
    let active = true
    let authRevision = 0
    const { data: { subscription } } = client.auth.onAuthStateChange((event, authSession) => {
      authRevision += 1
      session.setUser(event === 'SIGNED_OUT' ? null : authSession?.user ?? null)
    })
    const revision = authRevision
    void client.auth.getUser().then(({ data: { user }, error }) => {
      if (!active || authRevision !== revision) return
      if (error && !user && error.name !== 'AuthSessionMissingError') session.fail(error)
      else session.setUser(user)
    }).catch((error) => { if (active && authRevision === revision) session.fail(error) })
    return () => {
      active = false
      subscription.unsubscribe()
      session.dispose()
      controller.current = null
    }
  }, [])

  return <Context.Provider value={{ ...state, refresh }}>{children}</Context.Provider>
}

export function useGreenerSession(): GreenerSession {
  const session = useContext(Context)
  if (!session) throw new Error('useGreenerSession must be used within GreenerSessionProvider')
  return session
}

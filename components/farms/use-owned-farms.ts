'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useGreenerSession } from '@/components/session/greener-session'
import { listMyFarms } from '@/lib/data/farms'
import { ownedFarms } from '@/lib/session/owned-devices'
import type { FarmRow } from '@/lib/supabase/database.types'

export function useOwnedFarms() {
  const { user } = useGreenerSession()
  const [farms, setFarms] = useState<FarmRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const reload = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    try {
      const rows = user?.id ? await listMyFarms(controller.signal) : []
      controller.signal.throwIfAborted()
      const owned = ownedFarms(rows, user?.id)
      setFarms(owned)
      return owned
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Unable to load farms.')
      throw cause
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }, [user?.id])
  useEffect(() => { void reload().catch(() => {}); return () => request.current?.abort() }, [reload])
  return { farms, loading, error, reload }
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export const adminMessage = (cause: unknown) => cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Unable to complete the request. Please try again.'
export function useAdminResource<T>(load: (signal: AbortSignal) => Promise<T>, key = '') {
  const loader = useRef(load)
  loader.current = load
  const request = useRef<AbortController | null>(null)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    try {
      const next = await loader.current(controller.signal)
      controller.signal.throwIfAborted()
      setData(next)
      return next
    } catch (cause) {
      if (!controller.signal.aborted) setError(adminMessage(cause))
      throw cause
    } finally { if (!controller.signal.aborted) { controller.abort(); setLoading(false) } }
  }, [])
  useEffect(() => { setData(null); void reload().catch(() => {}); return () => request.current?.abort() }, [key, reload])
  return { data, error, loading, reload }
}

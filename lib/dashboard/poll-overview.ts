import type { OverviewSnapshot } from '@/lib/dashboard/load-overview'

type Callbacks = {
  onData: (snapshot: OverviewSnapshot) => void
  onError: (cause: unknown) => void
  onUpdating: (updating: boolean) => void
}
// One request at a time; hidden tabs and unmounted views stop all polling.
export function pollOverview(load: (signal: AbortSignal) => Promise<OverviewSnapshot>, callbacks: Callbacks, visibility: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> = document) {
  let active = true
  let timer: ReturnType<typeof setTimeout> | undefined
  let request: AbortController | null = null
  async function poll() {
    clearTimeout(timer)
    if (!active || visibility.visibilityState === 'hidden') return
    const controller = new AbortController()
    request = controller
    callbacks.onUpdating(true)
    try {
      const next = await load(controller.signal)
      if (active && !controller.signal.aborted) callbacks.onData(next)
    } catch (cause) {
      if (active && !controller.signal.aborted) callbacks.onError(cause)
    } finally {
      if (active && !controller.signal.aborted) {
        // Cancel sibling queries if one part of the combined load failed.
        controller.abort()
        callbacks.onUpdating(false)
        timer = setTimeout(() => { void poll() }, 15000)
      }
    }
  }
  function visibilityChanged() {
    clearTimeout(timer)
    request?.abort()
    if (visibility.visibilityState !== 'hidden') void poll()
    else callbacks.onUpdating(false)
  }
  visibility.addEventListener('visibilitychange', visibilityChanged)
  void poll()
  return () => {
    active = false
    clearTimeout(timer)
    request?.abort()
    visibility.removeEventListener('visibilitychange', visibilityChanged)
  }
}

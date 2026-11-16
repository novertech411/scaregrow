import type { ChartSnapshot } from '@/lib/dashboard/load-overview'
import { CHART_REFRESH_MS, shouldRefreshChart } from '@/lib/dashboard/overview'

export function pollChartHistory(load: (signal: AbortSignal) => Promise<ChartSnapshot>, callbacks: { onData: (snapshot: ChartSnapshot) => void; onError: (cause: unknown) => void }, visibility: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> = document) {
  let active = true
  let lastFetchedAt: number | null = null
  let inFlight = false
  let request: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  async function refresh() {
    clearTimeout(timer)
    if (!active || visibility.visibilityState === 'hidden' || inFlight) return
    if (!shouldRefreshChart(lastFetchedAt, Date.now())) {
      timer = setTimeout(() => { void refresh() }, CHART_REFRESH_MS - (Date.now() - lastFetchedAt!))
      return
    }
    const controller = new AbortController()
    request = controller
    inFlight = true
    try {
      const next = await load(controller.signal)
      if (active && !controller.signal.aborted) callbacks.onData(next)
    } catch (cause) {
      if (active && !controller.signal.aborted) callbacks.onError(cause)
    } finally {
      if (request === controller) inFlight = false
      if (active && !controller.signal.aborted) {
        lastFetchedAt = Date.now()
        timer = setTimeout(() => { void refresh() }, CHART_REFRESH_MS)
      }
    }
  }
  function visibilityChanged() {
    clearTimeout(timer)
    request?.abort()
    inFlight = false
    if (visibility.visibilityState !== 'hidden') void refresh()
  }
  visibility.addEventListener('visibilitychange', visibilityChanged)
  void refresh()
  return () => { active = false; clearTimeout(timer); request?.abort(); visibility.removeEventListener('visibilitychange', visibilityChanged) }

}

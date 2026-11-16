import type { ReadingAssistantRequest } from './types'

export function validateAssistantRequest(value: unknown): ReadingAssistantRequest {
  const fail = (): never => { throw new Error('Invalid assistant request. Please refresh the readings page and try again.') }
  if (!value || typeof value !== 'object') return fail()
  const { selection, messages } = value as Record<string, unknown>
  if (!selection || typeof selection !== 'object' || !Array.isArray(messages) || messages.length < 1 || messages.length > 20) return fail()
  const s = selection as Record<string, unknown>
  for (const key of ['farmName', 'plotName', 'deviceId']) {
    if (s[key] !== undefined && (typeof s[key] !== 'string' || !(s[key] as string).trim() || (s[key] as string).length > 200)) return fail()
  }
  for (const key of ['from', 'to']) {
    if (typeof s[key] !== 'string' || (s[key] as string).length > 40 || !Number.isFinite(Date.parse(s[key] as string))) return fail()
  }
  const from = Date.parse(s.from as string), to = Date.parse(s.to as string)
  if (from > to || to - from > 31 * 86400000 || to > Date.now() + 300000) return fail()
  if (!Number.isSafeInteger(s.page) || Number(s.page) < 1 || Number(s.page) > 100000) return fail()
  if (!['All', 'Moisture', 'Temperature', 'pH', 'EC'].includes(String(s.parameter))) return fail()
  let length = 0
  const cleanMessages = messages.map((message, index) => {
    if (!message || typeof message !== 'object') return fail()
    const m = message as Record<string, unknown>
    if (m.role !== (index % 2 === 0 ? 'user' : 'assistant') || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 4000) return fail()
    length += m.content.length
    return { role: m.role as 'user' | 'assistant', content: m.content.trim() }
  })
  if (length > 20000 || cleanMessages.at(-1)?.role !== 'user') return fail()
  return {
    selection: {
      farmName: s.farmName as string | undefined, plotName: s.plotName as string | undefined,
      deviceId: s.deviceId as string | undefined, from: new Date(from).toISOString(), to: new Date(to).toISOString(),
      page: Number(s.page), parameter: s.parameter as ReadingAssistantRequest['selection']['parameter'],
    }, messages: cleanMessages,
  }
}

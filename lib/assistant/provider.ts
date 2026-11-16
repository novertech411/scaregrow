import 'server-only'
import type { AssistantMessage } from './types'

export class AssistantProviderError extends Error {
  constructor(message: string, public status = 502) { super(message) }
}

// All provider-specific transport and secrets live here, never in a client component.
export async function generateReadingAnswer(systemPrompt: string, messages: AssistantMessage[], signal?: AbortSignal) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new AssistantProviderError('Greener Assistant is not configured yet. Ask your administrator to set OPENAI_API_KEY on the server.', 503)
  let response: Response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, ...messages], max_completion_tokens: 1000 }),
    })
  } catch {
    throw new AssistantProviderError('The assistant could not connect. Please try again.', 504)
  }
  if (!response.ok) throw new AssistantProviderError(response.status === 429 ? 'The assistant is busy. Please try again shortly.' : 'The assistant could not respond. Please try again.', response.status === 429 ? 429 : 502)
  const data = await response.json().catch(() => null)
  const answer = data?.choices?.[0]?.message?.content
  if (typeof answer !== 'string' || !answer.trim()) throw new AssistantProviderError('The assistant returned an empty response. Please try again.')
  return answer.trim()
}

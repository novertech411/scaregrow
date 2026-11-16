import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { validateAssistantRequest } from '@/lib/assistant/validate-request'
import { buildReadingContext } from '@/lib/assistant/build-reading-context'
import { buildSystemPrompt } from '@/lib/assistant/build-system-prompt'
import { AssistantProviderError, generateReadingAnswer } from '@/lib/assistant/provider'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Request origin is not allowed.' }, 403)
  if (Number(request.headers.get('content-length')) > 40000) return json({ error: 'Request is too large.' }, 413)
  try {
    const client = await createServerSupabaseClient()
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) return json({ error: 'Please sign in to use Greener Assistant.' }, 401)
    let input
    try {
      const body = await request.text()
      if (body.length > 40000) return json({ error: 'Request is too large.' }, 413)
      input = validateAssistantRequest(JSON.parse(body))
    } catch { return json({ error: 'Invalid assistant request. Please refresh the readings page and try again.' }, 400) }
    const context = await buildReadingContext(client, input.selection)
    const answer = await generateReadingAnswer(buildSystemPrompt(context), input.messages, request.signal)
    return json({ answer, analyzedReadings: context.readings.length })
  } catch (error) {
    if (error instanceof AssistantProviderError) return json({ error: error.message }, error.status)
    return json({ error: 'Unable to load assistant context. Please try again.' }, 500)
  }
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronDown, LoaderCircle, RotateCcw, Send } from 'lucide-react'
import type { AssistantMessage as Message, ReadingAssistantSelection } from '@/lib/assistant/types'
import { AssistantMessage } from './assistant-message'
import { withBase } from '@/lib/base-path'

const questions = ['What needs attention?', 'Why is moisture changing?', 'Compare these readings', 'What should I check next?']

export function ReadingsAssistant({ selection, label, disabled }: { selection: ReadingAssistantSelection; label: string; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(new URLSearchParams(window.location.search).get('assistant') === 'open') }, [])
  const contextKey = JSON.stringify(selection)
  return (
    <section className="overflow-hidden rounded-2xl border border-[#c6dfce] bg-[#fbfdf9] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <button type="button" aria-expanded={open} aria-controls="readings-assistant-panel" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-[#1f7a52] sm:p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4d8] text-[#1f7a52]"><Bot aria-hidden="true" className="size-5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#123d2d]">Greener Assistant</span><span className="mt-1 block text-xs leading-5 text-[#587568]">{label}</span></span>
        <span className="hidden text-xs font-semibold text-[#1f7a52] sm:block">{open ? 'Collapse' : 'Explain readings'}</span>
        <ChevronDown className={`size-4 shrink-0 text-[#587568] ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <Conversation key={contextKey} selection={selection} disabled={disabled} />}
    </section>
  )
}

function Conversation({ selection, disabled }: { selection: ReadingAssistantSelection; disabled: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analyzedReadings, setAnalyzedReadings] = useState<number | null>(null)
  const [failedQuestion, setFailedQuestion] = useState('')
  const pending = useRef<AbortController | null>(null)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => () => { pending.current?.abort() }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages, loading, error])

  async function send(question: string) {
    if (!question.trim() || pending.current || disabled) return
    const controller = new AbortController()
    pending.current = controller
    // Retain complete turns only; previous model replies never replace server context.
    const history = messages.slice(-16)
    // A long model reply cannot make the next request exceed validation limits.
    while (history.some((message) => message.content.length > 4000)) history.splice(0, 2)
    while (history.reduce((length, message) => length + message.content.length, question.length) > 18000) history.splice(0, 2)
    const next: Message[] = [...history, { role: 'user', content: question.trim() }]
    setMessages(next)
    setInput('')
    setError('')
    setFailedQuestion('')
    setLoading(true)
    try {
      const response = await fetch(withBase('/api/assistant/readings'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selection, messages: next }), signal: controller.signal })
      const result = await response.json().catch(() => null)
      if (!response.ok || typeof result?.answer !== 'string') throw new Error(result?.error || 'Unable to reach the assistant. Please try again.')
      if (!controller.signal.aborted) {
        setMessages([...next, { role: 'assistant', content: result.answer }])
        setAnalyzedReadings(typeof result.analyzedReadings === 'number' ? result.analyzedReadings : null)
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessages(history)
        setFailedQuestion(question)
        setInput(question)
        setError(error instanceof Error ? error.message : 'Unable to reach the assistant.')
      }
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setLoading(false) }
    }
  }

  return (
    <div id="readings-assistant-panel" className="border-t border-[#d7e8dc]">
      <div className="border-b border-[#e6efe7] px-5 py-3 text-xs leading-5 text-[#587568]">Uses the readings on this page and available open alerts. Changing your selection starts a new conversation.</div>
      <div role="log" aria-label="Assistant conversation" aria-live="polite" aria-relevant="additions" className="flex max-h-[400px] min-h-[160px] flex-col gap-3 overflow-y-auto p-4 sm:p-5">
        {messages.length === 0 && <div className="py-3"><p className="text-sm font-semibold text-[#123d2d]">A second look at your soil data.</p><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Ask about changes, compare measurements, or plan your next field check. Your current filters are already included. This conversation applies to the current page of readings.</p></div>}
        {messages.map((message, index) => <AssistantMessage key={index} message={message} />)}
        {loading && <p role="status" className="flex items-center gap-2 text-sm text-[#587568]"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />Analyzing readings…</p>}
        {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"><p>{error}</p><button type="button" disabled={disabled || loading} onClick={() => send(failedQuestion)} className="mt-2 font-semibold underline disabled:opacity-50">Try again</button></div>}
        <div ref={end} />
      </div>
      <div className="border-t border-[#e6efe7] bg-white p-4 sm:p-5">
        {messages.length > 0 && <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[#587568]" role="status">{analyzedReadings == null ? 'Current readings selection' : `${analyzedReadings} readings analyzed on this page`}</p>
          <button type="button" disabled={loading} onClick={() => { setMessages([]); setError(''); setInput(''); setFailedQuestion(''); setAnalyzedReadings(null) }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1f7a52] hover:bg-[#f4faef] focus-visible:outline-2 focus-visible:outline-[#1f7a52] disabled:opacity-50"><RotateCcw aria-hidden="true" className="size-3" />New conversation</button>
        </div>}
        <div className="mb-3 flex flex-wrap gap-2">{questions.map((question) => <button key={question} type="button" onClick={() => send(question)} disabled={loading || disabled} className="rounded-full border border-[#d7e8dc] bg-[#f4faef] px-3 py-2 text-xs font-medium text-[#356b59] hover:bg-[#e6f4d8] focus-visible:outline-2 focus-visible:outline-[#1f7a52] disabled:opacity-50">{question}</button>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); send(input) }} className="flex gap-2">
          <label htmlFor="assistant-question" className="sr-only">Ask about these readings</label>
          <input id="assistant-question" value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} disabled={loading || disabled} placeholder="Ask about these readings…" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#7dbb98] focus:ring-2 focus:ring-[#dcefe3] disabled:opacity-50" />
          <button type="submit" disabled={loading || disabled || !input.trim()} aria-label="Send question" className="flex h-11 items-center gap-2 rounded-xl bg-[#1f7a52] px-4 text-sm font-semibold text-white hover:bg-[#156b43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f7a52] disabled:opacity-50"><Send aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Send</span></button>
        </form>
        <p className="mt-2 text-[11px] text-slate-500">{disabled ? 'Waiting for readings to load successfully.' : 'AI explanations can be mistaken. Verify recommendations in the field.'}</p>
      </div>
    </div>
  )
}

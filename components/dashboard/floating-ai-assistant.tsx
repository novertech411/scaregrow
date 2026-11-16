'use client'

import { useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bot, X } from 'lucide-react'
import type { DashboardAiSummary } from '@/lib/dashboard/build-ai-summary'

const tones = {
  healthy: 'bg-emerald-50 text-emerald-800',
  attention: 'bg-amber-50 text-amber-800',
  critical: 'bg-red-50 text-red-800',
}

export function FloatingAiAssistant({ summary }: { summary: DashboardAiSummary }) {
  const [open, setOpen] = useState(true)
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const dismiss = () => { setOpen(false); trigger.current?.focus() }

  return (
    <aside aria-label="Greener Assistant" className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-30 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6" onKeyDown={(event) => { if (event.key === 'Escape' && open) { event.preventDefault(); dismiss() } }}>
      <section id={id} aria-labelledby={`${id}-title`} hidden={!open} className="greener-assistant-preview w-[300px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#c6dfce] bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <h2 id={`${id}-title`} className="text-sm font-semibold text-[#123d2d]">Greener Assistant</h2>
          <button type="button" onClick={dismiss} aria-label="Minimize assistant preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#1f7a52]"><X aria-hidden="true" className="size-4" /></button>
        </div>
        <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tones[summary.status]}`}>{summary.headline}</span>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{summary.shortSummary}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-600"><span className="font-semibold">Recommended:</span> {summary.recommendation}</p>
        <Link href="/readings?assistant=open" className="mt-3 inline-flex items-center gap-1 rounded-lg py-2 text-sm font-semibold text-[#1f7a52] hover:underline focus-visible:outline-2 focus-visible:outline-[#1f7a52]">View details <ArrowRight aria-hidden="true" className="size-4" /></Link>
      </section>
      <button ref={trigger} type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Minimize Greener Assistant' : 'Open Greener Assistant'} aria-expanded={open} aria-controls={id} className="greener-assistant-trigger flex size-14 items-center justify-center rounded-full border border-[#c6dfce] bg-[#123d2d] text-white shadow-lg hover:bg-[#1f7a52] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1f7a52]">
        <Bot aria-hidden="true" className="size-6" />
      </button>
    </aside>
  )
}

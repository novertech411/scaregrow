'use client'

import { useEffect, useRef, useState } from 'react'
import { PageLoading } from '@/components/ui/page-loading'
import { adminMessage } from '@/components/admin/use-admin-resource'

export const adminInput = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#4d9b6b] focus:ring-2 focus:ring-[#dff1c3]'
export const adminButton = 'rounded-lg border border-[#d7e8dc] bg-white px-3 py-2 text-xs font-semibold text-[#1f7a52] hover:bg-[#f4faef] focus-visible:outline-2 focus-visible:outline-[#1f7a52] disabled:cursor-not-allowed disabled:opacity-40'
export function AdminTitle({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#587568]">Admin</p><h1 className="text-2xl font-semibold tracking-tight text-[#123d2d]">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div><div className="flex flex-wrap gap-2">{children}</div></div>
}
export function AdminLoadState({ error, loading, hasData, retry }: { error: string; loading: boolean; hasData: boolean; retry: () => Promise<unknown> }) {
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{error}</p>{hasData && <p className="mt-1 text-xs">Showing previously loaded data.</p>}<button type="button" disabled={loading} onClick={() => { void retry().catch(() => {}) }} className="mt-2 font-semibold underline">Retry</button></div>
  return loading && !hasData ? <PageLoading /> : null
}
export function AdminPager({ page, next, total, onPage }: { page: number; next: boolean; total?: number; onPage: (page: number) => void }) {
  return <div className="flex items-center justify-between gap-3 text-xs text-slate-500"><p>{total === undefined ? `Page ${page + 1}` : `${total.toLocaleString()} ${total === 1 ? 'record' : 'records'} · Page ${page + 1}`}</p><div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} className={adminButton}>Previous</button><button type="button" disabled={!next} onClick={() => onPage(page + 1)} className={adminButton}>Next</button></div></div>
}
export function AdminTable({ headings, children }: { headings: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-[#d7e8dc] bg-white"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-[#f4faef] text-[#587568]"><tr>{headings.map((heading) => <th scope="col" key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#edf3ee] [&_td]:px-4 [&_td]:py-4">{children}</tbody></table></div>
}
export function AdminEmpty({ text }: { text: string }) { return <p className="rounded-2xl border border-[#d7e8dc] bg-white p-10 text-center text-sm text-slate-500">{text}</p> }
export type AdminMutation = { title: string; description: string; submitLabel: string; fields?: React.ReactNode; save: (reason: string, signal: AbortSignal) => Promise<unknown> }
export function ReasonDialog({ mutation, onSaved, onClose }: { mutation: AdminMutation; onSaved: () => Promise<unknown>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement | null>(null)
  const request = useRef<AbortController | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [committed, setCommitted] = useState(false)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { request.current?.abort(); element?.close() } }, [])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.current || committed) return
    if (!reason.trim()) { setError('A reason is required.'); return }
    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setError('')
    let saved = false
    try {
      await mutation.save(reason.trim(), controller.signal)
      controller.signal.throwIfAborted()
      saved = true
      setCommitted(true)
      await onSaved()
      if (!controller.signal.aborted) onClose()
    } catch (cause) { if (!controller.signal.aborted) setError(`${saved ? 'The change was saved, but the lists could not be refreshed. Close this dialog and use Refresh. ' : ''}${adminMessage(cause)}`) }
    finally { if (request.current === controller) request.current = null; if (!controller.signal.aborted) setPending(false) }
  }
  return <dialog ref={dialog} aria-labelledby="admin-dialog-title" onCancel={(event) => { event.preventDefault(); if (!pending) onClose() }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-[#d7e8dc] bg-white p-6 shadow-xl backdrop:bg-[#123d2d]/40">
    <form onSubmit={submit} className="space-y-4"><div><h2 id="admin-dialog-title" className="text-lg font-semibold text-[#123d2d]">{mutation.title}</h2><p className="mt-2 text-sm text-slate-600">{mutation.description}</p></div><fieldset disabled={pending || committed} className="space-y-3">{mutation.fields}<label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">Reason (required)<textarea required autoFocus value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#4d9b6b] focus:ring-2 focus:ring-[#dff1c3]" /></label></fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={pending} onClick={onClose} className={adminButton}>{committed ? 'Close' : 'Cancel'}</button><button type="submit" disabled={pending || committed} className="rounded-lg bg-[#123d2d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Saving…' : mutation.submitLabel}</button></div></form>
  </dialog>
}

export function DirectoryNotice({ truncated }: { truncated: boolean }) {
  return truncated ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Showing the first 5,000 users.</p> : null
}

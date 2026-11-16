'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useGreenerSession } from '@/components/session/greener-session'
import { successMessage, type AdminOperation } from '@/lib/admin/actions'

type Feedback = { message: string; clear: () => void; succeed: (operation: AdminOperation, result: unknown) => void }
const Context = createContext<Feedback | null>(null)
// Lives above LandingGate so session.refresh() cannot discard successful action feedback.
export function AdminFeedbackProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useGreenerSession()
  const [notice, setNotice] = useState<{ userId: string; message: string } | null>(null)
  useEffect(() => setNotice(null), [user?.id])
  const clear = useCallback(() => setNotice(null), [])
  const succeed = useCallback((operation: AdminOperation, result: unknown) => {
    if (user && isAdmin) setNotice({ userId: user.id, message: successMessage(operation, result) })
  }, [user?.id, isAdmin])
  return <Context.Provider value={{ message: isAdmin && notice?.userId === user?.id ? notice?.message ?? '' : '', clear, succeed }}>{children}</Context.Provider>
}
export function useAdminFeedback(): Feedback {
  const value = useContext(Context)
  if (!value) throw new Error('AdminFeedbackProvider is required')
  return value
}
export function AdminSuccessMessage({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return message ? <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-[#245e3e]"><p>{message}</p><button type="button" onClick={onDismiss} aria-label="Dismiss success message" className="rounded-lg px-2 py-1 font-semibold hover:bg-emerald-100">Dismiss</button></div> : null
}
export function AdminSuccess() {
  const feedback = useAdminFeedback()
  return <AdminSuccessMessage message={feedback.message} onDismiss={feedback.clear} />
}

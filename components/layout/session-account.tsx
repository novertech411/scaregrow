'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useGreenerSession } from '@/components/session/greener-session'
import { signOut } from '@/lib/supabase/auth'

export function SessionAccount({ compact = false }: { compact?: boolean }) {
  const { profile, user } = useGreenerSession()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const name = profile?.full_name || user?.email || 'Your account'
  async function logout() {
    if (pending) return
    setPending(true)
    setError('')
    try {
      await signOut()
      router.replace('/login')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign out. Please try again.')
      setPending(false)
    }
  }
  return <div className={compact ? 'text-slate-600' : 'text-white'}><div className="flex min-w-0 items-center gap-3">
    {!compact && <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dbeee2] text-xs font-semibold text-[#256d4a]" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</div>}
    <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium" title={name}>{name}</p>{!compact && user?.email !== name && <p className="mt-1 truncate text-[11px] text-white/55">{user?.email}</p>}</div>
    <button type="button" aria-label={pending ? 'Signing out' : 'Sign out'} title="Sign out" disabled={pending} onClick={() => { void logout() }} className="shrink-0 rounded-lg p-2 opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current disabled:opacity-40"><LogOut className="size-4" /></button>
  </div>{error && <p role="alert" className="mt-2 text-xs">{error}</p>}</div>
}

'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PageLoading } from '@/components/ui/page-loading'
import { useGreenerSession } from '@/components/session/greener-session'
import { ownedDevices } from '@/lib/session/owned-devices'
import { resolveLanding } from '@/lib/session/landing'

export function LandingGate({ children }: { children: React.ReactNode }) {
  const session = useGreenerSession()
  const pathname = usePathname()
  const router = useRouter()
  const target = resolveLanding({ status: session.status, isAdmin: session.isAdmin, deviceCount: ownedDevices(session.devices, session.user?.id).length, pathname })
  useEffect(() => {
    if (target) router.replace(target)
    else if (session.status === 'signed-out') router.replace('/login')
  }, [target, session.status, router])

  if (session.status === 'error') return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <p role="alert" className="text-sm text-red-700">{session.error?.message}</p>
      <button type="button" onClick={() => {
        if (session.user) void session.refresh().catch(() => {})
        else window.location.reload()
      }} className="rounded-xl bg-[#123d2d] px-4 py-2 text-sm font-semibold text-white">Try again</button>
      <a href="/login" className="ml-4 text-sm text-[#1f7a52] underline">Back to sign in</a>
    </main>
  )
  if (session.status !== 'ready' || target) return <main className="mx-auto max-w-5xl p-6"><PageLoading /></main>
  return children
}

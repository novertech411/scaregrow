'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useGreenerSession } from '@/components/session/greener-session'
import { PageLoading } from '@/components/ui/page-loading'
import { listMyFarms } from '@/lib/data/farms'
import { ownedDevices, ownedFarms } from '@/lib/session/owned-devices'
import { pairDevice } from '@/lib/data/pairing'
import { signOut } from '@/lib/supabase/auth'
import type { FarmRow } from '@/lib/supabase/database.types'
import { withBase } from '@/lib/base-path'

const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#4d9b6b] focus:ring-2 focus:ring-[#dff1c3]'
const labelClass = 'flex flex-col gap-1.5 text-xs font-semibold text-slate-700'
function messageOf(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Please try again.'
}

export function ConnectDevicePage() {
  const session = useGreenerSession()
  const router = useRouter()
  useEffect(() => { if (session.status === 'signed-out') router.replace('/login') }, [session.status, router])
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-[#123d2d] p-4 sm:p-6 lg:justify-end lg:p-10">
      <img src={withBase('/images/login.webp')} srcSet={`${withBase('/images/login-mobile.webp')} 640w, ${withBase('/images/login.webp')} 1280w`} sizes="100vw" width={1280} height={839} alt="" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(18,61,45,.16),rgba(18,61,45,.46)_48%,rgba(18,61,45,.84))]" aria-hidden="true" />
      <section aria-label="Connect a device to Greener" className="w-full max-w-[420px] rounded-[24px] border border-white/60 bg-white/95 p-6 shadow-[0_24px_80px_rgba(8,35,24,.3)] backdrop-blur sm:p-7 lg:mr-[5vw]">
        <div className="mb-5 flex items-center gap-2.5">
          <img src={withBase('/images/icon.png')} alt="Logo" className="size-6" />
          <p className="text-lg font-bold tracking-tight text-[#123d2d]">Greener</p>
        </div>
        {session.user ? <ConnectDeviceForm key={session.user.id} /> : session.status === 'error' ? <p role="alert" className="text-sm text-red-700">{session.error?.message} <a href={withBase('/login')} className="underline">Back to sign in</a></p> : <PageLoading />}
      </section>
    </main>
  )
}

function ConnectDeviceForm() {
  const session = useGreenerSession()
  const router = useRouter()
  const [deviceId, setDeviceId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [farmId, setFarmId] = useState('')
  const [farmName, setFarmName] = useState('')
  const [farmLocation, setFarmLocation] = useState('')
  const [farms, setFarms] = useState<FarmRow[]>([])
  const [farmsLoading, setFarmsLoading] = useState(true)
  const [farmError, setFarmError] = useState('')
  const [message, setMessage] = useState('')
  const [connected, setConnected] = useState(false)
  const [pending, setPending] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const submitting = useRef(false)
  const request = useRef<AbortController | null>(null)
  const accountRequest = useRef(false)
  const hasDevices = ownedDevices(session.devices, session.user?.id).length > 0

  useEffect(() => {
    const controller = new AbortController()
    void listMyFarms(controller.signal).then((rows) => {
      if (!controller.signal.aborted) setFarms(ownedFarms(rows, session.user?.id))
    }).catch((error) => {
      if (!controller.signal.aborted) setFarmError(messageOf(error))
    }).finally(() => { if (!controller.signal.aborted) setFarmsLoading(false) })
    return () => { controller.abort(); request.current?.abort() }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || accountRequest.current || session.status !== 'ready') return
    submitting.current = true
    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setMessage('')
    setConnected(false)
    let paired = false
    try {
      await pairDevice({ deviceId, deviceName, ...(farmId ? { farmId } : { farmName, farmLocation }) }, controller.signal)
      paired = true
      if (controller.signal.aborted) return
      setConnected(true)
      await session.refresh()
      if (!controller.signal.aborted) router.replace('/')
    } catch (error) {
      if (!controller.signal.aborted) setMessage(`${paired ? 'Your device was connected, but we could not refresh your account. ' : ''}${messageOf(error)}`)
    } finally {
      submitting.current = false
      if (!controller.signal.aborted) setPending(false)
    }
  }

  async function handleSignOut() {
    if (accountRequest.current) return
    accountRequest.current = true
    setSigningOut(true)
    setSignOutError('')
    try {
      await signOut()
      router.replace('/login')
    } catch (error) {
      setSignOutError(messageOf(error))
      setSigningOut(false)
    } finally { accountRequest.current = false }
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-[#123d2d]">{hasDevices ? 'Add another device' : 'Connect your device'}</h1>
        <p className="mt-1 text-xs text-slate-500">Enter the device ID to link it to your account.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" aria-busy={pending}>
        <fieldset disabled={pending || signingOut} className="flex min-w-0 flex-col gap-3">
          <label className={labelClass}>
            Device ID
            <input required autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" aria-describedby="device-id-help" value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className={inputClass} />
          </label>
          <p id="device-id-help" className="-mt-1 text-xs text-slate-500">Exactly as printed on the device — capitals matter</p>
          <label className={labelClass}>
            Device name (optional)
            <input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} className={inputClass} />
          </label>
          {farmsLoading && <p role="status" className="text-xs text-slate-500">Loading farms…</p>}
          {farmError && <p role="alert" className="text-xs text-red-700">We couldn't load your farms. {farmError}</p>}
          {farms.length > 0 && <label className={labelClass}>
            Farm
            <select value={farmId} onChange={(event) => setFarmId(event.target.value)} className={inputClass}>
              <option value="">New farm</option>
              {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}{farm.location ? ` · ${farm.location}` : ''}</option>)}
            </select>
          </label>}
          {!farmId && <>
            <label className={labelClass}>
              Farm name (optional)
              <input value={farmName} onChange={(event) => setFarmName(event.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Location (optional)
              <input value={farmLocation} onChange={(event) => setFarmLocation(event.target.value)} className={inputClass} />
            </label>
          </>}
        </fieldset>
        <button type="submit" disabled={pending || signingOut || farmsLoading || session.status !== 'ready'} className="mt-1 flex h-10.5 items-center justify-center gap-2 rounded-xl bg-[#123d2d] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1f7a52] active:scale-[0.98] disabled:opacity-50">
          {pending ? 'Connecting…' : 'Connect device'} <ArrowRight className="size-4" />
        </button>
        {message && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <p className="font-semibold">{connected ? 'We couldn’t finish loading your account' : "We couldn't connect that device"}</p>
          <p className="mt-1">{message}</p>
        </div>}
        {session.status === 'error' && <div role="alert" className="text-xs text-red-700">
          <p>{session.error?.message}</p>
          <button type="button" onClick={() => { void session.refresh().catch(() => {}) }} className="mt-1 font-semibold underline">Try loading your account again</button>
        </div>}
      </form>
      {hasDevices && <p className="mt-4 text-center text-xs"><Link href="/" className="font-semibold text-[#1f7a52] hover:underline">Back to dashboard</Link></p>}
      {signOutError && <p role="alert" className="mt-4 text-xs text-red-700">{signOutError}</p>}
      <p className="mt-5 break-words text-center text-xs text-slate-500">Signed in as {session.user?.email} · <button type="button" disabled={signingOut} onClick={() => { void handleSignOut() }} className="font-semibold text-[#1f7a52] hover:underline disabled:opacity-50">{signingOut ? 'Signing out…' : 'Sign out'}</button></p>
    </>
  )
}

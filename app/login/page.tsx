'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/supabase/auth'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('error')) {
      setMessage('Sign-in could not be completed. Please try again. Confirmation links may have expired.')
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setPending(true)
    try {
      await signIn(email.trim(), password)
      router.replace('/')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="grid min-h-svh bg-white md:grid-cols-2">
      <section aria-label="Grow with Greener" className="relative isolate flex min-h-[240px] flex-col justify-end overflow-hidden bg-[#123d2d] px-6 py-8 sm:px-10 md:min-h-svh md:p-12 lg:p-16">
        <img
          src="/images/login.webp"
          srcSet="/images/login-mobile.webp 640w, /images/login.webp 1280w"
          sizes="(min-width: 768px) 50vw, 100vw"
          width={1280}
          height={839}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#09281f]/95 via-[#123d2d]/30 to-transparent" aria-hidden="true" />
        <div className="max-w-md text-white">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#d8f2b1]">Rooted in better farming</p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight lg:text-5xl">Know your soil.<br />Grow with confidence.</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">Keep a closer eye on your fields, spot changes early, and give every crop the care it needs.</p>
        </div>
      </section>
      <section aria-label="Sign in to Greener" className="flex items-center justify-center bg-white px-6 py-10 sm:px-10 md:py-16">
      <div className="w-full max-w-[380px] bg-white">
        <div className="mb-5 flex items-center gap-2.5">
          <img src="/images/icon.png" alt="Logo" className="size-6" />
          <p className="text-lg font-bold tracking-tight text-[#123d2d]">Greener</p>
        </div>
        
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#123d2d]">Sign in</h1>
          <p className="mt-1 text-xs text-slate-500">Monitor field conditions and farm intelligence.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Email address
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-[#4d9b6b] focus-within:ring-2 focus-within:ring-[#dff1c3]">
              <Mail className="size-4 text-slate-400" />
              <input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@greenedenfarms.com" className="h-10 w-full bg-transparent px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Password
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-[#4d9b6b] focus-within:ring-2 focus-within:ring-[#dff1c3]">
              <LockKeyhole className="size-4 text-slate-400" />
              <input required autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" className="h-10 w-full bg-transparent px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-500">
              <input type="checkbox" className="size-3.5 accent-[#1f7a52]" />
              Remember me
            </label>
            <button type="button" disabled className="font-semibold text-[#1f7a52] opacity-60">Forgot password?</button>
          </div>

          <button type="submit" disabled={pending} className="mt-1 flex h-10.5 items-center justify-center gap-2 rounded-xl bg-[#123d2d] text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f7a52] disabled:opacity-50">
            {pending ? 'Signing in…' : 'Sign in'} <ArrowRight className="size-4" />
          </button>

          {message && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{message}</p>}
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link href="/signup" className="font-semibold text-[#1f7a52] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
      </section>
    </main>
  )
}

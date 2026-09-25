'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/supabase/auth'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, User } from 'lucide-react'

const farmImage = '/images/login.png'

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSuccess(false)
    setPending(true)
    try {
      const data = await signUp(email.trim(), password, fullName.trim())
      if (data?.session) {
        router.replace('/')
        router.refresh()
      } else {
        setIsSuccess(true)
        setMessage('Account created! Please check your email to confirm your registration.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create account.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-end overflow-hidden bg-[#123d2d] p-4 sm:p-6 lg:p-10">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${farmImage})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,61,45,.16),rgba(18,61,45,.46)_48%,rgba(18,61,45,.84))]" aria-hidden="true" />
      <div className="relative z-10 mr-0 w-full max-w-[420px] rounded-[24px] border border-white/60 bg-white/95 p-6 shadow-[0_24px_80px_rgba(8,35,24,.3)] backdrop-blur sm:p-7 lg:mr-[5vw]">
        <div className="mb-5 flex items-center gap-2.5">
          <img src="/images/icon.png" alt="Logo" className="size-6" />
          <p className="text-lg font-bold tracking-tight text-[#123d2d]">ScareGrow</p>
        </div>
        
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#123d2d]">Create an account</h1>
          <p className="mt-1 text-xs text-slate-500">Get started with real-time farm intelligence.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Full name
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-[#4d9b6b] focus-within:ring-2 focus-within:ring-[#dff1c3]">
              <User className="size-4 text-slate-400" />
              <input required type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Jane Doe" className="h-10 w-full bg-transparent px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Email address
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-[#4d9b6b] focus-within:ring-2 focus-within:ring-[#dff1c3]">
              <Mail className="size-4 text-slate-400" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@greenedenfarms.com" className="h-10 w-full bg-transparent px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Password
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-[#4d9b6b] focus-within:ring-2 focus-within:ring-[#dff1c3]">
              <LockKeyhole className="size-4 text-slate-400" />
              <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" minLength={6} className="h-10 w-full bg-transparent px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>

          <button type="submit" disabled={pending} className="mt-1 flex h-10.5 items-center justify-center gap-2 rounded-xl bg-[#123d2d] text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f7a52] disabled:opacity-50">
            {pending ? 'Creating account…' : 'Sign up'} <ArrowRight className="size-4" />
          </button>

          {message && (
            <p role="alert" className={`rounded-lg px-3 py-2 text-xs ${isSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700'}`}>
              {message}
            </p>
          )}
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#1f7a52] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

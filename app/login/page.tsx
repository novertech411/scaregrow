'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Leaf, LockKeyhole, Mail } from 'lucide-react'

const farmImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/c5adb1f72a0bd20534d25b3b22f84784-z78CaqCWLy3MsoPyKhC2qictx7SXPL.webp'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('Authentication is ready to connect once your account service is configured.')
  }

  return (
    <main className="relative flex min-h-screen items-center justify-end overflow-hidden bg-[#123d2d] p-4 sm:p-8 lg:p-12">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${farmImage})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,61,45,.16),rgba(18,61,45,.46)_48%,rgba(18,61,45,.84))]" aria-hidden="true" />
      <div className="relative z-10 mr-0 w-full max-w-[460px] rounded-[28px] border border-white/60 bg-white/95 p-6 shadow-[0_24px_80px_rgba(8,35,24,.3)] backdrop-blur sm:p-9 lg:mr-[5vw]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#123d2d] text-[#b9e878] shadow-sm"><Leaf className="size-6" strokeWidth={2.5} /></div>
          <div><p className="text-lg font-semibold tracking-tight text-[#123d2d]">ScareGrow</p><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#779083]">Farm intelligence</p></div>
        </div>
        <div className="mb-7"><p className="mb-2 text-sm font-semibold text-[#4d8068]">Welcome back</p><h1 className="text-3xl font-semibold tracking-tight text-[#123d2d]">Sign in to your farm</h1><p className="mt-2 text-sm leading-6 text-slate-500">Monitor field conditions, device health, and alerts from one calm workspace.</p></div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">Email address<div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-[#4d9b6b] focus-within:ring-4 focus-within:ring-[#dff1c3]"><Mail className="size-4 text-slate-400" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@greenedenfarms.com" className="h-11 w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" /></div></label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">Password<div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-[#4d9b6b] focus-within:ring-4 focus-within:ring-[#dff1c3]"><LockKeyhole className="size-4 text-slate-400" /><input required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-11 w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
          <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-slate-500"><input type="checkbox" className="size-4 accent-[#1f7a52]" />Remember me</label><button type="button" className="font-semibold text-[#1f7a52] hover:underline">Forgot password?</button></div>
          <button type="submit" className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#123d2d] text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f7a52]">Sign in <ArrowRight className="size-4" /></button>
          {message && <p role="status" className="rounded-xl bg-[#eef8df] px-3 py-2 text-xs leading-5 text-[#356b59]">{message}</p>}
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or continue with<span className="h-px flex-1 bg-slate-200" /></div>
        <button type="button" onClick={() => setMessage('Google sign-in will be available after authentication is connected.')} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-[#a9d27a] hover:bg-[#f7fcec]"><span className="text-base font-bold text-[#4285f4]">G</span>Sign in with Google</button>
        <p className="mt-7 text-center text-sm text-slate-500">New to ScareGrow? <Link href="/login?mode=signup" className="font-semibold text-[#1f7a52] hover:underline">Create an account</Link></p>
      </div>
    </main>
  )
}

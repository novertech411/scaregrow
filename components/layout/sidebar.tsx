'use client'

import Link from 'next/link'
import { Activity, BarChart3, Plus, Sprout, Wifi } from 'lucide-react'
import type { PageKey } from '@/lib/types'
import { BrandMark } from './brand-mark'
import { SessionAccount } from './session-account'

export const navItems: { label: PageKey; path: string; icon: typeof Activity; comingSoon?: boolean }[] = [
  { label: 'Overview', path: '/', icon: Activity },
  { label: 'Devices', path: '/devices', icon: Wifi },
  { label: 'Readings', path: '/readings', icon: BarChart3, comingSoon: true },
  { label: 'Farms', path: '/farms', icon: Sprout, comingSoon: true },
]

export function Sidebar({ active }: { active: PageKey }) {
  return <aside className="sticky top-0 hidden h-dvh w-[224px] shrink-0 flex-col border-r border-[#174c37] bg-[#123d2d] text-white lg:flex">
    <div className="flex h-[64px] items-center border-b border-white/10 px-5"><BrandMark /></div>
    <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 px-3 py-5">
      {navItems.map(({ label, path, icon: Icon, comingSoon }) => comingSoon ? <div key={label} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/40" aria-disabled="true"><Icon className="size-[18px] shrink-0" strokeWidth={1.8} /><span>{label}</span><span className="ml-auto text-[10px]">Soon</span></div> : <Link key={label} href={path} aria-current={active === label ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#b9e878] ${active === label ? 'bg-[#b9e878] text-[#123d2d] shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}><Icon className="size-[18px] shrink-0" strokeWidth={1.8} />{label}</Link>)}
      <Link href="/connect-device" className="mt-4 flex items-center gap-3 rounded-xl border border-white/20 px-3 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#b9e878]"><Plus className="size-[18px]" />Add device</Link>
    </nav>
    <div className="border-t border-white/10 p-4"><SessionAccount /></div>
  </aside>
}

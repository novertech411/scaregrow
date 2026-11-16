'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { PageKey } from '@/lib/types'
import { navItems } from './sidebar'

export function MobileNav({ activePage }: { activePage: PageKey }) {
  return <nav aria-label="Mobile navigation" className="fixed inset-x-3 bottom-3 z-30 flex min-h-[68px] items-center justify-around rounded-2xl bg-[#123d2d] px-1 shadow-[0_12px_30px_rgba(18,61,45,0.28)] lg:hidden">
    {navItems.map(({ label, path, icon: Icon, comingSoon }) => comingSoon ? <span key={label} aria-disabled="true" className="flex min-w-12 flex-col items-center gap-1 px-1 py-2 text-[10px] text-white/40"><Icon className="size-[18px]" />{label}<span className="text-[8px]">Soon</span></span> : <Link key={label} href={path} aria-current={activePage === label ? 'page' : undefined} className={`flex min-w-12 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-white ${activePage === label ? 'bg-[#b9e878] text-[#123d2d]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon className="size-[18px]" />{label}</Link>)}
    <Link href="/connect-device" className="flex min-w-12 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold text-white/75 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"><Plus className="size-[18px]" />Add device</Link>
  </nav>
}

'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { PageKey } from '@/lib/types'
import { useGreenerSession } from '@/components/session/greener-session'
import { canAccessAdmin } from '@/lib/admin/navigation'
import { navItems } from './sidebar'

export function MobileNav({ activePage }: { activePage?: PageKey }) {
  // Admins navigate with the admin bar under the header instead.
  if (canAccessAdmin(useGreenerSession())) return null
  return <nav aria-label="Mobile navigation" className="fixed inset-x-3 bottom-3 z-30 flex min-h-[68px] items-center justify-around rounded-2xl bg-[#123d2d] px-1 shadow-[0_12px_30px_rgba(18,61,45,0.28)] lg:hidden">
    {navItems.map(({ label, path, icon: Icon }) => <Link key={label} href={path} aria-current={activePage === label ? 'page' : undefined} className={`flex min-w-12 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-white ${activePage === label ? 'bg-[#b9e878] text-[#123d2d]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon className="size-[18px]" />{label}</Link>)}
    <Link href="/connect-device" className="flex min-w-12 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold text-white/75 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"><Plus className="size-[18px]" />Add device</Link>
  </nav>
}

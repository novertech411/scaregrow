'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useGreenerSession } from '@/components/session/greener-session'
import { adminItems, canAccessAdmin } from '@/lib/admin/navigation'

export function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const session = useGreenerSession()
  const pathname = usePathname()
  if (!canAccessAdmin(session)) return null
  return <section aria-label="Admin section" className={mobile ? 'border-b border-[#d8e5d9] bg-[#fbfdf9] px-4 py-3 lg:hidden' : 'mt-6 border-t border-white/15 pt-5'}>
    <h2 className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${mobile ? 'text-[#587568]' : 'px-3 text-white/45'}`}>Admin</h2>
    <nav aria-label={mobile ? 'Mobile admin navigation' : 'Admin navigation'} className={mobile ? 'flex gap-2 overflow-x-auto pb-1' : 'flex flex-col gap-1'}>{adminItems.map((item) => {
      const path = `/admin/${item.section}`
      const selected = pathname === path || pathname.startsWith(`${path}/`)
      return <Link key={path} href={path} aria-current={selected ? 'page' : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#b9e878] ${selected ? 'bg-[#b9e878] text-[#123d2d]' : mobile ? 'text-[#587568] hover:bg-[#eff7e9]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>{item.label}</Link>
    })}</nav>
  </section>
}

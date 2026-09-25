'use client'

import type { PageKey } from '@/lib/types'
import { navItems } from './sidebar'

export function MobileNav({
  activePage,
  onNavigate,
}: {
  activePage: PageKey
  onNavigate: (page: PageKey, path: string) => void
}) {
  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-4 bottom-3 z-30 flex h-[68px] items-center justify-around rounded-2xl bg-[#123d2d] px-2 shadow-[0_12px_30px_rgba(18,61,45,0.28)] lg:hidden">
      {navItems.slice(0, 5).map(({ label, path, icon: Icon }) => (
        <button
          key={label}
          onClick={() => onNavigate(label, path)}
          aria-label={label}
          className={`flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors ${
            activePage === label ? 'bg-[#b9e878] text-[#123d2d]' : 'text-white/75 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icon className="size-[19px]" strokeWidth={2.6} />
          {label === 'Overview' ? 'Home' : label}
        </button>
      ))}
    </nav>
  )
}

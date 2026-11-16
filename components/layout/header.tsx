'use client'

import { SessionAccount } from '@/components/layout/session-account'

export function Header() {
  return <header className="flex h-16 items-center justify-between gap-4 border-b border-[#d8e5d9] bg-[#fbfdf9] px-4 sm:px-6 lg:px-8"><p className="text-sm font-semibold text-[#123d2d] lg:hidden">Greener</p><p className="hidden text-xs text-[#587568] lg:block">Field monitoring</p><div className="ml-auto max-w-64"><SessionAccount compact /></div></header>
}

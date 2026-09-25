'use client'

import {
  Activity,
  AlertTriangle,
  BarChart3,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sprout,
  Users,
  Wifi,
} from 'lucide-react'
import type { PageKey } from '@/lib/types'
import type { CurrentProfile } from '@/lib/supabase/profile'
import { signOut } from '@/lib/supabase/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BrandMark } from './brand-mark'

export const navItems: { label: PageKey; path: string; icon: typeof Activity }[] = [
  { label: 'Overview', path: '/', icon: Activity },
  { label: 'Farms', path: '/farms', icon: Sprout },
  { label: 'Devices', path: '/devices', icon: Wifi },
  { label: 'Readings', path: '/readings', icon: BarChart3 },
  { label: 'Alerts', path: '/alerts', icon: AlertTriangle },
  { label: 'Users', path: '/users', icon: Users },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export function Sidebar({
  active,
  onNavigate,
  collapsed,
  setCollapsed,
  profile,
  openAlerts,
}: {
  active: PageKey
  onNavigate: (page: PageKey, path: string) => void
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  profile: CurrentProfile | null
  openAlerts: number
}) {
  const router = useRouter()
  const [signOutError, setSignOutError] = useState('')
  const logout = async () => {
    try { await signOut(); router.replace('/login'); router.refresh() }
    catch (error) { setSignOutError(error instanceof Error ? error.message : 'Unable to sign out.') }
  }
  const name = profile?.name ?? 'User'
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return (
    <aside
      className={`sticky top-0 h-screen hidden shrink-0 border-r border-[#174c37] bg-[#123d2d] text-white transition-all duration-200 lg:flex lg:flex-col ${
        collapsed ? 'w-[76px]' : 'w-[224px]'
      }`}
    >
      <div className={`flex h-[50px] items-center border-b border-white/10 px-3.5 ${collapsed ? 'justify-between gap-1' : 'justify-between'}`}>
        <BrandMark collapsed={collapsed} />
        {/* <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button> */}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-5">
        {navItems.map(({ label, path, icon: Icon }) => (
          <button
            key={label}
            aria-label={label}
            title={collapsed ? label : undefined}
            onClick={() => onNavigate(label, path)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active === label ? 'bg-[#b9e878] text-[#123d2d] shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
            <span className={collapsed ? 'sr-only' : ''}>{label}</span>
            {label === 'Alerts' && !collapsed && openAlerts > 0 && (
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-red-50 text-[10px] font-semibold text-red-600">{openAlerts}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center gap-3 rounded-xl p-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dbeee2] text-sm font-semibold text-[#256d4a]" title={name}>{initials}</div>
          <div className={collapsed ? 'sr-only' : ''}>
            <p className="text-sm font-semibold text-white truncate">{name}</p>
            <p className="text-xs text-white/55 truncate">{profile?.role ?? 'Loading profile…'}</p>
          </div>
          <button aria-label="Sign out" title="Sign out" onClick={logout} className="ml-auto text-white/50 hover:text-white">
            <LogOut className="size-4" />
          </button>
        </div>
        {signOutError && <p role="alert" className="px-2 text-xs text-red-200">{signOutError}</p>}
      </div>
    </aside>
  )
}

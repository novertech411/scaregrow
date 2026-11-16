'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { LandingGate } from '@/components/session/landing-gate'
import { PageLoading } from '@/components/ui/page-loading'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SessionAccount } from '@/components/layout/session-account'
import { OverviewPage } from '@/components/dashboard/overview-page'
import type { PageKey } from '@/lib/types'

// Other pages retain their existing implementations until their migration phase.
const FarmsPage = dynamic(() => import('./farms-page').then((module) => module.FarmsPage), { loading: PageLoading })
const FarmDetailPage = dynamic(() => import('./farm-detail-page').then((module) => module.FarmDetailPage), { loading: PageLoading })
const DevicesPage = dynamic(() => import('./devices-page').then((module) => module.DevicesPage), { loading: PageLoading })
const ReadingsPage = dynamic(() => import('./readings-page').then((module) => module.ReadingsPage), { loading: PageLoading })
const UsersPage = dynamic(() => import('./users-page').then((module) => module.UsersPage), { loading: PageLoading })
const SettingsPage = dynamic(() => import('./settings-page').then((module) => module.SettingsPage), { loading: PageLoading })
const AlertsPage = dynamic(() => import('./alerts-page').then((module) => module.AlertsPage), { loading: PageLoading })
const AlertDetail = dynamic(() => import('./alerts-page').then((module) => module.AlertDetail), { loading: PageLoading })
type DashboardProps = { initialPage?: PageKey; alertId?: string; deviceId?: string; farmId?: string }

export default function GreenerDashboard(props: DashboardProps) {
  return <LandingGate><GreenerDashboardContent {...props} /></LandingGate>
}

function GreenerDashboardContent({ initialPage = 'Overview', alertId, deviceId, farmId }: DashboardProps) {
  const pathname = usePathname()
  const activePage: PageKey = useMemo(() => {
    if (pathname.startsWith('/farms')) return 'Farms'
    if (pathname.startsWith('/devices')) return 'Devices'
    if (pathname.startsWith('/readings')) return 'Readings'
    if (pathname.startsWith('/alerts')) return 'Alerts'
    if (pathname.startsWith('/users')) return 'Users'
    if (pathname.startsWith('/settings')) return 'Settings'
    return initialPage
  }, [pathname, initialPage])
  const [activeAlertId, setActiveAlertId] = useState<string | undefined>(alertId)
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(deviceId)
  return <div className="flex min-h-dvh bg-[linear-gradient(135deg,#edf8ee_0%,#f8f4ea_52%,#edf2f8_100%)] text-slate-900">
    <a href="#main-content" className="sr-only z-50 rounded bg-white px-4 py-2 text-[#123d2d] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <Sidebar active={activePage} />
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 items-center justify-between gap-4 border-b border-[#d8e5d9] bg-[#fbfdf9] px-4 sm:px-6 lg:px-8"><p className="text-sm font-semibold text-[#123d2d] lg:hidden">Greener</p><p className="hidden text-xs text-[#587568] lg:block">Field monitoring</p><div className="ml-auto max-w-64"><SessionAccount compact /></div></header>
      <main id="main-content" className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
        {activePage === 'Farms' ? (farmId ? <FarmDetailPage farmId={farmId} /> : <FarmsPage />)
          : activePage === 'Devices' ? <DevicesPage selectedDeviceId={activeDeviceId ?? deviceId} onSelectDevice={(id) => setActiveDeviceId(id ?? undefined)} />
          : activePage === 'Readings' ? <ReadingsPage />
          : activePage === 'Alerts' ? (activeAlertId ?? alertId ? <AlertDetail alertId={activeAlertId ?? alertId!} onBack={() => setActiveAlertId(undefined)} /> : <AlertsPage onSelectAlert={setActiveAlertId} />)
          : activePage === 'Users' ? <UsersPage />
          : activePage === 'Settings' ? <SettingsPage />
          : <OverviewPage />}
      </main>
      <MobileNav activePage={activePage} />
    </div>
  </div>
}

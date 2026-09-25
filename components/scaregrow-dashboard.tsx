'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { PageLoading, PanelLoading } from '@/components/ui/page-loading'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BatteryMedium,
  ChevronDown,
  CloudSun,
  Droplets,
  Map,
  ShieldCheck,
  Signal,
  Wifi,
  X,
} from 'lucide-react'
import type { Alert, PageKey, Reading } from '@/lib/types'
import { getReadings, getMoistureTrend } from '@/lib/services/readings'
import { getAlerts } from '@/lib/services/alerts'
import { getDashboardSummary } from '@/lib/services/dashboard'
import { getMapDevices, type MapDevice } from '@/lib/services/map-devices'
import { getCurrentProfile, type CurrentProfile } from '@/lib/supabase/profile'
import { toAlert, toReading } from '@/lib/services/presenters'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { BrandMark } from '@/components/layout/brand-mark'
import { MetricCard } from '@/components/dashboard/metric-card'
import { ReadingsTable } from '@/components/dashboard/readings-table'
import { AlertsPanel } from '@/components/dashboard/alerts-panel'

const FarmMap = dynamic(() => import('@/components/dashboard/farm-map').then((module) => module.FarmMap), { loading: () => <PanelLoading label="Loading map…" className="min-h-[430px]" /> })
const TrendChart = dynamic(() => import('@/components/dashboard/trend-chart').then((module) => module.TrendChart), { loading: () => <PanelLoading label="Loading chart…" className="min-h-[310px]" /> })
const FarmsPage = dynamic(() => import('./farms-page').then((module) => module.FarmsPage), { loading: PageLoading })
const FarmDetailPage = dynamic(() => import('./farm-detail-page').then((module) => module.FarmDetailPage), { loading: PageLoading })
const DevicesPage = dynamic(() => import('./devices-page').then((module) => module.DevicesPage), { loading: PageLoading })
const ReadingsPage = dynamic(() => import('./readings-page').then((module) => module.ReadingsPage), { loading: PageLoading })
const UsersPage = dynamic(() => import('./users-page').then((module) => module.UsersPage), { loading: PageLoading })
const SettingsPage = dynamic(() => import('./settings-page').then((module) => module.SettingsPage), { loading: PageLoading })
const AlertsPage = dynamic(() => import('./alerts-page').then((module) => module.AlertsPage), { loading: PageLoading })
const AlertDetail = dynamic(() => import('./alerts-page').then((module) => module.AlertDetail), { loading: PageLoading })

export default function ScareGrowDashboard({
  initialPage = 'Overview',
  alertId,
  deviceId,
  farmId,
}: {
  initialPage?: PageKey
  alertId?: string
  deviceId?: string
  farmId?: string
}) {
  const router = useRouter()
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


  const [profile, setProfile] = useState<CurrentProfile | null>(null)
  useEffect(() => { getCurrentProfile().then(setProfile).catch((error) => setLoadError(error.message)) }, [])
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [readings, setReadings] = useState<Reading[]>([])
  const [mapDevices, setMapDevices] = useState<MapDevice[]>([])
  const [selectedPlot, setSelectedPlot] = useState<Reading | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [trend, setTrend] = useState<{ day: string; moisture: number }[]>([])
  const [summary, setSummary] = useState({ onlineDevices: 0, offlineDevices: 0, openAlerts: 0, lowBatteryDevices: null as number | null })
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    if (activePage !== 'Overview') return
    getMapDevices().then(setMapDevices).catch((error) => setLoadError(error.message))
    Promise.all([getReadings({ limit: 10 }), getAlerts({ status: 'open', limit: 5 }), getMoistureTrend('SG-JOS-001')])
      .then(([rows, alertRows, trendRows]) => {
        const mapped = rows.map(toReading)
        setReadings(mapped)
        setSelectedPlot(mapped[0] ?? null)
        setAlerts(alertRows.map(toAlert))
        setTrend(trendRows.map((row) => ({ day: new Date(String(row.measured_at)).toLocaleDateString(), moisture: Number(row.moisture_pct ?? 0) })))
      })
      .catch((error) => setLoadError(error.message))
  }, [activePage])

  // The summary also supplies the shared navigation alert count.
  useEffect(() => {
    getDashboardSummary().then(setSummary).catch((error) => setLoadError(error.message))
  }, [])

  const [activeAlertId, setActiveAlertId] = useState<string | undefined>(alertId)
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(deviceId)


  const handleNavigate = (page: PageKey, path: string) => {
    setActiveAlertId(undefined)
    setActiveDeviceId(undefined)
    setMobileOpen(false)
    router.push(path)
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return readings
    return readings.filter((row) => [row.plot, row.farm, row.crop, row.device, row.status].some((value) => value.toLowerCase().includes(query)))
  }, [search, readings])

  return (
    <div className="flex min-h-screen bg-[linear-gradient(135deg,#edf8ee_0%,#f8f4ea_52%,#edf2f8_100%)] text-slate-900">
      <Sidebar active={activePage} onNavigate={handleNavigate} collapsed={collapsed} setCollapsed={setCollapsed} profile={profile} openAlerts={summary.openAlerts} />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/20 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-[255px] bg-[#123d2d] text-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
              <BrandMark />
              <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header active={activePage} search={search} setSearch={setSearch} setMobileOpen={setMobileOpen} profile={profile} />

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {loadError && <p role="alert" className="mb-4 text-sm text-red-700">{loadError}</p>}
          {activePage === 'Farms' ? (
            farmId ? <FarmDetailPage farmId={farmId} /> : <FarmsPage />
          ) : activePage === 'Devices' ? (
            <DevicesPage selectedDeviceId={activeDeviceId ?? deviceId} onSelectDevice={(id) => setActiveDeviceId(id ?? undefined)} />
          ) : activePage === 'Readings' ? (
            <ReadingsPage />
          ) : activePage === 'Alerts' ? (
            activeAlertId ?? alertId ? (
              <AlertDetail alertId={activeAlertId ?? alertId!} onBack={() => setActiveAlertId(undefined)} />
            ) : (
              <AlertsPage onSelectAlert={(id) => setActiveAlertId(id)} />
            )
          ) : activePage === 'Users' ? (
            <UsersPage />
          ) : activePage === 'Settings' ? (
            <SettingsPage />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#2b8b61]">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Good morning, {profile?.name?.split(' ')[0] ?? 'there'}</h1>
                
                </div>
                <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                  <Map className="size-4 text-[#1f7a52]" />Green Eden Farm<ChevronDown className="size-4 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <MetricCard title="Active devices" value={String(summary.onlineDevices)} subtitle="Online devices" icon={Wifi} tone="bg-[#d8f2b1] text-[#245e3e] ring-4 ring-[#eef9de]" />
                <MetricCard title="Offline devices" value={String(summary.offlineDevices)} subtitle="Needs attention" icon={Signal} tone="bg-[#dbe8e4] text-[#356b59] ring-4 ring-[#f0f6f2]" />
                <MetricCard title="Open alerts" value={String(summary.openAlerts)} subtitle="Open alerts" icon={AlertTriangle} tone="bg-[#ffe4a8] text-[#9a5b08] ring-4 ring-[#fff4d7]" />
                <MetricCard title="Low battery" value={summary.lowBatteryDevices == null ? "—" : String(summary.lowBatteryDevices)} subtitle="Threshold not configured" icon={BatteryMedium} tone="bg-red-50 text-red-600" />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
                <FarmMap readings={readings} devices={mapDevices} selectedPlot={selectedPlot} setSelectedPlot={setSelectedPlot} onNavigate={handleNavigate} />
                <div className="flex flex-col gap-5">
                  {selectedPlot && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">Current conditions</h2>
                        <p className="mt-1 text-xs text-slate-400">{selectedPlot.plot} · {selectedPlot.updated}</p>
                      </div>
                      <CloudSun className="size-5 text-[#1f7a52]" />
                    </div>
                    <div className="mt-5 flex items-end gap-2">
                      <p className="text-4xl font-semibold tracking-tight text-slate-900">{selectedPlot.temperature}°C</p>
                      <p className="pb-1 text-xs text-slate-400">field temperature</p>
                    </div>
                    <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-3 text-center">
                      <div>
                        <Droplets className="mx-auto size-4 text-[#1f7a52]" />
                        <p className="mt-1 text-xs text-slate-400">Humidity</p>
                        <p className="mt-1 text-sm font-semibold">—</p>
                      </div>
                      <div>
                        <CloudSun className="mx-auto size-4 text-amber-500" />
                        <p className="mt-1 text-xs text-slate-400">Forecast</p>
                        <p className="mt-1 text-sm font-semibold">—</p>
                      </div>
                      <div>
                        <Activity className="mx-auto size-4 text-slate-500" />
                        <p className="mt-1 text-xs text-slate-400">Wind</p>
                        <p className="mt-1 text-sm font-semibold">—</p>
                      </div>
                    </div>
                  </div>}

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">Device connectivity</h2>
                        <p className="mt-1 text-xs text-slate-400">Last sync across the farm</p>
                      </div>
                      <ShieldCheck className="size-5 text-[#1f7a52]" />
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="relative flex size-16 items-center justify-center rounded-full border-[6px] border-emerald-100">
                        <span className="text-lg font-semibold text-slate-800">{summary.onlineDevices + summary.offlineDevices ? Math.round(summary.onlineDevices / (summary.onlineDevices + summary.offlineDevices) * 100) : 0}%</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Mostly online</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{summary.onlineDevices} online · {summary.offlineDevices} offline</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <ReadingsTable rows={filteredRows} onSelect={setSelectedPlot} />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <TrendChart trendData={trend} />
                <AlertsPanel alerts={alerts} onNavigate={handleNavigate} />
              </div>
            </div>
          )}
        </main>

        <MobileNav activePage={activePage} onNavigate={handleNavigate} />
      </div>
    </div>
  )
}

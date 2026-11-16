const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { createClient } = require('@supabase/supabase-js')
function load(relative, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)((id) => {
    if (id in overrides) return overrides[id]
    if (id.startsWith('@/')) {
      const base = id.slice(2)
      return load(`${base}${fs.existsSync(path.resolve(__dirname, '..', `${base}.ts`)) ? '.ts' : '.tsx'}`, overrides)
    }
    return require(id)
  }, module, module.exports)
  return module.exports
}
const { ownedDevices, pickDevice } = load('lib/session/owned-devices.ts')
const base = { hardware_version: 'v2', enabled: true, archived_at: null, last_received_at: '2026-11-16T12:00:00Z', claimed_at: null, farm: null }
const ownA = { ...base, device_id: 'GEF-003', display_name: 'Alpha field', owner_user_id: 'admin-1' }
const ownZ = { ...base, device_id: 'GEF-002', display_name: 'Zulu field', owner_user_id: 'admin-1' }
const ownUnnamed = { ...base, device_id: 'GEF-001', display_name: '', owner_user_id: 'admin-1' }
const other = { ...base, device_id: 'OTHER', display_name: 'Other farmer', owner_user_id: 'farmer-2' }
const unclaimed = { ...base, device_id: 'UNCLAIMED', display_name: null, owner_user_id: null }
const all = [other, ownZ, unclaimed, ownUnnamed, ownA]
test('ownedDevices filters an admin-wide list, sorts display names/fallback IDs and does not mutate input', () => {
  assert.deepEqual(ownedDevices(all, 'admin-1'), [ownA, ownUnnamed, ownZ])
  assert.deepEqual(all, [other, ownZ, unclaimed, ownUnnamed, ownA])
  assert.deepEqual(ownedDevices(all, 'farmer-2'), [other])
  assert.deepEqual(ownedDevices(all, null), [])
  assert.deepEqual(ownedDevices(all, undefined), [])
  assert.deepEqual(ownedDevices(all, 'missing'), [])
})
test('pickDevice accepts only an owned ID, falls back in sorted order, and handles no devices', () => {
  const owned = ownedDevices(all, 'admin-1')
  assert.equal(pickDevice(owned, ownZ.device_id), ownZ)
  for (const requested of [other.device_id, 'gef-003', 'unknown', null, undefined]) assert.equal(pickDevice(owned, requested), ownA)
  assert.equal(pickDevice([], 'GEF-003'), null)
})
const session = { user: { id: 'admin-1' }, devices: all, refresh: async () => {} }
const overrides = {
  '@/components/session/greener-session': { useGreenerSession: () => session },
  '@/components/dashboard/overview-page': { DeviceOverview: ({ deviceId }) => React.createElement('div', { 'data-shared-overview': deviceId }) },
}
const { DevicesPage } = load('components/devices-page.tsx', overrides)
test('device cards show only owned devices, status text/icons, view links and add-device link', () => {
  const markup = renderToStaticMarkup(React.createElement(DevicesPage))
  assert.match(markup, /Alpha field/)
  assert.match(markup, /No farm assigned/)
  assert.match(markup, /Active/)
  assert.match(markup, /Last data received/)
  assert.match(markup, /href="\/devices\/GEF-003"/)
  assert.match(markup, /href="\/connect-device"/)
  assert.doesNotMatch(markup, /Other farmer|OTHER|UNCLAIMED/)
})
test('device detail reuses shared overview only for owned devices', () => {
  const own = renderToStaticMarkup(React.createElement(DevicesPage, { selectedDeviceId: ownA.device_id }))
  assert.match(own, /data-shared-overview="GEF-003"/)
  assert.match(own, /All devices/)
  for (const id of ['unknown', other.device_id, unclaimed.device_id]) {
    const unknown = renderToStaticMarkup(React.createElement(DevicesPage, { selectedDeviceId: id }))
    assert.match(unknown, /Device not found/)
    assert.doesNotMatch(unknown, /data-shared-overview/)
  }
})
test('empty owned list shows an empty state even when admin can see other farmers devices', () => {
  const { DevicesPage: EmptyDevices } = load('components/devices-page.tsx', { ...overrides, '@/components/session/greener-session': { useGreenerSession: () => ({ ...session, devices: [other, unclaimed] }) } })
  assert.match(renderToStaticMarkup(React.createElement(EmptyDevices)), /No devices connected yet/)
})
const { DeviceStatusBanner } = load('components/dashboard/device-status-banner.tsx')
test('locked and archived banners carry exact text and icons, with archive priority', () => {
  const locked = renderToStaticMarkup(React.createElement(DeviceStatusBanner, { enabled: false, archivedAt: null }))
  assert.match(locked, /<svg/)
  assert.match(locked, /This device is locked by an administrator. New data isn&#x27;t being recorded./)
  const archived = renderToStaticMarkup(React.createElement(DeviceStatusBanner, { enabled: false, archivedAt: '2026-11-16' }))
  assert.match(archived, /This device has been archived./)
  assert.match(archived, /<svg/)
  assert.doesNotMatch(archived, /locked by/)
  assert.equal(renderToStaticMarkup(React.createElement(DeviceStatusBanner, { enabled: true, archivedAt: null })), '')
})
function renameSetup(result, status = 200) {
  const requests = []
  const client = createClient('https://devices.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options) => {
      requests.push({ url: new URL(input), method: options.method, body: JSON.parse(options.body) })
      return new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  return { requests, renameDevice: load('lib/dashboard/rename-device.ts', { '@/lib/supabase/client': { createClient: () => client } }).renameDevice }
}
test('rename refuses a null result without refreshing or changing the old device name', async () => {
  const { renameDevice } = renameSetup([])
  let refreshed = false
  await assert.rejects(renameDevice(ownA.device_id, 'Changed', async () => { refreshed = true }), /could not be saved/)
  assert.equal(refreshed, false)
  assert.equal(ownA.display_name, 'Alpha field')
})
test('rename propagates backend failure and retains the old name', async () => {
  const { renameDevice } = renameSetup({ message: 'Rename denied', code: 'DENIED' }, 403)
  await assert.rejects(renameDevice(ownA.device_id, 'Changed', () => assert.fail('Must not refresh')), { message: 'Rename denied' })
  assert.equal(ownA.display_name, 'Alpha field')
})
test('rename updates only the display name and awaits session refresh after success', async () => {
  const renamed = { ...ownA, display_name: 'Changed' }
  const { renameDevice, requests } = renameSetup([renamed])
  let refreshed = false
  const result = await renameDevice(ownA.device_id, ' Changed ', async () => { refreshed = true })
  assert.equal(refreshed, true)
  assert.equal(result.display_name, 'Changed')
  assert.deepEqual(requests[0].body, { display_name: 'Changed' })
  assert.equal(requests[0].url.searchParams.get('device_id'), 'eq.GEF-003')
  assert.equal(requests[0].method, 'PATCH')
})
test('dead routes render only the shared unavailable panel without loading old pages', () => {
  for (const pathname of ['/alerts', '/alerts/123', '/users', '/settings']) {
    const { default: Dashboard } = load('components/greener-dashboard.tsx', {
      'next/navigation': { usePathname: () => pathname },
      'next/dynamic': { default: () => () => { throw new Error('An old page must not mount') } },
      '@/components/session/landing-gate': { LandingGate: ({ children }) => children },
      '@/components/layout/sidebar': { Sidebar: () => null },
      '@/components/layout/mobile-nav': { MobileNav: () => null },
      '@/components/layout/header': { Header: () => null },
      '@/components/dashboard/overview-page': { OverviewPage: () => { throw new Error('Overview must not mount') } },
    })
    const markup = renderToStaticMarkup(React.createElement(Dashboard))
    assert.match(markup, /Not available yet/)
    assert.match(markup, /This section isn&#x27;t available yet./)
  }
})

test('Overview URL selection cannot expose another owners device in an admin session', () => {
  const { OverviewPage } = load('components/dashboard/overview-page.tsx', {
    '@/components/session/greener-session': { useGreenerSession: () => session },
    'next/navigation': { usePathname: () => '/', useRouter: () => ({ replace: () => {} }), useSearchParams: () => new URLSearchParams('device=OTHER') },
  })
  const markup = renderToStaticMarkup(React.createElement(OverviewPage))
  assert.match(markup, /Alpha field/)
  assert.match(markup, /value="GEF-003" selected=""/)
  assert.doesNotMatch(markup, /Other farmer|value="OTHER"|UNCLAIMED/)
})
test('chart selector defaults to soil moisture and offers only hardware-supported metrics', () => {
  const { DeviceHistoryChart } = load('components/dashboard/device-history-chart.tsx')
  const render = (hardwareVersion) => renderToStaticMarkup(React.createElement(DeviceHistoryChart, { deviceId: 'GEF-003', hardwareVersion }))
  const v1 = render('v1')
  const v2 = render('v2')
  assert.match(v1, /value="soil_moisture_pct" selected=""/)
  assert.equal((v1.match(/<option /g) || []).length, 7)
  assert.equal((v2.match(/<option /g) || []).length, 13)
  assert.doesNotMatch(v1, /value="air_humidity_pct"/)
  assert.match(v2, /value="air_humidity_pct"/)
})

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { createClient } = require('@supabase/supabase-js')

function load(relative, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)((id) => {
    if (id in overrides) return overrides[id]
    if (id.startsWith('@/')) return load(`${id.slice(2)}.ts`, overrides)
    return require(id)
  }, module, module.exports)
  return module.exports
}
function setup(file, respond = () => ({ body: [] })) {
  const requests = []
  const client = createClient('https://data.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options) => {
      const request = { url: new URL(input), method: options.method, headers: new Headers(options.headers), body: options.body ? JSON.parse(options.body) : undefined, signal: options.signal }
      requests.push(request)
      const result = respond(request)
      return new Response(options.method === 'HEAD' ? null : JSON.stringify(result.body), {
        status: result.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...result.headers },
      })
    } },
  })
  client.auth.getUser = async () => ({ data: { user: { id: 'user-1' } }, error: null })
  return { requests, service: load(`lib/data/${file}.ts`, { '@/lib/supabase/client': { createClient: () => client } }) }
}

test('pairing trims details, uses null for blanks, and keeps the device ID case', async () => {
  const { service, requests } = setup('pairing', () => ({ body: 'GEF-002' }))
  assert.equal(await service.pairDevice({ deviceId: ' GEF-002 ', deviceName: ' Probe ', farmName: ' ', farmLocation: '\t' }), 'GEF-002')
  assert.equal(requests[0].url.pathname, '/rest/v1/rpc/pair_device')
  assert.deepEqual(requests[0].body, { p_device_id: 'GEF-002', p_device_name: 'Probe', p_farm_name: null, p_farm_location: null })
  await service.pairDevice({ deviceId: 'GEF-002', farmId: ' farm-1 ', farmName: 'ignored', farmLocation: ' Jos ' })
  assert.deepEqual(requests[1].body, { p_device_id: 'GEF-002', p_device_name: null, p_farm_id: 'farm-1', p_farm_location: 'Jos' })
  await assert.rejects(service.pairDevice({ deviceId: ' ' }), service.PairingError)
  assert.equal(requests.length, 2)
})

test('pairing preserves backend error message and code', async () => {
  const { service } = setup('pairing', () => ({ status: 400, body: { message: 'Original error', code: 'P0001' } }))
  await assert.rejects(service.pairDevice({ deviceId: 'GEF-002' }), (error) => error instanceof service.PairingError && error.message === 'Original error' && error.code === 'P0001')
})

test('latest queries isolate packet type and use stable receipt ordering', async () => {
  const { service, requests } = setup('sensor-readings')
  assert.equal(await service.getLatestFullReading('GEF-002'), null)
  await service.getLatestMoistureReading('GEF-002')
  const p = requests[0].url.searchParams
  assert.equal(p.get('device_id'), 'eq.GEF-002')
  assert.equal(p.get('packet_type'), 'eq.sensor')
  assert.equal(p.get('order'), 'received_at.desc,id.desc')
  assert.equal(p.get('limit'), '1')
  assert.equal(requests[1].url.searchParams.get('packet_type'), 'eq.moisture')
})

test('history filters receipt dates and paginates a stable ordered range; count has no range', async () => {
  const { service, requests } = setup('sensor-readings', () => ({ body: [], headers: { 'Content-Range': '10-14/23' } }))
  const filters = { deviceId: 'GEF-002', from: '2026-11-01T00:00:00Z', to: '2026-11-16T00:00:00Z', packetType: 'sensor' }
  assert.deepEqual(await service.getReadingHistory({ ...filters, limit: 5, offset: 10, ascending: true }), [])
  const p = requests[0].url.searchParams
  assert.equal(p.get('device_id'), 'eq.GEF-002')
  assert.deepEqual(p.getAll('received_at'), [`gte.${filters.from}`, `lte.${filters.to}`])
  assert.equal(p.get('packet_type'), 'eq.sensor')
  assert.equal(p.get('order'), 'received_at.asc,id.asc')
  assert.equal(p.get('offset'), '10')
  assert.equal(p.get('limit'), '5')
  assert.equal(await service.getReadingCount(filters), 23)
  assert.equal(requests[1].method, 'HEAD')
  assert.match(requests[1].headers.get('prefer'), /count=exact/)
  assert.equal(requests[1].url.searchParams.has('limit'), false)
})

test('device queries select the explicit farm relationship and handle missing rows', async () => {
  const { service, requests } = setup('devices')
  assert.deepEqual(await service.listMyDevices(), [])
  assert.match(requests[0].url.searchParams.get('select'), /farm:farms!devices_farm_id_fkey\(id,name,location\)/)
  assert.equal(requests[0].url.searchParams.get('order'), 'device_id.asc')
  assert.equal(await service.getDevice('missing'), null)
})

test('profile inserts the signed-in user when missing', async () => {
  const profile = { id: 'user-1', full_name: 'Ada', created_at: '2026-11-16T00:00:00Z' }
  const { service, requests } = setup('profile', ({ method }) => ({ body: method === 'GET' ? [] : profile }))
  assert.deepEqual(await service.ensureMyProfile('Ada'), profile)
  assert.equal(requests[1].method, 'POST')
  assert.deepEqual(requests[1].body, { id: 'user-1', full_name: 'Ada' })
})

test('existing profile updates only full_name, or performs no write when omitted', async () => {
  const profile = { id: 'user-1', full_name: 'Ada', created_at: '2026-11-16T00:00:00Z' }
  const { service, requests } = setup('profile', ({ method }) => ({ body: method === 'GET' ? [profile] : { ...profile, full_name: 'New' } }))
  await service.ensureMyProfile('New')
  assert.equal(requests[1].method, 'PATCH')
  assert.deepEqual(requests[1].body, { full_name: 'New' })
  assert.equal(requests[1].url.searchParams.get('id'), 'eq.user-1')
  await service.ensureMyProfile()
  assert.equal(requests.length, 3)
})

test('admin detection accepts only literal true and propagates errors', async () => {
  for (const value of [true, false, null, 'true', 1, {}, []]) {
    const { service } = setup('admin', () => ({ body: value }))
    assert.equal(await service.isSuperAdmin(), value === true)
  }
  const { service } = setup('admin', () => ({ status: 403, body: { message: 'Denied' } }))
  await assert.rejects(service.isSuperAdmin(), { message: 'Denied' })
})

test('admin management validates reasons before fetching and sends exact RPC arguments', async () => {
  const { service, requests } = setup('admin', () => ({ body: null }))
  await assert.rejects(service.manageDevice('GEF-002', 'archive', ' '), /reason/)
  await assert.rejects(service.registerDevice('GEF-002', 'v2', null, ' '), /reason/)
  await assert.rejects(service.setAllDevicesLocked(true, ' '), /reason/)
  await assert.rejects(service.updateDeviceName('GEF-002', 'Probe', ' '), /reason/)
  await assert.rejects(service.updateFarmAsAdmin('farm-1', 'Farm', null, ' '), /reason/)
  assert.equal(requests.length, 0)
  await service.manageDevice('GEF-002', 'archive', ' Retired ')
  assert.equal(requests[0].url.pathname, '/rest/v1/rpc/admin_manage_device')
  assert.deepEqual(requests[0].body, { p_device_id: 'GEF-002', p_action: 'archive', p_reason: 'Retired' })
})

test('admin user limits are clamped to 1–100 with defaults', async () => {
  const { service, requests } = setup('admin')
  for (const limit of [-2, 500, 12.9]) await service.listUsers({ limit, offset: 10 })
  await service.listUsers()
  assert.deepEqual(requests.map((r) => r.body.p_limit), [1, 100, 12, 50])
  assert.deepEqual(requests.map((r) => r.body.p_offset), [10, 10, 10, 0])
})

test('query failures propagate and AbortSignal is forwarded', async () => {
  const { service, requests } = setup('farms', () => ({ status: 403, body: { message: 'Denied' } }))
  const controller = new AbortController()
  await assert.rejects(service.listMyFarms(controller.signal), { message: 'Denied' })
  assert.equal(requests[0].signal, controller.signal)
})

const presenters = load('lib/data/presenters.ts')
test('admin status follows archived, locked, unclaimed, claimed priority', () => {
  const status = presenters.deviceAdminStatus
  assert.equal(status({ archived_at: '2026-11-16', enabled: false, owner_user_id: null }), 'Archived')
  assert.equal(status({ archived_at: null, enabled: false, owner_user_id: null }), 'Locked')
  assert.equal(status({ archived_at: null, enabled: true, owner_user_id: null }), 'Unclaimed')
  assert.equal(status({ archived_at: null, enabled: true, owner_user_id: 'user-1' }), 'Claimed')
})
test('device presenter uses contract labels and receipt timestamp', () => {
  assert.deepEqual(presenters.toDeviceView({ device_id: 'GEF-002', display_name: '', farm: null, hardware_version: 'v1', enabled: true, archived_at: null, last_received_at: null, claimed_at: null }), {
    id: 'GEF-002', name: 'GEF-002', farmName: 'No farm assigned', farmLocation: null, hardwareVersion: 'v1', enabled: true, archived: false, lastDataReceived: null, claimedAt: null,
  })
})
const metrics = load('lib/measurements.ts')
test('measurements distinguish missing and non-finite values from zero', () => {
  for (const value of [null, undefined, NaN, Infinity, -Infinity]) assert.equal(metrics.formatMeasurement(value, 'soil_moisture_pct'), 'Unavailable')
  assert.equal(metrics.formatMeasurement(0, 'soil_moisture_pct'), '0 %')
  assert.equal(metrics.formatMeasurement(6.789, 'soil_ph'), '6.79 pH')
  assert.equal(metrics.measurements.length, 13)
  assert.equal(metrics.measurementsFor('v1').length, 7)
  assert.ok(metrics.measurementsFor('v1').every((m) => m.group === 'soil' || m.group === 'nutrients'))
  for (const version of ['v2', null, 'unknown']) assert.equal(metrics.measurementsFor(version).length, 13)
  assert.ok(metrics.measurements.filter((m) => m.isEstimate).every((m) => m.formulaNote && m.label.startsWith('Estimated')))
})
test('timestamp formatting uses Intl local time and invalid dates are unavailable', () => {
  const iso = '2026-11-16T12:00:00+01:00'
  assert.equal(metrics.formatTimestamp(iso), new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)))
  for (const value of [null, undefined, 'bad']) {
    assert.equal(metrics.formatTimestamp(value), 'Unavailable')
    assert.equal(metrics.formatRelative(value), 'Unavailable')
  }
  assert.match(metrics.formatRelative(new Date(Date.now() - 120000).toISOString()), /2 minutes ago/)
})

test('admin RPC wrappers preserve exact contract argument names', async () => {
  const { service, requests } = setup('admin', () => ({ body: null }))
  await service.registerDevice('GEF-002', 'v2', 'Probe', 'Inventory')
  await service.setAllDevicesLocked(true, 'Maintenance')
  await service.updateDeviceName('GEF-002', null, 'Correction')
  await service.updateFarmAsAdmin('farm-1', 'North', 'Jos', 'Correction')
  assert.deepEqual(requests.map((r) => [r.url.pathname.split('/').pop(), r.body]), [
    ['admin_register_device', { p_device_id: 'GEF-002', p_hardware_version: 'v2', p_display_name: 'Probe', p_reason: 'Inventory' }],
    ['admin_set_all_devices_locked', { p_locked: true, p_reason: 'Maintenance' }],
    ['admin_update_device_name', { p_device_id: 'GEF-002', p_display_name: null, p_reason: 'Correction' }],
    ['admin_update_farm', { p_farm_id: 'farm-1', p_name: 'North', p_location: 'Jos', p_reason: 'Correction' }],
  ])
})
test('admin audit log is ordered and paginated; lists retain farm joins', async () => {
  const { service, requests } = setup('admin')
  assert.deepEqual(await service.listAuditLog({ limit: 5, offset: 10 }), [])
  const p = requests[0].url.searchParams
  assert.equal(p.get('order'), 'created_at.desc')
  assert.equal(p.get('offset'), '10')
  assert.equal(p.get('limit'), '5')
  await service.listAllDevices()
  await service.listAllFarms()
  assert.match(requests[1].url.searchParams.get('select'), /farms!devices_farm_id_fkey/)
  assert.equal(requests[2].url.pathname, '/rest/v1/farms')
})
test('farm edits whitelist name and location and device edits only display_name', async () => {
  const farms = setup('farms')
  await farms.service.updateFarm('farm-1', { name: 'North', location: 'Jos', owner_user_id: 'forbidden' })
  assert.deepEqual(farms.requests[0].body, { name: 'North', location: 'Jos' })
  assert.equal(farms.requests[0].url.searchParams.get('id'), 'eq.farm-1')
  const devices = setup('devices')
  await devices.service.updateDeviceDisplayName('GEF-002', 'Probe')
  assert.deepEqual(devices.requests[0].body, { display_name: 'Probe' })
  assert.equal(devices.requests[0].url.searchParams.get('device_id'), 'eq.GEF-002')
})

test('ensureMyProfile treats blank names as omitted and trims nonblank names', async () => {
  const profile = { id: 'user-1', full_name: 'Saved name', created_at: '2026-11-16T00:00:00Z' }
  const { service, requests } = setup('profile', ({ method }) => ({ body: method === 'GET' ? [profile] : profile }))
  for (const name of ['', '  ', '\t\n']) assert.deepEqual(await service.ensureMyProfile(name), profile)
  assert.equal(requests.length, 3)
  assert.ok(requests.every((request) => request.method === 'GET'))
  await service.ensureMyProfile('  New name  ')
  assert.deepEqual(requests[4].body, { full_name: 'New name' })
  const missing = setup('profile', ({ method }) => ({ body: method === 'GET' ? [] : { ...profile, full_name: null } }))
  await missing.service.ensureMyProfile('  ')
  assert.deepEqual(missing.requests[1].body, { id: 'user-1', full_name: null })
})
test('createMyProfileIfMissing inserts only when missing and never overwrites a saved name', async () => {
  const profile = { id: 'user-1', full_name: 'Saved name', created_at: '2026-11-16T00:00:00Z' }
  const existing = setup('profile', () => ({ body: [profile] }))
  assert.deepEqual(await existing.service.createMyProfileIfMissing('Old metadata name'), profile)
  assert.deepEqual(await existing.service.createMyProfileIfMissing(' '), profile)
  assert.ok(existing.requests.every((request) => request.method === 'GET'))
  for (const [name, expected] of [[' Ada ', 'Ada'], ['  ', null], [undefined, null]]) {
    const missing = setup('profile', ({ method }) => ({ body: method === 'GET' ? [] : { ...profile, full_name: expected } }))
    const row = await missing.service.createMyProfileIfMissing(name)
    assert.equal(row.full_name, expected)
    assert.equal(missing.requests[1].method, 'POST')
    assert.deepEqual(missing.requests[1].body, { id: 'user-1', full_name: expected })
  }
})

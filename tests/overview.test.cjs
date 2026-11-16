const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { createClient } = require('@supabase/supabase-js')

function load(relative, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
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
const helpers = load('lib/dashboard/overview.ts')
const full = { id: 1, device_id: 'GEF-002', packet_type: 'sensor', received_at: '2026-11-16T12:00:00Z', measured_at: null, soil_moisture_pct: 0, soil_temperature_c: 24 }
const moisture = { id: 2, device_id: 'GEF-002', packet_type: 'moisture', received_at: '2026-11-16T12:01:00Z', measured_at: null, soil_moisture_pct: 31.2, soil_temperature_c: null }

test('live moisture compares receipt time without replacing full sample metrics', () => {
  assert.equal(helpers.latestMoisture(full, moisture), moisture)
  assert.equal(full.soil_temperature_c, 24)
  assert.equal(helpers.latestMoisture(full, { ...moisture, received_at: '2026-11-16T11:59:00Z' }), full)
  assert.equal(helpers.latestMoisture(null, moisture), moisture)
  assert.equal(helpers.latestMoisture(full, null), full)
  assert.equal(helpers.latestMoisture(null, null), null)
  assert.equal(helpers.latestMoisture(full, { ...moisture, soil_moisture_pct: null }).soil_moisture_pct, null)
})
test('receipt ties use stable reading IDs and zero stays a real reading', () => {
  assert.equal(helpers.latestMoisture(full, { ...moisture, received_at: full.received_at }).id, 2)
  assert.equal(helpers.latestMoisture({ ...full, id: 3 }, { ...moisture, received_at: full.received_at }).id, 3)
  assert.equal(helpers.latestMoisture(full, null).soil_moisture_pct, 0)
})
test('date windows use exact elapsed days and retain timezone offsets', () => {
  const now = new Date('2026-11-16T13:00:00+01:00')
  assert.deepEqual(helpers.overviewWindow('24h', now), { from: '2026-11-15T12:00:00.000Z', to: '2026-11-16T12:00:00.000Z' })
  assert.equal(helpers.overviewWindow('7d', now).from, '2026-11-09T12:00:00.000Z')
})
test('chart sorts actual measurement time and preserves missing values as gaps', () => {
  const rows = [
    { ...full, id: 3, measured_at: '2026-11-16T11:58:00Z', soil_moisture_pct: 22 },
    { ...full, id: 2, measured_at: '2026-11-16T11:59:00Z', soil_moisture_pct: null },
    { ...full, id: 4, measured_at: 'invalid', soil_moisture_pct: Infinity },
    full,
    { ...full, id: 5, received_at: 'invalid' },
  ]
  const points = helpers.moisturePoints(rows)
  assert.deepEqual(points.map((point) => point.id), [3, 2, 1, 4])
  assert.deepEqual(points.map((point) => point.moisture), [22, null, 0, null])
  assert.equal(helpers.readingTime(rows[2]), full.received_at)
  assert.deepEqual(helpers.moisturePoints([]), [])
})

function setup(historyCount = 3, fail = false) {
  const requests = []
  const device = { device_id: 'GEF-002', display_name: 'North field', hardware_version: 'v2', farm: { id: 'farm-1', name: 'Green Eden', location: 'Jos' } }
  const client = createClient('https://overview.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options) => {
      const url = new URL(input)
      requests.push({ url, signal: options.signal })
      const p = url.searchParams
      const limit = Number(p.get('limit'))
      const offset = Number(p.get('offset'))
      let body
      if (url.pathname.endsWith('/devices')) body = [device]
      else if (p.get('packet_type') === 'eq.sensor') body = [full]
      else if (p.get('packet_type') === 'eq.moisture') body = [moisture]
      else if (limit === 10 && !p.has('received_at')) body = [moisture, full]
      else body = Array.from({ length: Math.min(limit, Math.max(0, historyCount - offset)) }, (_, i) => ({ ...full, id: historyCount - offset - i }))
      return new Response(JSON.stringify(fail ? { message: 'Reading query failed', code: 'TEST' } : body), { status: fail ? 400 : 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  return { requests, service: load('lib/dashboard/load-overview.ts', { '@/lib/supabase/client': { createClient: () => client } }) }
}
test('overview uses only contract tables, separates packets, and requests latest ten', async () => {
  const { service, requests } = setup()
  const controller = new AbortController()
  const snapshot = await service.loadOverview('GEF-002', '24h', controller.signal)
  assert.equal(snapshot.device.farm.name, 'Green Eden')
  assert.equal(snapshot.full.soil_temperature_c, 24)
  assert.equal(snapshot.moisture.soil_moisture_pct, 31.2)
  assert.equal(snapshot.recent.length, 2)
  assert.equal(snapshot.historyTruncated, false)
  assert.ok(requests.every(({ url }) => ['/rest/v1/devices', '/rest/v1/sensor_readings'].includes(url.pathname)))
  assert.ok(requests.every(({ url }) => url.searchParams.get('device_id') === 'eq.GEF-002'))
  const recent = requests.find(({ url }) => url.searchParams.get('limit') === '10')
  assert.equal(recent.url.searchParams.get('order'), 'received_at.desc,id.desc')
  assert.ok(requests.every(({ signal }) => signal === controller.signal))
})
test('history fetches subsequent pages with consistent date filters', async () => {
  const { service, requests } = setup(1234)
  const snapshot = await service.loadOverview('GEF-002', '7d')
  const pages = requests.filter(({ url }) => url.searchParams.has('received_at'))
  assert.equal(snapshot.history.length, 1234)
  assert.equal(snapshot.historyTruncated, false)
  assert.deepEqual(pages.map(({ url }) => url.searchParams.get('offset')), ['0', '1000'])
  assert.deepEqual(pages[0].url.searchParams.getAll('received_at'), pages[1].url.searchParams.getAll('received_at'))
  assert.equal(pages[0].url.searchParams.get('order'), 'received_at.desc,id.desc')
})
test('high-volume history has an explicit limit and a truncation flag', async () => {
  const { service } = setup(10001)
  const snapshot = await service.loadOverview('GEF-002', '7d')
  assert.equal(snapshot.history.length, service.OVERVIEW_HISTORY_LIMIT)
  assert.equal(snapshot.historyTruncated, true)
  assert.equal(snapshot.history[0].id, 10001)
})
test('query failures propagate and cancelled loads do not return success', async () => {
  const failed = setup(0, true)
  await assert.rejects(failed.service.loadOverview('GEF-002', '24h'), { message: 'Reading query failed' })
  const { service } = setup()
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(service.loadOverview('GEF-002', '24h', controller.signal))
})

const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { MeasurementGroups, RecentReadings } = load('components/dashboard/reading-panels.tsx')
test('rendered V1 metrics hide air and estimates; V2 labels formulas and unavailable values', () => {
  const v1 = renderToStaticMarkup(React.createElement(MeasurementGroups, { full, hardwareVersion: 'v1' }))
  assert.match(v1, /0 %/)
  assert.match(v1, /24 °C/)
  assert.match(v1, /Unavailable/)
  assert.doesNotMatch(v1, /aria-label="Air \/ light"|aria-label="Estimates"/)
  const v2 = renderToStaticMarkup(React.createElement(MeasurementGroups, { full: null, hardwareVersion: 'v2' }))
  assert.match(v2, /aria-label="Air \/ light"/)
  assert.match(v2, /aria-label="Estimates"/)
  assert.match(v2, /Estimated salinity/)
  assert.match(v2, /EC × 0.55 \/ 1000/)
  assert.equal((v2.match(/<dd /g) || []).length, 13)
  assert.equal((v2.match(/>Unavailable<\/dd>/g) || []).length, 13)
})
test('recent readings show packet type, zero, null, and an honest empty state', () => {
  const markup = renderToStaticMarkup(React.createElement(RecentReadings, { rows: [moisture, full] }))
  assert.match(markup, /Moisture/)
  assert.match(markup, /Full sensor/)
  assert.match(markup, /31.2 %/)
  assert.match(markup, /0 %/)
  assert.match(markup, /Unavailable/)
  assert.match(markup, /Receipt time/)
  assert.match(renderToStaticMarkup(React.createElement(RecentReadings, { rows: [] })), /No readings received yet/)
})

const { pollOverview } = load('lib/dashboard/poll-overview.ts')
const { setImmediate: tick } = require('node:timers/promises')
function fakeVisibility(initial = 'visible') {
  const document = new EventTarget()
  document.visibilityState = initial
  document.show = (value) => { document.visibilityState = value; document.dispatchEvent(new Event('visibilitychange')) }
  return document
}
function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}
test('polling pauses when hidden, resumes immediately, and discards cancelled results', async (t) => {
  const document = fakeVisibility('hidden')
  const first = deferred()
  const calls = []
  const data = []
  const errors = []
  const stop = pollOverview((signal) => { calls.push(signal); return calls.length === 1 ? first.promise : Promise.resolve({ id: 'new-device' }) }, { onData: (next) => data.push(next), onError: (error) => errors.push(error), onUpdating: () => {} }, document)
  t.after(stop)
  assert.equal(calls.length, 0)
  document.show('visible')
  assert.equal(calls.length, 1)
  document.show('hidden')
  assert.equal(calls[0].aborted, true)
  document.show('visible')
  await tick()
  assert.deepEqual(data, [{ id: 'new-device' }])
  first.resolve({ id: 'stale-device' })
  await tick()
  assert.deepEqual(data, [{ id: 'new-device' }])
  assert.equal(errors.length, 0)
  stop()
  assert.equal(calls[1].aborted, true)
  document.show('visible')
  assert.equal(calls.length, 2)
})
test('unmount aborts pending work without publishing late results', async () => {
  const document = fakeVisibility()
  const pending = deferred()
  let signal
  const data = []
  const stop = pollOverview((current) => { signal = current; return pending.promise }, { onData: (next) => data.push(next), onError: () => assert.fail('Cancelled work must not show an error'), onUpdating: () => {} }, document)
  stop()
  assert.equal(signal.aborted, true)
  pending.resolve({ id: 'old-device' })
  await tick()
  assert.deepEqual(data, [])
})
test('polling exposes query failures for retry instead of an empty successful state', async (t) => {
  const document = fakeVisibility()
  const errors = []
  const stop = pollOverview(async () => { throw new Error('Query denied') }, { onData: () => assert.fail('Must not report success'), onError: (error) => errors.push(error), onUpdating: () => {} }, document)
  t.after(stop)
  await tick()
  assert.equal(errors[0].message, 'Query denied')
})

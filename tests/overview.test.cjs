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
const full = { id: 1, device_id: 'GEF-002', packet_type: 'sensor', received_at: '2026-11-16T12:00:00Z', measured_at: null, soil_moisture_pct: 0, soil_temperature_c: 24, owner_user_id_at_receipt: 'user-1' }
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
test('chart retains reversed receipt order, uses measurement time and keeps null gaps', () => {
  const rows = [
    { ...full, id: 3, measured_at: '2026-11-16T11:58:00Z', soil_moisture_pct: 22 },
    { ...full, id: 2, measured_at: '2026-11-16T11:59:00Z', soil_moisture_pct: null },
    { ...full, id: 4, measured_at: 'invalid', soil_moisture_pct: Infinity },
    full,
    { ...full, id: 5, received_at: 'invalid' },
  ]
  const points = helpers.measurementPoints(rows, 'soil_moisture_pct')
  assert.deepEqual(points.map((point) => point.id), [3, 2, 4, 1])
  assert.deepEqual(points.map((point) => point.value), [22, null, null, 0])
  assert.equal(helpers.readingTime(rows[2]), full.received_at)
  assert.deepEqual(helpers.measurementPoints([], 'soil_moisture_pct'), [])
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
      else if (limit === 1 && p.get('packet_type') === 'eq.sensor') body = [full]
      else if (limit === 1 && p.get('packet_type') === 'eq.moisture') body = [moisture]
      else if (limit === 10 && !p.has('received_at')) body = [full]
      else body = Array.from({ length: Math.min(limit, Math.max(0, historyCount - offset)) }, (_, i) => ({ ...full, id: historyCount - offset - i }))
      return new Response(JSON.stringify(fail ? { message: 'Reading query failed', code: 'TEST' } : body), { status: fail ? 400 : 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  return { requests, service: load('lib/dashboard/load-overview.ts', { '@/lib/supabase/client': { createClient: () => client } }) }
}
test('overview uses only contract tables, separates packets, and requests latest ten', async () => {
  const { service, requests } = setup()
  const controller = new AbortController()
  const snapshot = await service.loadOverview('GEF-002', controller.signal)
  assert.equal(snapshot.device.farm.name, 'Green Eden')
  assert.equal(snapshot.full.soil_temperature_c, 24)
  assert.equal(snapshot.moisture.soil_moisture_pct, 31.2)
  assert.equal(snapshot.recent.length, 1)
  assert.ok(requests.every(({ url }) => ['/rest/v1/devices', '/rest/v1/sensor_readings'].includes(url.pathname)))
  assert.ok(requests.every(({ url }) => url.searchParams.get('device_id') === 'eq.GEF-002'))
  const recent = requests.find(({ url }) => url.searchParams.get('limit') === '10')
  assert.equal(recent.url.searchParams.get('order'), 'received_at.desc,id.desc')
  assert.equal(recent.url.searchParams.get('packet_type'), 'eq.sensor')
  assert.equal(requests.length, 4)
  assert.ok(requests.every(({ url }) => !url.searchParams.has('received_at')))
  assert.ok(requests.every(({ signal }) => signal === controller.signal))
})
test('chart history makes one request for newest 1000 sensor packets and reverses display order', async () => {
  const { service, requests } = setup(1234)
  const snapshot = await service.loadChartHistory('GEF-002', '7d')
  assert.equal(snapshot.history.length, 1000)
  assert.equal(snapshot.historyTruncated, true)
  assert.equal(requests.length, 1)
  const p = requests[0].url.searchParams
  assert.equal(p.get('limit'), '1000')
  assert.equal(p.get('offset'), '0')
  assert.equal(p.get('packet_type'), 'eq.sensor')
  assert.equal(p.get('order'), 'received_at.desc,id.desc')
  assert.equal(p.getAll('received_at').length, 2)
  assert.equal(snapshot.history[0].id, 235)
  assert.equal(snapshot.history.at(-1).id, 1234)
})
test('exactly 1000 shows the limit notice; fewer readings do not', async () => {
  for (const count of [0, 999, 1000]) {
    const { service } = setup(count)
    const snapshot = await service.loadChartHistory('GEF-002', '24h')
    assert.equal(snapshot.history.length, count)
    assert.equal(snapshot.historyTruncated, count === 1000)
  }
})
test('query failures propagate and cancelled loads do not return success', async () => {
  const failed = setup(0, true)
  await assert.rejects(failed.service.loadOverview('GEF-002'), { message: 'Reading query failed' })
  const { service } = setup()
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(service.loadOverview('GEF-002', controller.signal))
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
test('recent readings show full packets, zero, null, all metrics and an empty state', () => {
  const markup = renderToStaticMarkup(React.createElement(RecentReadings, { rows: [{ ...full, id: 3, soil_moisture_pct: 31.2, soil_temperature_c: null }, full], hardwareVersion: 'v2' }))
  assert.match(markup, /Salinity/)
  assert.match(markup, /Humidity/)
  assert.match(markup, /Full sensor/)
  assert.match(markup, /31.2 %/)
  assert.match(markup, /0 %/)
  assert.match(markup, /Unavailable/)
  assert.match(markup, /Receipt time/)
  assert.match(renderToStaticMarkup(React.createElement(RecentReadings, { rows: [], hardwareVersion: 'v1' })), /No readings received yet/)
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

test('chart refresh is due only on first fetch or after five minutes', () => {
  assert.equal(helpers.shouldRefreshChart(null, 0), true)
  assert.equal(helpers.shouldRefreshChart(0, 15000), false)
  assert.equal(helpers.shouldRefreshChart(0, 299999), false)
  assert.equal(helpers.shouldRefreshChart(0, 300000), true)
  assert.equal(helpers.shouldRefreshChart(300000, 300001), false)
})
test('each chart metric uses its own values, null gaps, and domain', () => {
  assert.deepEqual(helpers.chartDomain('soil_moisture_pct'), [0, 100])
  assert.deepEqual(helpers.chartDomain('air_humidity_pct'), [0, 100])
  assert.deepEqual(helpers.chartDomain('soil_ph'), [0, 14])
  assert.deepEqual(helpers.chartDomain('nitrogen_mg_kg'), ['auto', 'auto'])
  assert.deepEqual(helpers.chartDomain('soil_temperature_c'), ['auto', 'auto'])
  assert.deepEqual(helpers.measurementPoints([{ ...full, soil_ph: 6.8 }, { ...full, id: 3, soil_ph: null }], 'soil_ph').map((point) => point.value), [6.8, null])
})
test('recent table renders all and only the device supported metric columns', () => {
  const render = (hardwareVersion) => renderToStaticMarkup(React.createElement(RecentReadings, { rows: [full], hardwareVersion }))
  assert.equal((render('v1').match(/scope="col"/g) || []).length, 9)
  assert.equal((render('v2').match(/scope="col"/g) || []).length, 15)
  assert.doesNotMatch(render('v1'), /Irradiance/)
  assert.match(render('v2'), /Irradiance/)
})
const { pollChartHistory } = load('lib/dashboard/poll-chart-history.ts')
test('chart network refresh stays separate from 15-second ticks and tab resumes', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 0 })
  const visibility = fakeVisibility()
  const calls = []
  const data = []
  const stop = pollChartHistory(async (signal) => { calls.push(signal); return { history: [], historyTruncated: false } }, { onData: (value) => data.push(value), onError: (error) => assert.fail(error) }, visibility)
  t.after(stop)
  await tick()
  assert.equal(calls.length, 1)
  t.mock.timers.tick(15000)
  visibility.show('hidden')
  visibility.show('visible')
  await tick()
  assert.equal(calls.length, 1)
  t.mock.timers.tick(284999)
  await tick()
  assert.equal(calls.length, 1)
  t.mock.timers.tick(1)
  await tick()
  assert.equal(calls.length, 2)
  assert.equal(data.length, 2)
  stop()
  t.mock.timers.tick(300000)
  assert.equal(calls.length, 2)
})

test('shared chart history uses a supplied frozen window without recalculating dates', async () => {
  const { service, requests } = setup(3)
  const window = { from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T00:00:00.000Z' }
  await service.loadChartHistory('GEF-002', window)
  assert.equal(requests.length, 1)
  assert.deepEqual(requests[0].url.searchParams.getAll('received_at'), [`gte.${window.from}`, `lte.${window.to}`])
  assert.equal(requests[0].url.searchParams.get('packet_type'), 'eq.sensor')
})

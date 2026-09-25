const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { createClient } = require('@supabase/supabase-js')

// Exercise the installed Supabase query builder against a controlled transport.
function load(relative, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)((id) => {
    if (id in overrides) return overrides[id]
    if (id.startsWith('@/')) return load(`${id.slice(2)}.ts`, overrides)
    return require(id)
  }, module, module.exports)
  return module.exports
}

function setup(respond = () => []) {
  const requests = []
  const methods = []
  const preferences = []
  const client = createClient('https://readings.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options) => {
      const url = new URL(input)
      requests.push(url)
      methods.push(options.method)
      preferences.push(new Headers(options.headers).get('prefer'))
      const result = respond(url)
      return new Response(options.method === 'HEAD' ? null : JSON.stringify(result.body ?? result), {
        status: result.status ?? 200, headers: { 'Content-Type': 'application/json', ...(result.headers ?? {}) },
      })
    } },
  })
  return { requests, methods, preferences, service: load('lib/services/readings.ts', {
    '@/lib/supabase/client': { createClient: () => client },
  }) }
}

const filters = { farmName: 'Green Eden', plotName: 'North', deviceId: 'SG-1', from: '2026-09-18T00:00:00Z', to: '2026-09-25T00:00:00Z' }

function checkFilters(url) {
  const p = url.searchParams
  assert.equal(p.get('device.farm.name'), 'eq.Green Eden')
  assert.equal(p.get('device.plot.name'), 'eq.North')
  assert.equal(p.get('device_id'), 'eq.SG-1')
  assert.deepEqual(p.getAll('measured_at'), [`gte.${filters.from}`, `lte.${filters.to}`])
  assert.match(p.get('select'), /device:devices!inner/)
  assert.match(p.get('select'), /farm:farms!inner/)
  assert.match(p.get('select'), /plot:plots!inner/)
}

test('default page is ten newest valid readings with stable tie ordering', async () => {
  const { service, requests } = setup()
  await service.getReadings()
  const p = requests[0].searchParams
  assert.equal(p.get('limit'), '10')
  assert.equal(p.get('is_valid'), 'eq.true')
  assert.equal(p.get('order'), 'measured_at.desc,device_id.asc,sequence.asc')
  assert.doesNotMatch(p.get('select'), /!inner/)
})

test('next page uses offset 10 and limit 10 with all database filters', async () => {
  const { service, requests } = setup()
  await service.getReadings({ ...filters, offset: 10 })
  assert.equal(requests[0].searchParams.get('offset'), '10')
  assert.equal(requests[0].searchParams.get('limit'), '10')
  checkFilters(requests[0])
})

test('farm-only filtering does not require a plot and plot-only does not require a farm', async () => {
  const { service, requests } = setup()
  await service.getReadings({ farmName: 'Green Eden' })
  await service.getReadings({ plotName: 'North' })
  assert.doesNotMatch(requests[0].searchParams.get('select'), /plots!inner/)
  assert.doesNotMatch(requests[1].searchParams.get('select'), /farms!inner/)
})

test('lookup tables provide distinct names and dependent database filters', async () => {
  const { service, requests } = setup((url) => url.pathname.endsWith('/devices')
    ? [{ id: 'SG-1' }] : [{ name: 'North' }, { name: 'North' }, { name: 'South' }])
  assert.deepEqual(await service.getReadingFarms(), ['North', 'South'])
  assert.deepEqual(await service.getReadingPlots('Green Eden'), ['North', 'South'])
  assert.deepEqual(await service.getReadingDevices('Green Eden', 'North'), ['SG-1'])
  assert.equal(requests[0].pathname, '/rest/v1/farms')
  assert.equal(requests[1].pathname, '/rest/v1/plots')
  assert.equal(requests[1].searchParams.get('farm.name'), 'eq.Green Eden')
  assert.equal(requests[2].pathname, '/rest/v1/devices')
  assert.equal(requests[2].searchParams.get('farm.name'), 'eq.Green Eden')
  assert.equal(requests[2].searchParams.get('plot.name'), 'eq.North')
})

test('export retrieves every filtered page, including the partial final page', async () => {
  const { service, requests } = setup((url) => {
    const offset = Number(url.searchParams.get('offset'))
    return Array.from({ length: offset < 20 ? 10 : 3 }, (_, i) => ({ sequence: offset + i }))
  })
  const rows = await service.getReadingsForExport(filters)
  assert.equal(rows.length, 23)
  assert.deepEqual(requests.map((url) => url.searchParams.get('offset')), ['0', '10', '20'])
  requests.forEach(checkFilters)
})

test('query failures propagate instead of exporting a partial success', async () => {
  const { service } = setup((url) => url.searchParams.get('offset') === '0'
    ? Array.from({ length: 10 }, () => ({}))
    : { status: 400, body: { message: 'Query failed', code: 'test' } })
  await assert.rejects(service.getReadingsForExport(filters), { message: 'Query failed' })
})

const view = load('lib/readings-view.ts')
const sample = { device_id: 'SG-1', sequence: 1, measured_at: '2026-09-25T12:00:00Z', moisture_pct: 42, soil_temp_c: 27, ph: 6.8, ec_us_cm: 1200,
  device: { status: 'online', farm: { name: 'Green, "Eden"' }, plot: { name: 'North\nField' } } }

test('all parameter selections map to the correct source metric, units and scale', () => {
  const reading = view.toPageReading(sample)
  for (const [parameter, expected] of Object.entries({ Moisture: 42, Temperature: 27, pH: 6.8, EC: 1200 })) {
    assert.equal(reading[view.readingSeries[parameter].value], expected)
  }
  assert.equal(view.readingSeries.Temperature.unit, '°C')
  assert.equal(view.readingSeries.EC.unit, 'µS/cm')
  assert.deepEqual(view.readingSeries.pH.domain, [0, 14])
  assert.deepEqual(view.readingSeries.Temperature.domain, ['auto', 'auto'])
  assert.equal(view.toPageReading({ ...sample, ph: null }).ph, null)
})

test('CSV includes specified columns, status, ISO timestamp, proper escaping and dated filename', () => {
  const csv = view.readingsCsv([sample])
  assert.ok(csv.startsWith('\uFEFF"Timestamp","Farm","Plot","Device","Moisture (%)","Temperature (°C)","pH","EC (µS/cm)","Status"\r\n'))
  assert.ok(csv.includes('"2026-09-25T12:00:00Z","Green, ""Eden""","North\nField","SG-1","42","27","6.8","1200","Online"'))
  assert.equal(view.readingsCsvFilename(new Date(2026, 8, 25)), 'greener-readings-2026-09-25.csv')
})


test('exact count uses HEAD with identical filters and no pagination', async () => {
  const { service, requests, methods, preferences } = setup(() => ({ headers: { 'Content-Range': '0-9/23' } }))
  assert.equal(await service.getReadingsCount(filters), 23)
  checkFilters(requests[0])
  assert.equal(methods[0], 'HEAD')
  assert.match(preferences[0], /count=exact/)
  assert.equal(requests[0].searchParams.has('limit'), false)
  assert.equal(requests[0].searchParams.has('offset'), false)
  await service.getReadingsCount()
  assert.equal(requests[1].searchParams.get('select'), '*')
})

test('next and previous fetch bounded ranges instead of accumulating rows', async () => {
  const { service, requests } = setup()
  await service.getReadings({ offset: 0 })
  await service.getReadings({ offset: 10 })
  await service.getReadings({ offset: 0 })
  assert.deepEqual(requests.map((url) => url.searchParams.get('offset')), ['0', '10', '0'])
  requests.forEach((url) => assert.equal(url.searchParams.get('limit'), '10'))
})

test('All chart normalizes each metric and preserves original values for tooltips', () => {
  const first = view.toPageReading(sample)
  const second = view.toPageReading({ ...sample, moisture_pct: 84, soil_temp_c: 37, ph: 7.8, ec_us_cm: 2400 })
  const points = view.allMetricsChart([second, first])
  for (const parameter of ['Moisture', 'Temperature', 'pH', 'EC']) {
    assert.equal(points[0].normalized[parameter], 0)
    assert.equal(points[1].normalized[parameter], 100)
  }
  assert.equal(points[1].reading.ec, 2400)
  const missing = view.allMetricsChart([view.toPageReading({ ...sample, ph: null })])
  assert.equal(missing[0].normalized.pH, null)
  assert.equal(missing[0].normalized.Moisture, 50)
  assert.deepEqual(view.allMetricsChart([]), [])
})

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
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
const { ownedFarms } = load('lib/session/owned-devices.ts')
const filters = load('lib/readings/filters.ts')
const csv = load('lib/data/readings-csv.ts')
const metrics = load('lib/measurements.ts').measurements
const devices = [{ device_id: 'GEF-002' }, { device_id: 'released' }]
const now = new Date('2026-11-16T12:00:00Z')

test('ownedFarms excludes other owners even for admin-style results, sorts, and preserves input', () => {
  const farms = [{ id: '3', name: 'Zulu', owner_user_id: 'admin' }, { id: '2', name: 'Other', owner_user_id: 'farmer' }, { id: '1', name: 'Alpha', owner_user_id: 'admin' }]
  assert.deepEqual(ownedFarms(farms, 'admin').map((farm) => farm.id), ['1', '3'])
  assert.deepEqual(farms.map((farm) => farm.id), ['3', '2', '1'])
  assert.deepEqual(ownedFarms(farms, null), [])
  assert.deepEqual(ownedFarms(farms, 'unknown'), [])
})
test('readings URL defaults are owned-first, 24h, full sensor, page one', () => {
  assert.deepEqual(filters.parseReadingsState(new URLSearchParams(), devices, now), { deviceId: 'GEF-002', range: '24h', from: '2026-11-15T12:00:00.000Z', to: '2026-11-16T12:00:00.000Z', packet: 'sensor', page: 1 })
  assert.equal(filters.parseReadingsState(new URLSearchParams(), [], now).deviceId, '')
})
test('invalid URL choices fall back and cannot select an inaccessible device', () => {
  const state = filters.parseReadingsState(new URLSearchParams('device=foreign&range=bad&from=bad&to=bad&packet=bad&page=-1'), devices, now)
  assert.equal(state.deviceId, 'GEF-002')
  assert.equal(state.range, '24h')
  assert.equal(state.packet, 'sensor')
  assert.equal(state.page, 1)
  for (const value of ['1.5', 'NaN', 'Infinity', '0', '9007199254740992']) assert.equal(filters.parseReadingsState(new URLSearchParams(`page=${value}`), devices, now).page, 1)
})
test('URL round-trip freezes the exact query window across paging and later times', () => {
  const first = filters.parseReadingsState(new URLSearchParams('device=released&range=7d&packet=all&page=2'), devices, now)
  const later = filters.parseReadingsState(new URLSearchParams(filters.readingsSearch(first)), devices, new Date('2026-12-01T00:00:00Z'))
  assert.deepEqual(later, first)
  assert.equal(later.deviceId, 'released')
  assert.equal(later.page, 2)
  assert.equal(filters.readingFilters(later).packetType, undefined)
  assert.equal(filters.readingFilters({ ...later, packet: 'moisture' }).packetType, 'moisture')
})
test('custom windows accept equal dates, reject reverse/invalid/over-92-day ranges', () => {
  const same = filters.customWindow('2026-11-16', '2026-11-16')
  assert.ok(Date.parse(same.to) > Date.parse(same.from))
  assert.equal(filters.validateCustomRange(same.from, same.to), null)
  assert.throws(() => filters.customWindow('2026-11-17', '2026-11-16'), /before or equal/)
  assert.throws(() => filters.customWindow('2026-02-30', '2026-03-01'), /valid/)
  assert.throws(() => filters.customWindow('bad', '2026-11-16'), /valid/)
  assert.doesNotThrow(() => filters.customWindow('2026-01-01', '2026-04-02'))
  assert.throws(() => filters.customWindow('2026-01-01', '2026-04-03'), /92/)
  assert.match(filters.validateCustomRange('bad', 'bad'), /valid/)
})
test('custom URL windows validate dates and invalid custom falls back to 24h', () => {
  const custom = filters.parseReadingsState(new URLSearchParams('range=custom&from=2026-11-01&to=2026-11-16'), devices, now)
  assert.equal(custom.range, 'custom')
  assert.deepEqual(filters.parseReadingsState(new URLSearchParams(filters.readingsSearch(custom)), devices, now), custom)
  for (const query of ['range=custom', 'range=custom&from=bad&to=bad', 'range=custom&from=2026-01-01&to=2026-11-16']) assert.equal(filters.parseReadingsState(new URLSearchParams(query), devices, now).range, '24h')
})
test('history device choices merge only owned/current and RPC history, tolerating unknown columns', () => {
  const own = [{ device_id: 'own', display_name: 'North', hardware_version: 'v1' }]
  const choices = filters.readingDevices(own, [{ device_id: 'own' }, { device_id: 'past', arbitrary_extra: 123 }, { device_id: 'past' }, { device_id: 'past-v2', hardware_version: 'v2' }])
  assert.equal(choices.length, 3)
  assert.equal(choices[0].past, false)
  assert.equal(choices[1].past, true)
  assert.equal(choices[1].hardwareVersion, null)
  assert.equal(choices[2].hardwareVersion, 'v2')
})
const row = { id: 1, received_at: '2026-11-16T12:00:00Z', measured_at: null, device_id: 'GEF-002', packet_type: 'sensor', cycle: 0, soil_moisture_pct: 0, soil_temperature_c: null }
test('CSV contains all 13 unit headers, BOM/CRLF, ISO timestamps and empty null cells', () => {
  const text = csv.readingsCsv([row])
  assert.ok(text.startsWith('\uFEFF"received_at","measured_at","device_id","packet_type","cycle"'))
  for (const metric of metrics) assert.ok(text.includes(`"${metric.key} (${metric.unit})"`))
  assert.ok(text.includes('\r\n"2026-11-16T12:00:00Z","","GEF-002","sensor","0","0",""'))
  assert.doesNotMatch(text, /Unavailable/)
  assert.equal(text.split('\r\n').length, 2)
  assert.equal(text.replaceAll('\r\n', '').includes('\n'), false)
})
test('CSV quotes every cell, doubles quotes, and neutralizes spreadsheet formulas', () => {
  assert.equal(csv.csvCell('Farm, "North"'), '"Farm, ""North"""')
  for (const text of ['=SUM(A1)', '+123', '-value', '@cell', '\tcmd', '\rcmd']) assert.equal(csv.csvCell(text), `"'${text}"`)
  assert.equal(csv.csvCell(-2), '"-2"')
  assert.equal(csv.csvCell('=SUM(1)'), '"\'=SUM(1)"')
  assert.equal(csv.csvCell('-x'), '"\'-x"')
  assert.equal(csv.csvCell(null), '""')
  assert.equal(csv.csvCell(undefined), '""')
  assert.equal(csv.readingsCsvFilename('GEF-002', new Date(2026, 10, 16)), 'greener-GEF-002-2026-11-16.csv')
})
test('CSV export pages oldest-first with identical frozen filters and progress', async () => {
  const calls = []
  const progress = []
  const service = load('lib/data/readings-csv.ts', { '@/lib/data/sensor-readings': { getReadingHistory: async (options) => { calls.push(options); return Array.from({ length: options.offset === 0 ? 1000 : 12 }, (_, i) => ({ ...row, id: options.offset + i })) } } })
  const state = filters.parseReadingsState(new URLSearchParams('range=7d&packet=moisture'), devices, now)
  const query = filters.readingFilters(state)
  const result = await service.exportReadingsCsv(query, { onProgress: (count) => progress.push(count) })
  assert.equal(result.rowCount, 1012)
  assert.equal(result.limited, false)
  assert.deepEqual(progress, [0, 1000, 1012])
  assert.deepEqual(calls.map((call) => call.offset), [0, 1000])
  for (const call of calls) { assert.equal(call.ascending, true); assert.equal(call.limit, 1000); assert.equal(call.from, query.from); assert.equal(call.to, query.to); assert.equal(call.packetType, 'moisture'); assert.equal(call.deviceId, 'GEF-002') }
})
test('CSV export stops at 50000 rows and exposes the exact limit notice', async () => {
  let calls = 0
  const service = load('lib/data/readings-csv.ts', { '@/lib/data/sensor-readings': { getReadingHistory: async (options) => { calls++; return Array.from({ length: options.limit }, (_, i) => ({ ...row, id: options.offset + i })) } } })
  const result = await service.exportReadingsCsv({ deviceId: 'GEF-002' })
  assert.equal(calls, 50)
  assert.equal(result.rowCount, 50000)
  assert.equal(result.limited, true)
  assert.equal(result.csv.split('\r\n').length, 50001)
  assert.equal(service.CSV_LIMIT_MESSAGE, 'Export limited to the first 50,000 rows — narrow the date range.')
})
test('cancelled and failed exports do not return a partial CSV success', async () => {
  const controller = new AbortController()
  let calls = 0
  const service = load('lib/data/readings-csv.ts', { '@/lib/data/sensor-readings': { getReadingHistory: async () => { calls++; controller.abort(); return [row] } } })
  await assert.rejects(service.exportReadingsCsv({ deviceId: 'GEF-002' }, { signal: controller.signal }), { name: 'AbortError' })
  await assert.rejects(service.exportReadingsCsv({ deviceId: 'GEF-002' }, { signal: controller.signal }), { name: 'AbortError' })
  assert.equal(calls, 1)
  const failed = load('lib/data/readings-csv.ts', { '@/lib/data/sensor-readings': { getReadingHistory: async () => { throw new Error('Query failed') } } })
  await assert.rejects(failed.exportReadingsCsv({ deviceId: 'GEF-002' }), /Query failed/)
})
test('farm edits trim required names, clear blank locations, and reject null backend updates', async () => {
  const module = load('lib/data/farm-edits.ts', { '@/lib/data/farms': { updateFarm: async () => null } })
  assert.deepEqual(module.farmEdits(' North ', ' Jos '), { name: 'North', location: 'Jos' })
  assert.deepEqual(module.farmEdits('North', ' '), { name: 'North', location: null })
  assert.throws(() => module.farmEdits(' ', 'Jos'), /required/)
  await assert.rejects(module.saveFarmDetails('farm-1', 'North', 'Jos'), /could not be saved/)
})
test('farm update failures propagate and successful edits send only name/location', async () => {
  const calls = []
  const saved = { id: 'farm-1', name: 'North', location: 'Jos' }
  const module = load('lib/data/farm-edits.ts', { '@/lib/data/farms': { updateFarm: async (...args) => { calls.push(args); return saved } } })
  assert.deepEqual(await module.saveFarmDetails('farm-1', ' North ', ' Jos '), saved)
  assert.deepEqual(calls[0].slice(0, 2), ['farm-1', { name: 'North', location: 'Jos' }])
  const failed = load('lib/data/farm-edits.ts', { '@/lib/data/farms': { updateFarm: async () => { throw new Error('Denied') } } })
  await assert.rejects(failed.saveFarmDetails('farm-1', 'North', 'Jos'), /Denied/)
})
test('farms pages show owned farms/device names only and unknown detail has a back link', () => {
  const farms = [{ id: 'mine', name: 'My farm', location: null, owner_user_id: 'user' }]
  const devices = [{ device_id: 'my-device', display_name: 'My probe', farm_id: 'mine', owner_user_id: 'user' }, { device_id: 'foreign', display_name: 'Foreign probe', farm_id: 'mine', owner_user_id: 'other' }]
  const { FarmsPage } = load('components/farms-page.tsx', {
    '@/components/session/greener-session': { useGreenerSession: () => ({ user: { id: 'user' }, devices, refresh: async () => {} }) },
    '@/components/farms/use-owned-farms': { useOwnedFarms: () => ({ farms, loading: false, error: '', reload: async () => {} }) },
    '@/components/devices-page': { DeviceCard: ({ device }) => React.createElement('div', null, device.display_name) },
  })
  const markup = renderToStaticMarkup(React.createElement(FarmsPage))
  assert.match(markup, /My farm/)
  assert.match(markup, /No location/)
  assert.match(markup, /My probe/)
  assert.doesNotMatch(markup, /Foreign probe/)
  const unknown = renderToStaticMarkup(React.createElement(FarmsPage, { farmId: 'unknown' }))
  assert.match(unknown, /Farm not found/)
  assert.match(unknown, /href="\/farms"/)
})

test('malformed numeric dates and rollover dates in URL state are rejected', () => {
  for (const [from, to] of [['1', '2'], ['2026-02-30T00:00:00Z', '2026-03-02T00:00:00Z'], ['2026-13-01', '2026-13-02']]) {
    const state = filters.parseReadingsState(new URLSearchParams({ range: 'custom', from, to }), devices, now)
    assert.equal(state.range, '24h')
    assert.equal(state.to, now.toISOString())
  }
})

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
    if (id === '@/components/admin/feedback') return { useAdminFeedback: () => ({ message: '', clear: () => {}, succeed: () => {} }), AdminSuccess: () => null }
    if (id.startsWith('@/')) {
      const base = id.slice(2)
      return load(`${base}${fs.existsSync(path.resolve(__dirname, '..', `${base}.ts`)) ? '.ts' : '.tsx'}`, overrides)
    }
    return require(id)
  }, module, module.exports)
  return module.exports
}
const nav = load('lib/admin/navigation.ts')
const helpers = load('lib/admin/presenters.ts')
const adminSession = { status: 'ready', isAdmin: true, user: { id: 'admin' }, refresh: async () => {} }
function setup(respond = () => ({ body: null })) {
  const requests = []
  const client = createClient('https://admin.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options) => {
      const request = { url: new URL(input), method: options.method, body: options.body ? JSON.parse(options.body) : undefined }
      requests.push(request)
      const result = respond(request)
      return new Response(JSON.stringify(result.body), { status: result.status ?? 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const overrides = { '@/lib/supabase/client': { createClient: () => client } }
  return { requests, actions: load('lib/admin/actions.ts', overrides), data: load('lib/data/admin.ts', overrides) }
}
test('admin access requires a ready session and literal true; only known routes exist', () => {
  for (const status of ['loading', 'error', 'signed-out']) assert.equal(nav.canAccessAdmin({ status, isAdmin: true }), false)
  for (const isAdmin of [false, null, undefined, 1, 'true']) assert.equal(nav.canAccessAdmin({ status: 'ready', isAdmin }), false)
  assert.equal(nav.canAccessAdmin(adminSession), true)
  for (const section of ['devices', 'users', 'farms', 'readings', 'activity']) assert.equal(nav.isAdminSection(section), true)
  assert.equal(nav.isAdminSection('roles'), false)
})
test('non-admin pages never render children or call an admin data loader', () => {
  for (const section of ['devices', 'users', 'farms', 'readings', 'activity']) {
    const { AdminPage } = load('components/admin/admin-page.tsx', {
      '@/components/session/greener-session': { useGreenerSession: () => ({ ...adminSession, isAdmin: false }) },
      '@/components/admin/use-admin-resource': { useAdminResource: () => assert.fail('Admin data must not load') },
    })
    assert.match(renderToStaticMarkup(React.createElement(AdminPage, { section })), /Super admin access required/)
  }
})
test('admin section navigation is hidden for farmers and loading sessions', () => {
  const render = (session) => {
    const { AdminNavigation } = load('components/admin/navigation.tsx', { '@/components/session/greener-session': { useGreenerSession: () => session }, 'next/navigation': { usePathname: () => '/admin/activity' } })
    return renderToStaticMarkup(React.createElement(AdminNavigation))
  }
  assert.equal(render({ ...adminSession, isAdmin: false }), '')
  assert.equal(render({ ...adminSession, status: 'loading' }), '')
  const markup = render(adminSession)
  for (const label of ['All devices', 'Users', 'All farms', 'All readings', 'Activity']) assert.ok(markup.includes(label))
  assert.match(markup, /aria-current="page"/)
  assert.match(markup, /href="\/admin\/activity"/)
})
test('all mutation requests fail before fetch for blank reason or non-admin sessions', async () => {
  const { actions, requests } = setup()
  const operations = [{ kind: 'register', deviceId: 'GEF-002', hardwareVersion: 'v2', name: '' }, { kind: 'manage', deviceId: 'GEF-002', action: 'archive' }, { kind: 'bulk', locked: true }, { kind: 'rename', deviceId: 'GEF-002', name: 'Probe' }, { kind: 'farm', farmId: 'farm-1', name: 'North', location: '' }]
  for (const operation of operations) {
    await assert.rejects(actions.performAdminAction(operation, '  ', adminSession), /reason/)
    await assert.rejects(actions.performAdminAction(operation, 'Reason', { ...adminSession, isAdmin: false }), /Super admin/)
  }
  assert.equal(requests.length, 0)
})
test('admin mutation forms send exact audited RPCs and archive never deletes a row', async () => {
  const { actions, requests } = setup()
  const operations = [
    { kind: 'register', deviceId: ' GEF-002 ', hardwareVersion: 'v2', name: ' North field ' },
    ...['lock', 'unlock', 'release', 'archive', 'restore'].map((action) => ({ kind: 'manage', deviceId: 'GEF-002', action })),
    { kind: 'bulk', locked: false }, { kind: 'rename', deviceId: 'GEF-002', name: ' ' }, { kind: 'farm', farmId: 'farm-1', name: ' North ', location: ' Jos ' },
  ]
  for (const operation of operations) await actions.performAdminAction(operation, ' Maintenance ', adminSession)
  assert.equal(requests[0].url.pathname, '/rest/v1/rpc/admin_register_device')
  assert.deepEqual(requests[0].body, { p_device_id: 'GEF-002', p_hardware_version: 'v2', p_display_name: 'North field', p_reason: 'Maintenance' })
  assert.deepEqual(requests.slice(1, 6).map((request) => request.body.p_action), ['lock', 'unlock', 'release', 'archive', 'restore'])
  assert.ok(requests.every((request) => request.method === 'POST' && request.body.p_reason === 'Maintenance'))
  assert.deepEqual(requests[6].body, { p_locked: false, p_reason: 'Maintenance' })
  assert.deepEqual(requests[7].body, { p_device_id: 'GEF-002', p_display_name: null, p_reason: 'Maintenance' })
  assert.deepEqual(requests[8].body, { p_farm_id: 'farm-1', p_name: 'North', p_location: 'Jos', p_reason: 'Maintenance' })
})
test('admin validation and backend errors do not produce successful mutations', async () => {
  const { actions, requests } = setup()
  await assert.rejects(actions.performAdminAction({ kind: 'register', deviceId: ' ', hardwareVersion: 'v2', name: '' }, 'Reason', adminSession), /Device ID/)
  await assert.rejects(actions.performAdminAction({ kind: 'farm', farmId: 'farm-1', name: ' ', location: '' }, 'Reason', adminSession), /Farm name/)
  assert.equal(requests.length, 0)
  const failed = setup(() => ({ status: 403, body: { message: 'Admin RPC denied', code: 'DENIED' } }))
  await assert.rejects(failed.actions.performAdminAction({ kind: 'bulk', locked: true }, 'Reason', adminSession), { message: 'Admin RPC denied', code: 'DENIED' })
})
test('admin directories page beyond default row caps and keep stable order', async () => {
  const { data, requests } = setup(({ url, body }) => {
    const users = url.pathname.endsWith('/admin_list_users')
    const offset = users ? body.p_offset : Number(url.searchParams.get('offset'))
    const size = users ? 100 : 1000
    return { body: Array.from({ length: offset === 0 ? size : 1 }, (_, index) => users ? { user_id: `u-${offset + index}`, email: null, full_name: null, created_at: '2026-11-16', device_count: 0 } : { device_id: `d-${offset + index}`, id: `f-${offset + index}`, name: 'Farm', farm: null }) }
  })
  assert.equal((await data.listAllDevices()).length, 1001)
  assert.equal((await data.listAllFarms()).length, 1001)
  assert.equal((await data.listAllUsers()).users.length, 101)
  assert.deepEqual(requests.slice(0, 2).map((request) => request.url.searchParams.get('offset')), ['0', '1000'])
  assert.equal(requests[0].url.searchParams.get('order'), 'device_id.asc')
  assert.equal(requests[2].url.searchParams.get('order'), 'name.asc,id.asc')
  assert.deepEqual(requests.slice(4).map((request) => request.body), [{ p_limit: 100, p_offset: 0 }, { p_limit: 100, p_offset: 100 }])
})
test('failed directory pages propagate instead of returning partial success', async () => {
  const { data } = setup(({ url }) => url.searchParams.get('offset') === '0' ? { body: Array.from({ length: 1000 }, () => ({ device_id: 'd', farm: null })) } : { status: 403, body: { message: 'Directory unavailable' } })
  await assert.rejects(data.listAllDevices(), { message: 'Directory unavailable' })
})
test('cancelled admin directories make no request', async () => {
  const { data, requests } = setup()
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(data.listAllDevices(controller.signal), { name: 'AbortError' })
  await assert.rejects(data.listAllFarms(controller.signal), { name: 'AbortError' })
  await assert.rejects(data.listAllUsers(controller.signal), { name: 'AbortError' })
  assert.equal(requests.length, 0)
})
test('action availability, owner labels and before/after JSON honor the contract', () => {
  assert.deepEqual(helpers.allowedActions({ archived_at: '2026-11-16', enabled: true, owner_user_id: 'u' }), ['restore'])
  assert.deepEqual(helpers.allowedActions({ archived_at: null, enabled: false, owner_user_id: 'u' }), ['rename', 'unlock', 'release', 'archive'])
  assert.deepEqual(helpers.allowedActions({ archived_at: null, enabled: true, owner_user_id: null }), ['rename', 'lock', 'archive'])
  assert.equal(helpers.ownerLabel(null, []), 'Unclaimed')
  assert.equal(helpers.ownerLabel('u', [{ user_id: 'u', full_name: 'Ada', email: 'ada@example.test' }]), 'Ada · ada@example.test')
  assert.equal(helpers.ownerLabel('unknown-user', []), 'unknown-user')
  assert.equal(helpers.auditJson(null), 'Unavailable')
  assert.match(helpers.auditJson({ enabled: false }), /"enabled": false/)
})
const users = [{ user_id: 'owner-1', full_name: 'Ada', email: 'ada@example.test', created_at: '2026-11-16T12:00:00Z', device_count: 0 }]
const devices = [{ device_id: 'GEF-002', display_name: 'North', hardware_version: 'v2', owner_user_id: 'owner-1', enabled: false, archived_at: '2026-11-16', farm: { id: 'farm', name: 'Green Eden', location: null }, last_received_at: null }]
const noopResource = (data) => ({ data, error: '', loading: false, reload: async () => data })
test('All devices shows every owner, archive priority, restore and disabled assignment', () => {
  const { AdminDevices } = load('components/admin/devices.tsx', {
    '@/components/session/greener-session': { useGreenerSession: () => adminSession },
    '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource({ devices, users }) },
  })
  const markup = renderToStaticMarkup(React.createElement(AdminDevices))
  for (const text of ['All devices', 'Ada', 'Green Eden', 'Archived', 'Restore', 'Register device', 'Lock all', 'Unlock all']) assert.ok(markup.includes(text))
  assert.doesNotMatch(markup, />Rename<|>Assign to farmer/)
  assert.doesNotMatch(markup, /Delete permanently/)
})
test('reason dialog asks for confirmation and a required recorded reason', () => {
  const { ReasonDialog } = load('components/admin/shared.tsx')
  const markup = renderToStaticMarkup(React.createElement(ReasonDialog, { mutation: { title: 'Release GEF-002', description: 'Confirm release. It does not unlock.', submitLabel: 'Release', save: async () => {} }, onSaved: async () => {}, onClose: () => {} }))
  assert.match(markup, /<dialog/)
  assert.match(markup, /Confirm release/)
  assert.match(markup, /Reason \(required\)/)
  assert.match(markup, /<textarea required=""/)
})
test('admin farms and users show other owners and account fields without farmer filtering', () => {
  const { AdminFarms } = load('components/admin/farms.tsx', {
    '@/components/session/greener-session': { useGreenerSession: () => adminSession },
    '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource({ farms: [{ id: 'farm', name: 'Other owner farm', location: 'Jos', owner_user_id: 'owner-1' }], users, devices: [{ device_id: 'GEF-002', farm_id: 'farm' }], truncated: false }) },
  })
  const farms = renderToStaticMarkup(React.createElement(AdminFarms))
  assert.match(farms, /Other owner farm/)
  assert.match(farms, /Ada/)
  assert.match(farms, /Edit name\/location/)
  const { AdminUsers } = load('components/admin/users.tsx', { '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource(users) } })
  const accounts = renderToStaticMarkup(React.createElement(AdminUsers))
  assert.match(accounts, /ada@example.test/)
  assert.match(accounts, /Joined/)
  assert.match(accounts, />0<\/td>/)
})
test('admin readings reuses history and CSV for every device, including other owners', () => {
  const { AdminReadings } = load('components/admin/readings.tsx', {
    '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource(devices) },
    '@/components/readings-page': { HistoryContent: ({ devices, title }) => React.createElement('div', null, title, ':', devices.map((device) => device.device_id).join(',')) },
  })
  const markup = renderToStaticMarkup(React.createElement(AdminReadings))
  assert.match(markup, /All readings/)
  assert.match(markup, /GEF-002/)
})
test('activity renders actor, reason, linked target and escaped before/after JSON', () => {
  const rows = [{ actor_user_id: 'owner-1', action: 'archive', target_id: 'GEF-002', reason: 'Retired', created_at: '2026-11-16T12:00:00Z', before_data: { label: '<script>' }, after_data: { archived_at: '2026-11-16' } }]
  const { ActivityLog } = load('components/admin/activity.tsx', { '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource(rows) } })
  const markup = renderToStaticMarkup(React.createElement(ActivityLog, { directory: { users, devices, truncated: true } }))
  for (const text of ['Ada', 'Retired', 'GEF-002', 'Before', 'After', '&lt;script&gt;', 'Showing the first 5,000 users.']) assert.ok(markup.includes(text))
  assert.match(markup, /href="\/admin\/devices\/GEF-002"/)
  assert.doesNotMatch(markup, /<script>/)
})

test('successMessage covers every action and numeric/fallback bulk results', () => {
  const { successMessage } = load('lib/admin/actions.ts')
  for (const [action, verb] of Object.entries({ lock: 'locked', unlock: 'unlocked', release: 'released', archive: 'archived', restore: 'restored' })) assert.equal(successMessage({ kind: 'manage', deviceId: 'GEF-002', action }, null), `GEF-002 ${verb}.`)
  assert.equal(successMessage({ kind: 'register', deviceId: ' GEF-002 ', hardwareVersion: 'v2', name: '' }, null), 'GEF-002 registered.')
  assert.equal(successMessage({ kind: 'rename', deviceId: 'GEF-002', name: 'North' }, null), 'GEF-002 renamed.')
  assert.equal(successMessage({ kind: 'farm', farmId: 'f', name: ' North ', location: '' }, null), 'North updated.')
  assert.equal(successMessage({ kind: 'bulk', locked: true }, 12), 'Locked 12 devices.')
  assert.equal(successMessage({ kind: 'bulk', locked: false }, 12), 'Unlocked 12 devices.')
  assert.equal(successMessage({ kind: 'bulk', locked: true }, 0), 'Locked 0 devices.')
  for (const value of [null, undefined, '12', {}, NaN]) assert.equal(successMessage({ kind: 'bulk', locked: true }, value), 'Done')
})
test('allowedActions returns the complete action list for every status', () => {
  const cases = [
    [{ archived_at: '2026-11-16', enabled: false, owner_user_id: 'owner' }, ['restore']],
    [{ archived_at: null, enabled: false, owner_user_id: 'owner' }, ['rename', 'unlock', 'release', 'archive']],
    [{ archived_at: null, enabled: false, owner_user_id: null }, ['rename', 'unlock', 'archive']],
    [{ archived_at: null, enabled: true, owner_user_id: null }, ['rename', 'lock', 'archive']],
    [{ archived_at: null, enabled: true, owner_user_id: 'owner' }, ['rename', 'lock', 'release', 'archive']],
  ]
  for (const [device, expected] of cases) assert.deepEqual(helpers.allowedActions(device), expected)
})
test('shared action controls show only Restore for archived, and full actions otherwise', () => {
  const { DeviceActionButtons } = load('components/admin/devices.tsx')
  const archived = renderToStaticMarkup(React.createElement(DeviceActionButtons, { device: devices[0], onAction: () => {} }))
  assert.match(archived, />Restore</)
  assert.doesNotMatch(archived, /Rename|Assign to farmer|Release|Remove/)
  assert.equal((archived.match(/<button/g) || []).length, 1)
  const claimed = renderToStaticMarkup(React.createElement(DeviceActionButtons, { device: { ...devices[0], archived_at: null, enabled: true }, onAction: () => {} }))
  for (const label of ['Rename', 'Lock', 'Release', 'Remove (Archive)']) assert.ok(claimed.includes(label))
  assert.match(claimed, /disabled=""[^>]*>Assign to farmer/)
})
test('audit log applies a device target filter, receipt ordering, and twenty-row pagination', async () => {
  const { data, requests } = setup(() => ({ body: [] }))
  await data.listAuditLog({ limit: 20, offset: 20, targetId: 'GEF-002' })
  const p = requests[0].url.searchParams
  assert.equal(p.get('target_id'), 'eq.GEF-002')
  assert.equal(p.get('order'), 'created_at.desc')
  assert.equal(p.get('offset'), '20')
  assert.equal(p.get('limit'), '20')
})
test('user directory cap returns exactly 5000 and marks truncation after 50 RPCs', async () => {
  const { data, requests } = setup(({ body }) => ({ body: Array.from({ length: body.p_limit }, (_, index) => ({ ...users[0], user_id: `user-${body.p_offset + index}` })) }))
  const directory = await data.listAllUsers()
  assert.equal(directory.users.length, 5000)
  assert.equal(directory.truncated, true)
  assert.equal(requests.length, 50)
  assert.equal(requests.at(-1).body.p_offset, 4900)
  assert.ok(requests.every((request) => request.url.pathname.endsWith('/admin_list_users') && request.body.p_limit === 100))
})
test('short and empty user directories do not claim truncation', async () => {
  for (const count of [0, 101]) {
    const { data } = setup(({ body }) => ({ body: Array.from({ length: Math.max(0, Math.min(body.p_limit, count - body.p_offset)) }, (_, index) => ({ ...users[0], user_id: `u-${index}` })) }))
    const directory = await data.listAllUsers()
    assert.equal(directory.users.length, count)
    assert.equal(directory.truncated, false)
  }
})
test('device detail renders facts, shared actions, owner notice, and scoped activity', () => {
  const device = { ...devices[0], created_at: '2026-11-01T00:00:00Z', claimed_at: '2026-11-02T00:00:00Z' }
  const { AdminDeviceDetail } = load('components/admin/device-detail.tsx', {
    '@/components/session/greener-session': { useGreenerSession: () => adminSession },
    '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource({ device, users, truncated: true }) },
    '@/components/admin/activity': { ActivityLog: ({ targetId, pageSize }) => React.createElement('div', { 'data-target': targetId, 'data-size': pageSize }, 'Device activity') },
  })
  const markup = renderToStaticMarkup(React.createElement(AdminDeviceDetail, { deviceId: 'GEF-002' }))
  for (const text of ['Display name', 'Hardware version', 'Archived', 'Ada', 'Claimed at', 'Created at', 'Last data received', 'Restore', 'Showing the first 5,000 users.']) assert.ok(markup.includes(text))
  assert.match(markup, /href="\/admin\/devices"/)
  assert.match(markup, /href="\/admin\/readings\?device=GEF-002"/)
  assert.match(markup, /data-target="GEF-002" data-size="20"/)
  assert.doesNotMatch(markup, />Rename</)
})
test('unknown admin device gets a not-found panel without activity loading', () => {
  const { AdminDeviceDetail } = load('components/admin/device-detail.tsx', {
    '@/components/session/greener-session': { useGreenerSession: () => adminSession },
    '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource({ device: null, users, truncated: false }) },
    '@/components/admin/activity': { ActivityLog: () => assert.fail('Unknown devices have no activity query') },
  })
  const markup = renderToStaticMarkup(React.createElement(AdminDeviceDetail, { deviceId: 'missing' }))
  assert.match(markup, /Device not found/)
  assert.match(markup, /href="\/admin\/devices"/)
})
test('Activity directory is loaded once and log pagination queries only audit rows', async () => {
  const requests = { users: 0, devices: 0, audit: [] }
  const loaders = []
  let page = 0
  const { AdminActivity, ActivityLog } = load('components/admin/activity.tsx', {
    react: { ...React, useState: () => [page, () => {}] },
    '@/lib/data/admin': {
      listAllUsers: async () => { requests.users++; return { users, truncated: true } },
      listAllDevices: async () => { requests.devices++; return devices },
      listAuditLog: async (options) => { requests.audit.push(options); return [] },
    },
    '@/components/admin/use-admin-resource': { useAdminResource: (load, key) => { loaders.push({ load, key }); return noopResource(null) } },
  })
  renderToStaticMarkup(React.createElement(AdminActivity))
  assert.equal(loaders[0].key, undefined)
  const directory = await loaders[0].load(new AbortController().signal)
  for (page = 0; page < 3; page++) {
    renderToStaticMarkup(React.createElement(ActivityLog, { directory }))
    await loaders.at(-1).load(new AbortController().signal)
  }
  assert.equal(requests.users, 1)
  assert.equal(requests.devices, 1)
  assert.deepEqual(requests.audit.map((request) => request.offset), [0, 50, 100])
})
test('unknown activity targets stay text while known devices link to detail', () => {
  const rows = [{ actor_user_id: null, action: 'update', target_id: 'farm-uuid', reason: 'Correction', created_at: '2026-11-16', before_data: null, after_data: null }]
  const { ActivityLog } = load('components/admin/activity.tsx', { '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource(rows) } })
  const markup = renderToStaticMarkup(React.createElement(ActivityLog, { directory: { users, devices, truncated: false } }))
  assert.match(markup, /farm-uuid/)
  assert.doesNotMatch(markup, /href="\/admin\/devices\/farm-uuid"/)
})
test('all farms counts matching farm_id and users shows the backend roles note', () => {
  const { AdminFarms } = load('components/admin/farms.tsx', {
    '@/components/session/greener-session': { useGreenerSession: () => adminSession },
    '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource({ farms: [{ id: 'farm', name: 'Farm', location: null, owner_user_id: 'owner-1' }], users, devices: [{ farm_id: 'farm' }, { farm_id: 'farm' }, { farm_id: 'other' }], truncated: true }) },
  })
  const markup = renderToStaticMarkup(React.createElement(AdminFarms))
  assert.match(markup, />Devices</)
  assert.match(markup, /class="tabular-nums">2<\/td>/)
  assert.match(markup, /Showing the first 5,000 users./)
  const { AdminUsers } = load('components/admin/users.tsx', { '@/components/admin/use-admin-resource': { useAdminResource: () => noopResource(users) } })
  assert.match(renderToStaticMarkup(React.createElement(AdminUsers)), /Roles are managed by the backend team./)
})
test('success feedback survives session loading, is dismissible, and does not leak between users', () => {
  let session = adminSession
  let notice = null
  let feedback
  let effect
  let previousId
  const module = load('components/admin/feedback.tsx', {
    '@/components/session/greener-session': { useGreenerSession: () => session },
    react: { ...React, useState: () => [notice, (next) => { notice = next }], useCallback: (callback) => callback, useEffect: (callback, deps) => { if (deps[0] !== previousId) { previousId = deps[0]; effect = callback } } },
  })
  function Probe() { feedback = module.useAdminFeedback(); return React.createElement(module.AdminSuccessMessage, { message: feedback.message, onDismiss: feedback.clear }) }
  const render = () => renderToStaticMarkup(React.createElement(module.AdminFeedbackProvider, null, React.createElement(Probe)))
  render()
  effect()
  feedback.succeed({ kind: 'manage', deviceId: 'GEF-002', action: 'lock' }, null)
  assert.match(render(), /role="status"/)
  assert.match(render(), /GEF-002 locked./)
  session = { ...session, status: 'loading', isAdmin: false }
  assert.equal(render(), '')
  session = adminSession
  assert.match(render(), /GEF-002 locked./)
  feedback.clear()
  assert.equal(render(), '')
  feedback.succeed({ kind: 'bulk', locked: true }, 12)
  assert.match(render(), /Locked 12 devices./)
  session = { ...adminSession, user: { id: 'different-admin' } }
  assert.equal(render(), '')
  effect()
  assert.equal(notice, null)
})

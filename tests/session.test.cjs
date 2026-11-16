const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { setTimeout: delay } = require('node:timers/promises')

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
const { resolveLanding } = load('lib/session/landing.ts')
const { createSessionController, emptySession } = load('lib/session/controller.ts')
const user = { id: 'user-1', email: 'ada@example.test', user_metadata: { full_name: 'Ada' } }
const profile = { id: user.id, full_name: 'Saved name', created_at: '2026-11-16' }
function setup(overrides = {}) {
  const calls = []
  const states = []
  const controller = createSessionController({
    createProfile: async (name, signal) => { calls.push(['profile', signal, name]); return profile },
    checkAdmin: async (signal) => { calls.push(['admin', signal]); return false },
    listDevices: async (signal) => { calls.push(['devices', signal]); return [] },
    ...overrides,
  }, (state) => states.push(state))
  return { controller, calls, states, current: () => states.at(-1) }
}
function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

test('ready farmers with no devices are gated on every dashboard route', () => {
  for (const pathname of ['/', '/farms', '/farms/1', '/devices', '/alerts', '/users', '/settings']) {
    assert.equal(resolveLanding({ status: 'ready', isAdmin: false, deviceCount: 0, pathname }), '/connect-device')
  }
})
test('admins, device owners, auth pages, and connect-device stay put', () => {
  assert.equal(resolveLanding({ status: 'ready', isAdmin: true, deviceCount: 0, pathname: '/' }), null)
  assert.equal(resolveLanding({ status: 'ready', isAdmin: false, deviceCount: 1, pathname: '/' }), null)
  for (const pathname of ['/login', '/signup', '/auth/callback', '/connect-device', '/readings']) {
    assert.equal(resolveLanding({ status: 'ready', isAdmin: false, deviceCount: 0, pathname }), null)
  }
})
test('loading, failed, and signed-out sessions never get a device redirect', () => {
  for (const status of ['loading', 'error', 'signed-out']) {
    assert.equal(resolveLanding({ status, isAdmin: false, deviceCount: 0, pathname: '/' }), null)
  }
})
test('signed-out sessions make no data calls and sign-in initializes only once per user', async () => {
  const s = setup()
  s.controller.setUser(null)
  assert.deepEqual(s.current(), emptySession('signed-out'))
  await delay(5)
  assert.equal(s.calls.length, 0)
  s.controller.setUser(user)
  s.controller.setUser(user)
  await delay(5)
  assert.equal(s.current().status, 'ready')
  assert.equal(s.current().profile.full_name, 'Saved name')
  assert.deepEqual(s.calls.map((call) => call[0]), ['profile', 'admin', 'devices'])
  assert.equal(s.calls[0][2], 'Ada')
  s.controller.setUser({ ...user, user_metadata: { full_name: 'New metadata' } })
  await delay(5)
  assert.equal(s.calls.length, 3)
  s.controller.dispose()
})
test('profile failure is exposed but does not prevent ready state', async () => {
  const failure = { message: 'Profile insert denied' }
  const s = setup({ createProfile: async () => { throw failure } })
  s.controller.setUser(user)
  await delay(5)
  assert.equal(s.current().status, 'ready')
  assert.equal(s.current().profile, null)
  assert.equal(s.current().profileError.message, failure.message)
  assert.equal(s.current().error, null)
  assert.equal(s.current().isAdmin, false)
  assert.deepEqual(s.calls.map((call) => call[0]), ['admin', 'devices'])
  s.controller.dispose()
})
test('admin check failure fails closed with an exposed error and no device redirect', async () => {
  const s = setup({ checkAdmin: async () => { throw new Error('Admin check failed') } })
  s.controller.setUser(user)
  await delay(5)
  assert.equal(s.current().status, 'error')
  assert.equal(s.current().isAdmin, false)
  assert.equal(s.current().error.message, 'Admin check failed')
  assert.equal(resolveLanding({ ...s.current(), deviceCount: 0, pathname: '/' }), null)
  s.controller.dispose()
})
test('device query failure is not mistaken for zero owned devices', async () => {
  const s = setup({ listDevices: async () => { throw new Error('Devices unavailable') } })
  s.controller.setUser(user)
  await delay(5)
  assert.equal(s.current().status, 'error')
  assert.equal(s.current().error.message, 'Devices unavailable')
  s.controller.dispose()
})
test('sign-out aborts requests, clears state, and ignores late results', async () => {
  const pending = deferred()
  const s = setup({ listDevices: () => pending.promise })
  s.controller.setUser(user)
  await delay(5)
  const signal = s.calls[0][1]
  assert.equal(signal.aborted, false)
  s.controller.setUser(null)
  assert.equal(signal.aborted, true)
  assert.deepEqual(s.current(), emptySession('signed-out'))
  pending.resolve([{ device_id: 'old-device' }])
  await delay(5)
  assert.deepEqual(s.current(), emptySession('signed-out'))
  s.controller.dispose()
})
test('switching accounts aborts old requests and keeps new account data', async () => {
  const first = deferred()
  let count = 0
  const s = setup({ listDevices: () => ++count === 1 ? first.promise : Promise.resolve([{ device_id: 'new-device' }]) })
  s.controller.setUser(user)
  await delay(5)
  s.controller.setUser({ ...user, id: 'user-2' })
  await delay(5)
  first.resolve([{ device_id: 'old-device' }])
  await delay(5)
  assert.equal(s.current().user.id, 'user-2')
  assert.deepEqual(s.current().devices, [{ device_id: 'new-device' }])
  assert.equal(s.calls[0][1].aborted, true)
  s.controller.dispose()
})
test('refresh awaits new devices; sign-out during refresh rejects and cannot repopulate state', async () => {
  let devices = []
  const s = setup({ listDevices: async () => devices })
  s.controller.setUser(user)
  await delay(5)
  devices = [{ device_id: 'GEF-002' }]
  await s.controller.refresh()
  assert.deepEqual(s.current().devices, devices)
  const refresh = s.controller.refresh()
  const rejected = assert.rejects(refresh, { name: 'AbortError' })
  s.controller.setUser(null)
  await rejected
  assert.deepEqual(s.current(), emptySession('signed-out'))
  s.controller.dispose()
})
test('sign-out before deferred auth work prevents calls; signing in again initializes again', async () => {
  const s = setup()
  s.controller.setUser(user)
  s.controller.setUser(null)
  await delay(5)
  assert.equal(s.calls.length, 0)
  s.controller.setUser(user)
  await delay(5)
  assert.equal(s.calls.length, 3)
  s.controller.setUser(null)
  s.controller.setUser(user)
  await delay(5)
  assert.equal(s.calls.length, 6)
  s.controller.dispose()
})
test('disposing cancels pending work without publishing after unmount', async () => {
  const s = setup()
  s.controller.setUser(user)
  const count = s.states.length
  s.controller.dispose()
  await delay(5)
  assert.equal(s.calls.length, 0)
  assert.equal(s.states.length, count)
})
test('proxy covers connect-device and redirects unauthenticated requests to login', async () => {
  let authCalls = 0
  const { proxy, config } = load('proxy.ts', {
    '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => { authCalls++; return { data: { user: null }, error: null } } } }) },
  })
  const { NextRequest } = require('next/server')
  const matcher = new RegExp(`^${config.matcher[0]}$`)
  assert.ok(matcher.test('/connect-device'))
  const response = await proxy(new NextRequest('https://greener.example.test/connect-device'))
  assert.equal(response.status, 307)
  assert.equal(response.headers.get('location'), 'https://greener.example.test/login')
  assert.equal(authCalls, 1)
})

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const moduleUnderTest = { exports: {} }
const source = ts.transpileModule(fs.readFileSync('lib/dashboard/build-ai-summary.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
new Function('module', 'exports', source)(moduleUnderTest, moduleUnderTest.exports)
const { buildAiSummary } = moduleUnderTest.exports
const base = { readings: [{ device: 'actual-device', status: 'Online' }], alerts: [], openAlerts: 0, criticalAlerts: 0, offlineDevices: 0 }
test('critical counts take priority even when a critical alert is outside the preview window', () => {
  assert.equal(buildAiSummary({ ...base, criticalAlerts: 1 }).status, 'critical')
})
test('open critical alerts take priority over warnings and resolved alerts', () => {
  const alerts = [{ status: 'Open', severity: 'Warning', type: 'Low battery', plot: 'North', device: 'd1' }, { status: 'Open', severity: 'Critical', type: 'High EC', plot: 'South', device: 'd2' }]
  const result = buildAiSummary({ ...base, alerts })
  assert.equal(result.status, 'critical')
  assert.match(result.shortSummary, /South/)
  assert.equal(buildAiSummary({ ...base, alerts: alerts.map((a) => ({ ...a, status: 'Resolved' })) }).status, 'healthy')
})
test('missing readings never claim healthy conditions', () => {
  assert.equal(buildAiSummary({ ...base, readings: [] }).status, 'attention')
})
test('device warnings and aggregate open alerts request attention', () => {
  assert.equal(buildAiSummary({ ...base, openAlerts: 9 }).status, 'attention')
  assert.equal(buildAiSummary({ ...base, offlineDevices: 2 }).status, 'attention')
  assert.match(buildAiSummary({ ...base, readings: [{ device: 'actual-device', status: 'Warning' }] }).shortSummary, /actual-device/)
})
test('healthy copy does not claim measured values fall inside invented thresholds', () => {
  assert.equal(buildAiSummary(base).status, 'healthy')
  assert.match(buildAiSummary(base).shortSummary, /loaded data/)
})

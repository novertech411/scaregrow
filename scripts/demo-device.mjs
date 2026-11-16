// Demo helper: check / release / register a device as the super admin.
// Uses the public anon key + your admin login, so the backend's own admin checks apply.
//
//   export ADMIN_EMAIL=you@example.com
//   read -s ADMIN_PASSWORD && export ADMIN_PASSWORD
//   node scripts/demo-device.mjs status   GEF-002
//   node scripts/demo-device.mjs release  GEF-002
//   node scripts/demo-device.mjs register TEST-001 v2 "Demo device"
//
// Requires Node 22 (process.loadEnvFile) and .env.local with the Supabase URL + anon key.
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.local')
const [command, deviceId, ...rest] = process.argv.slice(2)
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env

function fail(message) { console.error(`✖ ${message}`); process.exit(1) }
if (!['status', 'release', 'register'].includes(command) || !deviceId) fail('Usage: node scripts/demo-device.mjs <status|release|register> <DEVICE_ID> [v1|v2] [display name]')
if (!url || !key) fail('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local')
if (!email || !password) fail('Set ADMIN_EMAIL and ADMIN_PASSWORD first (see the top of this file)')

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
if (loginError) fail(`Admin login failed: ${loginError.message}`)

const { data: isAdmin, error: adminError } = await supabase.rpc('is_super_admin')
if (adminError) fail(`is_super_admin failed: ${adminError.message}`)
if (isAdmin !== true) fail(`${email} is NOT a super admin — ask the backend engineer to run the 07 admin-grant script`)
console.log(`✔ Signed in as super admin ${email}`)

async function showStatus() {
  const { data, error } = await supabase.from('devices').select('*').eq('device_id', deviceId).maybeSingle()
  if (error) fail(error.message)
  if (!data) fail(`Device ${deviceId} is not registered (IDs are case-sensitive)`)
  const status = data.archived_at ? 'Archived' : !data.enabled ? 'Locked' : !data.owner_user_id ? 'Unclaimed ✅ (ready to pair)' : 'Claimed'
  console.log(`  ${data.device_id} · ${data.hardware_version} · ${status}`)
  console.log(`  owner: ${data.owner_user_id ?? '—'} · last data received: ${data.last_received_at ?? 'never'}`)
}

if (command === 'release') {
  const { error } = await supabase.rpc('admin_manage_device', { p_device_id: deviceId, p_action: 'release', p_reason: 'Demo reset' })
  if (error) fail(`Release failed: ${error.message}`)
  console.log(`✔ Released ${deviceId}`)
}
if (command === 'register') {
  const [version = 'v2', ...name] = rest
  if (!['v1', 'v2'].includes(version)) fail('Hardware version must be v1 or v2')
  const { error } = await supabase.rpc('admin_register_device', { p_device_id: deviceId, p_hardware_version: version, p_display_name: name.join(' ') || null, p_reason: 'Demo device' })
  if (error) fail(`Register failed: ${error.message}`)
  console.log(`✔ Registered ${deviceId} (${version})`)
}
await showStatus()
await supabase.auth.signOut()

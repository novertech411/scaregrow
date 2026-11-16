# Greener backend contract (from the backend/IT engineer)

**This file is the source of truth for the database.** The backend team owns the Supabase schema, RLS and RPCs.
The frontend repo does **not** create or migrate tables. Where CLAUDE.md or older code disagrees with this file, this file wins.

Status (2026-11-15): V2 / EMQX ingestion is confirmed working. V1 / ThingSpeak ingestion is pending.
The contract is based on the supplied schema scripts, not on a live inspection of the database. **Test pairing and isolation with two user accounts before release.**

## 1. Schemas

- `public` is the only schema the app uses.
- `auth.users` holds accounts. Email and password are managed by Supabase Auth.
- `farm_private` is internal. **The app must never query it.**

## 2. Tables (public)

| Table | Columns | Notes |
|---|---|---|
| `profiles` | `id` (uuid PK = auth user id), `full_name`, `created_at` | **Not created automatically.** The app creates it after sign-in (§4). |
| `farms` | `id`, `owner_user_id`, `name`, `location`, `created_at` | One owner has many farms. RLS restricts each farm to its owner. Other users may use the same farm name. |
| `devices` | `device_id` (text PK, e.g. `GEF-002`, permanent, case-sensitive), `hardware_version` (`v1`/`v2`), `owner_user_id`, `display_name`, `farm_id` → farms (fk `devices_farm_id_fkey`), `farm_name`, `location`, `enabled`, `archived_at`, `created_at`, `claimed_at`, `last_received_at` | One farm has many devices. `farm_name` and `location` on devices are **legacy mirrors**: edit the farm instead. Editing them on a linked device is ignored. |
| `sensor_readings` | see §6, plus `owner_user_id_at_receipt` (uuid, nullable; confirmed in the schema diagram 2026-11-16). The admin brief also mentioned `farm_id_at_receipt`, but it is **not** in the diagram (unconfirmed, see §10). | One device has many readings. Each reading belongs to whoever owned the device **when it was received**. |

Relationships: `profiles.id` and `devices.owner_user_id` → `auth.users.id`. `sensor_readings.device_id` → `devices.device_id`. `devices.farm_id` → `farms.id`.

## 3. Permissions (RLS)

- A user sees **only devices they own** and **only their own farms**.
- **Readings are scoped to ownership at receipt.** A user sees the readings received while *they* owned the device, never another owner's period. Don't assume the current owner can see every past reading.
- `my_reading_devices()` lists every device a user has readings for, **including devices that were later released**. Use it to offer history; then query `sensor_readings` by `device_id` and RLS returns only the permitted rows.
- **Super admins can SELECT every row** in devices, farms and sensor_readings (all history).
- Users **may** edit their own `profiles.full_name`, `devices.display_name` and their own farms' `name`/`location`.
- Users **may not** insert readings, change ownership or `farm_id` directly, register devices, or change `enabled`.
- Devices must be **pre-registered by an admin** (`admin_register_device`, §8) before anyone can pair them.
- `ingest_emqx_reading` is ingestion-only. The app never calls it.
- The frontend reads Supabase only. It never connects to EMQX or ThingSpeak.

## 4. Sign-up and device pairing

1. Sign up with email and password, confirm the email if required, and get a signed-in session.
2. Create the user's `profiles` row (`id = user.id`, `full_name`). If the row exists, update only `full_name`.
3. Ask for the device ID (required), plus optional device name, farm name and farm location. These can be collected during sign-up, but **pairing must happen only after sign-in**.
4. Call `pair_device`:

```js
const { data, error } = await supabase.rpc('pair_device', {
  p_device_id: deviceId.trim(),
  p_device_name: deviceName.trim() || null,
  p_farm_name: farmName.trim() || null,
  p_farm_location: location.trim() || null,
})
// To attach to an EXISTING farm instead: pass p_farm_id: selectedFarmId and omit p_farm_name.
// Handle `error` before opening the dashboard. Success returns the device ID.
```

Rules:
- The **first signed-in claimant wins**. Once a device is linked to an account, **no other account can take it**. A retry from the same owner is allowed.
- There is no claim code. Device IDs are case-sensitive and must already be registered.
- Show clear "not found / unavailable" and "already claimed" errors.
- `pair_device` also updates names and farm assignment for a device the user already owns. **Blank values keep the current values.** They never unlink a farm or erase a label.
- Same owner + exact farm name + location reuses the existing farm. Prefer selecting an existing farm by ID.
- `claim_farm_device(p_device_id)` is the older RPC. It still works but doesn't take the optional details. Use `pair_device`.
- There are no direct frontend writes to `farm_id` or ownership.

## 5. Dashboard queries

```js
// Devices (RLS limits to the signed-in user's devices) with their farm
supabase.from('devices').select('*, farm:farms!devices_farm_id_fkey(id,name,location)')

// Farms
supabase.from('farms').select('*')

// Latest FULL reading — moisture-only packets must NOT blank the other sensor cards
supabase.from('sensor_readings').select('*')
  .eq('device_id', deviceId).eq('packet_type', 'sensor')
  .order('received_at', { ascending: false }).order('id', { ascending: false })
  .limit(1).maybeSingle()

// Live moisture: same query with packet_type = 'moisture'; compare its received_at with the latest full sample.
// Charts/history: filter by device + date range, order by received_at then id, paginate.
```

- Check every query's `error` **and** its empty state.
- Use the row `id` as the UI key. `cycle` repeats and is not unique.
- **Refresh by polling every 10–15 s while the dashboard is visible.** Stop polling on logout or navigation. Realtime is not enabled.
- Show `last_received_at` as **"Last data received"**. It doesn't prove the device is connected right now.
- Display `display_name || device_id` and `farm?.name || 'No farm assigned'`.

## 6. Reading fields and display

| Group | Column | Display meaning | Unit |
|---|---|---|---|
| Identity | `id`, `device_id`, `node_id` (unused, null) | | |
| Packet | `source` (`emqx`/`thingspeak`), `packet_type` (`sensor`/`moisture`), `cycle` (counter, not unique), `source_message_id` | | |
| Time | `received_at` (database receipt time), `measured_at` (nullable, actual measurement time) | | |
| Soil | `soil_moisture_pct` | Soil moisture | % |
| | `soil_temperature_c` | Soil temperature | °C |
| | `soil_ph` | Soil pH (acidity/alkalinity) | pH (dimensionless) |
| | `soil_ec_us_cm` | EC — electrical conductivity | µS/cm |
| Nutrients | `nitrogen_mg_kg` | N — nitrogen | mg/kg |
| | `phosphorus_mg_kg` | P — phosphorus | mg/kg |
| | `potassium_mg_kg` | K — potassium | mg/kg |
| Estimates | `salinity_est_g_l` | Estimated salinity (= EC × 0.55 / 1000) | g/L |
| | `tds_est_mg_l` | Estimated TDS — total dissolved solids (= EC × 0.50) | mg/L |
| | `irradiance_est_w_m2` | Estimated irradiance (= lux × 0.0079) | W/m² |
| Air/light (V2 only) | `air_temperature_c` | Ambient air temperature | °C |
| | `air_humidity_pct` | Ambient relative humidity | % RH |
| | `illuminance_lux` | Illuminance (visible light on the sensor) | lx |
| Debug only | `raw_payload` | Original JSON. Don't show to farmers. | |

- **Null means "Unavailable", never zero.**
- V1 devices send soil + NPK only. V2 adds air/light and the three estimates (see §6.1).
- Salinity, TDS and irradiance are **estimates**. Keep that label.
- Units follow the firmware mapping, not an independent calibration.
- Display times in the user's local time zone (e.g. Africa/Lagos) by parsing the timestamp's offset. Never add hours by hand.
- `received_at` doesn't prove when a reading was measured. Show `measured_at` when present.

### 6.1 What each hardware version sends

| Column | V1 | V2 |
|---|---|---|
| `cycle` | — | ✓ |
| soil: `soil_moisture_pct`, `soil_temperature_c`, `soil_ph`, `soil_ec_us_cm` | ✓ | ✓ |
| nutrients: `nitrogen_mg_kg`, `phosphorus_mg_kg`, `potassium_mg_kg` | ✓ | ✓ |
| air/light: `air_temperature_c`, `air_humidity_pct`, `illuminance_lux` | — | ✓ |
| estimates: `irradiance_est_w_m2`, `salinity_est_g_l`, `tds_est_mg_l` | — | ✓ |

Use `devices.hardware_version` to decide which cards to show. For a V1 device, **hide** the V2-only cards instead of filling the page with "Unavailable". For a V2 device, a null value still shows "Unavailable".

## 7. Not implemented in the backend — do not show as working

Irrigation controls (no Start/Stop buttons), thresholds, alerts, command acknowledgements, node management, notifications.
Battery and signal fields don't exist.

## 8. Super admin

Use the same Supabase Auth and the public anon key. **Never put a service-role key in the browser.**

**Who is an admin:** after login, call `supabase.rpc('is_super_admin')`. Show admin pages only when `data === true`.
The backend enforces access on its own regardless of the UI.
Roles are granted **only in the SQL Editor** (the backend's "07" SQL script, run with the user's Auth UUID). Users can't promote themselves, and the app needs **no role-editing screen**.

### 8.1 Admin pages and data

| Page | Source and fields |
|---|---|
| Devices | `devices`: device_id, hardware_version, display_name, owner_user_id, farm_id, enabled, archived_at, claimed_at, last_received_at |
| Farms | `farms`: id, owner_user_id, name, location |
| Users | `rpc('admin_list_users', { p_limit, p_offset })` → user_id, email, full_name, created_at, device_count (p_limit default 50, max 100) |
| Readings | `sensor_readings` filtered by device_id, ordered by received_at desc, paginated |
| Activity | `admin_audit_log`: actor_user_id, action, target_id, reason, before_data, after_data, created_at |

Join `devices.farm_id` → `farms.id`, and `owner_user_id` → the `admin_list_users` result (to show owner name/email).
"Last data received" means recent data, not a confirmed live connection.

### 8.2 Admin RPCs (every one takes a `p_reason`, recorded in the audit log)

| Function | Arguments | Notes |
|---|---|---|
| `admin_register_device` | p_device_id, p_hardware_version (`v1`/`v2`), p_display_name, p_reason | Pre-registers a device so a farmer can pair it |
| `admin_manage_device` | p_device_id, p_action (`lock`, `unlock`, `release`, `archive`, `restore`), p_reason | |
| `admin_set_all_devices_locked` | p_locked (boolean), p_reason | Returns the number of devices changed |
| `admin_update_device_name` | p_device_id, p_display_name, p_reason | |
| `admin_update_farm` | p_farm_id, p_name, p_location, p_reason | |
| `admin_list_users` | p_limit, p_offset | |

Handle `error` before showing success. Refresh the affected lists after each success.

### 8.3 Device status (admin view)

Status priority: `archived_at` set → **Archived**; else `!enabled` → **Locked**; else no `owner_user_id` → **Unclaimed**; else → **Claimed**.

- **Lock** blocks cloud ingestion and new claims. It does **not** stop local valves or MQTT connections, so say so in the UI.
- **Release** clears the owner, assignment and labels (this is how a device is unpaired). It does **not** unlock.
- **Restore** brings back an archived device but keeps it locked.
- The **Remove** button should call **Archive**. There's no permanent delete.
- **Release, Archive and bulk lock/unlock need a confirmation dialog** plus a required reason.
- **Assigning a device to a farmer has no backend.** Build it as UI only, disabled and marked "coming soon".

## 9. Unchanged

Firmware, MQTT topics, API keys and sensor upload bodies are unchanged.

## 10. Still open for the backend engineer

1. **Pairing errors:** what are the exact error codes or messages from `pair_device` for not-found, locked/archived and already-claimed?
2. **Profiles RLS:** can a signed-in user `insert` their own `profiles` row (needed for §4 step 2)?
3. **`my_reading_devices()`:** what are the exact return columns?
4. **Bulk-lock count:** what's the exact return shape of `admin_set_all_devices_locked`? And does `admin_audit_log` support ordering and pagination for normal users, or are they denied?
5. **`farm_id_at_receipt`:** the admin brief mentions it, but the schema diagram shows only `owner_user_id_at_receipt`. Does `farm_id_at_receipt` exist?

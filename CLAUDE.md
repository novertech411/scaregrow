# CLAUDE.md — Greener (Green Eden farm & soil monitoring)

Guide for Claude Code, Codex and humans working in this repo. Read it before changing code.
**The database contract in [docs/backend-contract.md](docs/backend-contract.md) overrides anything here.**

## 1. What this project is

**Greener** is a web dashboard for **Green Eden Farms** (Nigeria). Field sensor nodes measure soil and environment
conditions. A backend owned by a separate engineer ingests them into **Supabase**, and this Next.js app displays them.

```
SENSOR NODE (V1 / V2) → EMQX (V2) / ThingSpeak (V1, pending) → backend ingestion → SUPABASE → THIS APP
                                                                (backend team)      (RLS)     (read + RPCs)
```

There are two account types:
- **Farmer:** signs up, pairs a device by its ID, and sees **only their own** devices, farms and readings.
- **Super admin:** detected by `rpc('is_super_admin')`. Sees and manages **all** devices, farms, users, readings and the audit log.
  Admins are granted by the backend team in SQL. There's no role screen in the app.

Guiding principle: **the UI is a client of the system.** Security lives in Supabase RLS and RPCs, never only in the UI.

## 2. Who does what (working agreement)

- The **backend engineer** owns the Supabase schema, RLS and RPCs. This repo has **no DB migrations**.
  Their handoffs are captured in `docs/backend-contract.md`, including the open questions in §10.
- **Claude Code** is the architect and reviewer: it writes task prompts, verifies results and maintains this file and the contract.
- **Codex** implements. Every task report must list files, give per-task Done/Partially/Not done, and paste typecheck/test/build output.

## 3. Tech stack

Next.js 16 (App Router) · React 19 · TypeScript 5.7 strict · Tailwind CSS v4 · lucide-react · recharts ·
Supabase (`@supabase/ssr`, `@supabase/supabase-js`, anon key + RLS) · OpenAI Chat Completions via raw `fetch` (server-only, assistant) ·
Vercel (+ `@vercel/analytics`) · **Node 22.x** · **pnpm 12.3.4** via corepack · Inter bundled in `app/fonts/`.
`leaflet` and `react-leaflet` are still in package.json but **unused** (the map was removed).

## 4. Commands

```sh
corepack pnpm install --frozen-lockfile   # pnpm-lock.yaml is authoritative; never npm install
corepack pnpm dev                         # http://localhost:3000
corepack pnpm typecheck                   # tsc --noEmit
corepack pnpm test                        # node --test tests/*.test.cjs
corepack pnpm build                       # next build --webpack (not Turbopack)
```

Run all three checks before you call a task done. On this machine, put Node 22 on PATH first:
`export PATH=$HOME/.nvm/versions/node/v22.19.0/bin:$PATH`. The system Node 18 breaks the supabase-js tests ("native WebSocket not found").

## 5. Environment variables

`.env.example` → `.env.local` (git-ignored, never commit or print it).

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | **Anon key only. Never a service-role key anywhere.** |
| `OPENAI_API_KEY` | server only | Assistant. Never `NEXT_PUBLIC_`. |
| `OPENAI_MODEL` | server only | Optional, default `gpt-4o-mini` |

## 6. Directory map

```
app/
  layout.tsx                  Font, metadata, <GreenerSessionProvider><AdminFeedbackProvider>
  page.tsx                    "/" → GreenerDashboard (Overview)
  login/, signup/             Auth pages (email + optional Google)
  auth/callback/route.ts      Supabase code exchange (same-origin redirects only)
  connect-device/page.tsx     Pair a device (pair_device RPC)
  devices/, devices/[deviceId]/   Farmer devices list / device overview
  readings/                   Farmer reading history + CSV
  farms/, farms/[farmId]/     Farmer farms list / detail
  admin/page.tsx              → /admin/devices
  admin/[section]/page.tsx    devices | users | farms | readings | activity
  admin/devices/[deviceId]/   Admin device detail + its audit log
  api/assistant/readings/     POST — AI assistant (LEGACY, being rebuilt in Phase 5)
proxy.ts                      Auth gate on every request (Next 16 "proxy" = middleware)

components/
  greener-dashboard.tsx       App shell (Sidebar, Header, MobileNav) wrapped in LandingGate; picks the page
  session/                    greener-session.tsx (provider + useGreenerSession), landing-gate.tsx
  dashboard/                  overview-page (device overview + polling), reading-panels, device-history-chart,
                              moisture-chart, device-status-banner, device-not-found
  devices-page.tsx, readings-page.tsx (exports HistoryContent, reused by admin), farms-page.tsx,
  farm-detail-page.tsx, change-device-farm.tsx, connect-device-page.tsx, farms/use-owned-farms.ts
  admin/                      Admin screens, ReasonDialog, useAdminResource, feedback (success toasts), navigation
  layout/                     sidebar, header, mobile-nav, session-account, brand-mark
  assistant/                  LEGACY readings chat UI (not mounted; Phase 5)
  ui/                         button, page-loading, status-badge

lib/
  supabase/                   client.ts (browser), server.ts (cookies), auth.ts, database.types.ts (hand-written from contract)
  data/                       ★ Contract data layer: devices, farms, sensor-readings, profile, pairing, admin,
                              presenters (toDeviceView, deviceAdminStatus), readings-csv, farm-edits
  measurements.ts             ★ The 13 metrics: labels, units, groups, V1/V2 support, formatMeasurement/formatTimestamp
  session/                    controller.ts (session state machine), landing.ts (resolveLanding), owned-devices.ts
  dashboard/                  overview loading, 15 s polling, chart polling (5 min), rename
  readings/filters.ts         Readings URL state, windows, custom-range validation
  admin/                      navigation (sections, canAccessAdmin), actions (performAdminAction, successMessage),
                              presenters (allowedActions, ownerLabel, auditJson)
  assistant/                  LEGACY server pipeline (Phase 5). Still imports lib/services/readings + lib/readings-view.
  services/readings.ts, readings-view.ts, readings-constants.ts   LEGACY, kept only for the assistant
  types.ts                    PageKey ('Overview' | 'Farms' | 'Devices' | 'Readings')

docs/backend-contract.md      ★ Source of truth for the DB
docs/archive/sql-do-not-run/  Obsolete SQL. NEVER run it (it would break per-farmer RLS isolation).
tests/*.test.cjs              node:test suites (see §11)
```

## 7. How the app works

### 7.1 Auth and session
- `proxy.ts`: signed-out → `/login` (401 JSON for `/api/assistant/*`); signed-in on `/login` or `/signup` → `/`.
- `GreenerSessionProvider` (root layout) loads **once per sign-in**: `createMyProfileIfMissing(full_name)` (non-fatal),
  `isSuperAdmin()` (a failure puts the session in an error state, failing closed) and `listMyDevices()`. It exposes
  `{ status, user, isAdmin, profile, devices, error, profileError, refresh() }` and clears everything on sign-out.
- `LandingGate` + `resolveLanding()` (UX only):
  - a farmer with 0 owned devices → `/connect-device`. `/readings` is exempt, so past-device history stays reachable.
  - an admin on `/` always → `/admin/devices`. The admin sidebar shows only the admin section; farmer pages stay reachable by URL.

### 7.2 The ownership trap (important)
RLS lets admins read **every** row, so for an admin `session.devices` and `listMyFarms()` return everyone's data.
**Farmer screens must always filter** with `ownedDevices(devices, userId)` / `ownedFarms(farms, userId)`.
**Admin screens must never filter.**

### 7.3 Farmer screens
- **Overview / device detail** (`overview-page.tsx`): the selected device is in `?device=` (`pickDevice`).
  - Every **15 s** while the tab is visible (`pollOverview`), it refreshes the device, the latest *full* reading (`packet_type='sensor'`), the latest moisture packet and the last 10 sensor rows.
  - The chart reloads only on range/metric change or every **5 min** (`pollChartHistory`), capped at the newest 1,000 sensor packets.
  - Moisture-only packets never blank the other cards.
- **Readings:** owned plus past devices (`my_reading_devices`).
  - URL state: `device, range, from, to, packet, page`.
  - Frozen time window, 25 rows per page, a chart, and CSV export (≤ 50k rows; formula-escaping applies to strings only).
- **Devices:** rename (`updateDeviceDisplayName`; a null return = refused), change farm (`pair_device` with farmId or a new farm).
- **Farms:** edit name/location (`updateFarm`; a null return = refused).
- **Connect device:** `pairDevice()` → `pair_device` RPC. The first claimant wins. Backend error messages are shown as-is.

### 7.4 Admin screens (`/admin/*`, gated by `canAccessAdmin`)
- All devices, device detail, Users, All farms, All readings (reuses `HistoryContent`), Activity (`admin_audit_log`).
- Every mutation goes through `performAdminAction` → `admin_*` RPCs with a **required reason**, inside `ReasonDialog`.
- Afterwards the affected lists are refreshed and a success message (`successMessage`) appears.
- `allowedActions(device)`: Archived → restore only. Otherwise rename, plus lock/unlock, plus release (only if owned), plus archive.
- "Assign to farmer" is disabled ("coming soon"); there's no backend for it.

### 7.5 Measurements
Always use `lib/measurements.ts`:
- `measurementsFor(hardware_version)` decides which cards to show (V1 = soil + NPK; V2 adds air/light + 3 estimates).
- `formatMeasurement` turns null into **'Unavailable'**, never 0.
- Estimates (salinity, TDS, irradiance) keep their "Estimated" label and formula.

## 8. Status

**Done (2026-11-16, branch `frontend-backend-contract`):** Phase 1 data layer · Phase 2 sign-up/pairing/session ·
Phase 3 farmer Overview/Devices/Readings/Farms · Phase 4 admin. The super admin was verified live on `/admin/devices`.

**Next:**
- **Phase 5, the AI assistant.** Rebuild it on `sensor_readings`, then remove `lib/services/readings.ts`, `lib/readings-view.ts` and their old tests.
- Two-account isolation test against the live DB.
- Remove the unused leaflet deps.

**Not in the backend (don't build or fake them):** alerts, thresholds, notifications, irrigation controls, battery/signal, assigning devices to farmers.

## 9. Domain rules

- **No fake success.** Check every RPC/query `error`. A null return from `update().select().maybeSingle()` means RLS refused it.
- **Null = "Unavailable", never zero.** Label estimates as estimates. Don't invent metrics, health scores or labels like "toxic/bad".
- **No hard-coded agronomic thresholds** and no alert logic in the UI. Describe measured values precisely.
- **Times:** order by `received_at`, then `id`. Show `measured_at` when present and say which one is shown.
  "Last data received" ≠ "online". Format with `Intl` in local time; never add hours by hand.
- `cycle` repeats. Use the reading `id` as the key.
- **Never** query `farm_private`, call `ingest_emqx_reading`, or use a service-role key. Device IDs are case-sensitive: trim them only.
- **Don't use color alone** for status. Pair it with text and an icon.
- **Don't redesign.** Keep the Greener palette (`#123d2d`, `#1f7a52`, `#b9e878`), rounded cards and Inter.

## 10. Code conventions

- `@/*` alias. Compact style: single quotes, no semicolons, 2-space indent, dense one-line JSX (match the surrounding file).
- New DB access goes in `lib/data/*` (throw Supabase errors, accept an optional `AbortSignal`). Logic worth testing goes in pure functions under `lib/`.
- Components are `'use client'`. Errors show inline with `role="alert"`, success with `role="status"`.
  Use `AbortController` for anything that can be superseded. Heavy widgets go through `next/dynamic`.
- No new dependencies without the architect's approval. Modals use native `<dialog>`.

## 11. Testing

- `node:test` in `tests/*.test.cjs`. TS is transpiled on the fly with a small require shim (`@/` alias, `server-only` stubbed).
- Supabase queries are tested with a **real `createClient()` plus a fake `global.fetch`**, asserting PostgREST URLs and bodies.
- Suites: `data`, `session`, `overview`, `devices`, `history-farms`, `admin`, plus LEGACY `readings` and `assistant` (both rewritten or removed in Phase 5).
- Live Supabase behavior (RLS, RPC errors) is **not** covered by tests. Verify it manually with real accounts.

## 12. Deployment (Vercel)

- `vercel.json` pins pnpm install and build.
- Set the env vars for Production and Preview.
- Add each deployed origin's `/auth/callback` to Supabase **Auth → URL Configuration → Redirect URLs** (also `http://localhost:3000/auth/callback`).
- Work happens on branch `frontend-backend-contract`. Merge to `main` only after testing the preview. Details: [DEPLOYMENT.md](DEPLOYMENT.md).

## 13. Gotchas

- `README.md` is empty. The product spec is [Greener_README.md](Greener_README.md). It predates the backend contract (it mentions alerts/RBAC roles that don't exist), so the contract wins.
- Both `package-lock.json` and `pnpm-lock.yaml` exist. pnpm is authoritative.
- Several backend details are still unconfirmed (contract §10): pairing error codes, profile-insert RLS,
  `my_reading_devices` columns, the bulk-lock return shape, and whether `farm_id_at_receipt` exists (the types use `owner_user_id_at_receipt`).

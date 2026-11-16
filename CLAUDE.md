# CLAUDE.md — Greener (Green Eden farm & soil monitoring)

This file guides Claude Code (and humans) working in this repository. Read it before changing code.

## 1. What this project is

**Greener** is a web dashboard for monitoring farms and soil conditions, built for **Green Eden Farms**
(Nigeria — Jos, Kaduna, Kano). Field sensor nodes (ESP32 + SIM800L cellular modem + 4‑in‑1 soil probe)
measure **soil moisture, soil temperature, pH and EC (electrical conductivity)**. Those readings are stored in
**Supabase (Postgres)**, and this Next.js app displays them as an operational dashboard with farms, devices,
readings, alerts, users, notifications and an AI "Greener Assistant".

Intended end-to-end data flow (only the right-hand half exists today):

```
SOIL PROBE → ESP32 → SIM800L/GPRS → INGESTION API → DATABASE → RULES/ALERT ENGINE → DASHBOARD → USERS + NOTIFICATIONS
                                    (not built yet)  (Supabase)   (not built yet)    (this repo)
```

The core loop the architecture should serve: **SENSE → VALIDATE → STORE → ANALYZE → ALERT → NOTIFY → ACT → RECORD HISTORY**.
Guiding principle: **the UI is not the system — the UI is a client of the system.**

The UI was first generated with **v0** (Vercel). It has since been wired to real Supabase data. The
long-form product/engineering spec is [Greener_README.md](Greener_README.md). Treat it as the source of truth for
product intent. Deployment steps are in [DEPLOYMENT.md](DEPLOYMENT.md), and the AI assistant design is in
[lib/assistant/README.md](lib/assistant/README.md).

## 2. Tech stack

| Area | Choice |
|---|---|
| Framework | **Next.js 16** (App Router), **React 19**, TypeScript 5.7 (strict) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`), `tw-animate-css`, shadcn (`base-nova` style, `@base-ui/react`), `class-variance-authority`, `tailwind-merge` |
| Icons | `lucide-react` |
| Charts | `recharts` |
| Maps | `leaflet` + `react-leaflet` (client-only, dynamically imported) |
| Backend/DB/Auth | **Supabase** via `@supabase/ssr` + `@supabase/supabase-js` (anon key + Row Level Security) |
| AI | OpenAI Chat Completions over raw `fetch` (no SDK), server-side only |
| Analytics | `@vercel/analytics` (production only) |
| Hosting | **Vercel** |
| Runtime | **Node 22.x** (required — see Testing), **pnpm 12.3.4** via corepack |
| Font | Inter, bundled locally in `app/fonts/` (no Google Fonts download at build time) |

## 3. Commands

```sh
corepack pnpm install --frozen-lockfile   # install (pnpm-lock.yaml is authoritative; ignore package-lock.json)
corepack pnpm dev                         # dev server on http://localhost:3000
corepack pnpm build                       # production build — uses `next build --webpack` (NOT Turbopack)
corepack pnpm start                       # serve the production build
corepack pnpm typecheck                   # tsc --noEmit
corepack pnpm test                        # node --test tests/*.test.cjs
```

Run `test`, `typecheck` and `build` before deploying.

## 4. Environment variables

Copy `.env.example` → `.env.local` (git-ignored; never commit it).

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | **Anon key only. Never a service-role key.** |
| `OPENAI_API_KEY` | server only (`lib/assistant/provider.ts`) | Never prefix with `NEXT_PUBLIC_`. Without it, the assistant shows a "not configured" error (503). |
| `OPENAI_MODEL` | server only | Optional, default `gpt-4o-mini` |

`NEXT_PUBLIC_*` values are embedded at build time, so changing them needs a redeploy.

## 5. Directory map

```
app/                         Next.js App Router
  layout.tsx                 Root layout: local Inter font, metadata/icons, Vercel Analytics
  page.tsx                   "/" → <GreenerDashboard /> (Overview)
  loading.tsx                Global loading UI
  login/page.tsx             Email/password + Google sign-in
  signup/page.tsx            Account creation (email confirmation via /auth/callback)
  auth/callback/route.ts     Exchanges the Supabase auth code for a session cookie, then redirects
  farms/page.tsx, farms/[farmId]/page.tsx
  devices/page.tsx, devices/[deviceId]/page.tsx
  readings/page.tsx          (supports ?assistant=open to open the AI panel)
  alerts/page.tsx, alerts/[alertId]/page.tsx
  users/page.tsx, settings/page.tsx
  api/assistant/readings/route.ts   POST — Greener Assistant (only API route so far)
  fonts/                     Inter-Variable.ttf + OFL license
  globals.css                Tailwind v4 theme tokens (oklch green palette) + custom classes

proxy.ts                     Next 16 "proxy" (formerly middleware): auth gate for every route

components/
  greener-dashboard.tsx      ★ App shell + Overview page. Every route renders this component.
  farms-page.tsx, farm-detail-page.tsx, devices-page.tsx, readings-page.tsx,
  alerts-page.tsx (AlertsPage + AlertDetail), users-page.tsx, settings-page.tsx
  layout/                    sidebar.tsx (navItems), header.tsx (search + notification bell),
                             mobile-nav.tsx, brand-mark.tsx
  dashboard/                 metric-card, readings-table, trend-chart, alerts-panel,
                             farm-map.tsx (wrapper) + farm-map-leaflet.tsx (Leaflet, client-only),
                             floating-ai-assistant.tsx (Overview summary bubble)
  assistant/                 readings-assistant.tsx (chat panel on /readings), assistant-message.tsx
  ui/                        button.tsx (shadcn/cva), status-badge.tsx, page-loading.tsx

lib/
  types.ts                   UI-facing domain types (Reading, Device, Farm, Alert, UserRecord, ...)
  supabase/
    client.ts                Browser Supabase client (createBrowserClient)
    server.ts                Server Supabase client bound to Next cookies
    auth.ts                  signIn / signUp / signInWithGoogle / signOut / getSession / getUser
    profile.ts               getCurrentProfile() from `user_profiles`
    database.types.ts        Placeholder permissive DB types (replace with `supabase gen types`)
  services/                  ★ Data access layer — ALL Supabase queries live here
    readings.ts              Filtered/paginated readings, count, lookups, CSV export, latest, trend
    dashboard.ts             Overview counts (online/offline devices, open/critical alerts)
    farms.ts, devices.ts, alerts.ts, users.ts, notifications.ts, map-devices.ts
    presenters.ts            ★ DB row (snake_case) → UI type mappers: toDevice, toReading, toAlert, ...
  readings-view.ts           Readings page helpers: series config, CSV builder, chart normalization
  readings-constants.ts      READINGS_PAGE_SIZE = 10 (shared by client + server)
  dashboard/build-ai-summary.ts   Deterministic (non-LLM) Overview status summary
  assistant/                 Server-side AI assistant pipeline (see §8)
  mock-data.ts               Legacy v0 mock arrays — currently NOT imported anywhere
  utils.ts                   cn() class merger

tests/                       Node built-in test runner, CommonJS (.cjs)
docs/archive/sql-do-not-run/supabase-latest-readings.sql SQL for RPC `get_latest_readings()` (latest valid reading per device)
docs/archive/sql-do-not-run/supabase-seed-readings.sql   Optional sample readings for SG-JOS-001/002
public/images/               Logos, icons, login artwork
```

## 6. How the app works

### 6.1 Routing & the single-shell pattern
Every page file under `app/` is a thin wrapper that renders **`<GreenerDashboard initialPage=... farmId/deviceId/alertId=... />`**.
`components/greener-dashboard.tsx` is a `'use client'` component that:
- works out the active page from `usePathname()` (`/farms` → Farms and so on, falling back to `initialPage`);
- renders the shared chrome (Sidebar, Header, MobileNav);
- lazily loads the page component with `next/dynamic` (FarmsPage, DevicesPage, ReadingsPage, ...);
- renders the **Overview** inline: metric cards, farm map, moisture trend, latest readings and recent alerts, plus the floating AI summary.

Navigation goes through `router.push(path)` from the sidebar `navItems` (`components/layout/sidebar.tsx`).
To add a page: add a `PageKey` in `lib/types.ts`, a nav item, a route in `app/`, a pathname branch, and a render branch in `greener-dashboard.tsx`.

### 6.2 Authentication
- **`proxy.ts`** runs on every non-static request. It refreshes the Supabase session cookie and calls `auth.getUser()`.
  - Not signed in → redirect to `/login` (or a **401 JSON** response for `/api/assistant/*`).
  - Signed in and on `/login` or `/signup` → redirect to `/`.
  - `/auth/callback` is skipped so the code exchange can happen first.
- Login/signup use `lib/supabase/auth.ts`. Google OAuth first checks Supabase's public `/auth/v1/settings` to confirm Google is enabled.
- The OAuth/email-confirm redirect lands on `app/auth/callback/route.ts`, which calls `exchangeCodeForSession`. It only allows same-origin `next` redirects.
- Supabase dashboard config: Site URL plus redirect URL `https://<domain>/auth/callback` (and `http://localhost:3000/auth/callback`).

### 6.3 Data access
- **Data is fetched client-side** from components through `lib/services/*`, using the **browser** Supabase client with the anon key. **Row Level Security in Supabase is the actual access control.**
- Services return raw rows; components map them with **`lib/services/presenters.ts`**. The presenters normalize enum casing (`'sensor_fault'` → `'Sensor fault'`), format relative times ("12 min ago"), and resolve joined relations that may be an object or an array.
- Readings queries (`lib/services/readings.ts`):
  - always filter `is_valid = true`;
  - filter by **farm/plot name** (not ID) using `!inner` joins so non-matching rows drop out;
  - order by `measured_at desc, device_id, sequence` (stable ordering is important for pagination and the assistant);
  - page size 10; lookups page through 1000-row chunks so dropdowns aren't truncated;
  - CSV export pages through everything, adds a BOM, and escapes formula-injection characters (`= + - @`).

### 6.4 Supabase schema — owned by the backend team
**Read [docs/backend-contract.md](docs/backend-contract.md). It is the source of truth and overrides anything else in this file.**
The backend engineer owns the schema, RLS and RPCs. This repo does **not** migrate the database.

In short:
- Tables: `profiles`, `farms` (per owner), `devices` (PK `device_id`), `sensor_readings`.
- RLS: a user sees only their own devices, farms and readings. Super admins see everything.
- Pairing goes through the `pair_device` RPC. The first claimant wins; ownership can't be taken over.
- There's no backend for alerts, thresholds, notifications, irrigation, battery or signal.

Product model:
- **Farmer:** self sign-up, then pairs a device by its ID on first login, then sees only their devices.
- **Super admin:** detected with `rpc('is_super_admin')`. Sees and manages all devices, farms, users, readings and the audit log through `admin_*` RPCs (contract §8). Assigning a device to a farmer has no backend, so it's UI-only (disabled).
- Readings are scoped to **ownership at receipt**: a farmer sees only readings received while they owned the device.

⚠️ `docs/archive/sql-do-not-run/20261115000000_greener_app_compat.sql` was written before the contract arrived. **DO NOT RUN IT.**
Its "every signed-in user reads everything" policies would break per-farmer isolation, and its `farms` table conflicts with the backend's.
The old code still queries tables that don't exist in the backend (`readings`, `alerts`, `plots`, `notifications`, `user_profiles`).
The frontend is being migrated to the contract in phases.

### 6.5 Greener Assistant (AI)
There are two separate features:
1. **Overview summary bubble** (`components/dashboard/floating-ai-assistant.tsx` + `lib/dashboard/build-ai-summary.ts`): **deterministic rules, no LLM.** It reports healthy, attention or critical based on open/critical alerts, offline devices and device statuses, and never claims "healthy" when there are no readings. Its "View details" link goes to `/readings?assistant=open`.
2. **Readings chat** (`components/assistant/readings-assistant.tsx` → `POST /api/assistant/readings`):
   - The browser sends **only** the filters (farm/plot name, device ID, ISO date window), page number, selected metric, and conversation history (max 20 turns). **No measurements are trusted from the client.**
   - The route (`app/api/assistant/readings/route.ts`, Node runtime, 60s max) checks the same origin, a 40 KB body limit and an authenticated user, then runs `validate-request.ts`. That validation enforces a date range of 31 days or less, alternating user/assistant roles, 4000 characters per message and 20000 in total.
   - `build-reading-context.ts` re-queries the **same 10-row page** the table shows, using the **cookie-authenticated server client (RLS preserved, never a service role)**. It also loads the plots' threshold configs and open alerts (capped at 50, with a truncation flag). A failed optional query is marked `'unavailable'`, never reported as "no alerts".
   - `build-system-prompt.ts` holds the conservative rules: use only the given context, null means missing, don't invent thresholds or causes, never reclassify alerts, and give "Observation / Suggested checks" in plain text.
   - `provider.ts` is the **only** OpenAI-specific file (30s timeout, `max_completion_tokens: 1000`). It never leaks the key or upstream error bodies to the client.
   - The conversation is local state and resets when filters, page, metric or dates change, or when the panel closes.
   - Swapping the AI provider means changing only `lib/assistant/provider.ts`.

## 7. Implementation status (what's real vs. pending)

**Working against Supabase:** auth (email + Google), the proxy auth gate, the Overview counts, map, trend, latest readings and alerts, the farms list and detail, devices, readings (filters, pagination, chart, CSV export), the alerts list and detail with history, users, the notification bell (list, unread count, mark as read), and both AI features.

**Not built yet / placeholders:**
- **Settings page** (`components/settings-page.tsx`) holds **local React state only**. Nothing is saved to the database.
- **Alert acknowledge/resolve** (`lib/services/alerts.ts`) are stubs that throw. They need an authenticated actor and an atomic DB operation (for example an RPC) that also writes `alert_history`.
- `lowBatteryDevices` in the dashboard summary is `null` (not computed).
- There is no **device ingestion API** (`POST /api/device/readings`), **rules/alert engine**, **device simulator**, **audit log**, or **backend RBAC enforcement** beyond RLS.
- This repo has **no DB migrations**. The backend team owns the schema (see docs/backend-contract.md).
- **New data layer:** `lib/data/*` (contract-based) and `lib/measurements.ts` (the 13 metrics). The old `lib/services/*` stays only until each page moves over, then gets deleted.
- No distributed rate limiting for the assistant endpoint; add one before high-volume use.

Roadmap order from the spec: Foundation → Core entities → Readings/ingestion + simulator → Rules engine & alert lifecycle → Notifications & audit → Hardware (ESP32).

## 8. Domain rules — DO and DON'T

These come from `Greener_README.md` and should be respected in every change:

- **Do not redesign the UI** or replace the Greener visual language (green palette, rounded cards, Inter). Extend the existing patterns instead.
- **No business logic in React components.** Never write `if (reading.moisture < 20) createAlert()` in the UI. Alerts come from a backend rules engine; the UI only displays them.
- **No hard-coded universal agronomic thresholds.** Thresholds are configured per farm, plot or crop profile (`threshold_configurations`) and include persistence duration and severity.
- **Alerts need persistence** (a condition must last long enough before an alert fires) and follow the lifecycle **OPEN → ACKNOWLEDGED → RESOLVED**, with full history and `resolved_by = system | user`.
- **Alerts ≠ notifications.** An alert is a persistent operational record; a notification is a lightweight event pointing to it.
- **`measured_at` ≠ `received_at`.** Charts use the measurement time. Delayed or offline-buffered readings must never be discarded.
- **Sequence numbers** are per device. Never insert a duplicate `(device_id, sequence)`.
- **Invalid sensor values** become diagnostics (`is_valid = false`). They must not replace the last known good reading.
- **Device offline** = `now − last accepted reading > configured offline window`.
- **Don't invent metrics**, farm-health scores, or labels like "toxic", "bad" or "dangerous". Describe measured conditions precisely.
- **Don't use color alone** to show severity. Pair it with a text label or icon.
- **No fake success states.** If a backend action isn't implemented, say so (as the alert stubs do).
- **Security:** RBAC must be enforced in the backend or RLS, not only by hiding buttons. Never expose the service-role key or AI keys to the browser.
- Units: moisture `%`, soil temperature `°C`, pH unitless (0–14), EC `µS/cm`, battery `V` (readings) / `%` (devices), signal `dBm`.

Roles: **Administrator** (manage everything), **Farm Manager** (assigned farms, thresholds, alerts), **Agronomist** (read data, add notes), **Technician** (devices, diagnostics, configuration), **Viewer** (read-only).

## 9. Code conventions

- Use the path alias `@/*` → repo root (for example `@/lib/services/readings`).
- Page and UI components are `'use client'`. Server-only modules import `'server-only'` (all of `lib/assistant/*` except types, prompt and validation).
- Put new data access in `lib/services/<entity>.ts`. Throw Supabase errors (`if (error) throw error`) and keep mapping in `presenters.ts`.
- Components catch errors and show them inline with `role="alert"`. Use `AbortController` for fetches that can be superseded (see `readings-page.tsx`).
- Heavy client-only widgets (Leaflet, Recharts, page bodies) load through `next/dynamic` with `PageLoading`/`PanelLoading` fallbacks.
- Styling: Tailwind utility classes, often with literal brand hex values (`#1f7a52` primary green, `#123d2d` dark green, `#2b8b61`). Use `cn()` from `lib/utils.ts` for conditional classes, and keep focus-visible outlines and ARIA labels as the existing components do.
- Code style is compact: single quotes, no semicolons, 2-space indent, frequently one-line JSX and functions. Match the surrounding file.
- `next.config.mjs` sets `images.unoptimized: true`.

## 10. Testing

- Tests use Node's built-in runner (`node:test`) in `tests/*.test.cjs`. There's no Jest or Vitest. Each test transpiles the TS source on the fly with the `typescript` package and a small custom `require` shim. That shim maps `@/` imports and stubs `server-only`.
- Supabase queries are tested by passing a **real `createClient()` with a fake `global.fetch`** and checking the generated PostgREST URLs, methods and `Prefer` headers. Use this pattern for new service tests.
- Files: `readings.test.cjs` (query building, pagination, CSV), `assistant.test.cjs` (validation, context building, prompt), `dashboard-ai-summary.test.cjs`.
- **Node 22 is required.** On Node 18, about half the tests fail with `Node.js detected but native WebSocket not found` from supabase-js. That comes from the environment, not from a code bug.

## 11. Deployment (Vercel)

`vercel.json` pins `corepack pnpm install --frozen-lockfile` and `corepack pnpm build`. Set the env vars from §4 for Production and Preview, then add the deployed `/auth/callback` URL in Supabase Auth's URL configuration. Full checklist: [DEPLOYMENT.md](DEPLOYMENT.md).

## 12. Known issues / gotchas

- The new sensors (NPK, air, light) exist in `sensor_readings` and the `readings` view, but the UI and the assistant prompt don't use them yet. The prompt still says "There are no NPK readings".
- Battery and signal aren't real columns in `sensor_readings`. They may be inside `raw_payload`. Until mapped, battery/signal show as unavailable.
- `README.md` is empty. The real docs are `Greener_README.md`, `DEPLOYMENT.md` and `lib/assistant/README.md`.
- Both `package-lock.json` and `pnpm-lock.yaml` exist. **pnpm is authoritative.** Don't run `npm install`.
- Readings filter farms and plots **by name**, so two farms with the same name are merged. This is deliberate for now and matches the assistant's behavior.
- `lib/mock-data.ts` is unused legacy data from v0. Don't wire it back into components.
- The farm `status` in `toFarm` is a simple heuristic (any offline device → Warning). It should eventually come from the backend.

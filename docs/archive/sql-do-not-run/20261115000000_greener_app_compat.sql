-- Greener app compatibility layer for the new Supabase project.
--
-- ADDITIVE ONLY: `devices` and `sensor_readings` keep every existing column, so the
-- external ingestion pipeline that writes to them keeps working unchanged.
-- This adds what the Next.js app queries: farms, plots, threshold_configurations,
-- alerts, alert_history, notifications, a `readings` view, a `user_profiles` view,
-- device status/last_seen, and the get_latest_readings() RPC.
--
-- Access model: one organization. Every signed-in user can READ all farm, device,
-- reading and alert data. Only profiles with role = 'admin' can change farms, plots,
-- thresholds and alerts. Anonymous visitors get nothing.
--
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
-- Run in Supabase Dashboard → SQL Editor (runs as postgres).

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Profiles: roles, email, auto-create on sign-up
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'viewer';
alter table public.profiles add column if not exists last_active timestamptz;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'farm_manager', 'agronomist', 'technician', 'viewer'));

-- Admin check used by policies. SECURITY DEFINER avoids RLS recursion on profiles.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile for every new auth user. The FIRST user ever becomes admin so the
-- project can be bootstrapped; everyone after that starts as 'viewer'.
-- Named zz_* so it runs AFTER any pre-existing profile trigger on auth.users, and
-- merges into that row (ON CONFLICT) instead of colliding with it.
create or replace function public.greener_handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  is_first boolean := not exists (select 1 from public.profiles where id <> new.id);
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    new.email,
    case when is_first then 'admin' else 'viewer' end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        role = case when is_first then 'admin' else public.profiles.role end;
  return new;
end;
$$;

drop trigger if exists zz_greener_on_auth_user_created on auth.users;
create trigger zz_greener_on_auth_user_created
  after insert on auth.users
  for each row execute function public.greener_handle_new_user();

-- Backfill profiles for any auth users that already exist.
insert into public.profiles (id, full_name, email)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', u.email), u.email
from auth.users u
on conflict (id) do nothing;

-- The app reads `user_profiles`; expose profiles under that name.
create or replace view public.user_profiles
with (security_invoker = on) as
  select id, full_name, email, role, last_active, created_at from public.profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Farms and plots
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.plots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null,
  crop text,
  soil_profile text,
  planting_date date,
  created_at timestamptz not null default now(),
  unique (farm_id, name)
);

create table if not exists public.threshold_configurations (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots (id) on delete cascade,
  parameter text not null check (parameter in ('soil_moisture_pct', 'soil_temperature_c', 'soil_ph', 'soil_ec_us_cm', 'battery_pct')),
  min_value numeric,
  max_value numeric,
  persistence_minutes integer not null default 30 check (persistence_minutes >= 0),
  severity text not null default 'warning' check (severity in ('warning', 'critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plot_id, parameter, severity)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Devices: app-facing columns (ingestion columns untouched)
-- ─────────────────────────────────────────────────────────────────────────────
-- All added columns are nullable or defaulted, so existing INSERT/UPDATE statements from
-- the ingestion pipeline (which never mention them) keep working unchanged.
-- (The app aliases device_id as `id` in its queries; no id column is added here.)
alter table public.devices add column if not exists farm_id uuid references public.farms (id) on delete set null;
alter table public.devices add column if not exists plot_id uuid references public.plots (id) on delete set null;
alter table public.devices add column if not exists status text not null default 'offline';
alter table public.devices add column if not exists last_seen timestamptz;
alter table public.devices add column if not exists battery_pct numeric;
alter table public.devices add column if not exists signal_dbm numeric;
alter table public.devices add column if not exists firmware text;
alter table public.devices drop constraint if exists devices_status_check;
alter table public.devices add constraint devices_status_check
  check (status in ('online', 'warning', 'offline', 'sensor_fault'));

create index if not exists devices_farm_id_idx on public.devices (farm_id);
create index if not exists devices_plot_id_idx on public.devices (plot_id);

-- Create farms from the existing devices.farm_name text and link them.
insert into public.farms (name, location)
select farm_name, min(location)
from public.devices
where farm_name is not null and btrim(farm_name) <> ''
group by farm_name
on conflict (name) do nothing;

update public.devices d
set farm_id = f.id
from public.farms f
where d.farm_id is null and f.name = d.farm_name;

-- Keep farm_id in sync when a device is added or its farm_name changes.
create or replace function public.greener_link_device_farm()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  begin
    if new.farm_name is not null and btrim(new.farm_name) <> ''
       and (tg_op = 'INSERT' or new.farm_name is distinct from old.farm_name or new.farm_id is null) then
      insert into public.farms (name, location) values (new.farm_name, new.location)
      on conflict (name) do nothing;
      select id into new.farm_id from public.farms where name = new.farm_name;
    end if;
  exception when others then
    -- Never let dashboard bookkeeping block a device write from the IoT pipeline.
    raise warning 'greener_link_device_farm skipped for %: %', new.device_id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists greener_link_device_farm on public.devices;
create trigger greener_link_device_farm
  before insert or update of farm_name, farm_id on public.devices
  for each row execute function public.greener_link_device_farm();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Device status from telemetry (online / offline)
-- ─────────────────────────────────────────────────────────────────────────────
-- Offline window: a device is offline when no reading has arrived for 60 minutes,
-- or when it is disabled. Change the interval here to tune it.
create or replace function public.greener_refresh_device_status()
returns void
language sql security definer set search_path = ''
as $$
  update public.devices
  set status = case
    when not enabled then 'offline'
    when last_seen is not null and last_seen > now() - interval '60 minutes' then 'online'
    else 'offline'
  end
  where status is distinct from case
    when not enabled then 'offline'
    when last_seen is not null and last_seen > now() - interval '60 minutes' then 'online'
    else 'offline'
  end;
$$;

-- Each new reading refreshes its device. Any error is swallowed (logged as a warning)
-- so this trigger can NEVER make an ingestion INSERT into sensor_readings fail.
create or replace function public.greener_on_sensor_reading()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  begin
    update public.devices
    set last_seen = greatest(coalesce(last_seen, new.received_at), new.received_at),
        status = case when enabled then 'online' else 'offline' end
    where device_id = new.device_id;
  exception when others then
    raise warning 'greener_on_sensor_reading skipped for %: %', new.device_id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists greener_on_sensor_reading on public.sensor_readings;
create trigger greener_on_sensor_reading
  after insert on public.sensor_readings
  for each row execute function public.greener_on_sensor_reading();

-- Backfill last_seen from existing readings, then compute status.
update public.devices d
set last_seen = r.latest
from (select device_id, max(received_at) as latest from public.sensor_readings group by device_id) r
where r.device_id = d.device_id;

select public.greener_refresh_device_status();

create index if not exists sensor_readings_device_received_idx on public.sensor_readings (device_id, received_at desc);
create index if not exists sensor_readings_measured_idx on public.sensor_readings ((coalesce(measured_at, received_at)) desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. `readings` view: the app's column names over sensor_readings
-- ─────────────────────────────────────────────────────────────────────────────
-- security_invoker = on → sensor_readings RLS applies to whoever queries the view.
-- measured_at falls back to received_at when the device sent no timestamp.
create or replace view public.readings
with (security_invoker = on) as
  select
    s.id,
    s.device_id,
    coalesce(s.cycle, s.id) as sequence,
    coalesce(s.measured_at, s.received_at) as measured_at,
    s.received_at,
    s.soil_moisture_pct as moisture_pct,
    s.soil_temperature_c as soil_temp_c,
    s.soil_ph as ph,
    s.soil_ec_us_cm as ec_us_cm,
    s.nitrogen_mg_kg,
    s.phosphorus_mg_kg,
    s.potassium_mg_kg,
    s.tds_est_mg_l,
    s.air_humidity_pct,
    s.illuminance_lux,
    s.irradiance_est_w_m2,
    null::numeric as battery_v,
    null::numeric as signal_dbm,
    null::text as firmware,
    true as is_valid,
    s.source,
    s.packet_type,
    s.node_id
  from public.sensor_readings s;

-- Latest reading per device (used by lib/services/readings.ts getLatestReadingPerDevice).
create or replace function public.get_latest_readings()
returns table (
  device_id text, measured_at timestamptz, moisture_pct numeric, soil_temp_c numeric,
  ph numeric, ec_us_cm numeric, battery_v numeric, signal_dbm numeric, farm_name text, plot_name text
)
language sql stable security invoker set search_path = ''
as $$
  select distinct on (r.device_id)
    r.device_id, r.measured_at, r.moisture_pct, r.soil_temp_c, r.ph, r.ec_us_cm,
    r.battery_v, r.signal_dbm, f.name, p.name
  from public.readings r
  join public.devices d on d.device_id = r.device_id
  left join public.farms f on f.id = d.farm_id
  left join public.plots p on p.id = d.plot_id
  where r.is_valid
  order by r.device_id, r.measured_at desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Alerts, alert history, notifications
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  device_id text references public.devices (device_id) on delete set null,
  farm_id uuid references public.farms (id) on delete set null,
  plot_id uuid references public.plots (id) on delete set null,
  type text not null check (type in ('low_soil_moisture', 'high_soil_temperature', 'ph_out_of_range', 'high_ec', 'low_battery', 'device_offline', 'sensor_fault')),
  severity text not null check (severity in ('warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  current_value numeric,
  threshold_value text,
  triggered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text check (resolved_by in ('system', 'user'))
);
create index if not exists alerts_status_triggered_idx on public.alerts (status, triggered_at desc);
create index if not exists alerts_device_idx on public.alerts (device_id);

create table if not exists public.alert_history (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts (id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists alert_history_alert_idx on public.alert_history (alert_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_id uuid references public.alerts (id) on delete cascade,
  title text not null,
  meta text,
  message text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Row Level Security + grants
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.plots enable row level security;
alter table public.threshold_configurations enable row level security;
-- devices / sensor_readings: RLS setting deliberately NOT changed. Turning it on could
-- block the IoT pipeline if it writes without the service-role key. If RLS is already
-- on, the read policy below simply adds team read access; if off, grants alone apply.
alter table public.alerts enable row level security;
alter table public.alert_history enable row level security;
alter table public.notifications enable row level security;

-- Read access for the whole signed-in team. (Existing policies are kept; Postgres ORs them.)
do $$
declare t text;
begin
  foreach t in array array['profiles', 'farms', 'plots', 'threshold_configurations', 'devices', 'sensor_readings', 'alerts', 'alert_history'] loop
    execute format('drop policy if exists "greener team read" on public.%I', t);
    execute format('create policy "greener team read" on public.%I for select to authenticated using (true)', t);
  end loop;
  -- Admin-managed configuration and alert records.
  foreach t in array array['farms', 'plots', 'threshold_configurations', 'alerts', 'alert_history'] loop
    execute format('drop policy if exists "greener admin write" on public.%I', t);
    execute format('create policy "greener admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Admins manage roles; users may edit only their own name (role change is blocked by column grants).
drop policy if exists "greener admin manage profiles" on public.profiles;
create policy "greener admin manage profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "greener own profile name" on public.profiles;
create policy "greener own profile name" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Notifications are private to their recipient.
drop policy if exists "greener own notifications read" on public.notifications;
create policy "greener own notifications read" on public.notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "greener own notifications mark read" on public.notifications;
create policy "greener own notifications mark read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Table privileges. Anonymous role gets nothing.
revoke all on public.farms, public.plots, public.threshold_configurations, public.alerts,
  public.alert_history, public.notifications, public.readings, public.user_profiles from anon;
grant select on public.profiles, public.farms, public.plots, public.threshold_configurations,
  public.devices, public.sensor_readings, public.alerts, public.alert_history,
  public.notifications, public.readings, public.user_profiles to authenticated;
grant insert, update, delete on public.farms, public.plots, public.threshold_configurations,
  public.alerts, public.alert_history to authenticated;
grant update (full_name, last_active) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant execute on function public.get_latest_readings() to authenticated;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.get_latest_readings() from anon;
revoke execute on function public.greener_refresh_device_status() from anon, authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Scheduled offline detection (separate from the transaction above)
-- ─────────────────────────────────────────────────────────────────────────────
-- Marks devices offline every 5 minutes when readings stop arriving.
-- If this errors, enable "pg_cron" in Database → Extensions and run this part again.
create extension if not exists pg_cron;
select cron.schedule('greener-device-status', '*/5 * * * *', $$select public.greener_refresh_device_status()$$);

-- Make PostgREST pick up the new tables/views/relationships immediately.
notify pgrst, 'reload schema';

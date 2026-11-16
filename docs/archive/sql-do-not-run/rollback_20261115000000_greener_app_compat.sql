-- ROLLBACK for 20261115000000_greener_app_compat.sql
-- Removes everything that migration added and returns devices / sensor_readings /
-- profiles to their original columns. Ingestion data in sensor_readings and devices'
-- original columns is NOT touched. Data in the new app tables (farms, plots, alerts,
-- notifications, ...) IS deleted. Run in the Supabase SQL Editor only if needed.

do $$ begin
  perform cron.unschedule('greener-device-status');
exception when others then null;
end $$;

begin;

-- Triggers on ingestion / auth tables (the hot path first)
drop trigger if exists greener_on_sensor_reading on public.sensor_readings;
drop trigger if exists greener_link_device_farm on public.devices;
drop trigger if exists zz_greener_on_auth_user_created on auth.users;

-- Policies added to pre-existing tables
drop policy if exists "greener team read" on public.devices;
drop policy if exists "greener team read" on public.sensor_readings;
drop policy if exists "greener team read" on public.profiles;
drop policy if exists "greener admin manage profiles" on public.profiles;
drop policy if exists "greener own profile name" on public.profiles;

-- Views and functions
drop function if exists public.get_latest_readings();
drop view if exists public.readings;
drop view if exists public.user_profiles;

-- New app tables (and their data)
drop table if exists public.notifications;
drop table if exists public.alert_history;
drop table if exists public.alerts;
drop table if exists public.threshold_configurations;

-- Columns added to devices (drop FKs to plots/farms before those tables)
alter table public.devices drop constraint if exists devices_status_check;
alter table public.devices
  drop column if exists plot_id,
  drop column if exists farm_id,
  drop column if exists status,
  drop column if exists last_seen,
  drop column if exists battery_pct,
  drop column if exists signal_dbm,
  drop column if exists firmware;

drop table if exists public.plots;
drop table if exists public.farms;

-- Columns added to profiles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  drop column if exists email,
  drop column if exists role,
  drop column if exists last_active;

drop function if exists public.greener_on_sensor_reading();
drop function if exists public.greener_link_device_farm();
drop function if exists public.greener_refresh_device_status();
drop function if exists public.greener_handle_new_user();
drop function if exists public.is_admin();

drop index if exists public.sensor_readings_device_received_idx;
drop index if exists public.sensor_readings_measured_idx;

revoke select on public.devices, public.sensor_readings, public.profiles from authenticated;
revoke update (full_name, last_active) on public.profiles from authenticated;

commit;

notify pgrst, 'reload schema';

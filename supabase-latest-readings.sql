CREATE OR REPLACE FUNCTION get_latest_readings()
RETURNS TABLE (device_id text, measured_at timestamptz, moisture_pct double precision, soil_temp_c double precision, ph double precision, ec_us_cm double precision, battery_v double precision, signal_dbm double precision, farm_name text, plot_name text)
AS $$
  SELECT DISTINCT ON (r.device_id) r.device_id, r.measured_at, r.moisture_pct, r.soil_temp_c, r.ph, r.ec_us_cm, r.battery_v, r.signal_dbm, f.name, p.name
  FROM readings r JOIN devices d ON d.id = r.device_id LEFT JOIN farms f ON f.id = d.farm_id LEFT JOIN plots p ON p.id = d.plot_id
  WHERE r.is_valid = true ORDER BY r.device_id, r.measured_at DESC;
$$ LANGUAGE sql STABLE;

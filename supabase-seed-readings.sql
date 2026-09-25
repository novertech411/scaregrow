-- Optional temporary sample data for the new readings table.
-- Run in Supabase SQL Editor after confirming the table schema and access policy.
INSERT INTO readings (device_id, sequence, measured_at, moisture_pct, soil_temp_c, ph, ec_us_cm, battery_v, signal_dbm, firmware)
SELECT device_id, sample_index + 1,
  now() - interval '30 minutes' * sample_index,
  round((25 + random() * 20)::numeric, 1),
  round((22 + random() * 8)::numeric, 1),
  round((5.8 + random() * 1.5)::numeric, 1),
  round((600 + random() * 600)::numeric, 1),
  round((3.5 + random() * 0.7)::numeric, 2),
  round((-90 + random() * 20)::numeric, 0), '1.0.0'
FROM (VALUES ('SG-JOS-001'), ('SG-JOS-002')) AS devices(device_id)
CROSS JOIN generate_series(0, 47) AS samples(sample_index)
ON CONFLICT (device_id, sequence) DO NOTHING;

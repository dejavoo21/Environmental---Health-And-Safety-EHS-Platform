-- Fix Warehouse 2 coordinates from Bristol, UK to Toronto, Canada
UPDATE sites 
SET 
  country_code = 'CA',
  city = 'Toronto',
  timezone = 'America/Toronto',
  latitude = 43.6629,
  longitude = -79.3957
WHERE code = 'WH2' AND country_code = 'GB';

-- Verify the update
SELECT id, name, code, country_code, city, timezone, latitude, longitude 
FROM sites 
WHERE code = 'WH2';

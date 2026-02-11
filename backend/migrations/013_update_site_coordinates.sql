-- Migration: Update site coordinates for demo sites
-- Purpose: Ensure all demo sites have latitude/longitude coordinates for weather functionality
-- Date: February 11, 2026

BEGIN;

-- Update existing demo sites with coordinates (if they exist but lack coordinates)
-- UK Sites with well-known coordinates
UPDATE sites SET 
  latitude = 53.4808, 
  longitude = -2.2426
WHERE LOWER(name) = 'head office' AND latitude IS NULL;

UPDATE sites SET 
  latitude = 52.4862, 
  longitude = -1.8904
WHERE LOWER(name) = 'warehouse 1' AND latitude IS NULL;

UPDATE sites SET 
  latitude = 51.4545, 
  longitude = -2.5879
WHERE LOWER(name) = 'warehouse 2' AND latitude IS NULL;

UPDATE sites SET 
  latitude = 51.5074, 
  longitude = -0.1278
WHERE LOWER(name) = 'distribution center' AND latitude IS NULL;

-- Generic fallback for any other sites without coordinates
-- Default to London coordinates if no other coordinates are set
-- Commented out to avoid unintended updates - uncomment if needed
-- UPDATE sites SET 
--   latitude = 51.5074, 
--   longitude = -0.1278,
--   city = COALESCE(city, 'London'),
--   country_code = COALESCE(country_code, 'GB'),
--   timezone = COALESCE(timezone, 'Europe/London')
-- WHERE latitude IS NULL AND country_code IN ('GB', 'US', 'CA', 'ZA', 'AU');

COMMIT;

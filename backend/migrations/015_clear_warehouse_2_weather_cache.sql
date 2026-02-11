-- Clear old weather cache for Warehouse 2 so it will be re-fetched with correct coordinates
DELETE FROM weather_cache 
WHERE site_id = (SELECT id FROM sites WHERE code = 'WH2');

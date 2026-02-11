-- Phase 11.5: Site Location Enhancement Migration
-- This migration adds explicit location fields to the sites table
-- for proper weather integration and location display
-- Safe to run on existing data (uses ADD COLUMN IF NOT EXISTS pattern)

BEGIN;

-- =============================================================================
-- 1. Add location fields directly to sites table
-- =============================================================================

ALTER TABLE sites ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_sites_country_city ON sites(country_code, city);

-- =============================================================================
-- 2. Ensure site_locations table has all required fields (for backward compat)
-- =============================================================================

-- Create site_locations if it doesn't exist (for older deployments)
CREATE TABLE IF NOT EXISTS site_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  country_code VARCHAR(2),
  city TEXT,
  region TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  timezone TEXT,
  weather_location_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Add index for site lookup
CREATE INDEX IF NOT EXISTS idx_site_locations_site_id ON site_locations(site_id);

-- =============================================================================
-- 3. Sync existing site_locations data to sites table
-- =============================================================================

-- Copy location data from site_locations to sites table if available
UPDATE sites s
SET
  country_code = COALESCE(s.country_code, sl.country_code),
  city = COALESCE(s.city, sl.city),
  timezone = COALESCE(s.timezone, sl.timezone, 'Europe/London'),
  latitude = COALESCE(s.latitude, sl.latitude),
  longitude = COALESCE(s.longitude, sl.longitude)
FROM site_locations sl
WHERE sl.site_id = s.id
  AND (s.country_code IS NULL OR s.city IS NULL OR s.latitude IS NULL);

-- =============================================================================
-- 4. Add weather_cache table if missing (for newer deployments)
-- =============================================================================

CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  data_json JSONB,
  as_of TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT weather_cache_site_unique UNIQUE (site_id)
);

CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON weather_cache(expires_at);

COMMIT;

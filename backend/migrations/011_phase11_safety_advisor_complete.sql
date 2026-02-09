-- Phase 11 Safety Advisor & Site Intelligence - Complete Migration
-- This migration completes the Phase 11 tables as per DATA_MODEL_PHASE11.md
-- Idempotent: uses IF NOT EXISTS for all objects
-- All IDs are UUIDs to match the existing schema

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weather_condition_category') THEN
    CREATE TYPE weather_condition_category AS ENUM ('hot', 'cold', 'wet', 'windy', 'normal');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'safety_advisor_event_type') THEN
    CREATE TYPE safety_advisor_event_type AS ENUM ('view', 'acknowledge', 'dismiss');
  END IF;
END $$;

-- =============================================================================
-- 1.1 site_locations - Enhanced location metadata for weather/legislation
-- =============================================================================

-- Add missing columns to site_locations if they don't exist
DO $$ BEGIN
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS city TEXT;
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS timezone TEXT;
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS weather_location_id TEXT;
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE site_locations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist, will be created by the earlier migration
  NULL;
END $$;

-- Ensure unique constraint on organisation_id, site_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_locations_org_site_unique') THEN
    ALTER TABLE site_locations ADD CONSTRAINT site_locations_org_site_unique UNIQUE (organisation_id, site_id);
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- =============================================================================
-- 1.2 weather_cache - Enhanced with organisation scoping and expiry
-- =============================================================================

-- Add missing columns to weather_cache
DO $$ BEGIN
  ALTER TABLE weather_cache ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
  ALTER TABLE weather_cache ADD COLUMN IF NOT EXISTS as_of TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE weather_cache ADD COLUMN IF NOT EXISTS data_json JSONB;
  ALTER TABLE weather_cache ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Add unique constraint on site_id to ensure one cache per site
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weather_cache_site_unique') THEN
    ALTER TABLE weather_cache ADD CONSTRAINT weather_cache_site_unique UNIQUE (site_id);
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- =============================================================================
-- 1.3 safety_moments - Enhanced as per data model
-- =============================================================================

-- Add missing columns to safety_moments
DO $$ BEGIN
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS body TEXT;
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS category TEXT;
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS tags TEXT[];
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS applicable_sites UUID[];
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS applicable_roles TEXT[];
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS start_date DATE;
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS end_date DATE;
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
  ALTER TABLE safety_moments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Create index on safety_moments for active moment lookup
CREATE INDEX IF NOT EXISTS idx_safety_moments_active_dates
  ON safety_moments (organisation_id, is_active, start_date, end_date);

-- =============================================================================
-- 1.4 safety_moment_acknowledgements - New table
-- =============================================================================

CREATE TABLE IF NOT EXISTS safety_moment_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  safety_moment_id UUID NOT NULL REFERENCES safety_moments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'dashboard',
  entity_type TEXT,
  entity_id UUID,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint to prevent duplicate acknowledgements per entity context
CREATE UNIQUE INDEX IF NOT EXISTS idx_safety_moment_ack_unique
  ON safety_moment_acknowledgements (organisation_id, safety_moment_id, user_id, COALESCE(entity_type, ''), COALESCE(entity_id::text, ''));

CREATE INDEX IF NOT EXISTS idx_safety_moment_ack_site_date
  ON safety_moment_acknowledgements (organisation_id, site_id, acknowledged_at);

-- =============================================================================
-- 1.5 site_legislation_refs - Enhanced as per data model
-- =============================================================================

-- Add missing columns to site_legislation_refs
DO $$ BEGIN
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS jurisdiction TEXT;
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS category TEXT;
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS summary TEXT;
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS reference_url TEXT;
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
  ALTER TABLE site_legislation_refs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_site_legislation_refs_org_site
  ON site_legislation_refs (organisation_id, site_id);

CREATE INDEX IF NOT EXISTS idx_site_legislation_refs_jurisdiction
  ON site_legislation_refs (organisation_id, jurisdiction, category);

-- =============================================================================
-- 1.6 ppe_recommendations - Enhanced as per data model
-- =============================================================================

-- Add missing columns to ppe_recommendations
DO $$ BEGIN
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS task_type TEXT;
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS permit_type_id UUID;
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS weather_category TEXT;
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS recommendation_text TEXT;
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 99;
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
  ALTER TABLE ppe_recommendations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ppe_recommendations_lookup
  ON ppe_recommendations (organisation_id, site_id, task_type, weather_category, is_active);

-- =============================================================================
-- 1.7 safety_advisor_events - Usage analytics table
-- =============================================================================

CREATE TABLE IF NOT EXISTS safety_advisor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'view',
  entity_type TEXT,
  entity_id UUID,
  safety_moment_id UUID REFERENCES safety_moments(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_advisor_events_lookup
  ON safety_advisor_events (organisation_id, event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_safety_advisor_events_entity
  ON safety_advisor_events (organisation_id, entity_type, entity_id);

-- =============================================================================
-- 1.8 safety_acknowledgements - Generic acknowledgement table for high-risk workflows
-- =============================================================================

CREATE TABLE IF NOT EXISTS safety_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  is_high_risk BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  safety_summary_snapshot JSONB,
  metadata JSONB
);

-- Unique constraint: one acknowledgement per user per entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_safety_acknowledgement_unique
  ON safety_acknowledgements (organisation_id, user_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_safety_acknowledgements_entity
  ON safety_acknowledgements (organisation_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_safety_acknowledgements_user
  ON safety_acknowledgements (organisation_id, user_id, acknowledged_at);

-- =============================================================================
-- Add requires_safety_acknowledgement flag to relevant entity configurations
-- =============================================================================

-- Add flag to incident types for high-severity incidents requiring acknowledgement
DO $$ BEGIN
  ALTER TABLE incident_types ADD COLUMN IF NOT EXISTS requires_safety_acknowledgement BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Update high-severity incident types to require acknowledgement by default
UPDATE incident_types SET requires_safety_acknowledgement = TRUE WHERE name ILIKE '%fatality%' OR name ILIKE '%serious%';

-- =============================================================================
-- Migration complete
-- =============================================================================

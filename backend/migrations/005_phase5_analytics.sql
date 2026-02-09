-- Phase 5: Analytics & Insights
-- Migration: 005_phase5_analytics.sql
-- Created: 2026-02-03

-- ============================================================================
-- ANALYTICS DAILY SUMMARY TABLE
-- Pre-aggregated daily metrics per site, type, and severity combination
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  incident_type_id UUID REFERENCES incident_types(id) ON DELETE SET NULL,
  severity VARCHAR(20),

  -- Incident metrics
  incident_count INTEGER NOT NULL DEFAULT 0,
  incidents_closed INTEGER NOT NULL DEFAULT 0,
  incident_resolution_days_sum NUMERIC(10,2) DEFAULT 0,

  -- Inspection metrics
  inspection_count INTEGER NOT NULL DEFAULT 0,
  inspections_passed INTEGER NOT NULL DEFAULT 0,
  inspections_failed INTEGER NOT NULL DEFAULT 0,

  -- Action metrics
  actions_created INTEGER NOT NULL DEFAULT 0,
  actions_completed INTEGER NOT NULL DEFAULT 0,
  actions_overdue INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for upsert operations (using COALESCE for nullable columns)
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_daily_summary_unique
ON analytics_daily_summary (
  organisation_id,
  COALESCE(site_id, '00000000-0000-0000-0000-000000000000'),
  summary_date,
  COALESCE(incident_type_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(severity, 'ALL')
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_analytics_daily_summary_org_date
ON analytics_daily_summary(organisation_id, summary_date);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_summary_org_site_date
ON analytics_daily_summary(organisation_id, site_id, summary_date);

-- ============================================================================
-- SITE RISK SCORES TABLE
-- Current risk score for each site
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Calculated scores
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_category VARCHAR(20) NOT NULL DEFAULT 'low'
    CHECK (risk_category IN ('low', 'medium', 'high', 'critical')),
  incident_score INTEGER NOT NULL DEFAULT 0,
  action_score INTEGER NOT NULL DEFAULT 0,
  inspection_score INTEGER NOT NULL DEFAULT 0,

  -- Breakdown counts
  incidents_critical INTEGER DEFAULT 0,
  incidents_high INTEGER DEFAULT 0,
  incidents_medium INTEGER DEFAULT 0,
  incidents_low INTEGER DEFAULT 0,
  overdue_actions INTEGER DEFAULT 0,
  failed_inspections INTEGER DEFAULT 0,

  -- Metadata
  primary_factor VARCHAR(100),
  scoring_window_days INTEGER NOT NULL DEFAULT 90,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (organisation_id, site_id)
);

-- Performance indexes for risk scores
CREATE INDEX IF NOT EXISTS idx_site_risk_scores_org_score
ON site_risk_scores(organisation_id, risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_site_risk_scores_org_category
ON site_risk_scores(organisation_id, risk_category);

-- ============================================================================
-- SITE RISK SCORE HISTORY TABLE
-- Historical risk scores for trending
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_risk_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  risk_score INTEGER NOT NULL,
  risk_category VARCHAR(20) NOT NULL
    CHECK (risk_category IN ('low', 'medium', 'high', 'critical')),
  recorded_date DATE NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (organisation_id, site_id, recorded_date)
);

-- Performance index for history/trend queries
CREATE INDEX IF NOT EXISTS idx_site_risk_score_history_trend
ON site_risk_score_history(organisation_id, site_id, recorded_date DESC);

-- ============================================================================
-- SAVED VIEWS TABLE
-- User-saved analytics filter configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',

  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes for saved views
CREATE INDEX IF NOT EXISTS idx_saved_views_user
ON saved_views(organisation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_saved_views_shared
ON saved_views(organisation_id, is_shared) WHERE is_shared = TRUE;

-- ============================================================================
-- ADD RISK_SETTINGS TO ORGANISATIONS TABLE
-- ============================================================================

ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS risk_settings JSONB DEFAULT '{}';

-- ============================================================================
-- TRIGGER: Ensure only one default view per user per organisation
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_default_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE saved_views
    SET is_default = FALSE, updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND organisation_id = NEW.organisation_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saved_views_single_default ON saved_views;
CREATE TRIGGER saved_views_single_default
  BEFORE INSERT OR UPDATE ON saved_views
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_view();

-- ============================================================================
-- UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================================

-- Only create triggers if the update_updated_at_column function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    -- Analytics daily summary trigger
    DROP TRIGGER IF EXISTS analytics_daily_summary_updated_at ON analytics_daily_summary;
    CREATE TRIGGER analytics_daily_summary_updated_at
      BEFORE UPDATE ON analytics_daily_summary
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    -- Site risk scores trigger
    DROP TRIGGER IF EXISTS site_risk_scores_updated_at ON site_risk_scores;
    CREATE TRIGGER site_risk_scores_updated_at
      BEFORE UPDATE ON site_risk_scores
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    -- Saved views trigger
    DROP TRIGGER IF EXISTS saved_views_updated_at ON saved_views;
    CREATE TRIGGER saved_views_updated_at
      BEFORE UPDATE ON saved_views
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  ELSE
    -- Create the function if it doesn't exist
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    -- Then create triggers
    CREATE TRIGGER analytics_daily_summary_updated_at
      BEFORE UPDATE ON analytics_daily_summary
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER site_risk_scores_updated_at
      BEFORE UPDATE ON site_risk_scores
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER saved_views_updated_at
      BEFORE UPDATE ON saved_views
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- ADDITIONAL INDEXES ON EXISTING TABLES FOR ANALYTICS PERFORMANCE
-- ============================================================================

-- Index for incident date-based aggregation queries
CREATE INDEX IF NOT EXISTS idx_incidents_org_occurred_at
ON incidents(organisation_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_incidents_site_occurred_at
ON incidents(site_id, occurred_at);

-- Index for inspection date-based aggregation queries
CREATE INDEX IF NOT EXISTS idx_inspections_org_performed_at
ON inspections(organisation_id, performed_at);

CREATE INDEX IF NOT EXISTS idx_inspections_site_performed_at
ON inspections(site_id, performed_at);

-- Index for action due date queries
CREATE INDEX IF NOT EXISTS idx_actions_due_date_status
ON actions(due_date, status);

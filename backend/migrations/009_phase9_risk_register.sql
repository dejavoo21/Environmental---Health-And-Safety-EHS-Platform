-- =====================================================
-- Phase 9: Risk Register & Enterprise Risk Management
-- Migration: 009_phase9_risk_register.sql
-- =====================================================
-- This migration is idempotent and safe to rerun.

BEGIN;

-- ============================================
-- 1. Create Enums (with IF NOT EXISTS pattern)
-- ============================================

DO $$ BEGIN
  CREATE TYPE risk_status AS ENUM (
    'emerging', 'active', 'under_review', 'closed', 'accepted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE control_type AS ENUM ('prevention', 'mitigation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE control_hierarchy AS ENUM (
    'elimination', 'substitution', 'engineering', 'administrative', 'ppe'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE control_effectiveness AS ENUM (
    'effective', 'partially_effective', 'ineffective', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'extreme');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_outcome AS ENUM (
    'confirmed', 'updated', 'escalated', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_frequency AS ENUM (
    'monthly', 'quarterly', 'semi_annually', 'annually', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE link_entity_type AS ENUM (
    'incident', 'inspection', 'action', 'training_course', 'chemical', 'permit'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Create Tables
-- ============================================

-- 2.1 Risk Categories
CREATE TABLE IF NOT EXISTS risk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  category_type VARCHAR(50) DEFAULT 'custom',
  colour VARCHAR(20) DEFAULT '#607D8B',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_categories_org_code 
  ON risk_categories(COALESCE(organisation_id, '00000000-0000-0000-0000-000000000000'), code);
CREATE INDEX IF NOT EXISTS idx_risk_categories_org_active 
  ON risk_categories(organisation_id, is_active, display_order);

-- System risk categories (organisation_id = NULL)
INSERT INTO risk_categories (organisation_id, name, code, description, category_type, colour, display_order) VALUES
(NULL, 'Health & Safety', 'HS', 'Workplace health and safety risks', 'health_safety', '#F44336', 1),
(NULL, 'Environmental', 'ENV', 'Environmental and ecological risks', 'environmental', '#4CAF50', 2),
(NULL, 'Regulatory Compliance', 'REG', 'Legal and regulatory compliance risks', 'regulatory', '#2196F3', 3),
(NULL, 'Operational', 'OPS', 'Business operations and process risks', 'operational', '#FF9800', 4),
(NULL, 'Reputational', 'REP', 'Brand and reputation risks', 'reputational', '#9C27B0', 5),
(NULL, 'Financial (EHS)', 'FIN', 'EHS-related financial risks', 'financial', '#795548', 6)
ON CONFLICT DO NOTHING;

-- 2.2 Risks (Core Register)
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  reference_number VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES risk_categories(id),
  owner_user_id UUID NOT NULL REFERENCES users(id),
  hazard TEXT,
  cause TEXT,
  consequence TEXT,
  inherent_likelihood INTEGER NOT NULL CHECK (inherent_likelihood BETWEEN 1 AND 5),
  inherent_impact INTEGER NOT NULL CHECK (inherent_impact BETWEEN 1 AND 5),
  inherent_score INTEGER GENERATED ALWAYS AS (inherent_likelihood * inherent_impact) STORED,
  inherent_level risk_level NOT NULL,
  residual_likelihood INTEGER CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_impact INTEGER CHECK (residual_impact BETWEEN 1 AND 5),
  residual_score INTEGER GENERATED ALWAYS AS (residual_likelihood * residual_impact) STORED,
  residual_level risk_level,
  status risk_status NOT NULL DEFAULT 'emerging',
  review_frequency review_frequency NOT NULL DEFAULT 'quarterly',
  review_frequency_days INTEGER,
  next_review_date DATE,
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by UUID REFERENCES users(id),
  acceptance_justification TEXT,
  closure_reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_risks_org_ref ON risks(organisation_id, reference_number);
CREATE INDEX IF NOT EXISTS idx_risks_org_status ON risks(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_risks_org_category ON risks(organisation_id, category_id);
CREATE INDEX IF NOT EXISTS idx_risks_org_owner ON risks(organisation_id, owner_user_id);
CREATE INDEX IF NOT EXISTS idx_risks_org_inherent ON risks(organisation_id, inherent_level);
CREATE INDEX IF NOT EXISTS idx_risks_org_residual ON risks(organisation_id, residual_level);
CREATE INDEX IF NOT EXISTS idx_risks_org_review_date ON risks(organisation_id, next_review_date);

-- 2.3 Risk Sites Junction
CREATE TABLE IF NOT EXISTS risk_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_sites_unique ON risk_sites(risk_id, site_id);
CREATE INDEX IF NOT EXISTS idx_risk_sites_site ON risk_sites(site_id);

-- 2.4 Risk Controls
CREATE TABLE IF NOT EXISTS risk_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  control_type control_type NOT NULL,
  hierarchy control_hierarchy NOT NULL,
  effectiveness control_effectiveness DEFAULT 'unknown',
  owner_user_id UUID REFERENCES users(id),
  verification_method TEXT,
  last_verified_at TIMESTAMPTZ,
  next_verification_date DATE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_controls_risk ON risk_controls(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_controls_active ON risk_controls(risk_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_risk_controls_owner ON risk_controls(owner_user_id);

-- 2.5 Risk Control Links
CREATE TABLE IF NOT EXISTS risk_control_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID NOT NULL REFERENCES risk_controls(id) ON DELETE CASCADE,
  entity_type link_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  linked_by UUID NOT NULL REFERENCES users(id),
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_control_links_unique ON risk_control_links(control_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_control_links_entity ON risk_control_links(entity_type, entity_id);

-- 2.6 Risk Links
CREATE TABLE IF NOT EXISTS risk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  entity_type link_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  link_reason VARCHAR(200),
  linked_by UUID NOT NULL REFERENCES users(id),
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_links_unique ON risk_links(risk_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_links_entity ON risk_links(entity_type, entity_id);

-- 2.7 Risk Reviews
CREATE TABLE IF NOT EXISTS risk_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewer_user_id UUID NOT NULL REFERENCES users(id),
  outcome review_outcome NOT NULL,
  notes TEXT,
  decisions TEXT,
  inherent_likelihood_snapshot INTEGER NOT NULL,
  inherent_impact_snapshot INTEGER NOT NULL,
  inherent_score_snapshot INTEGER NOT NULL,
  inherent_level_snapshot risk_level NOT NULL,
  residual_likelihood_snapshot INTEGER,
  residual_impact_snapshot INTEGER,
  residual_score_snapshot INTEGER,
  residual_level_snapshot risk_level,
  previous_status risk_status NOT NULL,
  new_status risk_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_reviews_risk_date ON risk_reviews(risk_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_reviews_reviewer ON risk_reviews(reviewer_user_id);

-- 2.8 Risk Scoring Matrices
CREATE TABLE IF NOT EXISTS risk_scoring_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  dimension VARCHAR(20) NOT NULL CHECK (dimension IN ('likelihood', 'impact')),
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  label VARCHAR(50) NOT NULL,
  description TEXT,
  safety_example TEXT,
  environmental_example TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scoring_matrix_unique 
  ON risk_scoring_matrices(COALESCE(organisation_id, '00000000-0000-0000-0000-000000000000'), dimension, score);

-- Seed default scoring matrix (organisation_id = NULL for system defaults)
INSERT INTO risk_scoring_matrices (organisation_id, dimension, score, label, description, safety_example, display_order) VALUES
-- Likelihood
(NULL, 'likelihood', 1, 'Rare', 'May occur only in exceptional circumstances', 'Less than once per 10 years', 1),
(NULL, 'likelihood', 2, 'Unlikely', 'Could occur at some time', 'Once per 2-5 years', 2),
(NULL, 'likelihood', 3, 'Possible', 'Might occur at some time', 'Once per 1-2 years', 3),
(NULL, 'likelihood', 4, 'Likely', 'Will probably occur in most circumstances', 'Several times per year', 4),
(NULL, 'likelihood', 5, 'Almost Certain', 'Expected to occur in most circumstances', 'Monthly or more frequent', 5),
-- Impact
(NULL, 'impact', 1, 'Negligible', 'No injury, minimal environmental impact', 'First aid only', 1),
(NULL, 'impact', 2, 'Minor', 'Minor injury or limited environmental damage', 'Medical treatment required', 2),
(NULL, 'impact', 3, 'Moderate', 'Moderate injury or localised environmental impact', 'Lost time injury', 3),
(NULL, 'impact', 4, 'Major', 'Serious injury or significant environmental damage', 'Permanent disability', 4),
(NULL, 'impact', 5, 'Catastrophic', 'Fatality or major environmental disaster', 'Multiple fatalities', 5)
ON CONFLICT DO NOTHING;

-- 2.9 Risk Tolerances
CREATE TABLE IF NOT EXISTS risk_tolerances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  low_threshold INTEGER DEFAULT 4,
  medium_threshold INTEGER DEFAULT 9,
  high_threshold INTEGER DEFAULT 16,
  low_tolerance VARCHAR(50) DEFAULT 'acceptable',
  medium_tolerance VARCHAR(50) DEFAULT 'tolerable',
  high_tolerance VARCHAR(50) DEFAULT 'unacceptable',
  extreme_tolerance VARCHAR(50) DEFAULT 'intolerable',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_tolerances_org ON risk_tolerances(organisation_id);

-- ============================================
-- 3. Organisation Table Updates
-- ============================================

ALTER TABLE organisations 
  ADD COLUMN IF NOT EXISTS risk_register_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE organisations 
  ADD COLUMN IF NOT EXISTS risk_reference_prefix VARCHAR(20) DEFAULT 'RISK';

ALTER TABLE organisations 
  ADD COLUMN IF NOT EXISTS default_review_frequency VARCHAR(20) DEFAULT 'quarterly';

ALTER TABLE organisations 
  ADD COLUMN IF NOT EXISTS review_reminder_days INTEGER DEFAULT 7;

-- ============================================
-- 4. Helper Functions
-- ============================================

-- Calculate risk level from score
CREATE OR REPLACE FUNCTION calculate_risk_level(score INTEGER)
RETURNS risk_level AS $$
BEGIN
  IF score >= 17 THEN RETURN 'extreme';
  ELSIF score >= 10 THEN RETURN 'high';
  ELSIF score >= 5 THEN RETURN 'medium';
  ELSE RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate next risk reference number
CREATE OR REPLACE FUNCTION generate_risk_reference(org_id UUID, prefix VARCHAR DEFAULT 'RISK')
RETURNS VARCHAR AS $$
DECLARE
  current_year INTEGER;
  next_seq INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(reference_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM risks
  WHERE organisation_id = org_id
    AND reference_number LIKE prefix || '-' || current_year || '-%';
  
  RETURN prefix || '-' || current_year || '-' || LPAD(next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Calculate next review date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_review_date(
  freq review_frequency,
  custom_days INTEGER DEFAULT NULL,
  from_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE AS $$
BEGIN
  CASE freq
    WHEN 'monthly' THEN RETURN from_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN RETURN from_date + INTERVAL '3 months';
    WHEN 'semi_annually' THEN RETURN from_date + INTERVAL '6 months';
    WHEN 'annually' THEN RETURN from_date + INTERVAL '1 year';
    WHEN 'custom' THEN RETURN from_date + (COALESCE(custom_days, 90) * INTERVAL '1 day');
    ELSE RETURN from_date + INTERVAL '3 months';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers (idempotent with DROP IF EXISTS)
DROP TRIGGER IF EXISTS update_risks_updated_at ON risks;
CREATE TRIGGER update_risks_updated_at
  BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_risk_controls_updated_at ON risk_controls;
CREATE TRIGGER update_risk_controls_updated_at
  BEFORE UPDATE ON risk_controls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_risk_categories_updated_at ON risk_categories;
CREATE TRIGGER update_risk_categories_updated_at
  BEFORE UPDATE ON risk_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_risk_tolerances_updated_at ON risk_tolerances;
CREATE TRIGGER update_risk_tolerances_updated_at
  BEFORE UPDATE ON risk_tolerances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_risk_scoring_matrices_updated_at ON risk_scoring_matrices;
CREATE TRIGGER update_risk_scoring_matrices_updated_at
  BEFORE UPDATE ON risk_scoring_matrices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 14. Add Risk-related values to auditable_entity_type enum
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'risk' AND enumtypid = 'auditable_entity_type'::regtype) THEN
    ALTER TYPE auditable_entity_type ADD VALUE 'risk';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'risk_category' AND enumtypid = 'auditable_entity_type'::regtype) THEN
    ALTER TYPE auditable_entity_type ADD VALUE 'risk_category';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'risk_control' AND enumtypid = 'auditable_entity_type'::regtype) THEN
    ALTER TYPE auditable_entity_type ADD VALUE 'risk_control';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'risk_review' AND enumtypid = 'auditable_entity_type'::regtype) THEN
    ALTER TYPE auditable_entity_type ADD VALUE 'risk_review';
  END IF;
END $$;

COMMIT;

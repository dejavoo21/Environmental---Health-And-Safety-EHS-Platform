# Data Model – EHS Portal Phase 9
## Risk Register & Enterprise Risk Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 9 – Risk Register & Enterprise Risk Management |

---

## 1. Overview

Phase 9 introduces new tables to support the Risk Register, risk assessments, controls, and risk reviews.

**New Tables:**
- `risk_categories` - Configurable risk categorisation
- `risks` - Core risk register entries
- `risk_controls` - Controls documented against risks
- `risk_links` - Links between risks and other entities
- `risk_reviews` - Review history for each risk
- `risk_scoring_matrices` - Configurable scoring criteria
- `risk_tolerances` - Organisation risk tolerance thresholds

**Modified Tables:**
- `organisations` - Add risk register settings

---

## 2. Design Decisions

### 2.1 Risk Scoring Storage

**Decision:** Store both likelihood/impact values and calculated scores.

**Rationale:**
- Allows recalculation if scoring model changes
- Supports historical analysis
- Enables tolerance comparisons

### 2.2 Risk Links Design

**Decision:** Use polymorphic linking table with entity_type and entity_id.

**Rationale:**
- Flexible linking to any entity type
- Single table simplifies queries
- Supports future entity types without schema changes

### 2.3 Review History

**Decision:** Store complete score snapshots in reviews.

**Rationale:**
- Enables trend analysis over time
- Audit requirement for point-in-time scores
- Immutable record of assessment history

---

## 3. Enumerations

### 3.1 risk_status

```sql
CREATE TYPE risk_status AS ENUM (
  'emerging',      -- Newly identified, under initial assessment
  'active',        -- Fully assessed and being managed
  'under_review',  -- Currently being reviewed/updated
  'closed',        -- Risk eliminated or no longer applicable
  'accepted'       -- Risk formally accepted above tolerance
);
```

### 3.2 risk_category_type

```sql
-- System categories are predefined; custom categories can be added
CREATE TYPE risk_category_type AS ENUM (
  'health_safety',
  'environmental',
  'regulatory',
  'operational',
  'reputational',
  'financial',
  'custom'
);
```

### 3.3 control_type

```sql
CREATE TYPE control_type AS ENUM (
  'prevention',    -- Reduces likelihood
  'mitigation'     -- Reduces impact
);
```

### 3.4 control_hierarchy

```sql
CREATE TYPE control_hierarchy AS ENUM (
  'elimination',
  'substitution',
  'engineering',
  'administrative',
  'ppe'
);
```

### 3.5 control_effectiveness

```sql
CREATE TYPE control_effectiveness AS ENUM (
  'effective',
  'partially_effective',
  'ineffective',
  'unknown'
);
```

### 3.6 risk_level

```sql
CREATE TYPE risk_level AS ENUM (
  'low',       -- Score 1-4
  'medium',    -- Score 5-9
  'high',      -- Score 10-16
  'extreme'    -- Score 17-25
);
```

### 3.7 review_outcome

```sql
CREATE TYPE review_outcome AS ENUM (
  'confirmed',   -- No changes needed
  'updated',     -- Scores or details changed
  'escalated',   -- Risk level increased
  'closed'       -- Risk closed during review
);
```

### 3.8 review_frequency

```sql
CREATE TYPE review_frequency AS ENUM (
  'monthly',
  'quarterly',
  'semi_annually',
  'annually',
  'custom'
);
```

### 3.9 link_entity_type

```sql
CREATE TYPE link_entity_type AS ENUM (
  'incident',
  'inspection',
  'action',
  'training_course',
  'chemical',
  'permit'
);
```

---

## 4. Entity Definitions

### 4.1 risk_categories

Configurable categories for classifying risks.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| name | VARCHAR(100) | NOT NULL | Category display name |
| code | VARCHAR(50) | NOT NULL | Short code (e.g., "HS", "ENV") |
| description | TEXT | NULL | Category description |
| category_type | risk_category_type | NOT NULL, DEFAULT 'custom' | System or custom |
| display_order | INTEGER | DEFAULT 0 | Sort order |
| is_active | BOOLEAN | DEFAULT TRUE | Soft delete |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, code)`
- Index on `(organisation_id, is_active)`

**Seed Data:**
| Code | Name | Type |
|------|------|------|
| HS | Health & Safety | health_safety |
| ENV | Environmental | environmental |
| REG | Regulatory Compliance | regulatory |
| OPS | Operational | operational |
| REP | Reputational | reputational |
| FIN | Financial (EHS-related) | financial |

---

### 4.2 risks

Core risk register entries.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| reference_number | VARCHAR(50) | NOT NULL | Auto-generated reference (e.g., RISK-2026-001) |
| title | VARCHAR(200) | NOT NULL | Short descriptive title |
| description | TEXT | NULL | Full risk description |
| category_id | UUID | FK → risk_categories, NOT NULL | Risk category |
| site_id | UUID | FK → sites, NULL | Primary site (NULL = org-wide) |
| owner_user_id | UUID | FK → users, NOT NULL | Risk owner |
| hazard | TEXT | NULL | Source of potential harm |
| cause | TEXT | NULL | What could lead to the event |
| consequence | TEXT | NULL | Potential outcome |
| inherent_likelihood | INTEGER | NOT NULL, CHECK (1-5) | Pre-control likelihood |
| inherent_impact | INTEGER | NOT NULL, CHECK (1-5) | Pre-control impact |
| inherent_score | INTEGER | GENERATED AS (inherent_likelihood * inherent_impact) | Calculated score |
| inherent_level | risk_level | NOT NULL | Categorised level |
| residual_likelihood | INTEGER | NULL, CHECK (1-5) | Post-control likelihood |
| residual_impact | INTEGER | NULL, CHECK (1-5) | Post-control impact |
| residual_score | INTEGER | GENERATED AS (residual_likelihood * residual_impact) | Calculated score |
| residual_level | risk_level | NULL | Categorised level |
| status | risk_status | NOT NULL, DEFAULT 'emerging' | Current status |
| review_frequency | review_frequency | NOT NULL, DEFAULT 'quarterly' | How often to review |
| review_frequency_days | INTEGER | NULL | Custom days if frequency = 'custom' |
| next_review_date | DATE | NULL | Calculated next review |
| last_reviewed_at | TIMESTAMPTZ | NULL | Most recent review |
| last_reviewed_by | UUID | FK → users, NULL | Last reviewer |
| acceptance_justification | TEXT | NULL | Required if status = 'accepted' |
| closure_reason | TEXT | NULL | Required if status = 'closed' |
| created_by | UUID | FK → users, NOT NULL | Who created |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, reference_number)`
- Index on `(organisation_id, status)`
- Index on `(organisation_id, category_id)`
- Index on `(organisation_id, site_id)`
- Index on `(organisation_id, owner_user_id)`
- Index on `(organisation_id, inherent_level)`
- Index on `(organisation_id, residual_level)`
- Index on `(organisation_id, next_review_date)`

**Reference Number Generation:**
```sql
-- Pattern: RISK-{YEAR}-{SEQUENCE}
-- Sequence resets annually per organisation
-- Example: RISK-2026-001, RISK-2026-002
```

**Risk Level Calculation Function:**
```sql
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
```

---

### 4.3 risk_controls

Controls documented against risks.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| risk_id | UUID | FK → risks, NOT NULL, ON DELETE CASCADE | Parent risk |
| description | TEXT | NOT NULL | Control description |
| control_type | control_type | NOT NULL | Prevention or mitigation |
| hierarchy | control_hierarchy | NOT NULL | Control hierarchy position |
| effectiveness | control_effectiveness | DEFAULT 'unknown' | Current effectiveness |
| owner_user_id | UUID | FK → users, NULL | Control owner |
| verification_method | TEXT | NULL | How control is verified |
| last_verified_at | TIMESTAMPTZ | NULL | Last verification date |
| next_verification_date | DATE | NULL | Scheduled verification |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| is_active | BOOLEAN | DEFAULT TRUE | Soft delete |
| created_by | UUID | FK → users, NOT NULL | Who created |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `risk_id`
- Index on `(risk_id, is_active, sort_order)`

---

### 4.4 risk_control_links

Links between controls and existing portal entities.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| control_id | UUID | FK → risk_controls, NOT NULL, ON DELETE CASCADE | Parent control |
| entity_type | link_entity_type | NOT NULL | Type of linked entity |
| entity_id | UUID | NOT NULL | ID of linked entity |
| linked_by | UUID | FK → users, NOT NULL | Who created link |
| linked_at | TIMESTAMPTZ | DEFAULT NOW() | When linked |

**Indexes:**
- Primary key on `id`
- Unique index on `(control_id, entity_type, entity_id)`
- Index on `(entity_type, entity_id)` - Reverse lookup

---

### 4.5 risk_links

Links between risks and operational entities.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| risk_id | UUID | FK → risks, NOT NULL, ON DELETE CASCADE | Parent risk |
| entity_type | link_entity_type | NOT NULL | Type of linked entity |
| entity_id | UUID | NOT NULL | ID of linked entity |
| link_reason | VARCHAR(200) | NULL | Why this link exists |
| linked_by | UUID | FK → users, NOT NULL | Who created link |
| linked_at | TIMESTAMPTZ | DEFAULT NOW() | When linked |

**Indexes:**
- Primary key on `id`
- Unique index on `(risk_id, entity_type, entity_id)`
- Index on `(entity_type, entity_id)` - Reverse lookup

---

### 4.6 risk_reviews

Review history for each risk.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| risk_id | UUID | FK → risks, NOT NULL, ON DELETE CASCADE | Parent risk |
| reviewed_at | TIMESTAMPTZ | NOT NULL | When review performed |
| reviewer_user_id | UUID | FK → users, NOT NULL | Who reviewed |
| outcome | review_outcome | NOT NULL | Review result |
| notes | TEXT | NULL | Review notes |
| decisions | TEXT | NULL | Specific decisions made |
| inherent_likelihood_snapshot | INTEGER | NOT NULL | L score at review time |
| inherent_impact_snapshot | INTEGER | NOT NULL | I score at review time |
| inherent_score_snapshot | INTEGER | NOT NULL | Score at review time |
| inherent_level_snapshot | risk_level | NOT NULL | Level at review time |
| residual_likelihood_snapshot | INTEGER | NULL | L score at review time |
| residual_impact_snapshot | INTEGER | NULL | I score at review time |
| residual_score_snapshot | INTEGER | NULL | Score at review time |
| residual_level_snapshot | risk_level | NULL | Level at review time |
| previous_status | risk_status | NOT NULL | Status before review |
| new_status | risk_status | NOT NULL | Status after review |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `(risk_id, reviewed_at DESC)`
- Index on `reviewer_user_id`

---

### 4.7 risk_scoring_matrices

Configurable scoring criteria per organisation.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| dimension | VARCHAR(20) | NOT NULL | 'likelihood' or 'impact' |
| score | INTEGER | NOT NULL, CHECK (1-5) | Score value |
| label | VARCHAR(50) | NOT NULL | Display label |
| description | TEXT | NULL | Detailed description |
| safety_example | TEXT | NULL | Safety-specific example |
| environmental_example | TEXT | NULL | Environmental example |
| display_order | INTEGER | DEFAULT 0 | Sort order |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, dimension, score)`

**Seed Data (Likelihood):**
| Score | Label | Description |
|-------|-------|-------------|
| 1 | Rare | May occur only in exceptional circumstances |
| 2 | Unlikely | Could occur at some time |
| 3 | Possible | Might occur at some time |
| 4 | Likely | Will probably occur in most circumstances |
| 5 | Almost Certain | Expected to occur |

**Seed Data (Impact):**
| Score | Label | Description |
|-------|-------|-------------|
| 1 | Negligible | First aid only, no environmental impact |
| 2 | Minor | Medical treatment, minor contained impact |
| 3 | Moderate | Lost time injury, localised impact |
| 4 | Major | Serious injury, significant off-site impact |
| 5 | Catastrophic | Fatality, major environmental damage |

---

### 4.8 risk_tolerances

Organisation risk tolerance thresholds.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, UNIQUE | Tenant isolation |
| low_threshold | INTEGER | DEFAULT 4 | Max score for Low |
| medium_threshold | INTEGER | DEFAULT 9 | Max score for Medium |
| high_threshold | INTEGER | DEFAULT 16 | Max score for High |
| low_tolerance | VARCHAR(50) | DEFAULT 'acceptable' | Tolerance status |
| medium_tolerance | VARCHAR(50) | DEFAULT 'tolerable' | Tolerance status |
| high_tolerance | VARCHAR(50) | DEFAULT 'unacceptable' | Tolerance status |
| extreme_tolerance | VARCHAR(50) | DEFAULT 'intolerable' | Tolerance status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `organisation_id`

---

### 4.9 risk_sites (Junction Table)

Many-to-many relationship for risks applicable to multiple sites.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| risk_id | UUID | FK → risks, NOT NULL, ON DELETE CASCADE | Parent risk |
| site_id | UUID | FK → sites, NOT NULL, ON DELETE CASCADE | Applicable site |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(risk_id, site_id)`
- Index on `site_id`

---

## 5. Organisation Table Updates

Add risk register settings to `organisations` table:

```sql
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS
  risk_register_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS
  risk_reference_prefix VARCHAR(20) DEFAULT 'RISK';

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS
  default_review_frequency review_frequency DEFAULT 'quarterly';

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS
  review_reminder_days INTEGER DEFAULT 7;
```

---

## 6. Migration Script

**File:** `migrations/009_phase9_risk_register.sql`

```sql
-- Phase 9: Risk Register & Enterprise Risk Management
-- Migration: 009_phase9_risk_register.sql

BEGIN;

-- ============================================
-- 1. Create Enums
-- ============================================

CREATE TYPE risk_status AS ENUM (
  'emerging', 'active', 'under_review', 'closed', 'accepted'
);

CREATE TYPE control_type AS ENUM ('prevention', 'mitigation');

CREATE TYPE control_hierarchy AS ENUM (
  'elimination', 'substitution', 'engineering', 'administrative', 'ppe'
);

CREATE TYPE control_effectiveness AS ENUM (
  'effective', 'partially_effective', 'ineffective', 'unknown'
);

CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'extreme');

CREATE TYPE review_outcome AS ENUM (
  'confirmed', 'updated', 'escalated', 'closed'
);

CREATE TYPE review_frequency AS ENUM (
  'monthly', 'quarterly', 'semi_annually', 'annually', 'custom'
);

CREATE TYPE link_entity_type AS ENUM (
  'incident', 'inspection', 'action', 'training_course', 'chemical', 'permit'
);

-- ============================================
-- 2. Create Tables
-- ============================================

-- 2.1 Risk Categories
CREATE TABLE risk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  category_type VARCHAR(50) DEFAULT 'custom',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organisation_id, code)
);

CREATE INDEX idx_risk_categories_org_active 
  ON risk_categories(organisation_id, is_active);

-- 2.2 Risks (Core Register)
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  reference_number VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES risk_categories(id),
  site_id UUID REFERENCES sites(id),
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organisation_id, reference_number)
);

CREATE INDEX idx_risks_org_status ON risks(organisation_id, status);
CREATE INDEX idx_risks_org_category ON risks(organisation_id, category_id);
CREATE INDEX idx_risks_org_site ON risks(organisation_id, site_id);
CREATE INDEX idx_risks_org_owner ON risks(organisation_id, owner_user_id);
CREATE INDEX idx_risks_org_inherent ON risks(organisation_id, inherent_level);
CREATE INDEX idx_risks_org_residual ON risks(organisation_id, residual_level);
CREATE INDEX idx_risks_org_review_date ON risks(organisation_id, next_review_date);

-- 2.3 Risk Controls
CREATE TABLE risk_controls (
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

CREATE INDEX idx_risk_controls_risk ON risk_controls(risk_id);
CREATE INDEX idx_risk_controls_active ON risk_controls(risk_id, is_active, sort_order);

-- 2.4 Risk Control Links
CREATE TABLE risk_control_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID NOT NULL REFERENCES risk_controls(id) ON DELETE CASCADE,
  entity_type link_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  linked_by UUID NOT NULL REFERENCES users(id),
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(control_id, entity_type, entity_id)
);

CREATE INDEX idx_control_links_entity ON risk_control_links(entity_type, entity_id);

-- 2.5 Risk Links
CREATE TABLE risk_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  entity_type link_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  link_reason VARCHAR(200),
  linked_by UUID NOT NULL REFERENCES users(id),
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(risk_id, entity_type, entity_id)
);

CREATE INDEX idx_risk_links_entity ON risk_links(entity_type, entity_id);

-- 2.6 Risk Reviews
CREATE TABLE risk_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMPTZ NOT NULL,
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

CREATE INDEX idx_risk_reviews_risk_date ON risk_reviews(risk_id, reviewed_at DESC);
CREATE INDEX idx_risk_reviews_reviewer ON risk_reviews(reviewer_user_id);

-- 2.7 Risk Scoring Matrices
CREATE TABLE risk_scoring_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  dimension VARCHAR(20) NOT NULL CHECK (dimension IN ('likelihood', 'impact')),
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  label VARCHAR(50) NOT NULL,
  description TEXT,
  safety_example TEXT,
  environmental_example TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organisation_id, dimension, score)
);

-- 2.8 Risk Tolerances
CREATE TABLE risk_tolerances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) UNIQUE,
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

-- 2.9 Risk Sites Junction
CREATE TABLE risk_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(risk_id, site_id)
);

CREATE INDEX idx_risk_sites_site ON risk_sites(site_id);

-- ============================================
-- 3. Organisation Table Updates
-- ============================================

ALTER TABLE organisations 
  ADD COLUMN IF NOT EXISTS risk_register_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS risk_reference_prefix VARCHAR(20) DEFAULT 'RISK',
  ADD COLUMN IF NOT EXISTS default_review_frequency review_frequency DEFAULT 'quarterly',
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
  
  RETURN prefix || '-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Calculate next review date
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

COMMIT;
```

---

## 7. Entity Relationship Diagram

```
organisations
     |
     |──────────────────────────────────────────────────────
     |                    |                    |           |
     v                    v                    v           v
risk_categories        risks              risk_tolerances  risk_scoring_matrices
     |                    |
     |                    |───────────────────────────────────
     └────────────────────|                    |             |
                          v                    v             v
                    risk_controls        risk_links    risk_reviews
                          |
                          v
                   risk_control_links
                          |
          ┌───────────────┼───────────────────────────────┐
          v               v               v               v
      incidents      actions      training_courses    permits
                                                         
```

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 9 data model |

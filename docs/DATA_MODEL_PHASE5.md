# Data Model – EHS Portal Phase 5
## Analytics & Insights

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-02 |
| Status | Draft |
| Phase | 5 – Analytics & Insights |

---

## 1. Overview

Phase 5 introduces new tables to support analytics, risk scoring, and saved views. The design balances query performance with storage efficiency.

**New Tables:**
- `analytics_daily_summary` - Pre-aggregated daily metrics
- `site_risk_scores` - Calculated risk scores per site
- `site_risk_score_history` - Historical risk score tracking
- `saved_views` - User-saved analytics configurations

**Modified Tables:**
- `organisations` - Add risk threshold configuration

---

## 2. Design Decisions

### 2.1 Aggregation Strategy

**Decision:** Use hybrid approach with pre-aggregated daily summaries and real-time queries for recent data.

**Rationale:**
- Aggregated data enables fast analytics queries at scale
- Real-time queries for last 24-48 hours ensure data freshness
- Nightly job computes aggregates, avoiding peak-hour load

**Trade-offs:**
| Approach | Pros | Cons |
|----------|------|------|
| Real-time only | Always current | Slow with large datasets |
| Full aggregation | Very fast | Stale data, complex updates |
| Hybrid (chosen) | Fast + fresh | Moderate complexity |

### 2.2 Risk Score Storage

**Decision:** Store computed risk scores in dedicated table, refreshed nightly.

**Rationale:**
- Avoids expensive aggregation on every page load
- Enables trending (score over time)
- Supports dashboard widgets efficiently

### 2.3 Saved Views Storage

**Decision:** Store filter configuration as JSONB for flexibility.

**Rationale:**
- Filters may evolve without schema changes
- JSONB supports complex filter structures
- Easy serialisation/deserialisation

---

## 3. New Entity Definitions

### 3.1 analytics_daily_summary

Pre-aggregated daily metrics per site, type, and severity combination.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| site_id | UUID | FK → sites, NULL | Site (NULL for org-wide) |
| summary_date | DATE | NOT NULL | Date of summary |
| incident_type_id | UUID | FK → incident_types, NULL | Type (NULL for all types) |
| severity | VARCHAR(20) | NULL | Severity (NULL for all severities) |
| incident_count | INTEGER | NOT NULL, DEFAULT 0 | Incidents on this date |
| incidents_closed | INTEGER | NOT NULL, DEFAULT 0 | Incidents closed on date |
| incident_resolution_days_sum | NUMERIC(10,2) | DEFAULT 0 | Sum of resolution days (for avg) |
| inspection_count | INTEGER | NOT NULL, DEFAULT 0 | Inspections on this date |
| inspections_passed | INTEGER | NOT NULL, DEFAULT 0 | Passed inspections |
| inspections_failed | INTEGER | NOT NULL, DEFAULT 0 | Failed inspections |
| actions_created | INTEGER | NOT NULL, DEFAULT 0 | Actions created on date |
| actions_completed | INTEGER | NOT NULL, DEFAULT 0 | Actions completed on date |
| actions_overdue | INTEGER | NOT NULL, DEFAULT 0 | Actions overdue as of date |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, site_id, summary_date, incident_type_id, severity)`
- Index on `(organisation_id, summary_date)` - Date range queries
- Index on `(organisation_id, site_id, summary_date)` - Site-specific queries

**Aggregation Levels:**
1. **Org-wide total:** site_id = NULL, incident_type_id = NULL, severity = NULL
2. **By site:** site_id = X, incident_type_id = NULL, severity = NULL
3. **By type:** site_id = NULL, incident_type_id = X, severity = NULL
4. **By severity:** site_id = NULL, incident_type_id = NULL, severity = X
5. **Site + severity:** site_id = X, severity = Y, incident_type_id = NULL

**Note:** Not all combinations are pre-computed. Queries may combine multiple rows.

---

### 3.2 site_risk_scores

Current risk score for each site.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| site_id | UUID | FK → sites, NOT NULL, UNIQUE per org | Site being scored |
| risk_score | INTEGER | NOT NULL, DEFAULT 0 | Calculated risk score |
| risk_category | VARCHAR(20) | NOT NULL, DEFAULT 'low' | Category (low/medium/high/critical) |
| incident_score | INTEGER | NOT NULL, DEFAULT 0 | Incident component |
| action_score | INTEGER | NOT NULL, DEFAULT 0 | Overdue actions component |
| inspection_score | INTEGER | NOT NULL, DEFAULT 0 | Failed inspections component |
| incidents_critical | INTEGER | DEFAULT 0 | Count in scoring window |
| incidents_high | INTEGER | DEFAULT 0 | Count in scoring window |
| incidents_medium | INTEGER | DEFAULT 0 | Count in scoring window |
| incidents_low | INTEGER | DEFAULT 0 | Count in scoring window |
| overdue_actions | INTEGER | DEFAULT 0 | Count in scoring window |
| failed_inspections | INTEGER | DEFAULT 0 | Count in scoring window |
| primary_factor | VARCHAR(100) | NULL | Top contributing factor text |
| scoring_window_days | INTEGER | NOT NULL, DEFAULT 90 | Days used for calculation |
| calculated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When score was computed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, site_id)`
- Index on `(organisation_id, risk_score DESC)` - Top risk sites
- Index on `(organisation_id, risk_category)` - Filter by category

**Risk Category Calculation:**
```sql
CASE
  WHEN risk_score >= 51 THEN 'critical'
  WHEN risk_score >= 31 THEN 'high'
  WHEN risk_score >= 11 THEN 'medium'
  ELSE 'low'
END
```

---

### 3.3 site_risk_score_history

Historical risk scores for trending.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| site_id | UUID | FK → sites, NOT NULL | Site |
| risk_score | INTEGER | NOT NULL | Score at this point |
| risk_category | VARCHAR(20) | NOT NULL | Category at this point |
| recorded_date | DATE | NOT NULL | Date of recording |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, site_id, recorded_date)`
- Index on `(organisation_id, site_id, recorded_date DESC)` - Trend queries

**Retention:** 365 days (configurable)

---

### 3.4 saved_views

User-saved analytics filter configurations.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| user_id | UUID | FK → users, NOT NULL | View owner |
| name | VARCHAR(100) | NOT NULL | Display name |
| description | TEXT | NULL | Optional description |
| filters | JSONB | NOT NULL, DEFAULT '{}' | Saved filter configuration |
| is_shared | BOOLEAN | NOT NULL, DEFAULT FALSE | Visible to org users |
| is_default | BOOLEAN | NOT NULL, DEFAULT FALSE | Load by default |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `(organisation_id, user_id)` - User's views
- Index on `(organisation_id, is_shared)` - Shared views

**Filters JSONB Structure:**
```json
{
  "dateRange": {
    "preset": "last_90_days",
    "customStart": null,
    "customEnd": null
  },
  "siteIds": ["uuid1", "uuid2"],
  "incidentTypeIds": ["uuid1"],
  "severities": ["high", "critical"],
  "actionStatuses": ["open", "overdue"]
}
```

**Constraints:**
- Maximum 20 views per user (enforced in application)
- Only one `is_default = TRUE` per user (enforced via trigger or application)

---

## 4. Modified Tables

### 4.1 organisations (Additions)

Add risk configuration settings to the organisations table:

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| risk_settings | JSONB | DEFAULT '{}' | Risk scoring configuration |

**risk_settings JSONB Structure:**
```json
{
  "enabled": true,
  "scoringWindowDays": 90,
  "weights": {
    "incidentCritical": 10,
    "incidentHigh": 5,
    "incidentMedium": 2,
    "incidentLow": 1,
    "overdueAction": 3,
    "failedInspection": 2
  },
  "thresholds": {
    "low": 10,
    "medium": 30,
    "high": 50
  }
}
```

---

## 5. Entity Relationships

```
┌──────────────────────┐
│    organisations     │
├──────────────────────┤
│ id (PK)              │
│ risk_settings (JSONB)│◄───────────────────────────────────────┐
└──────────────────────┘                                        │
          │                                                     │
          │ 1:N                                                 │
          ▼                                                     │
┌──────────────────────────┐     ┌──────────────────────────┐   │
│  analytics_daily_summary │     │     site_risk_scores     │   │
├──────────────────────────┤     ├──────────────────────────┤   │
│ id (PK)                  │     │ id (PK)                  │   │
│ organisation_id (FK) ────┼─────│ organisation_id (FK) ────┼───┤
│ site_id (FK)             │     │ site_id (FK)             │   │
│ summary_date             │     │ risk_score               │   │
│ incident_type_id (FK)    │     │ risk_category            │   │
│ severity                 │     │ incident_score           │   │
│ incident_count           │     │ action_score             │   │
│ inspection_count         │     │ inspection_score         │   │
│ actions_created          │     │ calculated_at            │   │
│ ...                      │     └──────────────────────────┘   │
└──────────────────────────┘                │                   │
                                            │ 1:N               │
                                            ▼                   │
                             ┌──────────────────────────────┐   │
                             │  site_risk_score_history     │   │
                             ├──────────────────────────────┤   │
                             │ id (PK)                      │   │
                             │ organisation_id (FK) ────────┼───┤
                             │ site_id (FK)                 │   │
                             │ risk_score                   │   │
                             │ risk_category                │   │
                             │ recorded_date                │   │
                             └──────────────────────────────┘   │
                                                                │
          ┌─────────────────────────────────────────────────────┘
          │
          │ 1:N
          ▼
┌──────────────────────────┐
│       saved_views        │
├──────────────────────────┤
│ id (PK)                  │
│ organisation_id (FK)     │
│ user_id (FK)             │──► users
│ name                     │
│ description              │
│ filters (JSONB)          │
│ is_shared                │
│ is_default               │
└──────────────────────────┘
```

---

## 6. Relationships Summary

| From | To | Cardinality | FK Column | Description |
|------|----|-------------|-----------|-------------|
| organisations | analytics_daily_summary | 1:N | organisation_id | Org has many daily summaries |
| organisations | site_risk_scores | 1:N | organisation_id | Org has many site scores |
| organisations | site_risk_score_history | 1:N | organisation_id | Org has score history |
| organisations | saved_views | 1:N | organisation_id | Org has many saved views |
| sites | analytics_daily_summary | 1:N | site_id | Site has many summaries |
| sites | site_risk_scores | 1:1 | site_id | Site has one current score |
| sites | site_risk_score_history | 1:N | site_id | Site has score history |
| users | saved_views | 1:N | user_id | User owns many views |
| incident_types | analytics_daily_summary | 1:N | incident_type_id | Type appears in summaries |

---

## 7. SQL Migration Script

```sql
-- migrations/005_phase5_analytics.sql

-- Analytics daily summary table
CREATE TABLE analytics_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  incident_type_id UUID REFERENCES incident_types(id) ON DELETE SET NULL,
  severity VARCHAR(20),
  incident_count INTEGER NOT NULL DEFAULT 0,
  incidents_closed INTEGER NOT NULL DEFAULT 0,
  incident_resolution_days_sum NUMERIC(10,2) DEFAULT 0,
  inspection_count INTEGER NOT NULL DEFAULT 0,
  inspections_passed INTEGER NOT NULL DEFAULT 0,
  inspections_failed INTEGER NOT NULL DEFAULT 0,
  actions_created INTEGER NOT NULL DEFAULT 0,
  actions_completed INTEGER NOT NULL DEFAULT 0,
  actions_overdue INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for upsert operations
CREATE UNIQUE INDEX idx_analytics_daily_summary_unique
ON analytics_daily_summary (
  organisation_id,
  COALESCE(site_id, '00000000-0000-0000-0000-000000000000'),
  summary_date,
  COALESCE(incident_type_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(severity, 'ALL')
);

-- Performance indexes
CREATE INDEX idx_analytics_daily_summary_org_date
ON analytics_daily_summary(organisation_id, summary_date);

CREATE INDEX idx_analytics_daily_summary_org_site_date
ON analytics_daily_summary(organisation_id, site_id, summary_date);

-- Site risk scores table
CREATE TABLE site_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_category VARCHAR(20) NOT NULL DEFAULT 'low'
    CHECK (risk_category IN ('low', 'medium', 'high', 'critical')),
  incident_score INTEGER NOT NULL DEFAULT 0,
  action_score INTEGER NOT NULL DEFAULT 0,
  inspection_score INTEGER NOT NULL DEFAULT 0,
  incidents_critical INTEGER DEFAULT 0,
  incidents_high INTEGER DEFAULT 0,
  incidents_medium INTEGER DEFAULT 0,
  incidents_low INTEGER DEFAULT 0,
  overdue_actions INTEGER DEFAULT 0,
  failed_inspections INTEGER DEFAULT 0,
  primary_factor VARCHAR(100),
  scoring_window_days INTEGER NOT NULL DEFAULT 90,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organisation_id, site_id)
);

-- Performance indexes for risk scores
CREATE INDEX idx_site_risk_scores_org_score
ON site_risk_scores(organisation_id, risk_score DESC);

CREATE INDEX idx_site_risk_scores_org_category
ON site_risk_scores(organisation_id, risk_category);

-- Site risk score history table
CREATE TABLE site_risk_score_history (
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

-- Performance index for history
CREATE INDEX idx_site_risk_score_history_trend
ON site_risk_score_history(organisation_id, site_id, recorded_date DESC);

-- Saved views table
CREATE TABLE saved_views (
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
CREATE INDEX idx_saved_views_user ON saved_views(organisation_id, user_id);
CREATE INDEX idx_saved_views_shared ON saved_views(organisation_id, is_shared) WHERE is_shared = TRUE;

-- Add risk_settings to organisations
ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS risk_settings JSONB DEFAULT '{}';

-- Trigger to ensure only one default view per user
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

CREATE TRIGGER saved_views_single_default
  BEFORE INSERT OR UPDATE ON saved_views
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_view();

-- Updated_at trigger for new tables
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
```

---

## 8. Aggregation Job Logic

### 8.1 Daily Summary Aggregation

**Job Name:** `analytics_daily_aggregation`
**Schedule:** Daily at 02:00 UTC
**Logic:**

```sql
-- Pseudo-code for aggregation job

-- For each organisation:
FOR each organisation_id IN (SELECT id FROM organisations WHERE is_active = TRUE) LOOP

  -- Determine date to aggregate (yesterday, or backfill range)
  target_date := CURRENT_DATE - INTERVAL '1 day';

  -- Aggregate incidents by site and severity
  INSERT INTO analytics_daily_summary (
    organisation_id, site_id, summary_date, severity, incident_count
  )
  SELECT
    organisation_id,
    site_id,
    target_date,
    severity,
    COUNT(*)
  FROM incidents
  WHERE organisation_id = current_org_id
    AND DATE(occurred_at) = target_date
  GROUP BY organisation_id, site_id, severity
  ON CONFLICT (...) DO UPDATE SET
    incident_count = EXCLUDED.incident_count,
    updated_at = NOW();

  -- Aggregate inspections by site
  INSERT INTO analytics_daily_summary (
    organisation_id, site_id, summary_date,
    inspection_count, inspections_passed, inspections_failed
  )
  SELECT
    organisation_id,
    site_id,
    target_date,
    COUNT(*),
    SUM(CASE WHEN overall_result = 'pass' THEN 1 ELSE 0 END),
    SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END)
  FROM inspections
  WHERE organisation_id = current_org_id
    AND DATE(performed_at) = target_date
  GROUP BY organisation_id, site_id
  ON CONFLICT (...) DO UPDATE SET ...;

  -- Aggregate actions by site
  -- ... similar pattern for actions

END LOOP;
```

### 8.2 Risk Score Calculation

**Job Name:** `site_risk_score_calculation`
**Schedule:** Daily at 03:00 UTC
**Logic:**

```sql
-- For each site in each organisation:
FOR each site IN (SELECT id, organisation_id FROM sites WHERE organisation_id IS NOT NULL) LOOP

  -- Get scoring window from org settings (default 90 days)
  scoring_window := COALESCE(
    (SELECT risk_settings->>'scoringWindowDays' FROM organisations WHERE id = site.organisation_id)::INT,
    90
  );

  window_start := CURRENT_DATE - (scoring_window || ' days')::INTERVAL;

  -- Count incidents by severity
  SELECT
    COALESCE(SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END), 0)
  INTO critical_count, high_count, medium_count, low_count
  FROM incidents
  WHERE site_id = site.id
    AND occurred_at >= window_start;

  -- Count overdue actions
  SELECT COUNT(*)
  INTO overdue_count
  FROM actions a
  JOIN incidents i ON a.source_type = 'incident' AND a.source_id = i.id AND i.site_id = site.id
  WHERE a.status IN ('open', 'in_progress', 'overdue')
    AND a.due_date < CURRENT_DATE;

  -- Count failed inspections
  SELECT COUNT(*)
  INTO failed_count
  FROM inspections
  WHERE site_id = site.id
    AND overall_result = 'fail'
    AND performed_at >= window_start;

  -- Calculate scores (using default weights, or from org settings)
  incident_score := (critical_count * 10) + (high_count * 5) + (medium_count * 2) + (low_count * 1);
  action_score := overdue_count * 3;
  inspection_score := failed_count * 2;
  total_score := incident_score + action_score + inspection_score;

  -- Determine category
  category := CASE
    WHEN total_score >= 51 THEN 'critical'
    WHEN total_score >= 31 THEN 'high'
    WHEN total_score >= 11 THEN 'medium'
    ELSE 'low'
  END;

  -- Determine primary factor
  primary_factor := determine_primary_factor(...);

  -- Upsert risk score
  INSERT INTO site_risk_scores (...)
  VALUES (...)
  ON CONFLICT (organisation_id, site_id) DO UPDATE SET ...;

  -- Record history
  INSERT INTO site_risk_score_history (...)
  ON CONFLICT DO NOTHING;

END LOOP;
```

---

## 9. Query Patterns

### 9.1 Time-Series: Incidents per Month

```sql
-- Using aggregated data
SELECT
  DATE_TRUNC('month', summary_date) AS month,
  severity,
  SUM(incident_count) AS count
FROM analytics_daily_summary
WHERE organisation_id = $1
  AND summary_date BETWEEN $2 AND $3
  AND site_id IS NULL  -- Org-wide
  AND incident_type_id IS NULL
  AND severity IS NOT NULL
GROUP BY month, severity
ORDER BY month, severity;
```

### 9.2 Site Comparison: Incidents by Site

```sql
SELECT
  s.id AS site_id,
  s.name AS site_name,
  COALESCE(SUM(ads.incident_count), 0) AS incident_count
FROM sites s
LEFT JOIN analytics_daily_summary ads
  ON ads.site_id = s.id
  AND ads.organisation_id = s.organisation_id
  AND ads.summary_date BETWEEN $2 AND $3
  AND ads.incident_type_id IS NULL
  AND ads.severity IS NULL
WHERE s.organisation_id = $1
GROUP BY s.id, s.name
ORDER BY incident_count DESC
LIMIT 20;
```

### 9.3 KPI: Average Resolution Time

```sql
SELECT
  CASE
    WHEN SUM(incidents_closed) > 0
    THEN SUM(incident_resolution_days_sum) / SUM(incidents_closed)
    ELSE NULL
  END AS avg_resolution_days
FROM analytics_daily_summary
WHERE organisation_id = $1
  AND summary_date BETWEEN $2 AND $3
  AND site_id IS NULL;
```

### 9.4 Top Risk Sites

```sql
SELECT
  srs.site_id,
  s.name AS site_name,
  srs.risk_score,
  srs.risk_category,
  srs.primary_factor,
  srs.calculated_at,
  -- Previous score for trend
  prev.risk_score AS previous_score
FROM site_risk_scores srs
JOIN sites s ON s.id = srs.site_id
LEFT JOIN site_risk_score_history prev
  ON prev.site_id = srs.site_id
  AND prev.recorded_date = CURRENT_DATE - INTERVAL '7 days'
WHERE srs.organisation_id = $1
ORDER BY srs.risk_score DESC
LIMIT 5;
```

---

## 10. Performance Considerations

### 10.1 Index Strategy

| Query Pattern | Index Used |
|---------------|------------|
| Date range analytics | `idx_analytics_daily_summary_org_date` |
| Site-specific analytics | `idx_analytics_daily_summary_org_site_date` |
| Top risk sites | `idx_site_risk_scores_org_score` |
| Risk category filter | `idx_site_risk_scores_org_category` |
| Risk trend | `idx_site_risk_score_history_trend` |
| User saved views | `idx_saved_views_user` |

### 10.2 Partitioning (Future)

For very large datasets (>1M incidents), consider:
- Partitioning `analytics_daily_summary` by month
- Partitioning `site_risk_score_history` by year

### 10.3 Aggregation Freshness

| Data Type | Aggregation Lag | Mitigation |
|-----------|----------------|------------|
| Incidents | Up to 24 hours | Real-time query for "today" |
| Risk Scores | Up to 24 hours | Display "As of [date]" |
| Saved Views | Real-time | No aggregation needed |

---

## 11. Data Retention

| Table | Retention Period | Cleanup Job |
|-------|------------------|-------------|
| analytics_daily_summary | 2 years | Monthly (delete old months) |
| site_risk_scores | Current only | N/A (upsert replaces) |
| site_risk_score_history | 1 year | Monthly (delete old records) |
| saved_views | Indefinite | User-managed |

---

## 12. Related Documents

- [BRD_EHS_PORTAL_PHASE5.md](./BRD_EHS_PORTAL_PHASE5.md) - Business requirements
- [ARCHITECTURE_PHASE5.md](./ARCHITECTURE_PHASE5.md) - System architecture
- [API_SPEC_PHASE5.md](./API_SPEC_PHASE5.md) - API specification
- [DATA_MODEL.md](./DATA_MODEL.md) - Master data model (all phases)

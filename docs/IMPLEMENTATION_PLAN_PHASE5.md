# Implementation Plan - EHS Portal Phase 5
## Analytics & Insights

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-02 |
| Phase | 5 – Analytics & Insights |

---

## 1. Implementation Overview

Phase 5 adds advanced analytics capabilities to the EHS Portal. This plan outlines the implementation sequence, dependencies, and key technical decisions.

### 1.1 Implementation Principles

1. **Incremental delivery** - Deliver working features in stages
2. **Backend-first** - Build APIs before frontend components
3. **Performance from start** - Implement aggregation early
4. **Test-driven** - Write tests alongside implementation
5. **Minimal disruption** - Existing Phase 1-4 features remain stable

### 1.2 High-Level Phases

| Stage | Focus | Deliverables |
|-------|-------|--------------|
| 5.1 | Database & Aggregation | New tables, migration, aggregation job |
| 5.2 | Analytics APIs | Summary, time-series, site comparison endpoints |
| 5.3 | Risk Scoring | Risk calculation job, risk score APIs |
| 5.4 | Saved Views | Views CRUD API and storage |
| 5.5 | Frontend - Analytics Dashboard | Charts, KPIs, filters |
| 5.6 | Frontend - Risk Widgets | Risk score display, top sites widget |
| 5.7 | Saved Views UI | View management, load/save |
| 5.8 | PDF Generation | Board pack report generation |
| 5.9 | Drill-Down Navigation | Chart click navigation |
| 5.10 | Testing & Polish | E2E tests, performance tuning |

---

## 2. Stage 5.1 - Database & Aggregation

### 2.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.1.1 | Create migration 005_phase5_analytics.sql | S | None |
| 5.1.2 | Add analytics_daily_summary table | S | 5.1.1 |
| 5.1.3 | Add site_risk_scores table | S | 5.1.1 |
| 5.1.4 | Add site_risk_score_history table | S | 5.1.1 |
| 5.1.5 | Add saved_views table | S | 5.1.1 |
| 5.1.6 | Add indexes for analytics queries | S | 5.1.2-5.1.5 |
| 5.1.7 | Implement AggregationService | M | 5.1.2 |
| 5.1.8 | Create aggregation scheduled job (02:00 UTC) | M | 5.1.7 |
| 5.1.9 | Test aggregation with sample data | S | 5.1.8 |

### 2.2 Migration SQL

```sql
-- 005_phase5_analytics.sql

-- Daily aggregation table
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  incident_type_id UUID REFERENCES incident_types(id) ON DELETE SET NULL,
  severity VARCHAR(20),

  -- Counts
  incident_count INTEGER NOT NULL DEFAULT 0,
  inspection_count INTEGER NOT NULL DEFAULT 0,
  inspection_pass_count INTEGER NOT NULL DEFAULT 0,
  inspection_fail_count INTEGER NOT NULL DEFAULT 0,
  actions_created INTEGER NOT NULL DEFAULT 0,
  actions_completed INTEGER NOT NULL DEFAULT 0,
  actions_overdue INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for upsert
  UNIQUE (organisation_id, site_id, summary_date, incident_type_id, severity)
);

-- Site risk scores (current)
CREATE TABLE IF NOT EXISTS site_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Scores
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_category VARCHAR(20) NOT NULL DEFAULT 'low',
  incident_score INTEGER NOT NULL DEFAULT 0,
  action_score INTEGER NOT NULL DEFAULT 0,
  inspection_score INTEGER NOT NULL DEFAULT 0,

  -- Details
  critical_incidents INTEGER NOT NULL DEFAULT 0,
  high_incidents INTEGER NOT NULL DEFAULT 0,
  medium_incidents INTEGER NOT NULL DEFAULT 0,
  low_incidents INTEGER NOT NULL DEFAULT 0,
  overdue_actions INTEGER NOT NULL DEFAULT 0,
  failed_inspections INTEGER NOT NULL DEFAULT 0,

  primary_factor VARCHAR(100),
  calculation_window_days INTEGER NOT NULL DEFAULT 90,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (organisation_id, site_id)
);

-- Risk score history for trending
CREATE TABLE IF NOT EXISTS site_risk_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  risk_score INTEGER NOT NULL,
  risk_category VARCHAR(20) NOT NULL,
  recorded_at DATE NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved views
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

-- Indexes
CREATE INDEX idx_analytics_summary_org_date ON analytics_daily_summary(organisation_id, summary_date);
CREATE INDEX idx_analytics_summary_site_date ON analytics_daily_summary(site_id, summary_date);
CREATE INDEX idx_risk_scores_org ON site_risk_scores(organisation_id);
CREATE INDEX idx_risk_scores_score ON site_risk_scores(risk_score DESC);
CREATE INDEX idx_risk_history_site_date ON site_risk_score_history(site_id, recorded_at);
CREATE INDEX idx_saved_views_user ON saved_views(user_id);
CREATE INDEX idx_saved_views_org_shared ON saved_views(organisation_id, is_shared);
```

### 2.3 AggregationService Pseudocode

```javascript
// services/AggregationService.js

class AggregationService {
  async runDailyAggregation(targetDate = yesterday) {
    const orgs = await this.getActiveOrganisations();

    for (const org of orgs) {
      await this.aggregateOrganisation(org.id, targetDate);
    }
  }

  async aggregateOrganisation(orgId, targetDate) {
    // 1. Clear existing rows for this date (idempotent)
    await this.clearSummaryForDate(orgId, targetDate);

    // 2. Aggregate incidents by site, type, severity
    const incidentAgg = await db.query(`
      SELECT
        site_id,
        incident_type_id,
        severity,
        COUNT(*) as count
      FROM incidents
      WHERE organisation_id = $1
        AND DATE(incident_date) = $2
      GROUP BY site_id, incident_type_id, severity
    `, [orgId, targetDate]);

    // 3. Aggregate inspections
    const inspectionAgg = await db.query(`
      SELECT
        site_id,
        COUNT(*) as total,
        SUM(CASE WHEN overall_result = 'pass' THEN 1 ELSE 0 END) as pass_count,
        SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) as fail_count
      FROM inspections
      WHERE organisation_id = $1
        AND DATE(inspection_date) = $2
      GROUP BY site_id
    `, [orgId, targetDate]);

    // 4. Aggregate actions
    const actionAgg = await db.query(`
      SELECT
        i.site_id,
        COUNT(CASE WHEN DATE(a.created_at) = $2 THEN 1 END) as created,
        COUNT(CASE WHEN a.status = 'completed' AND DATE(a.updated_at) = $2 THEN 1 END) as completed,
        COUNT(CASE WHEN a.status != 'completed' AND a.due_date < $2 THEN 1 END) as overdue
      FROM actions a
      JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
      WHERE i.organisation_id = $1
      GROUP BY i.site_id
    `, [orgId, targetDate]);

    // 5. Insert summary rows
    await this.insertSummaryRows(orgId, targetDate, incidentAgg, inspectionAgg, actionAgg);
  }
}
```

---

## 3. Stage 5.2 - Analytics APIs

### 3.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.2.1 | Create analytics routes file | S | None |
| 5.2.2 | Implement GET /api/analytics/summary | M | 5.1.8 |
| 5.2.3 | Implement GET /api/analytics/incidents/time-series | M | 5.1.8 |
| 5.2.4 | Implement GET /api/analytics/incidents/by-site | M | 5.1.8 |
| 5.2.5 | Implement GET /api/analytics/incidents/by-type | M | 5.1.8 |
| 5.2.6 | Implement GET /api/analytics/inspections/time-series | M | 5.1.8 |
| 5.2.7 | Implement GET /api/analytics/actions/time-series | M | 5.1.8 |
| 5.2.8 | Create AnalyticsService for query logic | L | 5.2.2-5.2.7 |
| 5.2.9 | Add hybrid query (aggregated + live recent) | M | 5.2.8 |
| 5.2.10 | Write unit tests for analytics APIs | M | 5.2.2-5.2.9 |

### 3.2 API Implementation Notes

**Hybrid Query Strategy:**
```javascript
async getIncidentTimeSeries(orgId, startDate, endDate, filters) {
  const cutoffDate = subDays(new Date(), 2); // 48 hours ago

  // Data before cutoff: use aggregated table
  const aggregatedData = await this.queryAggregated(orgId, startDate, cutoffDate, filters);

  // Data after cutoff: use live tables
  const liveData = await this.queryLive(orgId, cutoffDate, endDate, filters);

  return this.mergeTimeSeries(aggregatedData, liveData);
}
```

---

## 4. Stage 5.3 - Risk Scoring

### 4.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.3.1 | Implement RiskScoreService | M | 5.1.3 |
| 5.3.2 | Implement risk score formula | S | 5.3.1 |
| 5.3.3 | Create risk calculation scheduled job (03:00 UTC) | M | 5.3.1 |
| 5.3.4 | Implement category assignment logic | S | 5.3.2 |
| 5.3.5 | Implement primary factor detection | S | 5.3.2 |
| 5.3.6 | Store risk history on each calculation | S | 5.3.3 |
| 5.3.7 | Implement GET /api/analytics/risk-scores | M | 5.3.3 |
| 5.3.8 | Implement GET /api/analytics/risk-scores/top | S | 5.3.7 |
| 5.3.9 | Implement GET /api/analytics/risk-scores/:siteId | S | 5.3.7 |
| 5.3.10 | Write unit tests for risk scoring | M | 5.3.1-5.3.9 |

### 4.2 Risk Score Calculation

```javascript
// services/RiskScoreService.js

const WEIGHTS = {
  CRITICAL_INCIDENT: 10,
  HIGH_INCIDENT: 5,
  MEDIUM_INCIDENT: 2,
  LOW_INCIDENT: 1,
  OVERDUE_ACTION: 3,
  FAILED_INSPECTION: 2
};

const CATEGORIES = [
  { max: 10, name: 'low', color: 'green' },
  { max: 30, name: 'medium', color: 'yellow' },
  { max: 50, name: 'high', color: 'orange' },
  { max: Infinity, name: 'critical', color: 'red' }
];

class RiskScoreService {
  async calculateSiteRiskScore(orgId, siteId, windowDays = 90) {
    const startDate = subDays(new Date(), windowDays);

    // Get incident counts by severity
    const incidents = await db.query(`
      SELECT
        severity,
        COUNT(*) as count
      FROM incidents
      WHERE organisation_id = $1
        AND site_id = $2
        AND incident_date >= $3
      GROUP BY severity
    `, [orgId, siteId, startDate]);

    // Get overdue actions count
    const overdueActions = await db.query(`
      SELECT COUNT(*) as count
      FROM actions a
      JOIN incidents i ON a.source_id = i.id AND a.source_type = 'incident'
      WHERE i.organisation_id = $1
        AND i.site_id = $2
        AND a.status != 'completed'
        AND a.due_date < NOW()
    `, [orgId, siteId]);

    // Get failed inspections count
    const failedInspections = await db.query(`
      SELECT COUNT(*) as count
      FROM inspections
      WHERE organisation_id = $1
        AND site_id = $2
        AND inspection_date >= $3
        AND overall_result = 'fail'
    `, [orgId, siteId, startDate]);

    // Calculate scores
    const incidentScore = this.calculateIncidentScore(incidents);
    const actionScore = overdueActions[0].count * WEIGHTS.OVERDUE_ACTION;
    const inspectionScore = failedInspections[0].count * WEIGHTS.FAILED_INSPECTION;

    const totalScore = incidentScore + actionScore + inspectionScore;
    const category = this.getCategory(totalScore);
    const primaryFactor = this.getPrimaryFactor(incidentScore, actionScore, inspectionScore);

    return {
      risk_score: totalScore,
      risk_category: category.name,
      incident_score: incidentScore,
      action_score: actionScore,
      inspection_score: inspectionScore,
      primary_factor: primaryFactor
    };
  }

  calculateIncidentScore(incidents) {
    let score = 0;
    for (const row of incidents) {
      const weight = WEIGHTS[`${row.severity.toUpperCase()}_INCIDENT`] || 1;
      score += row.count * weight;
    }
    return score;
  }

  getCategory(score) {
    return CATEGORIES.find(c => score <= c.max);
  }

  getPrimaryFactor(incidentScore, actionScore, inspectionScore) {
    const factors = [
      { name: 'incidents', score: incidentScore },
      { name: 'overdue_actions', score: actionScore },
      { name: 'failed_inspections', score: inspectionScore }
    ];
    const max = factors.reduce((a, b) => a.score > b.score ? a : b);
    return max.score > 0 ? max.name : null;
  }
}
```

---

## 5. Stage 5.4 - Saved Views API

### 5.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.4.1 | Create saved views routes | S | 5.1.5 |
| 5.4.2 | Implement GET /api/analytics/views | S | 5.4.1 |
| 5.4.3 | Implement POST /api/analytics/views | M | 5.4.1 |
| 5.4.4 | Implement PUT /api/analytics/views/:id | M | 5.4.3 |
| 5.4.5 | Implement DELETE /api/analytics/views/:id | S | 5.4.3 |
| 5.4.6 | Implement view limit validation (max 20) | S | 5.4.3 |
| 5.4.7 | Implement default view logic | S | 5.4.4 |
| 5.4.8 | Write unit tests for views API | S | 5.4.2-5.4.7 |

### 5.2 Filters Schema

```typescript
interface SavedViewFilters {
  dateRange: {
    preset?: 'last30' | 'last90' | 'last365' | 'thisYear' | 'custom';
    startDate?: string; // ISO date
    endDate?: string;   // ISO date
  };
  siteIds?: string[];        // UUID array
  incidentTypeIds?: string[]; // UUID array
  severities?: ('low' | 'medium' | 'high' | 'critical')[];
}
```

---

## 6. Stage 5.5 - Frontend Analytics Dashboard

### 6.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.5.1 | Install Recharts library | S | None |
| 5.5.2 | Create AnalyticsPage component | M | 5.2.10 |
| 5.5.3 | Create AnalyticsContext for state | M | 5.5.2 |
| 5.5.4 | Create FilterPanel component | M | 5.5.3 |
| 5.5.5 | Create KPICard component | S | 5.5.3 |
| 5.5.6 | Create KPICardGrid (6 cards) | M | 5.5.5 |
| 5.5.7 | Create TimeSeriesChart component | L | 5.5.3 |
| 5.5.8 | Create SiteComparisonChart component | L | 5.5.3 |
| 5.5.9 | Create IncidentTypeChart component | M | 5.5.3 |
| 5.5.10 | Implement filter debouncing (300ms) | S | 5.5.4 |
| 5.5.11 | Implement URL sync for filters | M | 5.5.4 |
| 5.5.12 | Add loading states for charts | S | 5.5.7-5.5.9 |
| 5.5.13 | Add empty states for no data | S | 5.5.7-5.5.9 |
| 5.5.14 | Write component unit tests | M | 5.5.2-5.5.13 |

### 6.2 Component Structure

```
src/
  pages/
    AnalyticsPage.jsx
  components/
    analytics/
      FilterPanel.jsx
      KPICard.jsx
      KPICardGrid.jsx
      TimeSeriesChart.jsx
      SiteComparisonChart.jsx
      IncidentTypeChart.jsx
      RiskWidget.jsx
      TopIncidentTypesWidget.jsx
      SavedViewsDropdown.jsx
      SaveViewModal.jsx
  contexts/
    AnalyticsContext.jsx
  hooks/
    useAnalytics.js
    useAnalyticsFilters.js
  services/
    analyticsService.js
```

### 6.3 KPICard Component

```jsx
// components/analytics/KPICard.jsx

const KPICard = ({ title, value, trend, trendDirection, onClick }) => {
  const trendColor = trendDirection === 'up'
    ? (trend > 0 ? 'text-red-500' : 'text-green-500')
    : (trend > 0 ? 'text-green-500' : 'text-red-500');

  return (
    <div
      className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition"
      onClick={onClick}
    >
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className={`text-sm mt-2 ${trendColor}`}>
        {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}% vs last period
      </div>
    </div>
  );
};
```

---

## 7. Stage 5.6 - Frontend Risk Widgets

### 7.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.6.1 | Create RiskWidget component | M | 5.3.10 |
| 5.6.2 | Create TopHighRiskSites widget | M | 5.6.1 |
| 5.6.3 | Create TopIncidentTypes widget | M | 5.6.1 |
| 5.6.4 | Add risk category colour coding | S | 5.6.2 |
| 5.6.5 | Add trend arrows for risk scores | S | 5.6.2 |
| 5.6.6 | Implement risk score tooltip (formula explanation) | S | 5.6.2 |
| 5.6.7 | Write widget unit tests | S | 5.6.1-5.6.6 |

---

## 8. Stage 5.7 - Saved Views UI

### 8.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.7.1 | Create SavedViewsDropdown component | M | 5.4.8 |
| 5.7.2 | Create SaveViewModal component | M | 5.7.1 |
| 5.7.3 | Create ManageViewsModal component | M | 5.7.1 |
| 5.7.4 | Implement load view functionality | S | 5.7.1 |
| 5.7.5 | Implement save current view | M | 5.7.2 |
| 5.7.6 | Implement update existing view | S | 5.7.3 |
| 5.7.7 | Implement delete view with confirmation | S | 5.7.3 |
| 5.7.8 | Implement set default view | S | 5.7.3 |
| 5.7.9 | Show "Currently viewing" indicator | S | 5.7.4 |
| 5.7.10 | Write UI tests for views management | M | 5.7.1-5.7.9 |

---

## 9. Stage 5.8 - PDF Generation

### 9.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.8.1 | Install Puppeteer for server-side rendering | S | None |
| 5.8.2 | Create ReportService | M | 5.8.1 |
| 5.8.3 | Create PDF template HTML | M | 5.8.2 |
| 5.8.4 | Implement chart-to-image conversion | L | 5.8.3 |
| 5.8.5 | Implement POST /api/analytics/report/pdf | M | 5.8.4 |
| 5.8.6 | Add cover page generation | S | 5.8.3 |
| 5.8.7 | Add executive summary section | M | 5.8.3 |
| 5.8.8 | Add filter summary to report | S | 5.8.5 |
| 5.8.9 | Add loading indicator during generation | S | 5.8.5 |
| 5.8.10 | Test PDF generation with various data volumes | M | 5.8.5-5.8.8 |

### 9.2 PDF Generation Flow

```
1. User clicks "Generate PDF Report" button
2. Frontend sends POST /api/analytics/report/pdf with current filters
3. Backend:
   a. Fetches analytics data using same queries as dashboard
   b. Renders HTML template with data
   c. Uses Puppeteer to render HTML to PDF
   d. Returns PDF as file download
4. Frontend shows loading spinner, then triggers download
```

---

## 10. Stage 5.9 - Drill-Down Navigation

### 10.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.9.1 | Add click handlers to chart components | M | 5.5.14 |
| 5.9.2 | Implement navigation with filter params | M | 5.9.1 |
| 5.9.3 | Update Incidents list to accept URL filters | M | 5.9.2 |
| 5.9.4 | Update Actions list to accept URL filters | M | 5.9.2 |
| 5.9.5 | Update Inspections list to accept URL filters | M | 5.9.2 |
| 5.9.6 | Add cursor pointer on hover | S | 5.9.1 |
| 5.9.7 | Add "Click to view details" tooltip | S | 5.9.1 |
| 5.9.8 | Add visual highlight on hover | S | 5.9.1 |
| 5.9.9 | Test drill-down navigation E2E | M | 5.9.1-5.9.8 |

### 10.2 Drill-Down Mapping

| Chart Element | Target Page | URL Parameters |
|---------------|-------------|----------------|
| Incidents by month bar | /incidents | ?month=YYYY-MM&severity=X |
| Incidents by site bar | /incidents | ?siteId=X |
| KPI: Open Actions | /actions | ?status=open |
| KPI: % Overdue | /actions | ?status=overdue |
| Top Risk Site row | /incidents | ?siteId=X&dateRange=90d |
| Top Incident Type row | /incidents | ?typeId=X |

---

## 11. Stage 5.10 - Testing & Polish

### 11.1 Tasks

| Task ID | Task | Effort | Dependencies |
|---------|------|--------|--------------|
| 5.10.1 | Write E2E tests for analytics dashboard | L | 5.9.9 |
| 5.10.2 | Write E2E tests for saved views | M | 5.7.10 |
| 5.10.3 | Write E2E tests for PDF generation | M | 5.8.10 |
| 5.10.4 | Performance testing with 10k+ incidents | M | 5.10.1 |
| 5.10.5 | Accessibility audit and fixes | M | 5.10.1 |
| 5.10.6 | Cross-browser testing | M | 5.10.1 |
| 5.10.7 | Mobile responsiveness testing | M | 5.10.1 |
| 5.10.8 | Security review (multi-tenant isolation) | M | All |
| 5.10.9 | Documentation updates | M | All |
| 5.10.10 | Final QA sign-off | L | All |

---

## 12. Technical Dependencies

### 12.1 New NPM Packages

**Backend:**
```json
{
  "puppeteer": "^21.0.0"  // PDF generation
}
```

**Frontend:**
```json
{
  "recharts": "^2.10.0",      // Charts
  "date-fns": "^2.30.0"       // Date manipulation (if not already)
}
```

### 12.2 Scheduled Jobs Configuration

```javascript
// Add to existing scheduler configuration

// Phase 5 jobs
scheduleJob('analytics-aggregation', '0 2 * * *', async () => {
  await aggregationService.runDailyAggregation();
});

scheduleJob('risk-score-calculation', '0 3 * * *', async () => {
  await riskScoreService.calculateAllSiteScores();
});

scheduleJob('risk-history-cleanup', '0 4 1 * *', async () => {
  // Monthly: delete risk history older than 2 years
  await riskScoreService.cleanupOldHistory(730);
});
```

---

## 13. Database Indexes Summary

```sql
-- Analytics performance indexes
CREATE INDEX idx_incidents_org_date ON incidents(organisation_id, incident_date);
CREATE INDEX idx_incidents_site_date ON incidents(site_id, incident_date);
CREATE INDEX idx_incidents_type_date ON incidents(incident_type_id, incident_date);
CREATE INDEX idx_inspections_org_date ON inspections(organisation_id, inspection_date);
CREATE INDEX idx_actions_due_status ON actions(due_date, status);
```

---

## 14. Rollback Plan

If Phase 5 deployment causes issues:

1. **Database:** Migration 005 can be reverted by dropping new tables (no existing data affected)
2. **Scheduled Jobs:** Disable via environment variable `ENABLE_PHASE5_JOBS=false`
3. **Frontend:** Feature flag `REACT_APP_ENABLE_ANALYTICS=false` hides Analytics nav item
4. **APIs:** Return 503 Service Unavailable if feature disabled

---

## 15. Definition of Done

Phase 5 is complete when:

- [ ] All database migrations applied and tested
- [ ] All scheduled jobs running successfully
- [ ] All APIs implemented with unit tests passing
- [ ] Frontend analytics dashboard functional
- [ ] Saved views working (create, load, update, delete)
- [ ] PDF report generation working
- [ ] Drill-down navigation working for all charts
- [ ] E2E tests passing (>90% coverage for Phase 5 features)
- [ ] Performance targets met (load times per BRD)
- [ ] Accessibility compliance verified
- [ ] Multi-tenant data isolation verified
- [ ] Documentation complete
- [ ] QA sign-off obtained

---

## 16. Effort Key

| Code | Meaning | Approximate Duration |
|------|---------|---------------------|
| S | Small | 2-4 hours |
| M | Medium | 1-2 days |
| L | Large | 3-5 days |
| XL | Extra Large | 1+ week |

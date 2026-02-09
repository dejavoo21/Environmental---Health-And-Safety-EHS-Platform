# Architecture – EHS Portal Phase 5
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

Phase 5 adds analytics capabilities to the EHS Portal through:

1. **Analytics API Layer** - New endpoints for aggregated metrics and charts
2. **Aggregation Jobs** - Scheduled background jobs for data pre-processing
3. **Risk Calculation Engine** - Site risk scoring service
4. **Analytics Frontend** - New dashboard with charts, KPIs, and saved views
5. **PDF Generation Service** - Board pack report generation

---

## 2. Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                              │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   AnalyticsPage  │  │   ChartsPanel    │  │    SavedViews        │  │
│  │                  │  │  - IncidentChart │  │    Management        │  │
│  │  - KPICards      │  │  - SiteChart     │  │                      │  │
│  │  - FilterPanel   │  │  - ActionChart   │  │                      │  │
│  │  - RiskWidgets   │  │  - TrendChart    │  │                      │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                       │              │
│           └─────────────────────┼───────────────────────┘              │
│                                 │                                      │
│                    ┌────────────▼────────────┐                         │
│                    │   AnalyticsContext      │                         │
│                    │   (State Management)    │                         │
│                    └────────────┬────────────┘                         │
│                                 │                                      │
│                    ┌────────────▼────────────┐                         │
│                    │      API Client         │                         │
│                    │   (Axios + Auth)        │                         │
│                    └────────────┬────────────┘                         │
└─────────────────────────────────┼──────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js/Express)                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        API Routes                                │   │
│  │  /api/analytics/incidents/time-series                           │   │
│  │  /api/analytics/incidents/by-site                               │   │
│  │  /api/analytics/actions/time-series                             │   │
│  │  /api/analytics/actions/overdue-by-site                         │   │
│  │  /api/analytics/inspections/time-series                         │   │
│  │  /api/analytics/summary                                         │   │
│  │  /api/analytics/risk-scores                                     │   │
│  │  /api/analytics/views                                           │   │
│  │  /api/analytics/report/pdf                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                  │                                     │
│  ┌───────────────────────────────┼─────────────────────────────────┐   │
│  │                     Services Layer                               │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐ │   │
│  │  │ AnalyticsService│ │RiskScoreService │ │ ReportService       │ │   │
│  │  │ - getTimeSeries │ │ - calculateScore│ │ - generatePDF       │ │   │
│  │  │ - getSiteStats  │ │ - getTopRisks   │ │ - formatCharts      │ │   │
│  │  │ - getKPIs       │ │ - getHistory    │ │                     │ │   │
│  │  └────────┬────────┘ └────────┬────────┘ └──────────┬──────────┘ │   │
│  │           │                   │                     │            │   │
│  │  ┌────────▼───────────────────▼─────────────────────▼──────────┐ │   │
│  │  │               Aggregation Query Layer                        │ │   │
│  │  │  - Query aggregated tables (analytics_daily_summary)         │ │   │
│  │  │  - Fallback to live tables for recent data                   │ │   │
│  │  │  - Apply org + user filters                                  │ │   │
│  │  └────────┬─────────────────────────────────────────────────────┘ │   │
│  └───────────┼──────────────────────────────────────────────────────┘   │
│              │                                                         │
│  ┌───────────┼──────────────────────────────────────────────────────┐   │
│  │           │         Scheduled Jobs (node-cron)                   │   │
│  │  ┌────────▼────────┐  ┌────────────────────┐  ┌───────────────┐  │   │
│  │  │DailyAggregation │  │RiskScoreCalculation│  │HistoryCleanup │  │   │
│  │  │Job              │  │Job                  │  │Job            │  │   │
│  │  │ 02:00 UTC       │  │ 03:00 UTC           │  │ 04:00 UTC     │  │   │
│  │  └─────────────────┘  └────────────────────┘  └───────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Database                             │
├────────────────────────────────────────────────────────────────────────┤
│  Operational Tables          │  Analytics Tables                       │
│  ─────────────────           │  ──────────────────                     │
│  • incidents                 │  • analytics_daily_summary              │
│  • inspections               │  • site_risk_scores                     │
│  • actions                   │  • site_risk_score_history              │
│  • sites                     │  • saved_views                          │
│  • users                     │                                         │
│  • organisations             │                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Details

### 3.1 Analytics API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/analytics/summary` | GET | KPI summary with trends |
| `/api/analytics/incidents/time-series` | GET | Incidents over time (by severity) |
| `/api/analytics/incidents/by-site` | GET | Incident counts per site |
| `/api/analytics/incidents/by-type` | GET | Incident counts per type |
| `/api/analytics/inspections/time-series` | GET | Inspections over time |
| `/api/analytics/inspections/by-site` | GET | Pass/fail rates per site |
| `/api/analytics/actions/time-series` | GET | Actions created vs completed |
| `/api/analytics/actions/overdue-by-site` | GET | Overdue actions per site |
| `/api/analytics/risk-scores` | GET | All site risk scores |
| `/api/analytics/risk-scores/top` | GET | Top N high-risk sites |
| `/api/analytics/views` | GET/POST | List/create saved views |
| `/api/analytics/views/:id` | GET/PUT/DELETE | Manage specific view |
| `/api/analytics/report/pdf` | POST | Generate PDF report |

### 3.2 Analytics Service

**Responsibilities:**
- Query aggregated data from `analytics_daily_summary`
- Apply organisation and user filters
- Calculate trend comparisons (current vs previous period)
- Format data for chart consumption

**Key Methods:**
```javascript
class AnalyticsService {
  // Time-series data
  async getIncidentTimeSeries(orgId, filters) { ... }
  async getInspectionTimeSeries(orgId, filters) { ... }
  async getActionTimeSeries(orgId, filters) { ... }

  // Site comparisons
  async getIncidentsBySite(orgId, filters) { ... }
  async getInspectionsBySite(orgId, filters) { ... }
  async getOverdueActionsBySite(orgId, filters) { ... }

  // KPI summary
  async getSummary(orgId, filters) { ... }
  async getTrendComparison(orgId, currentPeriod, previousPeriod) { ... }
}
```

### 3.3 Risk Score Service

**Responsibilities:**
- Calculate risk scores for sites
- Determine risk category
- Identify primary contributing factor
- Record score history

**Key Methods:**
```javascript
class RiskScoreService {
  async calculateSiteRiskScore(orgId, siteId, windowDays = 90) { ... }
  async calculateAllSiteScores(orgId) { ... }
  async getTopRiskSites(orgId, limit = 5) { ... }
  async getRiskScoreHistory(orgId, siteId, days = 90) { ... }
  async getRiskBreakdown(orgId, siteId) { ... }
}
```

### 3.4 Report Service

**Responsibilities:**
- Generate PDF analytics reports
- Render charts as images
- Format tables and KPIs
- Apply branding (org logo, colours)

**PDF Generation Approach:**
```javascript
// Using Puppeteer for PDF generation
async generatePDF(orgId, filters) {
  // 1. Fetch all analytics data
  const summary = await analyticsService.getSummary(orgId, filters);
  const charts = await generateChartImages(orgId, filters);
  const riskTable = await riskService.getTopRiskSites(orgId, 5);

  // 2. Render HTML template
  const html = renderReportTemplate({
    orgName,
    dateRange: filters.dateRange,
    summary,
    charts,
    riskTable
  });

  // 3. Generate PDF via Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();

  return pdf;
}
```

### 3.5 Aggregation Jobs

#### Daily Aggregation Job (02:00 UTC)
```javascript
// Job: analytics_daily_aggregation
cron.schedule('0 2 * * *', async () => {
  const orgs = await getActiveOrganisations();
  for (const org of orgs) {
    await aggregateDailyMetrics(org.id, yesterday);
  }
});
```

#### Risk Score Calculation Job (03:00 UTC)
```javascript
// Job: site_risk_score_calculation
cron.schedule('0 3 * * *', async () => {
  const orgs = await getActiveOrganisations();
  for (const org of orgs) {
    await calculateAllSiteRiskScores(org.id);
    await recordRiskScoreHistory(org.id);
  }
});
```

#### History Cleanup Job (04:00 UTC - Monthly)
```javascript
// Job: analytics_history_cleanup
cron.schedule('0 4 1 * *', async () => {
  // Delete summaries older than 2 years
  await deleteOldSummaries(730);
  // Delete risk history older than 1 year
  await deleteOldRiskHistory(365);
});
```

---

## 4. Frontend Components

### 4.1 Analytics Page Structure

```
AnalyticsPage
├── FilterPanel
│   ├── DateRangePicker
│   ├── SiteMultiSelect
│   ├── IncidentTypeMultiSelect
│   ├── SeverityMultiSelect
│   └── SavedViewSelector
│
├── KPICardRow
│   ├── KPICard (Total Incidents)
│   ├── KPICard (% High Severity)
│   ├── KPICard (Avg Resolution Time)
│   ├── KPICard (Open Actions)
│   ├── KPICard (% Overdue)
│   └── KPICard (Inspection Pass Rate)
│
├── ChartsSection
│   ├── IncidentTimeSeriesChart (stacked bar by severity)
│   ├── IncidentsBySiteChart (horizontal bar)
│   ├── InspectionsTimeSeriesChart (line)
│   └── ActionsTimeSeriesChart (created vs completed)
│
├── RiskInsightsSection
│   ├── TopRiskSitesWidget
│   └── TopIncidentTypesWidget
│
└── ViewActions
    ├── SaveViewButton
    ├── ExportPDFButton
    └── ShareButton
```

### 4.2 AnalyticsContext (State Management)

```javascript
const AnalyticsContext = createContext();

const AnalyticsProvider = ({ children }) => {
  const [filters, setFilters] = useState({
    dateRange: { preset: 'last_90_days' },
    siteIds: [],
    incidentTypeIds: [],
    severities: []
  });

  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState({});
  const [riskScores, setRiskScores] = useState([]);
  const [savedViews, setSavedViews] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all analytics data when filters change
  useEffect(() => {
    fetchAnalyticsData(filters);
  }, [filters]);

  const applyView = (view) => {
    setFilters(view.filters);
  };

  const saveCurrentView = async (name, isShared) => {
    // Save to API
  };

  return (
    <AnalyticsContext.Provider value={{
      filters, setFilters,
      summary, chartData, riskScores,
      savedViews, applyView, saveCurrentView,
      loading
    }}>
      {children}
    </AnalyticsContext.Provider>
  );
};
```

### 4.3 Chart Library Selection

**Recommended:** Recharts (React-specific, declarative)

**Rationale:**
- Native React components
- Good performance
- SVG-based (high quality)
- Extensive chart types (bar, line, area, stacked)
- Responsive out of the box
- Active maintenance

**Alternative:** Chart.js with react-chartjs-2

---

## 5. API Response Formats

### 5.1 Summary Response

```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-11-01",
      "end": "2026-02-01"
    },
    "kpis": {
      "totalIncidents": {
        "value": 156,
        "previousValue": 142,
        "trend": "up",
        "percentChange": 9.86
      },
      "highSeverityPercent": {
        "value": 23.5,
        "previousValue": 28.1,
        "trend": "down",
        "percentChange": -16.4
      },
      "avgResolutionDays": {
        "value": 4.2,
        "previousValue": 5.1,
        "trend": "down",
        "percentChange": -17.6
      },
      "openActions": {
        "value": 45,
        "previousValue": 38,
        "trend": "up",
        "percentChange": 18.4
      },
      "overduePercent": {
        "value": 12.5,
        "previousValue": 15.2,
        "trend": "down",
        "percentChange": -17.8
      },
      "inspectionPassRate": {
        "value": 87.3,
        "previousValue": 82.1,
        "trend": "up",
        "percentChange": 6.3
      }
    }
  }
}
```

### 5.2 Time-Series Response

```json
{
  "success": true,
  "data": {
    "series": [
      {
        "period": "2025-11",
        "low": 12,
        "medium": 8,
        "high": 3,
        "critical": 1,
        "total": 24
      },
      {
        "period": "2025-12",
        "low": 15,
        "medium": 10,
        "high": 4,
        "critical": 0,
        "total": 29
      }
    ],
    "metadata": {
      "granularity": "month",
      "severities": ["low", "medium", "high", "critical"]
    }
  }
}
```

### 5.3 Site Risk Scores Response

```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "siteId": "uuid-1",
        "siteName": "Warehouse A",
        "riskScore": 46,
        "riskCategory": "high",
        "previousScore": 38,
        "trend": "up",
        "primaryFactor": "7 high-severity incidents",
        "breakdown": {
          "incidentScore": 30,
          "actionScore": 12,
          "inspectionScore": 4
        },
        "calculatedAt": "2026-02-02T03:00:00Z"
      }
    ]
  }
}
```

---

## 6. Performance Strategy

### 6.1 Query Optimization

| Query Type | Strategy |
|------------|----------|
| Time-series (historical) | Use `analytics_daily_summary` |
| Time-series (today) | Query live tables + merge |
| Site comparisons | Use aggregated data |
| Risk scores | Use pre-computed `site_risk_scores` |
| KPI trends | Cached in summary calculation |

### 6.2 Caching Strategy

```javascript
// Redis caching for frequently accessed data
const cacheKeys = {
  summary: (orgId, hash) => `analytics:summary:${orgId}:${hash}`,
  riskScores: (orgId) => `analytics:risk:${orgId}`,
  savedViews: (orgId, userId) => `analytics:views:${orgId}:${userId}`
};

// Cache TTLs
const cacheTTL = {
  summary: 5 * 60,        // 5 minutes
  riskScores: 60 * 60,    // 1 hour (recalculated nightly)
  savedViews: 10 * 60     // 10 minutes
};
```

### 6.3 Frontend Optimization

- **Lazy loading:** Charts load as user scrolls
- **Debounced filters:** 300ms delay before API call
- **Skeleton loading:** Show chart placeholders while loading
- **Progressive rendering:** KPIs load first, then charts

---

## 7. Security Considerations

### 7.1 Data Access Control

```javascript
// All analytics endpoints enforce org scope
const analyticsMiddleware = (req, res, next) => {
  const { organisationId } = req.user;
  req.analyticsOrgId = organisationId;
  next();
};

// Saved views access
const viewAccessMiddleware = async (req, res, next) => {
  const view = await getView(req.params.id);
  if (view.userId !== req.user.id && !view.isShared) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
```

### 7.2 PDF Generation Security

- PDF generated server-side (no client-side rendering of sensitive data)
- Watermark with org name and generation timestamp
- PDF stored temporarily, deleted after download

---

## 8. Error Handling

### 8.1 Analytics Error Types

| Error | Status | Response |
|-------|--------|----------|
| Invalid date range | 400 | `{ error: 'Invalid date range' }` |
| No data available | 200 | `{ data: [], message: 'No data for selected period' }` |
| Aggregation lag | 200 | Include `dataAsOf` timestamp in response |
| PDF generation timeout | 408 | `{ error: 'Report generation timed out' }` |
| View not found | 404 | `{ error: 'View not found' }` |

### 8.2 Graceful Degradation

```javascript
// If aggregated data missing, fall back to live query
async getIncidentTimeSeries(orgId, filters) {
  try {
    // Try aggregated data first
    const aggregated = await queryAggregatedData(orgId, filters);
    if (aggregated.length > 0) {
      return aggregated;
    }
  } catch (err) {
    logger.warn('Aggregated query failed, falling back to live');
  }

  // Fallback to live query
  return queryLiveData(orgId, filters);
}
```

---

## 9. Monitoring & Logging

### 9.1 Analytics-Specific Metrics

| Metric | Description |
|--------|-------------|
| `analytics_api_latency` | Response time by endpoint |
| `analytics_query_time` | Database query duration |
| `aggregation_job_duration` | Time to complete daily aggregation |
| `risk_calculation_duration` | Time to calculate all risk scores |
| `pdf_generation_time` | Time to generate PDF report |
| `saved_views_count` | Number of saved views per org |

### 9.2 Audit Logging

```javascript
// Log significant analytics events
await auditLog.create({
  eventType: 'analytics_report_generated',
  entityType: 'organisation',
  entityId: orgId,
  userId: req.user.id,
  metadata: {
    reportType: 'pdf',
    filters: sanitizedFilters,
    fileSize: pdfBuffer.length
  }
});
```

---

## 10. Integration Points

### 10.1 With Existing Modules

| Module | Integration |
|--------|-------------|
| Incidents | Data source for incident analytics |
| Inspections | Data source for inspection analytics |
| Actions | Data source for action analytics |
| Notifications | Alert on risk score changes (future) |
| Dashboard | KPI cards reused/extended |

### 10.2 Shared Components

```javascript
// Reuse existing components
import { DateRangePicker } from '../common/DateRangePicker';
import { SiteSelector } from '../common/SiteSelector';
import { KPICard } from '../dashboard/KPICard';

// Extend for analytics
export const AnalyticsKPICard = ({ kpi, onClick }) => (
  <KPICard
    {...kpi}
    onClick={() => onClick(kpi.drillDownParams)}
    showTrend={true}
  />
);
```

---

## 11. Deployment Considerations

### 11.1 Environment Variables

```bash
# Analytics-specific configuration
ANALYTICS_CACHE_ENABLED=true
ANALYTICS_CACHE_TTL_SECONDS=300
RISK_SCORING_ENABLED=true
RISK_SCORING_WINDOW_DAYS=90
PDF_GENERATION_TIMEOUT_MS=30000
AGGREGATION_JOB_ENABLED=true
AGGREGATION_JOB_CRON=0 2 * * *
```

### 11.2 Database Requirements

- Additional storage for analytics tables (~10-50 MB per year per org)
- Increased query load during aggregation window (02:00-04:00 UTC)
- Consider read replica for analytics queries (at scale)

---

## 12. Related Documents

- [BRD_EHS_PORTAL_PHASE5.md](./BRD_EHS_PORTAL_PHASE5.md) - Business requirements
- [DATA_MODEL_PHASE5.md](./DATA_MODEL_PHASE5.md) - Data model
- [API_SPEC_PHASE5.md](./API_SPEC_PHASE5.md) - API specification
- [FRONTEND_UX_PHASE5.md](./FRONTEND_UX_PHASE5.md) - Frontend UX design
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Master architecture (all phases)

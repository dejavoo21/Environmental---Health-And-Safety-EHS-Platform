# Test Strategy - EHS Portal Phase 5
## Analytics & Insights

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | QA Lead |
| Date | 2026-02-02 |
| Phase | 5 – Analytics & Insights |

---

## 1. Test Strategy Overview

### 1.1 Objectives

- Ensure analytics calculations are accurate and consistent
- Validate risk score formula implementation
- Verify performance targets are met
- Confirm multi-tenant data isolation
- Test saved views CRUD operations
- Validate PDF report generation
- Ensure drill-down navigation works correctly

### 1.2 Test Levels

| Level | Description | Tools |
|-------|-------------|-------|
| Unit Tests | Service functions, calculations | Jest |
| Integration Tests | API endpoints with database | Jest + Supertest |
| Component Tests | React components in isolation | Jest + React Testing Library |
| E2E Tests | Full user workflows | Playwright |
| Performance Tests | Load and response time | k6, Lighthouse |
| Security Tests | Data isolation, auth | Manual + automated |

### 1.3 Test Coverage Targets

| Area | Target Coverage |
|------|-----------------|
| Analytics APIs | 90% |
| Risk Score Service | 95% |
| Aggregation Service | 90% |
| Frontend Components | 80% |
| E2E Critical Paths | 100% |

---

## 2. Unit Testing

### 2.1 Analytics Service Tests

```javascript
// tests/unit/services/analyticsService.test.js

describe('AnalyticsService', () => {
  describe('getKPISummary', () => {
    it('should return correct incident counts for date range', async () => {
      // Setup: Create incidents in test database
      // Execute: Call getKPISummary with date range
      // Assert: Counts match expected values
    });

    it('should calculate trend percentage correctly', async () => {
      // Setup: Create incidents in current and previous periods
      // Execute: Call getKPISummary
      // Assert: Trend percentage calculated correctly
    });

    it('should handle empty data gracefully', async () => {
      // Setup: No incidents in date range
      // Execute: Call getKPISummary
      // Assert: Returns zeros, no errors
    });

    it('should filter by site correctly', async () => {
      // Setup: Create incidents for multiple sites
      // Execute: Call getKPISummary with site filter
      // Assert: Only filtered site data returned
    });

    it('should respect organisation isolation', async () => {
      // Setup: Create incidents for two organisations
      // Execute: Call with org A context
      // Assert: Only org A data returned
    });
  });

  describe('getIncidentTimeSeries', () => {
    it('should group incidents by month correctly', async () => {
      // Setup: Create incidents across multiple months
      // Execute: Call getIncidentTimeSeries
      // Assert: Data grouped by month
    });

    it('should stack by severity when requested', async () => {
      // Setup: Create incidents with different severities
      // Execute: Call with stackBy=severity
      // Assert: Data includes severity breakdown
    });

    it('should show zero for months with no incidents', async () => {
      // Setup: Create incidents with gaps
      // Execute: Call getIncidentTimeSeries
      // Assert: Missing months show zero
    });

    it('should use hybrid query (aggregated + live)', async () => {
      // Setup: Data in both aggregated table and live table
      // Execute: Call getIncidentTimeSeries
      // Assert: Both sources merged correctly
    });
  });
});
```

### 2.2 Risk Score Service Tests

```javascript
// tests/unit/services/riskScoreService.test.js

describe('RiskScoreService', () => {
  describe('calculateSiteRiskScore', () => {
    it('should calculate incident score with correct weights', () => {
      const incidents = {
        critical: 1, // 1 × 10 = 10
        high: 2,     // 2 × 5 = 10
        medium: 3,   // 3 × 2 = 6
        low: 5       // 5 × 1 = 5
      };
      const expected = 31;
      // Assert calculation matches
    });

    it('should calculate action score correctly', () => {
      const overdueActions = 4;
      const expected = 4 * 3; // 12
      // Assert
    });

    it('should calculate inspection score correctly', () => {
      const failedInspections = 3;
      const expected = 3 * 2; // 6
      // Assert
    });

    it('should return correct category for score 0-10', () => {
      expect(getCategory(5)).toBe('low');
      expect(getCategory(10)).toBe('low');
    });

    it('should return correct category for score 11-30', () => {
      expect(getCategory(15)).toBe('medium');
      expect(getCategory(30)).toBe('medium');
    });

    it('should return correct category for score 31-50', () => {
      expect(getCategory(35)).toBe('high');
      expect(getCategory(50)).toBe('high');
    });

    it('should return correct category for score 51+', () => {
      expect(getCategory(51)).toBe('critical');
      expect(getCategory(100)).toBe('critical');
    });

    it('should identify primary factor correctly', () => {
      // When incident_score is highest
      expect(getPrimaryFactor(50, 10, 5)).toBe('incidents');

      // When action_score is highest
      expect(getPrimaryFactor(10, 30, 5)).toBe('overdue_actions');

      // When inspection_score is highest
      expect(getPrimaryFactor(5, 10, 40)).toBe('failed_inspections');
    });

    it('should use rolling 90-day window by default', async () => {
      // Setup: Create incidents both inside and outside window
      // Execute: calculateSiteRiskScore
      // Assert: Only 90-day data counted
    });
  });

  describe('calculateAllSiteScores', () => {
    it('should calculate scores for all sites in organisation', async () => {
      // Setup: Create 5 sites with data
      // Execute: calculateAllSiteScores
      // Assert: All 5 sites have scores
    });

    it('should store history record on calculation', async () => {
      // Execute: calculateAllSiteScores
      // Assert: site_risk_score_history has new rows
    });
  });
});
```

### 2.3 Aggregation Service Tests

```javascript
// tests/unit/services/aggregationService.test.js

describe('AggregationService', () => {
  describe('runDailyAggregation', () => {
    it('should create summary rows for each site/type/severity combination', async () => {
      // Setup: Create varied incidents
      // Execute: runDailyAggregation for yesterday
      // Assert: analytics_daily_summary has expected rows
    });

    it('should be idempotent (running twice produces same result)', async () => {
      // Execute twice
      // Assert: No duplicate rows, same counts
    });

    it('should aggregate inspections correctly', async () => {
      // Setup: Create pass and fail inspections
      // Execute: runDailyAggregation
      // Assert: pass_count and fail_count correct
    });

    it('should handle organisation with no data', async () => {
      // Execute for org with no incidents
      // Assert: No errors, empty or zero rows
    });
  });
});
```

---

## 3. Integration Testing

### 3.1 Analytics API Tests

```javascript
// tests/integration/api/analytics.test.js

describe('Analytics API', () => {
  beforeAll(async () => {
    // Setup: Create test data for known scenarios
  });

  describe('GET /api/analytics/summary', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/analytics/summary');
      expect(res.status).toBe(401);
    });

    it('should return KPI summary for authenticated user', async () => {
      const res = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalIncidents');
      expect(res.body).toHaveProperty('highSeverityPercent');
      expect(res.body).toHaveProperty('avgResolutionDays');
      expect(res.body).toHaveProperty('openActions');
      expect(res.body).toHaveProperty('overduePercent');
      expect(res.body).toHaveProperty('inspectionPassRate');
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/analytics/summary')
        .query({ startDate: '2026-01-01', endDate: '2026-01-31' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Assert counts match expected for that range
    });

    it('should filter by site', async () => {
      const res = await request(app)
        .get('/api/analytics/summary')
        .query({ siteIds: [testSiteId] })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Assert only site-specific data
    });
  });

  describe('GET /api/analytics/incidents/time-series', () => {
    it('should return monthly incident counts', async () => {
      const res = await request(app)
        .get('/api/analytics/incidents/time-series')
        .query({ startDate: '2025-01-01', endDate: '2025-12-31' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('month');
      expect(res.body.data[0]).toHaveProperty('count');
    });

    it('should include severity breakdown when requested', async () => {
      const res = await request(app)
        .get('/api/analytics/incidents/time-series')
        .query({ groupBy: 'severity' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.data[0]).toHaveProperty('low');
      expect(res.body.data[0]).toHaveProperty('medium');
      expect(res.body.data[0]).toHaveProperty('high');
      expect(res.body.data[0]).toHaveProperty('critical');
    });
  });

  describe('GET /api/analytics/risk-scores', () => {
    it('should return risk scores for all sites', async () => {
      const res = await request(app)
        .get('/api/analytics/risk-scores')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('site_id');
      expect(res.body.data[0]).toHaveProperty('risk_score');
      expect(res.body.data[0]).toHaveProperty('risk_category');
    });

    it('should return top N sites when limit specified', async () => {
      const res = await request(app)
        .get('/api/analytics/risk-scores/top')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });
  });
});
```

### 3.2 Saved Views API Tests

```javascript
// tests/integration/api/savedViews.test.js

describe('Saved Views API', () => {
  describe('POST /api/analytics/views', () => {
    it('should create a new saved view', async () => {
      const res = await request(app)
        .post('/api/analytics/views')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Monthly Review',
          filters: {
            dateRange: { preset: 'last30' },
            siteIds: [testSiteId]
          },
          isShared: false
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Monthly Review');
    });

    it('should reject when user has 20 views', async () => {
      // Setup: Create 20 views for user
      const res = await request(app)
        .post('/api/analytics/views')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'View 21', filters: {} });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('maximum');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/analytics/views')
        .set('Authorization', `Bearer ${token}`)
        .send({ filters: {} }); // Missing name

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/analytics/views', () => {
    it('should return user private views', async () => {
      const res = await request(app)
        .get('/api/analytics/views')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should include shared organisation views', async () => {
      // Setup: Create shared view by another user
      const res = await request(app)
        .get('/api/analytics/views')
        .set('Authorization', `Bearer ${token}`);

      // Assert shared view is included
    });
  });

  describe('PUT /api/analytics/views/:id', () => {
    it('should update own view', async () => {
      const res = await request(app)
        .put(`/api/analytics/views/${viewId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    it('should not update another user private view', async () => {
      const res = await request(app)
        .put(`/api/analytics/views/${otherUserViewId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });

    it('should set as default and unset other defaults', async () => {
      // Setup: User has existing default view
      const res = await request(app)
        .put(`/api/analytics/views/${newViewId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isDefault: true });

      expect(res.status).toBe(200);
      // Assert old default is now false
    });
  });

  describe('DELETE /api/analytics/views/:id', () => {
    it('should delete own view', async () => {
      const res = await request(app)
        .delete(`/api/analytics/views/${viewId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('should not delete another user view', async () => {
      const res = await request(app)
        .delete(`/api/analytics/views/${otherUserViewId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
```

---

## 4. Component Testing

### 4.1 KPICard Component

```javascript
// tests/components/KPICard.test.jsx

describe('KPICard', () => {
  it('renders title and value', () => {
    render(<KPICard title="Total Incidents" value={42} trend={5} />);

    expect(screen.getByText('Total Incidents')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows green up arrow for positive improving trend', () => {
    render(<KPICard title="Pass Rate" value="85%" trend={10} trendDirection="up" />);

    const arrow = screen.getByText('↑');
    expect(arrow).toHaveClass('text-green-500');
  });

  it('shows red up arrow for negative worsening trend', () => {
    render(<KPICard title="Incidents" value={42} trend={15} trendDirection="down" />);

    const arrow = screen.getByText('↑');
    expect(arrow).toHaveClass('text-red-500');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<KPICard title="Test" value={1} trend={0} onClick={handleClick} />);

    fireEvent.click(screen.getByText('Test'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### 4.2 FilterPanel Component

```javascript
// tests/components/FilterPanel.test.jsx

describe('FilterPanel', () => {
  it('renders all filter controls', () => {
    render(<FilterPanel sites={mockSites} incidentTypes={mockTypes} />);

    expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
    expect(screen.getByLabelText('Sites')).toBeInTheDocument();
    expect(screen.getByLabelText('Incident Types')).toBeInTheDocument();
    expect(screen.getByLabelText('Severities')).toBeInTheDocument();
  });

  it('calls onFilterChange with debounce', async () => {
    const handleChange = jest.fn();
    render(<FilterPanel onFilterChange={handleChange} />);

    // Rapidly change filter
    fireEvent.change(screen.getByLabelText('Date Range'), { target: { value: 'last30' }});

    // Should not call immediately
    expect(handleChange).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    }, { timeout: 400 });
  });

  it('clears all filters on Clear button click', () => {
    render(<FilterPanel initialFilters={{ siteIds: ['abc'] }} />);

    fireEvent.click(screen.getByText('Clear All'));

    // Assert filters reset
  });
});
```

### 4.3 TimeSeriesChart Component

```javascript
// tests/components/TimeSeriesChart.test.jsx

describe('TimeSeriesChart', () => {
  const mockData = [
    { month: '2026-01', count: 10 },
    { month: '2026-02', count: 15 }
  ];

  it('renders chart with data', () => {
    render(<TimeSeriesChart data={mockData} />);

    // Recharts renders SVG
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<TimeSeriesChart data={[]} loading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<TimeSeriesChart data={[]} loading={false} />);

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('calls onBarClick when bar clicked', () => {
    const handleClick = jest.fn();
    render(<TimeSeriesChart data={mockData} onBarClick={handleClick} />);

    // Simulate bar click (Recharts specific)
    // This may require finding the bar element in SVG
  });
});
```

---

## 5. End-to-End Testing

### 5.1 Analytics Dashboard E2E

```javascript
// tests/e2e/analytics.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'manager@test.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should load analytics page with KPIs', async ({ page }) => {
    await page.click('text=Analytics');
    await page.waitForURL('/analytics');

    // Verify KPI cards loaded
    await expect(page.locator('[data-testid="kpi-total-incidents"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-high-severity"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-open-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-pass-rate"]')).toBeVisible();
  });

  test('should filter by date range', async ({ page }) => {
    await page.goto('/analytics');

    await page.selectOption('[data-testid="date-range-select"]', 'last30');
    await page.waitForResponse(resp => resp.url().includes('/api/analytics/summary'));

    // Verify charts updated
    await expect(page.locator('[data-testid="incidents-chart"]')).toBeVisible();
  });

  test('should filter by site', async ({ page }) => {
    await page.goto('/analytics');

    await page.click('[data-testid="site-filter"]');
    await page.click('text=Warehouse A');

    await page.waitForResponse(resp => resp.url().includes('/api/analytics/summary'));

    // Verify filtered results
  });

  test('should drill down from KPI card', async ({ page }) => {
    await page.goto('/analytics');

    await page.click('[data-testid="kpi-open-actions"]');

    await expect(page).toHaveURL(/\/actions.*status=open/);
  });

  test('should drill down from chart bar', async ({ page }) => {
    await page.goto('/analytics');

    // Click on a specific bar in the chart
    await page.click('[data-testid="incidents-chart"] .recharts-bar-rectangle >> nth=0');

    await expect(page).toHaveURL(/\/incidents/);
  });
});
```

### 5.2 Risk Scores E2E

```javascript
// tests/e2e/riskScores.spec.ts

test.describe('Risk Scores', () => {
  test('should display top high-risk sites widget', async ({ page }) => {
    await page.goto('/analytics');

    const widget = page.locator('[data-testid="top-risk-sites"]');
    await expect(widget).toBeVisible();

    // Verify shows up to 5 sites
    const rows = widget.locator('[data-testid="risk-site-row"]');
    await expect(rows).toHaveCount({ max: 5 });
  });

  test('should show risk category colours', async ({ page }) => {
    await page.goto('/analytics');

    // Verify category badge colours
    await expect(page.locator('.risk-category-critical')).toHaveCSS('background-color', /red/);
    await expect(page.locator('.risk-category-high')).toHaveCSS('background-color', /orange/);
  });

  test('should show risk score tooltip with formula', async ({ page }) => {
    await page.goto('/analytics');

    await page.hover('[data-testid="risk-score-info-icon"]');

    await expect(page.locator('[role="tooltip"]')).toContainText('formula');
  });

  test('should navigate to incidents when clicking risk site', async ({ page }) => {
    await page.goto('/analytics');

    await page.click('[data-testid="risk-site-row"] >> nth=0');

    await expect(page).toHaveURL(/\/incidents.*siteId=/);
  });
});
```

### 5.3 Saved Views E2E

```javascript
// tests/e2e/savedViews.spec.ts

test.describe('Saved Views', () => {
  test('should save current view', async ({ page }) => {
    await page.goto('/analytics');

    // Apply some filters
    await page.selectOption('[data-testid="date-range-select"]', 'last90');
    await page.click('[data-testid="site-filter"]');
    await page.click('text=Factory B');

    // Save view
    await page.click('[data-testid="save-view-btn"]');
    await page.fill('[name="viewName"]', 'Q1 Factory Report');
    await page.click('button:has-text("Save")');

    // Verify saved
    await expect(page.locator('[data-testid="saved-views-dropdown"]')).toContainText('Q1 Factory Report');
  });

  test('should load saved view', async ({ page }) => {
    await page.goto('/analytics');

    await page.click('[data-testid="saved-views-dropdown"]');
    await page.click('text=Q1 Factory Report');

    // Verify filters applied
    await expect(page.locator('[data-testid="date-range-select"]')).toHaveValue('last90');
    await expect(page.locator('[data-testid="current-view-indicator"]')).toContainText('Q1 Factory Report');
  });

  test('should delete saved view', async ({ page }) => {
    await page.goto('/analytics');

    await page.click('[data-testid="manage-views-btn"]');
    await page.click('[data-testid="delete-view-btn"]');
    await page.click('button:has-text("Confirm")');

    // Verify deleted
    await expect(page.locator('[data-testid="saved-views-dropdown"]')).not.toContainText('Q1 Factory Report');
  });

  test('should set default view', async ({ page }) => {
    await page.goto('/analytics');

    await page.click('[data-testid="manage-views-btn"]');
    await page.click('[data-testid="set-default-btn"]');

    // Navigate away and back
    await page.goto('/dashboard');
    await page.click('text=Analytics');

    // Verify default view auto-loaded
    await expect(page.locator('[data-testid="current-view-indicator"]')).toBeVisible();
  });
});
```

### 5.4 PDF Report E2E

```javascript
// tests/e2e/pdfReport.spec.ts

test.describe('PDF Report Generation', () => {
  test('should generate and download PDF report', async ({ page }) => {
    await page.goto('/analytics');

    // Start download listener
    const downloadPromise = page.waitForEvent('download');

    await page.click('[data-testid="generate-pdf-btn"]');

    // Wait for loading to complete
    await expect(page.locator('[data-testid="pdf-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="pdf-loading"]')).toBeHidden({ timeout: 60000 });

    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/analytics-report.*\.pdf/);
  });

  test('should show loading indicator during generation', async ({ page }) => {
    await page.goto('/analytics');

    await page.click('[data-testid="generate-pdf-btn"]');

    await expect(page.locator('[data-testid="pdf-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="pdf-loading"]')).toContainText(/generating/i);
  });
});
```

---

## 6. Performance Testing

### 6.1 Load Time Tests

```javascript
// tests/performance/analyticsLoad.test.js

describe('Analytics Dashboard Load Performance', () => {
  it('should load within 2 seconds for < 1000 incidents', async () => {
    // Setup: Seed database with 500 incidents
    const startTime = Date.now();

    await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${token}`);

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  it('should load within 5 seconds for 1000-10000 incidents', async () => {
    // Setup: Seed database with 5000 incidents
    const startTime = Date.now();

    await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${token}`);

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });

  it('should load within 10 seconds for 10000-50000 incidents', async () => {
    // Setup: Seed database with 30000 incidents
    const startTime = Date.now();

    await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${token}`);

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
  });
});
```

### 6.2 K6 Load Test Script

```javascript
// tests/performance/k6/analytics-load.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
  },
};

export default function () {
  const token = __ENV.AUTH_TOKEN;

  const res = http.get('http://localhost:3001/api/analytics/summary', {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  sleep(1);
}
```

---

## 7. Security Testing

### 7.1 Multi-Tenant Isolation

```javascript
// tests/security/multiTenant.test.js

describe('Multi-Tenant Data Isolation', () => {
  let orgAToken, orgBToken;

  beforeAll(async () => {
    // Get tokens for users in different orgs
  });

  it('should not return other org incidents in summary', async () => {
    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${orgAToken}`);

    // Verify counts match only Org A data
    // Cross-reference with direct database query
  });

  it('should not return other org risk scores', async () => {
    const res = await request(app)
      .get('/api/analytics/risk-scores')
      .set('Authorization', `Bearer ${orgAToken}`);

    const siteIds = res.body.data.map(s => s.site_id);
    // Verify all sites belong to Org A
  });

  it('should not access other org saved views', async () => {
    // Create view in Org B
    const orgBView = await createViewForOrgB();

    // Try to access from Org A
    const res = await request(app)
      .get(`/api/analytics/views/${orgBView.id}`)
      .set('Authorization', `Bearer ${orgAToken}`);

    expect(res.status).toBe(404);
  });
});
```

### 7.2 Authorization Tests

```javascript
// tests/security/authorization.test.js

describe('Analytics Authorization', () => {
  it('should require authentication for all analytics endpoints', async () => {
    const endpoints = [
      '/api/analytics/summary',
      '/api/analytics/incidents/time-series',
      '/api/analytics/risk-scores',
      '/api/analytics/views'
    ];

    for (const endpoint of endpoints) {
      const res = await request(app).get(endpoint);
      expect(res.status).toBe(401);
    }
  });

  it('should allow worker to view analytics (read-only)', async () => {
    const res = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
  });

  it('should allow manager to save views', async () => {
    const res = await request(app)
      .post('/api/analytics/views')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Test View', filters: {} });

    expect(res.status).toBe(201);
  });
});
```

---

## 8. Test Data Requirements

### 8.1 Seed Data for Testing

```javascript
// tests/fixtures/analyticsTestData.js

export const analyticsTestData = {
  organisations: [
    { id: 'org-a', name: 'Test Org A' },
    { id: 'org-b', name: 'Test Org B' }
  ],

  sites: [
    { id: 'site-1', name: 'Warehouse A', organisation_id: 'org-a' },
    { id: 'site-2', name: 'Factory B', organisation_id: 'org-a' },
    { id: 'site-3', name: 'Office C', organisation_id: 'org-b' }
  ],

  incidents: [
    // Generate 100+ incidents with varied:
    // - Dates (spanning 12 months)
    // - Sites
    // - Severities (low, medium, high, critical)
    // - Types
    // - Organisations
  ],

  inspections: [
    // Generate 50+ inspections with:
    // - Pass and fail results
    // - Varied dates
    // - Different sites
  ],

  actions: [
    // Generate 30+ actions with:
    // - Open, completed, overdue statuses
    // - Varied due dates
  ]
};
```

---

## 9. Test Execution Plan

### 9.1 CI/CD Pipeline

```yaml
# .github/workflows/test-phase5.yml

name: Phase 5 Tests

on:
  push:
    branches: [main, phase-5/*]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run migrate:test
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:perf
```

---

## 10. Test Sign-Off Checklist

| Category | Test | Status |
|----------|------|--------|
| **Unit Tests** | | |
| | AnalyticsService tests pass | ☐ |
| | RiskScoreService tests pass | ☐ |
| | AggregationService tests pass | ☐ |
| | All unit tests > 90% coverage | ☐ |
| **Integration Tests** | | |
| | Analytics API tests pass | ☐ |
| | Saved Views API tests pass | ☐ |
| | Risk Score API tests pass | ☐ |
| **Component Tests** | | |
| | KPICard tests pass | ☐ |
| | FilterPanel tests pass | ☐ |
| | Chart components tests pass | ☐ |
| **E2E Tests** | | |
| | Analytics dashboard loads | ☐ |
| | Filters work correctly | ☐ |
| | Drill-down navigation works | ☐ |
| | Saved views CRUD works | ☐ |
| | PDF generation works | ☐ |
| **Performance Tests** | | |
| | < 1k incidents: < 2s load | ☐ |
| | 1k-10k incidents: < 5s load | ☐ |
| | 10k-50k incidents: < 10s load | ☐ |
| | Load test passes thresholds | ☐ |
| **Security Tests** | | |
| | Multi-tenant isolation verified | ☐ |
| | Authorization tests pass | ☐ |
| | No cross-org data leakage | ☐ |

---

## 11. Defect Classification

| Severity | Description | Example |
|----------|-------------|---------|
| Critical | Feature completely broken | Analytics page doesn't load |
| High | Major feature not working | Risk scores not calculating |
| Medium | Feature works with issues | Incorrect trend calculation |
| Low | Minor issues | Tooltip text typo |
| Cosmetic | Visual only | Chart colour slightly off |

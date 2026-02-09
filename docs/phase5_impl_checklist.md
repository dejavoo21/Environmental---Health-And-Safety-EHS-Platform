# Phase 5 Implementation Checklist
## Analytics & Insights

Use this checklist to track implementation progress for Phase 5.

---

## Stage 5.1 - Database & Aggregation

### Database Migration
- [x] **C-135-DB-01** Create migration file `005_phase5_analytics.sql`
- [x] **C-135-DB-02** Create `analytics_daily_summary` table
- [x] **C-135-DB-03** Create `site_risk_scores` table
- [x] **C-135-DB-04** Create `site_risk_score_history` table
- [x] **C-135-DB-05** Create `saved_views` table
- [x] **C-135-DB-06** Add indexes for analytics queries
- [ ] **C-135-DB-07** Run migration on development environment
- [ ] **C-135-DB-08** Run migration on test environment

### Aggregation Service
- [x] **C-135-AGG-01** Create `services/AggregationService.js`
- [x] **C-135-AGG-02** Implement `runDailyAggregation()` method
- [x] **C-135-AGG-03** Implement `aggregateOrganisation()` method
- [x] **C-135-AGG-04** Implement `aggregateIncidents()` helper
- [x] **C-135-AGG-05** Implement `aggregateInspections()` helper
- [x] **C-135-AGG-06** Implement `aggregateActions()` helper
- [x] **C-135-AGG-07** Add error handling and logging
- [x] **C-135-AGG-08** Register aggregation job in scheduler (02:00 UTC)
- [x] **C-135-AGG-09** Write unit tests for AggregationService
- [x] **C-135-AGG-10** Test aggregation with sample data

---

## Stage 5.2 - Analytics APIs

### Routes & Controllers
- [x] **C-120-API-01** Create `routes/analytics.js`
- [x] **C-120-API-02** Create `controllers/analyticsController.js` (logic in routes)
- [x] **C-120-API-03** Register routes in main app

### Summary API
- [x] **C-122-API-01** Implement `GET /api/analytics/summary`
- [x] **C-122-API-02** Calculate total incidents in period
- [x] **C-122-API-03** Calculate % high severity
- [x] **C-122-API-04** Calculate average resolution time
- [x] **C-122-API-05** Calculate open actions count
- [x] **C-122-API-06** Calculate % actions overdue
- [x] **C-122-API-07** Calculate inspection pass rate
- [x] **C-122-API-08** Calculate trend vs previous period for each KPI
- [x] **C-122-API-09** Write unit tests for summary endpoint

### Time-Series APIs
- [x] **C-120-API-04** Implement `GET /api/analytics/incidents/time-series`
- [x] **C-120-API-05** Support groupBy=severity parameter
- [x] **C-120-API-06** Implement `GET /api/analytics/inspections/time-series`
- [x] **C-120-API-07** Implement `GET /api/analytics/actions/time-series`
- [x] **C-120-API-08** Show created vs completed for actions
- [x] **C-120-API-09** Write unit tests for time-series endpoints

### Site Comparison APIs
- [x] **C-121-API-01** Implement `GET /api/analytics/incidents/by-site`
- [x] **C-121-API-02** Implement `GET /api/analytics/incidents/by-type`
- [x] **C-121-API-03** Implement `GET /api/analytics/actions/overdue-by-site`
- [x] **C-121-API-04** Implement `GET /api/analytics/inspections/by-site`
- [x] **C-121-API-05** Add sorting options (value, alphabetical)
- [x] **C-121-API-06** Limit to 20 sites, group remainder as "Other"
- [x] **C-121-API-07** Write unit tests for site comparison endpoints

### Analytics Service
- [x] **C-120-SVC-01** Create `services/AnalyticsService.js`
- [x] **C-120-SVC-02** Implement hybrid query (aggregated + live)
- [x] **C-120-SVC-03** Implement filter handling (date, site, type, severity)
- [x] **C-120-SVC-04** Add organisation scoping to all queries
- [x] **C-120-SVC-05** Write unit tests for AnalyticsService

---

## Stage 5.3 - Risk Scoring

### Risk Score Service
- [x] **C-124-RSK-01** Create `services/RiskScoreService.js`
- [x] **C-124-RSK-02** Implement `calculateSiteRiskScore()` method
- [x] **C-124-RSK-03** Implement incident score calculation with weights
- [x] **C-124-RSK-04** Implement action score calculation
- [x] **C-124-RSK-05** Implement inspection score calculation
- [x] **C-124-RSK-06** Implement category assignment (low/medium/high/critical)
- [x] **C-124-RSK-07** Implement primary factor detection
- [x] **C-124-RSK-08** Implement `calculateAllSiteScores()` method
- [x] **C-124-RSK-09** Store risk history on calculation
- [x] **C-124-RSK-10** Register risk calculation job (03:00 UTC)
- [x] **C-124-RSK-11** Write unit tests for RiskScoreService

### Risk Score APIs
- [x] **C-125-API-01** Implement `GET /api/analytics/risk-scores`
- [x] **C-125-API-02** Implement `GET /api/analytics/risk-scores/top?limit=5`
- [x] **C-125-API-03** Implement `GET /api/analytics/risk-scores/:siteId`
- [x] **C-125-API-04** Include trend data from history
- [x] **C-125-API-05** Write unit tests for risk score endpoints

---

## Stage 5.4 - Saved Views API

### Saved Views CRUD
- [x] **C-128-VW-01** Create saved views routes (add to analytics routes)
- [x] **C-128-VW-02** Implement `GET /api/analytics/views`
- [x] **C-128-VW-03** Return user's private views + org shared views
- [x] **C-129-VW-01** Implement `POST /api/analytics/views`
- [x] **C-129-VW-02** Validate required fields (name, filters)
- [x] **C-129-VW-03** Enforce max 20 views per user
- [x] **C-130-VW-01** Implement `PUT /api/analytics/views/:id`
- [x] **C-130-VW-02** Only allow owner to update private view
- [x] **C-130-VW-03** Implement default view logic (unset others)
- [x] **C-130-VW-04** Implement `DELETE /api/analytics/views/:id`
- [x] **C-130-VW-05** Only allow owner to delete
- [x] **C-128-VW-04** Write unit tests for saved views API

---

## Stage 5.5 - Frontend Analytics Dashboard

### Setup
- [x] **C-120-FE-01** Install Recharts library (already in package.json v3.6.0)
- [x] **C-120-FE-02** Install date-fns (already available)
- [x] **C-120-FE-03** Create `src/pages/AnalyticsPage.jsx`
- [x] **C-120-FE-04** Add Analytics route to router
- [x] **C-120-FE-05** Add Analytics link to navigation

### State Management
- [x] **C-123-FE-01** Create `src/context/AnalyticsContext.jsx`
- [x] **C-123-FE-02** Implement filter state management
- [x] **C-123-FE-03** Implement data fetching hooks
- [x] **C-123-FE-04** (Merged into AnalyticsContext)
- [x] **C-123-FE-05** (Merged into AnalyticsContext)

### API Service
- [x] **C-120-FE-06** API calls integrated in AnalyticsContext
- [x] **C-120-FE-07** Implement `getSummary()` method
- [x] **C-120-FE-08** Implement `getIncidentTimeSeries()` method
- [x] **C-120-FE-09** Implement `getIncidentsBySite()` method
- [x] **C-120-FE-10** Implement `getRiskScores()` method
- [x] **C-120-FE-11** Implement `getViews()`, `saveView()`, etc.

### Filter Panel
- [x] **C-123-FE-06** Create `src/components/analytics/FilterPanel.jsx`
- [x] **C-123-FE-07** Implement date range selector (presets + custom)
- [x] **C-123-FE-08** Implement site multi-select
- [x] **C-123-FE-09** Implement incident type multi-select
- [x] **C-123-FE-10** Implement severity multi-select
- [x] **C-123-FE-11** Implement Clear All button
- [x] **C-123-FE-12** Implement filter debouncing (300ms)
- [x] **C-123-FE-13** Implement URL sync for filters
- [x] **C-123-FE-14** Write tests for FilterPanel

### KPI Cards
- [x] **C-122-FE-01** Create `src/components/analytics/KPICard.jsx`
- [x] **C-122-FE-02** Display title, value, trend arrow, percentage
- [x] **C-122-FE-03** Implement colour coding (green/red/grey)
- [x] **C-122-FE-04** Implement click handler for drill-down
- [x] **C-122-FE-05** KPI grid integrated in AnalyticsPage
- [x] **C-122-FE-06** Display all 6 KPI cards in grid
- [x] **C-122-FE-07** Write tests for KPICard

### Charts
- [x] **C-120-FE-12** Create `src/components/analytics/TimeSeriesChart.jsx`
- [x] **C-120-FE-13** Implement stacked bar chart for incidents
- [x] **C-120-FE-14** Implement line chart for actions created/completed
- [x] **C-120-FE-15** Add hover tooltips with values
- [x] **C-120-FE-16** Add click handlers for drill-down
- [x] **C-121-FE-01** Create `src/components/analytics/SiteComparisonChart.jsx`
- [x] **C-121-FE-02** Implement horizontal bar chart
- [x] **C-121-FE-03** Add sorting toggle (value/alphabetical)
- [x] **C-121-FE-04** Add click handlers for drill-down
- [x] **C-121-FE-05** Write tests for chart components

### Loading & Empty States
- [x] **C-134-FE-01** Add loading spinner for charts
- [x] **C-134-FE-02** Add loading skeleton for KPI cards
- [x] **C-134-FE-03** Add empty state message for no data
- [x] **C-134-FE-04** Add error state handling

---

## Stage 5.6 - Frontend Risk Widgets

### Risk Score Widget
- [x] **C-125-FE-01** Create `src/components/analytics/RiskWidget.jsx`
- [x] **C-125-FE-02** Display site name, score, category badge
- [x] **C-125-FE-03** Add category colour coding
- [x] **C-125-FE-04** Display primary factor
- [x] **C-125-FE-05** Display trend arrow vs previous period
- [x] **C-125-FE-06** Add click handler for drill-down
- [x] **C-125-FE-07** Add "View All" link (navigates to incidents filtered by site)
- [x] **C-125-FE-08** Write tests for RiskWidget

### Top Incident Types Widget
- [x] **C-126-FE-01** Create `src/components/analytics/RiskWidget.jsx` (IncidentTypesWidget export)
- [x] **C-126-FE-02** Display type name, count, percentage (bar chart)
- [x] **C-126-FE-03** Display relative bar widths
- [x] **C-126-FE-04** Add click handler for drill-down
- [x] **C-126-FE-05** Write tests for IncidentTypesWidget

### Risk Score Transparency
- [x] **C-127-FE-01** Add info icon next to risk scores
- [x] **C-127-FE-02** Implement tooltip with formula explanation
- [x] **C-127-FE-03** Add score breakdown display (expandable)
- [x] **C-127-FE-04** Write tests for transparency features

---

## Stage 5.7 - Saved Views UI

### Saved Views Dropdown
- [x] **C-129-FE-01** Create `src/components/analytics/SavedViewsDropdown.jsx`
- [x] **C-129-FE-02** List user's saved views + shared views
- [x] **C-129-FE-03** Indicate default view with badge
- [x] **C-129-FE-04** Show "Currently viewing" indicator
- [x] **C-129-FE-05** Implement load view on selection
- [x] **C-129-FE-06** Write tests for SavedViewsDropdown

### Save View Modal
- [x] **C-128-FE-01** Create `src/components/analytics/SaveViewModal.jsx`
- [x] **C-128-FE-02** Form fields: name, description (optional)
- [x] **C-128-FE-03** Checkbox for shared view
- [x] **C-128-FE-04** Validate name required
- [x] **C-128-FE-05** Show error if max views reached
- [x] **C-128-FE-06** Write tests for SaveViewModal

### Manage Views Modal
- [x] **C-130-FE-01** Create `src/components/analytics/ManageViewsModal.jsx`
- [x] **C-130-FE-02** List all user's views
- [x] **C-130-FE-03** Edit button to rename/update description
- [x] **C-130-FE-04** Delete button with confirmation
- [x] **C-130-FE-05** Set as default toggle
- [x] **C-130-FE-06** Update view filters button
- [x] **C-130-FE-07** Write tests for ManageViewsModal

---

## Stage 5.8 - PDF Generation

### Backend Setup
- [ ] **C-131-PDF-01** Install Puppeteer
- [ ] **C-131-PDF-02** Create `services/ReportService.js`
- [ ] **C-131-PDF-03** Create PDF HTML template

### Report Generation
- [ ] **C-131-PDF-04** Implement `POST /api/analytics/report/pdf`
- [ ] **C-131-PDF-05** Fetch analytics data for current filters
- [ ] **C-131-PDF-06** Generate cover page section
- [ ] **C-131-PDF-07** Generate executive summary section
- [ ] **C-131-PDF-08** Render charts as images
- [ ] **C-131-PDF-09** Generate tables section
- [ ] **C-131-PDF-10** Generate filter summary section
- [ ] **C-131-PDF-11** Convert HTML to PDF via Puppeteer
- [ ] **C-131-PDF-12** Return PDF as file download
- [ ] **C-131-PDF-13** Write tests for ReportService

### Frontend Integration
- [ ] **C-131-FE-01** Add "Generate PDF Report" button
- [ ] **C-131-FE-02** Show loading indicator during generation
- [ ] **C-131-FE-03** Trigger download on completion
- [ ] **C-131-FE-04** Handle errors gracefully
- [ ] **C-131-FE-05** Write tests for PDF button

---

## Stage 5.9 - Drill-Down Navigation

### Chart Click Handlers
- [x] **C-132-DD-01** Add onClick to TimeSeriesChart bars
- [x] **C-132-DD-02** Add onClick to SiteComparisonChart bars
- [x] **C-132-DD-03** Add onClick to KPICard components
- [x] **C-132-DD-04** Add onClick to RiskWidget rows
- [x] **C-132-DD-05** Add onClick to IncidentTypesWidget rows

### Navigation Logic
- [x] **C-132-DD-06** Create drill-down navigation in AnalyticsPage
- [x] **C-132-DD-07** Map chart elements to target URLs
- [x] **C-132-DD-08** Preserve date range in navigation
- [x] **C-132-DD-09** Build query params from chart context

### Target Page Updates
- [ ] **C-132-DD-10** Update IncidentsPage to read URL filters
- [ ] **C-132-DD-11** Update ActionsPage to read URL filters
- [ ] **C-132-DD-12** Update InspectionsPage to read URL filters
- [x] **C-132-DD-13** Navigation uses query params for filtering

### Visual Indicators
- [x] **C-133-DD-01** Add cursor: pointer on hoverable elements
- [x] **C-133-DD-02** Add hover highlight effect on bars
- [x] **C-133-DD-03** Add hover highlight effect on widget items
- [ ] **C-133-DD-04** Write E2E tests for drill-down

---

## Stage 5.10 - Testing & Polish

### Unit Tests
- [ ] **C-TEST-01** All AnalyticsService unit tests pass
- [ ] **C-TEST-02** All RiskScoreService unit tests pass
- [ ] **C-TEST-03** All AggregationService unit tests pass
- [ ] **C-TEST-04** Unit test coverage > 90%

### Integration Tests
- [ ] **C-TEST-05** Analytics API integration tests pass
- [ ] **C-TEST-06** Saved Views API integration tests pass
- [ ] **C-TEST-07** Risk Scores API integration tests pass

### Component Tests
- [x] **C-TEST-08** KPICard component tests pass (KPICard.test.jsx)
- [x] **C-TEST-09** FilterPanel component tests pass (FilterPanel.test.jsx)
- [x] **C-TEST-10** Chart component tests pass (in AnalyticsPage.test.jsx)
- [x] **C-TEST-11** Widget component tests pass (RiskWidget.test.jsx)
- [x] **C-TEST-12** Modal component tests pass (SavedViewsDropdown.test.jsx)

### E2E Tests
- [ ] **C-TEST-13** Analytics dashboard E2E tests pass
- [ ] **C-TEST-14** Saved views E2E tests pass
- [ ] **C-TEST-15** PDF generation E2E tests pass
- [ ] **C-TEST-16** Drill-down navigation E2E tests pass
- [ ] **C-TEST-17** Risk scores E2E tests pass

### Performance Tests
- [ ] **C-TEST-18** Load time < 2s for < 1k incidents verified
- [ ] **C-TEST-19** Load time < 5s for 1k-10k incidents verified
- [ ] **C-TEST-20** Load time < 10s for 10k-50k incidents verified
- [ ] **C-TEST-21** K6 load test passes thresholds

### Security Tests
- [ ] **C-TEST-22** Multi-tenant isolation verified
- [ ] **C-TEST-23** No cross-org data leakage
- [ ] **C-TEST-24** Auth required for all endpoints verified

### Accessibility
- [ ] **C-A11Y-01** Keyboard navigation works
- [ ] **C-A11Y-02** Screen reader support verified
- [ ] **C-A11Y-03** Colour contrast meets WCAG AA
- [ ] **C-A11Y-04** Focus indicators visible

### Cross-Browser
- [ ] **C-BROWSER-01** Chrome tested and working
- [ ] **C-BROWSER-02** Firefox tested and working
- [ ] **C-BROWSER-03** Edge tested and working

### Responsive Design
- [ ] **C-RESP-01** Mobile viewport (375px) tested
- [ ] **C-RESP-02** Tablet viewport (768px) tested
- [ ] **C-RESP-03** Desktop viewport (1280px) tested

### Documentation
- [ ] **C-DOC-01** API documentation updated
- [ ] **C-DOC-02** User guide for analytics updated
- [ ] **C-DOC-03** Admin guide for scheduled jobs updated
- [ ] **C-DOC-04** Risk score methodology documented

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Tech Lead | | | |
| QA Lead | | | |
| Product Owner | | | |

---

## Notes

- All items prefixed with capability ID from BRD (e.g., C-120 = Time-Series Charts)
- Mark items with [x] when complete
- Add notes for any blockers or changes
- Update daily during implementation

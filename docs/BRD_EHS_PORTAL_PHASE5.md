# Business Requirements Document – EHS Portal Phase 5
## Analytics & Insights

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-02 |
| Status | Draft |
| Phase | 5 – Analytics & Insights |

---

## 1. Executive Summary

Phase 5 transforms the EHS Portal into a competitive analytics platform by adding advanced dashboards, risk insights, and data-driven decision support. Building on the operational foundation of Phases 1-4, this phase enables organisations to identify safety hotspots, benchmark site performance, and generate board-ready reports.

### 1.1 Business Context

With Phases 1-4 complete, the EHS Portal effectively captures and manages incidents, inspections, actions, and notifications. However, extracting strategic insights requires:

- **Manual analysis:** Users must export data to Excel for trend analysis
- **No risk visibility:** No systematic way to identify high-risk sites
- **Static views:** Each user starts fresh; no saved configurations
- **Limited drill-down:** Charts on dashboard don't link to underlying data

Phase 5 addresses these gaps with a comprehensive analytics and insights framework.

### 1.2 Business Goals

| Goal ID | Goal | Success Metric |
|---------|------|----------------|
| G-P5-01 | Enable data-driven safety decisions | 80% of managers use analytics weekly |
| G-P5-02 | Identify high-risk sites proactively | Risk scores calculated for 100% of sites |
| G-P5-03 | Reduce time to generate board reports | < 5 minutes to generate board pack |
| G-P5-04 | Improve incident response targeting | 30% reduction in repeat incidents at flagged sites |
| G-P5-05 | Enable self-service analytics | Users can save and reuse custom views |

### 1.3 Scope

**In Scope:**
- Advanced analytics dashboard with time-series charts
- Site performance comparison and benchmarking
- Simple, transparent risk scoring for sites
- Saved views (filter configurations)
- Drill-down from charts to detailed lists
- KPI cards with trend indicators
- PDF analytics report generation (board pack)

**Out of Scope:**
- Predictive analytics / ML-based forecasting – future phase
- Real-time streaming analytics
- Custom report builder with drag-and-drop
- External BI tool integration (Power BI, Tableau connectors)
- Mobile-specific analytics views

---

## 2. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Managers | Primary analytics users | Monitor site performance, identify issues |
| Admins | System administrators | Configure thresholds, manage views |
| Compliance Lead | Senior oversight | Generate board reports, track trends |
| HSE Director | Executive sponsor | Strategic decisions based on risk insights |
| Workers | Limited access | View simplified dashboard (optional) |

---

## 3. Business Requirements

### 3.1 Analytics Dashboard (BR-ANALYTICS)

#### BR-ANALYTICS-01: Time-Series Charts
**Priority:** Must Have

The system shall provide time-series visualisations showing:
1. **Incidents per month** - Stacked by severity (low/medium/high/critical)
2. **Inspections per month** - Completed inspections count
3. **Actions per month** - Created vs Completed comparison

**Acceptance Criteria:**
- Charts display data for configurable date range (default: 12 months)
- Hovering shows exact values for each data point
- Charts update based on applied filters
- Y-axis scales appropriately to data range
- Empty months show zero (continuous timeline)

**Capability ID:** C-120

---

#### BR-ANALYTICS-02: Site Comparison Charts
**Priority:** Must Have

The system shall provide site-level comparison visualisations:
1. **Incidents by site** - Bar chart, filterable by severity/type
2. **Overdue actions by site** - Bar chart showing backlog distribution
3. **Inspection pass/fail rate by site** - Stacked bar or percentage chart

**Acceptance Criteria:**
- Charts sortable by value (highest first) or alphabetically
- Clicking a bar drills down to site-specific list
- All charts respect date range filter
- Maximum 20 sites displayed; others grouped as "Other"

**Capability ID:** C-121

---

#### BR-ANALYTICS-03: KPI Cards with Trends
**Priority:** Must Have

The system shall display KPI cards showing:

| KPI | Description | Trend Indicator |
|-----|-------------|-----------------|
| Total Incidents | Count in selected period | vs previous period |
| % High Severity | High+Critical / Total incidents | vs previous period |
| Avg Resolution Time | Days from creation to closure (incidents) | vs previous period |
| Open Actions | Currently open action count | vs 30 days ago |
| % Actions Overdue | Overdue / Total open actions | vs previous period |
| Inspection Pass Rate | Pass / Total inspections | vs previous period |

**Acceptance Criteria:**
- Each card shows current value and trend arrow (up/down/neutral)
- Trend compares current period to equivalent previous period
- Cards are clickable to drill down to relevant list
- Colour coding: green (improving), red (worsening), grey (neutral)

**Capability ID:** C-122

---

#### BR-ANALYTICS-04: Analytics Filters
**Priority:** Must Have

The analytics dashboard shall support filtering by:
- **Date range:** Preset (Last 30/90/365 days, This Year, Custom)
- **Site(s):** Multi-select
- **Incident type:** Multi-select
- **Severity:** Multi-select
- **Organisation:** Auto-filtered by user's org (multi-tenant)

**Acceptance Criteria:**
- Filters persist during session
- "Clear All" resets to defaults
- Filter changes trigger immediate chart/KPI refresh
- URL updates to reflect filters (shareable links)

**Capability ID:** C-123

---

### 3.2 Risk & Performance Insights (BR-RISK)

#### BR-RISK-01: Site Risk Score Calculation
**Priority:** Must Have

The system shall calculate a risk score for each site based on:

**Risk Score Formula:**
```
Risk Score = (Incidents_Critical × 10) + (Incidents_High × 5) + (Incidents_Medium × 2) + (Incidents_Low × 1)
           + (Overdue_Actions × 3)
           + (Failed_Inspections × 2)
```

**Time Window:** Rolling 90 days (configurable per organisation)

**Risk Categories:**
| Score Range | Category | Colour |
|-------------|----------|--------|
| 0-10 | Low | Green |
| 11-30 | Medium | Yellow |
| 31-50 | High | Orange |
| 51+ | Critical | Red |

**Acceptance Criteria:**
- Risk scores calculated nightly (batch job) or on-demand
- Formula and weights documented and visible to users
- Category thresholds configurable per organisation
- Score history retained for trending

**Capability ID:** C-124

---

#### BR-RISK-02: Top High-Risk Sites Widget
**Priority:** Must Have

The analytics dashboard shall display a "Top 5 High-Risk Sites" widget showing:
- Site name
- Current risk score
- Risk category (with colour indicator)
- Primary contributing factor (e.g., "7 high-severity incidents")
- Trend arrow (score change from previous period)

**Acceptance Criteria:**
- Sites sorted by risk score descending
- Clicking site navigates to site-filtered incident list
- Widget respects date range filter
- "View All" link to full site risk ranking

**Capability ID:** C-125

---

#### BR-RISK-03: Top Recurring Incident Types Widget
**Priority:** Must Have

The analytics dashboard shall display "Top 5 Incident Types" in the selected period:
- Incident type name
- Count of incidents
- Percentage of total
- Trend vs previous period

**Acceptance Criteria:**
- Types sorted by count descending
- Clicking type drills down to filtered incident list
- Widget respects all analytics filters
- Excludes types with zero incidents

**Capability ID:** C-126

---

#### BR-RISK-04: Risk Score Transparency
**Priority:** Should Have

The system shall provide:
- Help tooltip explaining risk score formula
- Breakdown of score components for each site
- Link to documentation explaining the methodology

**Acceptance Criteria:**
- Users can see how a site's score was calculated
- No "black box" scoring
- Admin can view and adjust weights (future enhancement)

**Capability ID:** C-127

---

### 3.3 Saved Views / Board Pack (BR-VIEWS)

#### BR-VIEWS-01: Save Analytics View
**Priority:** Must Have

Managers and admins shall be able to save the current analytics filter configuration as a named view:
- View name (e.g., "Monthly Board Review")
- Description (optional)
- Saved filters (date range, sites, types, severities)
- Visibility: Private (user only) or Shared (org-wide)

**Acceptance Criteria:**
- Save button available on analytics page
- Saved views listed in dropdown for quick access
- Maximum 20 saved views per user
- Shared views visible to all org users

**Capability ID:** C-128

---

#### BR-VIEWS-02: Load Saved View
**Priority:** Must Have

Users shall be able to load a saved view:
1. Select view from dropdown
2. All filters automatically applied
3. Charts and KPIs refresh with saved configuration

**Acceptance Criteria:**
- Loading view takes < 2 seconds
- View can be modified after loading (not locked)
- "Currently viewing: [View Name]" indicator shown

**Capability ID:** C-129

---

#### BR-VIEWS-03: Manage Saved Views
**Priority:** Must Have

Users shall be able to:
- Rename saved views
- Update filters for existing view
- Delete saved views
- Set a view as "default" (loads on analytics page open)

**Acceptance Criteria:**
- Manage views accessible from analytics page
- Delete requires confirmation
- Default view marked with star icon

**Capability ID:** C-130

---

#### BR-VIEWS-04: PDF Analytics Report (Board Pack)
**Priority:** Should Have

Users shall be able to generate a PDF report containing:
1. **Cover page:** Organisation name, report period, generated date
2. **Executive summary:** KPI values and trends
3. **Charts:** Incidents over time, site comparison, risk scores
4. **Tables:** Top 5 high-risk sites, Top 5 incident types
5. **Filter summary:** What filters were applied

**Acceptance Criteria:**
- PDF generated within 30 seconds
- Charts rendered as images in PDF
- File size < 5MB for typical report
- Professional formatting suitable for board presentation

**Capability ID:** C-131

---

### 3.4 Drill-Down Navigation (BR-DRILL)

#### BR-DRILL-01: Chart Drill-Down to List
**Priority:** Must Have

Clicking on chart elements shall navigate to relevant filtered lists:

| Chart Element | Navigates To | Filters Applied |
|---------------|--------------|-----------------|
| Incidents by month (bar segment) | Incidents list | Month, Severity |
| Incidents by site (bar) | Incidents list | Site |
| Actions created/completed (line point) | Actions list | Month, Status |
| Inspection pass/fail by site | Inspections list | Site, Result |
| KPI card (e.g., Open Actions) | Actions list | Status = Open |
| High-risk site (widget row) | Incidents list | Site, Date range |
| Top incident type (widget row) | Incidents list | Type |

**Acceptance Criteria:**
- Navigation preserves date range filter from analytics
- Target list opens with filters pre-applied
- Back button returns to analytics page
- URL reflects drill-down filters (bookmarkable)

**Capability ID:** C-132

---

#### BR-DRILL-02: Contextual Drill-Down Indicators
**Priority:** Should Have

Charts and widgets shall indicate drill-down capability:
- Cursor changes to pointer on hoverable elements
- Tooltip shows "Click to view details"
- Visual highlight on hover

**Acceptance Criteria:**
- Consistent drill-down behaviour across all charts
- Clear visual affordance for clickable elements

**Capability ID:** C-133

---

### 3.5 Performance Requirements (BR-PERF)

#### BR-PERF-01: Analytics Dashboard Load Time
**Priority:** Must Have

The analytics dashboard shall load within acceptable time:

| Data Volume | Target Load Time |
|-------------|------------------|
| < 1,000 incidents | < 2 seconds |
| 1,000-10,000 incidents | < 5 seconds |
| 10,000-50,000 incidents | < 10 seconds |
| > 50,000 incidents | < 15 seconds (with progress indicator) |

**Acceptance Criteria:**
- Loading spinner shown during data fetch
- Charts render progressively if possible
- Performance logged for monitoring

**Capability ID:** C-134

---

#### BR-PERF-02: Pre-Aggregation Strategy
**Priority:** Should Have

To support large data volumes, the system may use pre-aggregated summary tables:
- Daily aggregates by site, type, severity
- Refreshed nightly via scheduled job
- Real-time queries fall back to operational tables for recent data

**Acceptance Criteria:**
- Aggregation job completes within 30 minutes
- Dashboard uses aggregates where appropriate
- Recent data (last 24 hours) from live tables

**Capability ID:** C-135

---

## 4. Capability-to-Requirement Mapping

| Capability ID | Capability Name | Business Requirement |
|---------------|-----------------|---------------------|
| C-120 | Time-Series Charts | BR-ANALYTICS-01 |
| C-121 | Site Comparison Charts | BR-ANALYTICS-02 |
| C-122 | KPI Cards with Trends | BR-ANALYTICS-03 |
| C-123 | Analytics Filters | BR-ANALYTICS-04 |
| C-124 | Site Risk Score Calculation | BR-RISK-01 |
| C-125 | Top High-Risk Sites Widget | BR-RISK-02 |
| C-126 | Top Recurring Incident Types Widget | BR-RISK-03 |
| C-127 | Risk Score Transparency | BR-RISK-04 |
| C-128 | Save Analytics View | BR-VIEWS-01 |
| C-129 | Load Saved View | BR-VIEWS-02 |
| C-130 | Manage Saved Views | BR-VIEWS-03 |
| C-131 | PDF Analytics Report | BR-VIEWS-04 |
| C-132 | Chart Drill-Down to List | BR-DRILL-01 |
| C-133 | Contextual Drill-Down Indicators | BR-DRILL-02 |
| C-134 | Analytics Dashboard Load Time | BR-PERF-01 |
| C-135 | Pre-Aggregation Strategy | BR-PERF-02 |

---

## 5. Risk Score Methodology

### 5.1 Formula Explanation

The site risk score provides a simple, weighted measure of safety performance:

```
Risk Score = Incident Score + Action Score + Inspection Score

Where:
  Incident Score = (Critical × 10) + (High × 5) + (Medium × 2) + (Low × 1)
  Action Score   = Overdue Actions × 3
  Inspection Score = Failed Inspections × 2
```

### 5.2 Rationale for Weights

| Factor | Weight | Rationale |
|--------|--------|-----------|
| Critical Incident | 10 | Potential fatality or severe harm |
| High Incident | 5 | Significant injury risk |
| Medium Incident | 2 | Moderate concern |
| Low Incident | 1 | Minor issue |
| Overdue Action | 3 | Indicates unaddressed risk |
| Failed Inspection | 2 | Systemic compliance gap |

### 5.3 Example Calculation

**Site: Warehouse A (Last 90 days)**
- Incidents: 0 critical, 2 high, 5 medium, 10 low
- Overdue Actions: 4
- Failed Inspections: 2

```
Incident Score = (0×10) + (2×5) + (5×2) + (10×1) = 0 + 10 + 10 + 10 = 30
Action Score = 4 × 3 = 12
Inspection Score = 2 × 2 = 4

Total Risk Score = 30 + 12 + 4 = 46 → Category: High (Orange)
```

### 5.4 Category Thresholds

| Category | Score Range | Action Required |
|----------|-------------|-----------------|
| Low | 0-10 | Monitor |
| Medium | 11-30 | Review and plan improvements |
| High | 31-50 | Prioritise corrective actions |
| Critical | 51+ | Immediate intervention required |

---

## 6. Assumptions and Dependencies

### 6.1 Assumptions

| ID | Assumption |
|----|------------|
| A-P5-01 | Sufficient historical data exists (3+ months) for meaningful analytics |
| A-P5-02 | Users have modern browsers supporting SVG charts (Chrome, Firefox, Edge) |
| A-P5-03 | PDF generation library available (server-side rendering) |
| A-P5-04 | Risk score weights are acceptable starting defaults |
| A-P5-05 | 90-day rolling window is appropriate for risk calculation |

### 6.2 Dependencies

| ID | Dependency | Impact |
|----|------------|--------|
| D-P5-01 | Phase 1-4 data model (incidents, inspections, actions) | Required for all analytics |
| D-P5-02 | Multi-tenant organisation model (Phase 3) | Data isolation in queries |
| D-P5-03 | Scheduled jobs infrastructure (Phase 4) | Risk score aggregation |
| D-P5-04 | Chart library (e.g., Chart.js, Recharts) | Frontend visualisations |
| D-P5-05 | PDF library (e.g., PDFKit, Puppeteer) | Board pack generation |

---

## 7. Constraints

| ID | Constraint | Rationale |
|----|------------|-----------|
| CON-P5-01 | Risk score weights not user-configurable in v1 | Simplify initial implementation |
| CON-P5-02 | Maximum 50,000 records for real-time analytics | Performance threshold |
| CON-P5-03 | PDF reports limited to current filter context | Avoid complex report builder |
| CON-P5-04 | Saved views limited to 20 per user | Storage and UX management |
| CON-P5-05 | Aggregation job runs only at night | Avoid peak-hour database load |

---

## 8. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R-P5-01 | Poor performance with large datasets | Medium | High | Implement aggregation tables, add indexes |
| R-P5-02 | Risk scores misinterpreted by users | Medium | Medium | Clear documentation, help tooltips |
| R-P5-03 | PDF generation timeout | Low | Medium | Async generation with progress indicator |
| R-P5-04 | Chart library compatibility issues | Low | Medium | Test across browsers, fallback options |
| R-P5-05 | Users request configurable weights | High | Low | Document as Phase 5.1 enhancement |

---

## 9. Success Criteria

Phase 5 will be considered successful when:

1. ✅ Analytics dashboard loads within target times for 95% of page views
2. ✅ Risk scores calculated for 100% of sites with activity
3. ✅ 70%+ of managers use analytics at least weekly (based on usage logs)
4. ✅ Saved views feature adopted by 50%+ of managers/admins
5. ✅ PDF board pack generates successfully for all filter combinations
6. ✅ Drill-down navigation works for all chart types
7. ✅ Zero data isolation breaches (multi-tenant security)

---

## 10. Future Enhancements (Phase 5.1+)

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| Configurable risk weights | Admin can adjust weight per factor | Medium |
| Scheduled report delivery | Email PDF reports on schedule | Medium |
| Trend predictions | ML-based incident forecasting | Low |
| Custom dashboards | User-created widget layouts | Low |
| External BI connectors | Power BI / Tableau integration | Low |
| Risk action plans | Link risks to mitigation actions | Medium |

---

## 11. Glossary

| Term | Definition |
|------|------------|
| Analytics Dashboard | Advanced page showing charts, KPIs, and insights |
| Risk Score | Numerical measure of site safety performance |
| Saved View | Persisted filter configuration for reuse |
| Board Pack | PDF report suitable for board/executive presentation |
| Drill-Down | Navigation from summary to detail by clicking chart element |
| Aggregation | Pre-computed summary data for performance |
| KPI | Key Performance Indicator |
| Time-Series | Data points ordered by time for trend visualisation |

---

## 12. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Technical Lead | | | |
| QA Lead | | | |

# Workflows – EHS Portal Phase 5
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

This document defines the key workflows for Phase 5 analytics features, including user interactions, system processes, and scheduled jobs.

---

## 2. User Workflows

### 2.1 WF-P5-01: View Analytics Dashboard

**Trigger:** User opens Analytics page
**Actors:** Manager, Admin

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User opens     │────▶│  Load default   │────▶│  Fetch summary  │
│  /analytics     │     │  or saved view  │     │  from API       │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │  Display KPIs,  │◀────│  Fetch charts   │
                        │  charts, risk   │     │  & risk data    │
                        │  widgets        │     │                 │
                        └─────────────────┘     └─────────────────┘
```

**Steps:**
1. User navigates to `/analytics`
2. System checks for user's default saved view
3. If default view exists, apply its filters; otherwise use defaults
4. System fetches:
   - KPI summary with trends
   - Time-series chart data
   - Site comparison data
   - Risk scores
5. Frontend renders dashboard components
6. User sees fully loaded analytics page

**Postconditions:**
- All charts and KPIs display current data
- Filters panel shows applied filters

---

### 2.2 WF-P5-02: Apply Analytics Filters

**Trigger:** User changes filter values
**Actors:** Manager, Admin

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User modifies  │────▶│  Debounce wait  │────▶│  Validate       │
│  filter value   │     │  (300ms)        │     │  filter values  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │  Re-render      │◀────│  Fetch new      │
                        │  charts & KPIs  │     │  analytics data │
                        │                 │     │                 │
                        └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │                 │
                        │  Update URL     │
                        │  params         │
                        │                 │
                        └─────────────────┘
```

**Steps:**
1. User selects/changes a filter (date range, site, type, severity)
2. System waits 300ms for additional changes (debounce)
3. System validates filter combination
4. System fetches updated analytics data
5. Frontend re-renders affected components
6. URL updates to reflect current filters

**Postconditions:**
- Charts and KPIs reflect filtered data
- URL is shareable with applied filters

---

### 2.3 WF-P5-03: Drill Down from Chart

**Trigger:** User clicks chart element
**Actors:** Manager, Admin

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User clicks    │────▶│  Identify       │────▶│  Build drill-   │
│  chart bar/     │     │  clicked        │     │  down URL with  │
│  point          │     │  element data   │     │  filters        │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │  Display        │◀────│  Navigate to    │
                        │  filtered list  │     │  target page    │
                        │                 │     │  (incidents/    │
                        │                 │     │  actions/etc)   │
                        └─────────────────┘     └─────────────────┘
```

**Steps:**
1. User hovers over chart element, sees tooltip
2. User clicks the element (bar, point, row)
3. System determines drill-down parameters:
   - Chart type → target page
   - Element data → filter values
4. System navigates to target list page
5. Target page loads with pre-applied filters
6. User sees detailed records

**Drill-Down Mapping:**

| Source | Element | Target | Filters |
|--------|---------|--------|---------|
| Incidents by Month | Bar segment | /incidents | Month, Severity |
| Incidents by Site | Bar | /incidents | Site |
| Actions Created/Completed | Point | /actions | Month, Status |
| Top Risk Sites | Row | /incidents | Site |
| Top Incident Types | Row | /incidents | Type |
| Open Actions KPI | Card | /actions | Status = Open |

---

### 2.4 WF-P5-04: Save Analytics View

**Trigger:** User clicks "Save View"
**Actors:** Manager, Admin

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User clicks    │────▶│  Open save      │────▶│  User enters    │
│  "Save View"    │     │  view modal     │     │  name,          │
│                 │     │                 │     │  description    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Update saved   │◀────│  API returns    │◀────│  POST to        │
│  views list     │     │  new view       │     │  /analytics/    │
│                 │     │                 │     │  views          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Steps:**
1. User applies desired filters
2. User clicks "Save View" button
3. Modal opens with form:
   - View name (required)
   - Description (optional)
   - Share with organisation (checkbox)
   - Set as default (checkbox)
4. User submits form
5. System validates (name uniqueness, view limit)
6. System saves view via API
7. Saved views dropdown updates
8. Success toast displayed

**Validation Rules:**
- Name: 3-100 characters, unique per user
- Maximum 20 views per user
- Only one default view per user

---

### 2.5 WF-P5-05: Load Saved View

**Trigger:** User selects saved view from dropdown
**Actors:** Manager, Admin

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User selects   │────▶│  Fetch view     │────▶│  Apply view     │
│  view from      │     │  details        │     │  filters to     │
│  dropdown       │     │                 │     │  state          │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │  Show "Viewing: │◀────│  Refresh        │
                        │  [View Name]"   │     │  analytics data │
                        │                 │     │                 │
                        └─────────────────┘     └─────────────────┘
```

**Steps:**
1. User opens saved views dropdown
2. User selects a view (own or shared)
3. System fetches view filter configuration
4. System applies filters to analytics state
5. Analytics data refreshes automatically
6. UI shows "Currently viewing: [View Name]"

---

### 2.6 WF-P5-06: Generate PDF Report

**Trigger:** User clicks "Export PDF"
**Actors:** Manager, Admin

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User clicks    │────▶│  Show progress  │────▶│  POST to        │
│  "Export PDF"   │     │  indicator      │     │  /analytics/    │
│                 │     │                 │     │  report/pdf     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Trigger        │◀────│  Return PDF     │◀────│  Generate PDF   │
│  download       │     │  as blob        │     │  server-side    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Steps:**
1. User clicks "Export PDF" button
2. System shows loading indicator ("Generating report...")
3. System sends current filters to PDF endpoint
4. Backend generates PDF:
   - Fetch analytics data
   - Render charts as images
   - Apply org branding
   - Generate PDF document
5. PDF returned to frontend
6. Browser triggers file download
7. Loading indicator dismissed

**PDF Contents:**
1. Cover page with org name, date range, generation date
2. Executive summary (KPIs with trends)
3. Charts section (incidents, sites, actions)
4. Risk insights (top risk sites table)
5. Filter summary (what was included/excluded)

---

### 2.7 WF-P5-07: Review Risk Scores

**Trigger:** User views Risk Insights section
**Actors:** Manager, Admin, Compliance Lead

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User scrolls   │────▶│  Load risk      │────▶│  Display top    │
│  to Risk        │     │  scores from    │     │  5 risk sites   │
│  section        │     │  API            │     │  with scores    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │                 │              │
                        │  User clicks    │◀─────────────┘
                        │  "View Details" │
                        │                 │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │  Show score     │
                        │  breakdown      │
                        │  modal          │
                        │                 │
                        └─────────────────┘
```

**Steps:**
1. Analytics page loads risk scores widget
2. Widget displays top 5 high-risk sites with:
   - Site name
   - Risk score and category (colour coded)
   - Primary contributing factor
   - Trend arrow
3. User can click "View Details" on any site
4. Modal shows full breakdown:
   - Incident counts by severity
   - Overdue action count
   - Failed inspection count
   - Individual component scores
5. User can click "View Incidents" to drill down

---

## 3. System Workflows

### 3.1 WF-P5-SYS-01: Daily Analytics Aggregation

**Trigger:** Scheduled job at 02:00 UTC
**Actor:** System

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Job triggered  │────▶│  Get active     │────▶│  For each org:  │
│  at 02:00 UTC   │     │  organisations  │     │  Aggregate      │
│                 │     │                 │     │  yesterday      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Log job        │◀────│  Update         │◀────│  Aggregate      │
│  completion     │     │  scheduled_     │     │  inspections,   │
│                 │     │  job_runs       │     │  actions        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Steps:**
1. Cron triggers job at 02:00 UTC
2. Job logs start in `scheduled_job_runs`
3. For each active organisation:
   a. Query incidents created/closed yesterday
   b. Aggregate by site, type, severity
   c. Upsert into `analytics_daily_summary`
   d. Query inspections performed yesterday
   e. Aggregate by site, pass/fail
   f. Upsert into `analytics_daily_summary`
   g. Query actions created/completed yesterday
   h. Aggregate by site
   i. Upsert into `analytics_daily_summary`
4. Update job run status to "completed"
5. Log duration and items processed

**Error Handling:**
- If org fails, continue to next org
- Log failures in `scheduled_job_runs.error_message`
- Final status is "partial" if any org failed

---

### 3.2 WF-P5-SYS-02: Risk Score Calculation

**Trigger:** Scheduled job at 03:00 UTC
**Actor:** System

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Job triggered  │────▶│  For each org:  │────▶│  For each site: │
│  at 03:00 UTC   │     │  Get all sites  │     │  Calculate      │
│                 │     │                 │     │  risk score     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Log job        │◀────│  Record score   │◀────│  Upsert into    │
│  completion     │     │  history        │     │  site_risk_     │
│                 │     │                 │     │  scores         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Steps:**
1. Cron triggers job at 03:00 UTC
2. Job logs start
3. For each active organisation:
   a. Get risk settings (window, weights, thresholds)
   b. For each site:
      - Query incidents in scoring window
      - Count overdue actions
      - Count failed inspections
      - Calculate component scores
      - Calculate total score
      - Determine category
      - Identify primary factor
      - Upsert into `site_risk_scores`
      - Insert into `site_risk_score_history`
4. Update job run status
5. Log completion

**Risk Score Calculation:**
```
Incident Score = (Critical × W1) + (High × W2) + (Medium × W3) + (Low × W4)
Action Score = Overdue Actions × W5
Inspection Score = Failed Inspections × W6

Total = Incident Score + Action Score + Inspection Score

Category =
  if Total >= T3 then 'critical'
  if Total >= T2 then 'high'
  if Total >= T1 then 'medium'
  else 'low'
```

Where W1-W6 are weights and T1-T3 are thresholds from org settings.

---

### 3.3 WF-P5-SYS-03: Analytics History Cleanup

**Trigger:** Scheduled job at 04:00 UTC on 1st of month
**Actor:** System

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Job triggered  │────▶│  Delete old     │────▶│  Delete old     │
│  1st of month   │     │  summaries      │     │  risk history   │
│                 │     │  (> 2 years)    │     │  (> 1 year)     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │                 │     │                 │
                        │  Log cleanup    │◀────│  Vacuum         │
                        │  results        │     │  tables         │
                        │                 │     │                 │
                        └─────────────────┘     └─────────────────┘
```

**Steps:**
1. Cron triggers job at 04:00 UTC on 1st of month
2. Delete from `analytics_daily_summary` where `summary_date < NOW() - 730 days`
3. Delete from `site_risk_score_history` where `recorded_date < NOW() - 365 days`
4. Run VACUUM ANALYZE on affected tables
5. Log deleted row counts

---

## 4. Error Handling Workflows

### 4.1 WF-P5-ERR-01: Analytics Query Timeout

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Query exceeds  │────▶│  Return partial │────▶│  Show warning   │
│  timeout        │     │  data if        │     │  to user        │
│  (10 seconds)   │     │  available      │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │                 │
                                                │  Log error for  │
                                                │  monitoring     │
                                                │                 │
                                                └─────────────────┘
```

**User Message:** "Some data could not be loaded. Please try narrowing your date range."

---

### 4.2 WF-P5-ERR-02: PDF Generation Failure

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  PDF generation │────▶│  Return error   │────▶│  Show error     │
│  fails/timeouts │     │  to frontend    │     │  message        │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │                 │
                                                │  Offer retry    │
                                                │  option         │
                                                │                 │
                                                └─────────────────┘
```

**User Message:** "Report generation failed. Please try again or contact support if the issue persists."

---

## 5. State Diagram: Saved View

```
                        ┌─────────┐
                        │         │
              ┌────────▶│ Active  │◀────────┐
              │         │         │         │
              │         └────┬────┘         │
              │              │              │
         Load │              │ Edit         │ Save
              │              ▼              │
         ┌────┴────┐    ┌─────────┐    ┌────┴────┐
         │         │    │         │    │         │
         │ Created │───▶│ Modified│───▶│ Updated │
         │         │    │ (unsaved│    │         │
         └─────────┘    │  changes│    └─────────┘
                        │         │
                        └────┬────┘
                             │
                        Delete
                             │
                             ▼
                        ┌─────────┐
                        │         │
                        │ Deleted │
                        │         │
                        └─────────┘
```

---

## 6. Workflow Summary

| ID | Workflow | Trigger | Primary Actor |
|----|----------|---------|---------------|
| WF-P5-01 | View Analytics Dashboard | Open /analytics | Manager/Admin |
| WF-P5-02 | Apply Analytics Filters | Change filter | Manager/Admin |
| WF-P5-03 | Drill Down from Chart | Click chart | Manager/Admin |
| WF-P5-04 | Save Analytics View | Click save | Manager/Admin |
| WF-P5-05 | Load Saved View | Select view | Manager/Admin |
| WF-P5-06 | Generate PDF Report | Click export | Manager/Admin |
| WF-P5-07 | Review Risk Scores | View risk section | Manager/Admin |
| WF-P5-SYS-01 | Daily Aggregation | Cron 02:00 UTC | System |
| WF-P5-SYS-02 | Risk Score Calculation | Cron 03:00 UTC | System |
| WF-P5-SYS-03 | History Cleanup | Cron 1st month | System |

---

## 7. Related Documents

- [BRD_EHS_PORTAL_PHASE5.md](./BRD_EHS_PORTAL_PHASE5.md) - Business requirements
- [USER_JOURNEYS.md](./USER_JOURNEYS.md) - User journey definitions
- [API_SPEC_PHASE5.md](./API_SPEC_PHASE5.md) - API specification
- [FRONTEND_UX_PHASE5.md](./FRONTEND_UX_PHASE5.md) - Frontend UX design

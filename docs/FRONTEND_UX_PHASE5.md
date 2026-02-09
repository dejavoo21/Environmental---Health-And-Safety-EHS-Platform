# Frontend UX Specification – EHS Portal Phase 5
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

Phase 5 introduces a comprehensive Analytics page with:
- KPI cards with trend indicators
- Time-series and comparison charts
- Risk insights widgets
- Filter panel
- Saved views management
- PDF export capability

---

## 2. Page Layout

### 2.1 Analytics Page (`/analytics`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Header (existing)                              │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                        Page Title Row                                │ │
│ │  Analytics & Insights                    [Saved Views ▼] [Export PDF]│ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                        Filter Panel                                  │ │
│ │  Date Range: [Last 90 Days ▼]   Sites: [All Sites ▼]                │ │
│ │  Types: [All Types ▼]   Severity: [All ▼]         [Clear Filters]   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  │
│ │   Total   │ │  % High   │ │   Avg     │ │   Open    │ │  Pass     │  │
│ │ Incidents │ │ Severity  │ │Resolution │ │  Actions  │ │   Rate    │  │
│ │    156    │ │   23.5%   │ │  4.2 days │ │    45     │ │  87.3%    │  │
│ │   ▲ +9.9% │ │   ▼ -16%  │ │  ▼ -18%   │ │  ▲ +18%   │ │  ▲ +6.3%  │  │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘  │
│                                                                         │
│ ┌─────────────────────────────────────┐ ┌─────────────────────────────┐ │
│ │     Incidents Over Time             │ │    Incidents by Site        │ │
│ │  ┌─────────────────────────────┐    │ │  ┌───────────────────────┐  │ │
│ │  │ [Stacked Bar Chart]        │    │ │  │ [Horizontal Bar]      │  │ │
│ │  │                             │    │ │  │                       │  │ │
│ │  │  ▓▓░░  ▓▓▓░  ▓▓░░  ▓▓▓▓░   │    │ │  │ Warehouse A    ████░  │  │ │
│ │  │  Mar   Apr   May   Jun     │    │ │  │ Dist Center    ███░░  │  │ │
│ │  │                             │    │ │  │ Factory B      ██░░░  │  │ │
│ │  │  ▓ Critical ▓ High ░ Med   │    │ │  │                       │  │ │
│ │  └─────────────────────────────┘    │ │  └───────────────────────┘  │ │
│ └─────────────────────────────────────┘ └─────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────┐ ┌─────────────────────────────┐ │
│ │     Actions Created vs Completed    │ │   Inspections Over Time     │ │
│ │  ┌─────────────────────────────┐    │ │  ┌───────────────────────┐  │ │
│ │  │ [Line Chart]                │    │ │  │ [Line Chart]          │  │ │
│ │  │     ___                     │    │ │  │    ___    ___         │  │ │
│ │  │    /   \___                 │    │ │  │   /   \  /   \        │  │ │
│ │  │   /        \___             │    │ │  │  /     \/            │  │ │
│ │  │  Created ── Completed ──    │    │ │  │  Pass Rate            │  │ │
│ │  └─────────────────────────────┘    │ │  └───────────────────────┘  │ │
│ └─────────────────────────────────────┘ └─────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────┐ ┌─────────────────────────────┐ │
│ │     Top 5 High-Risk Sites           │ │   Top 5 Incident Types      │ │
│ │  ┌─────────────────────────────┐    │ │  ┌───────────────────────┐  │ │
│ │  │ Distribution Ctr  52 ●CRIT▲│    │ │  │ Near Miss      48 30% │  │ │
│ │  │ Warehouse A       46 ●HIGH▲│    │ │  │ Injury         35 22% │  │ │
│ │  │ Factory B         28 ●MED  │    │ │  │ Property Dam   28 18% │  │ │
│ │  │ Office HQ         12 ○LOW  │    │ │  │ Environmental  25 16% │  │ │
│ │  │ Warehouse B        8 ○LOW  │    │ │  │ Other          22 14% │  │ │
│ │  │         [View All Sites →] │    │ │  │                       │  │ │
│ │  └─────────────────────────────┘    │ │  └───────────────────────┘  │ │
│ └─────────────────────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 KPI Card Component

```jsx
<KPICard
  title="Total Incidents"
  value={156}
  previousValue={142}
  trend="up"           // "up" | "down" | "neutral"
  percentChange={9.86}
  format="number"      // "number" | "percent" | "days"
  onClick={() => navigateTo('/incidents')}
  helpText="Total incidents in selected period"
/>
```

**Visual Design:**
```
┌─────────────────────────┐
│ Total Incidents      [?]│  ← Help icon (tooltip)
│                         │
│        156              │  ← Large value
│                         │
│     ▲ +9.9%             │  ← Trend arrow + percentage
│   vs previous period    │  ← Subtitle
└─────────────────────────┘
```

**Trend Colours:**
| Metric Type | Up = Good | Up = Bad |
|-------------|-----------|----------|
| Total Incidents | Red (bad) | - |
| % High Severity | - | Red (bad) |
| Avg Resolution | - | Red (bad) |
| Open Actions | Red (bad) | - |
| % Overdue | - | Red (bad) |
| Pass Rate | Green (good) | - |

**Click Behaviour:**
- Card is clickable (cursor: pointer)
- Navigates to relevant list with appropriate filters

---

### 3.2 Filter Panel Component

```jsx
<FilterPanel
  filters={currentFilters}
  onChange={handleFilterChange}
  onClear={handleClearFilters}
>
  <DateRangePicker
    presets={['last_30_days', 'last_90_days', 'last_365_days', 'this_year', 'custom']}
    value={filters.dateRange}
    onChange={(range) => updateFilter('dateRange', range)}
  />

  <MultiSelect
    label="Sites"
    options={sites}
    value={filters.siteIds}
    onChange={(ids) => updateFilter('siteIds', ids)}
    placeholder="All Sites"
  />

  <MultiSelect
    label="Incident Types"
    options={incidentTypes}
    value={filters.incidentTypeIds}
    onChange={(ids) => updateFilter('incidentTypeIds', ids)}
    placeholder="All Types"
  />

  <MultiSelect
    label="Severity"
    options={['low', 'medium', 'high', 'critical']}
    value={filters.severities}
    onChange={(vals) => updateFilter('severities', vals)}
    placeholder="All Severities"
  />
</FilterPanel>
```

**Filter Debouncing:**
- 300ms delay after last filter change before API call
- Show loading indicator on charts during fetch

---

### 3.3 Time-Series Chart Component

```jsx
<TimeSeriesChart
  title="Incidents Over Time"
  data={incidentTimeSeries}
  type="stacked-bar"    // "stacked-bar" | "line" | "area"
  xAxis="period"
  series={[
    { key: 'critical', label: 'Critical', color: '#DC2626' },
    { key: 'high', label: 'High', color: '#F97316' },
    { key: 'medium', label: 'Medium', color: '#FBBF24' },
    { key: 'low', label: 'Low', color: '#22C55E' }
  ]}
  onBarClick={(period, severity) => drillDown(period, severity)}
  height={300}
/>
```

**Interaction:**
- Hover: Show tooltip with exact values
- Click: Drill down to filtered list
- Legend: Click to toggle series visibility

---

### 3.4 Site Comparison Chart Component

```jsx
<SiteComparisonChart
  title="Incidents by Site"
  data={incidentsBySite}
  valueKey="incidentCount"
  labelKey="siteName"
  maxBars={10}
  showOther={true}
  onBarClick={(siteId) => drillDown(siteId)}
  orientation="horizontal"  // Better for site names
/>
```

---

### 3.5 Risk Widget Component

```jsx
<RiskWidget
  title="Top 5 High-Risk Sites"
  sites={topRiskSites}
  onSiteClick={(siteId) => drillDown(siteId)}
  onViewAll={() => navigateTo('/analytics/risk-scores')}
/>
```

**Row Design:**
```
┌────────────────────────────────────────────────────┐
│ ●  Distribution Center     52  [CRITICAL]  ▲ +15% │
│ ●  Category indicator      Score  Badge    Trend  │
└────────────────────────────────────────────────────┘
```

**Category Badge Colours:**
| Category | Background | Text |
|----------|------------|------|
| Low | Green-100 | Green-800 |
| Medium | Yellow-100 | Yellow-800 |
| High | Orange-100 | Orange-800 |
| Critical | Red-100 | Red-800 |

---

### 3.6 Saved Views Dropdown

```jsx
<SavedViewsDropdown
  views={savedViews}
  sharedViews={sharedViews}
  currentViewId={activeViewId}
  onSelectView={(viewId) => loadView(viewId)}
  onSaveView={() => openSaveModal()}
  onManageViews={() => openManageModal()}
/>
```

**Dropdown Structure:**
```
┌─────────────────────────────────────┐
│ [Search views...]                   │
├─────────────────────────────────────┤
│ MY VIEWS                            │
│   ★ Monthly Board Review (default)  │
│     Quarterly Risk Review           │
├─────────────────────────────────────┤
│ SHARED VIEWS                        │
│     Weekly Safety Huddle            │
│     Site Manager Overview           │
├─────────────────────────────────────┤
│ [+ Save Current View]               │
│ [Manage Views...]                   │
└─────────────────────────────────────┘
```

---

### 3.7 Save View Modal

```jsx
<SaveViewModal
  isOpen={showSaveModal}
  onClose={() => setShowSaveModal(false)}
  onSave={handleSaveView}
  currentFilters={filters}
  existingView={editingView}  // null for new, view object for edit
/>
```

**Modal Fields:**
```
┌─────────────────────────────────────────────────────┐
│ Save Analytics View                            [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ View Name *                                         │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Monthly Board Review                            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Description                                         │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Standard view for monthly board meetings        │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ☑ Share with organisation                          │
│ ☐ Set as my default view                           │
│                                                     │
│ Current Filters:                                    │
│   • Date Range: Last 90 days                       │
│   • Sites: All                                      │
│   • Severity: High, Critical                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                           [Cancel]  [Save View]    │
└─────────────────────────────────────────────────────┘
```

---

### 3.8 PDF Export Button

```jsx
<ExportPDFButton
  filters={filters}
  onExportStart={() => setExporting(true)}
  onExportComplete={() => setExporting(false)}
  onExportError={(error) => showError(error)}
/>
```

**Button States:**
- Default: "Export PDF"
- Loading: "Generating..." with spinner
- Error: "Export Failed - Retry"

---

## 4. Drill-Down Specifications

### 4.1 Drill-Down Mapping

| Source | Click Target | Destination | URL Example |
|--------|--------------|-------------|-------------|
| Incidents by Month | Bar segment | /incidents | `/incidents?month=2025-11&severity=high` |
| Incidents by Site | Bar | /incidents | `/incidents?siteId=uuid-1` |
| Actions Chart | Point | /actions | `/actions?month=2025-11&status=completed` |
| Risk Widget | Row | /incidents | `/incidents?siteId=uuid-1&startDate=...` |
| Top Types Widget | Row | /incidents | `/incidents?typeId=uuid-1` |
| Open Actions KPI | Card | /actions | `/actions?status=open` |
| Pass Rate KPI | Card | /inspections | `/inspections` |

### 4.2 Drill-Down URL Parameters

The analytics page passes filters via URL query parameters:
```javascript
const drillDownToIncidents = (filters) => {
  const params = new URLSearchParams();

  if (filters.siteId) params.append('siteId', filters.siteId);
  if (filters.month) {
    params.append('startDate', `${filters.month}-01`);
    params.append('endDate', getMonthEnd(filters.month));
  }
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.typeId) params.append('typeId', filters.typeId);

  navigate(`/incidents?${params.toString()}`);
};
```

### 4.3 Drill-Down Visual Feedback

- Hover: Cursor changes to pointer
- Hover: Element highlights (slight background change)
- Hover: Tooltip shows "Click to view details"
- Click: Brief press feedback before navigation

---

## 5. Loading & Error States

### 5.1 Initial Load

```
┌─────────────────────────────────────────────────────┐
│ Analytics & Insights                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │   │  ← Skeleton KPIs
│  │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │               ░░░░░░░░░░░░░░░               │   │  ← Skeleton Chart
│  │               Loading charts...              │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.2 Partial Load Error

```
┌─────────────────────────────────────────────────────┐
│  ⚠ Some data could not be loaded                    │
│  [Retry]                                   [Dismiss]│
└─────────────────────────────────────────────────────┘
```

### 5.3 Empty State

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           📊                                        │
│                                                     │
│    No data available for selected filters           │
│                                                     │
│    Try adjusting your date range or filters         │
│                                                     │
│              [Clear Filters]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 6. Responsive Design

### 6.1 Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥1280px) | 2 charts per row, 5-6 KPIs per row |
| Tablet (768-1279px) | 1-2 charts per row, 3 KPIs per row |
| Mobile (<768px) | 1 chart per row, 2 KPIs per row |

### 6.2 Mobile Adaptations

- Filter panel collapses to expandable section
- Charts become full-width
- KPI cards stack in 2-column grid
- Saved views dropdown becomes bottom sheet
- PDF export available but simplified format

---

## 7. Accessibility

### 7.1 ARIA Labels

```jsx
<div role="region" aria-label="Key Performance Indicators">
  <KPICard aria-label="Total Incidents: 156, up 9.9% from previous period" />
</div>

<div role="img" aria-label="Bar chart showing incidents by month">
  <Chart />
  <table className="sr-only">
    {/* Hidden table with chart data for screen readers */}
  </table>
</div>
```

### 7.2 Keyboard Navigation

- Tab through filter controls and charts
- Enter/Space to activate chart drill-down
- Arrow keys within filter dropdowns
- Escape to close modals

### 7.3 Colour Contrast

- All text meets WCAG AA contrast ratios
- Severity colours supplemented with patterns/icons
- Trend arrows have text labels ("up", "down")

---

## 8. Navigation Integration

### 8.1 Nav Menu Addition

```
┌─────────────────┐
│ Dashboard       │
│ Incidents       │
│ Inspections     │
│ Actions         │
│ ─────────────── │
│ Analytics    ←NEW
│ ─────────────── │
│ Admin           │
└─────────────────┘
```

### 8.2 Breadcrumbs

```
Dashboard > Analytics
Dashboard > Analytics > Site Risk Details
```

---

## 9. State Management

### 9.1 AnalyticsContext

```javascript
const AnalyticsContext = createContext();

const initialState = {
  filters: {
    dateRange: { preset: 'last_90_days' },
    siteIds: [],
    incidentTypeIds: [],
    severities: []
  },
  summary: null,
  incidentTimeSeries: [],
  incidentsBySite: [],
  inspectionTimeSeries: [],
  actionTimeSeries: [],
  riskScores: [],
  savedViews: [],
  activeViewId: null,
  loading: false,
  error: null
};

const AnalyticsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(analyticsReducer, initialState);

  // Load data when filters change
  useEffect(() => {
    fetchAllAnalyticsData(state.filters);
  }, [state.filters]);

  return (
    <AnalyticsContext.Provider value={{ state, dispatch }}>
      {children}
    </AnalyticsContext.Provider>
  );
};
```

---

## 10. Related Documents

- [BRD_EHS_PORTAL_PHASE5.md](./BRD_EHS_PORTAL_PHASE5.md) - Business requirements
- [API_SPEC_PHASE5.md](./API_SPEC_PHASE5.md) - API specification
- [WORKFLOWS_PHASE5.md](./WORKFLOWS_PHASE5.md) - Workflow definitions
- [USER_JOURNEYS.md](./USER_JOURNEYS.md) - User journey definitions

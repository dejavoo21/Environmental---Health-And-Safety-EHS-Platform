# Phase 11.5 - Dashboard Redesign

## Overview

The dashboard has been completely redesigned to provide a more compact, informative overview of EHS performance. The new design reduces vertical scrolling and includes visual representations of key metrics.

## Changes Made

### Backend Changes (`backend/src/routes/dashboard.js`)

1. **Extended KPIs** - Added new metrics:
   - `openActions` - Count of open actions
   - `overdueActions` - Count of overdue actions
   - `activePermits` - Count of active permits
   - `expiringPermits` - Permits expiring within 7 days
   - `activeRisks` - Total active risks
   - `highRisks` - High + Extreme risk count
   - `overdueTraining` - Overdue training assignments

2. **New Chart Data**:
   - `incidentsByStatus` - Pie chart data for incident status distribution
   - `incidentsBySeverity` - Donut chart data for severity breakdown
   - `actionsSummary` - Open/In Progress/Completed/Overdue counts
   - `upcomingActions` - Top 5 upcoming actions by due date

3. **Safe Query Helper** - Added `safeQuery()` function to gracefully handle missing tables (Phase 7+ features)

4. **Reduced Data Load** - Limited recent incidents/inspections to 5 rows instead of 10

### Frontend Changes

#### New Files:
- `frontend/src/pages/DashboardPage.css` - New compact dashboard styles

#### Updated Files:
- `frontend/src/pages/DashboardPage.jsx` - Complete redesign

### New Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Quick Stats Row (7 compact KPI cards)                           │
│ [Incidents][Open][Inspections][Overdue][Permits][Risks][Train]  │
├─────────────────────────────────────┬───────────────────────────┤
│ Charts (2x2 Grid)                   │ Right Column              │
│ ┌─────────────┬─────────────┐       │ ┌─────────────────────┐   │
│ │ Incidents   │ Severity    │       │ │ Safety Advisor      │   │
│ │ by Type     │ Pie Chart   │       │ │ (Weather + Moment)  │   │
│ │ [Bar Chart] │             │       │ └─────────────────────┘   │
│ ├─────────────┼─────────────┤       │ ┌─────────────────────┐   │
│ │ Actions     │ Trend       │       │ │ Quick Actions       │   │
│ │ Overview    │ [Line Chart]│       │ │ [New Incident]      │   │
│ └─────────────┴─────────────┘       │ │ [New Inspection]    │   │
├─────────────────────────────────────┤ │ [New Permit]        │   │
│ Recent Tables (side-by-side)        │ │ [New Risk]          │   │
│ [Incidents 5] | [Inspections 5]     │ └─────────────────────┘   │
└─────────────────────────────────────┴───────────────────────────┘
```

### Features

1. **7 Quick Stat Cards** - Clickable KPI cards with color-coded alerts:
   - Total Incidents
   - Open Incidents (warning state when > 0)
   - Inspections (30 days)
   - Overdue Actions (danger state when > 0)
   - Active Permits
   - High/Extreme Risks (danger state when > 0)
   - Overdue Training (warning state when > 0)

2. **4 Mini Charts**:
   - Incidents by Type (horizontal bar chart)
   - Severity Distribution (donut chart with legend)
   - Actions Overview (stat cards + upcoming actions list)
   - Incident Trend (multi-line chart, 12 months)

3. **Compact Tables** (side-by-side):
   - Recent Incidents (5 rows)
   - Recent Inspections (5 rows)

4. **Right Sidebar**:
   - Safety Advisor compact card with weather preview
   - Quick Actions grid (New Incident, Inspection, Permit, Risk)
   - Alerts section (expiring permits)

### Styling

- Uses CSS variables for theming (works with dark/light mode)
- Responsive design (collapses to single column on mobile)
- Color-coded badges for severity/status
- Hover effects on interactive elements

## How to Run

### Local Development
```bash
cd CLAUDE/backend && npm run dev
cd CLAUDE/frontend && npm run dev
```

### Deploy to Railway
```bash
cd CLAUDE
git add .
git commit -m "Phase 11.5: Dashboard redesign with compact layout and charts"
git push origin main
railway up
```

## Dependencies

No new dependencies required. Uses existing:
- `recharts` (already installed)
- `lucide-react` (already installed)

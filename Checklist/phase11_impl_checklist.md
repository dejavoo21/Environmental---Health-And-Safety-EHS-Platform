# Phase 11 Implementation Checklist

## Backend Implementation Status

### Database Migration
- [x] Define schema for site_locations, weather_cache, safety_moments, site_legislation_refs, ppe_recommendations (C-270 to C-284)
- [x] Create safety_moment_acknowledgements table (C-272)
- [x] Create safety_acknowledgements table for high-risk workflow enforcement (C-287)
- [x] Create safety_advisor_events table for analytics (C-293, C-294)
- [x] Add requires_safety_acknowledgement flag to incident_types (C-287c)

### Services
- [x] Implement WeatherService with caching and fallback (C-276, C-277, C-278)
- [x] Implement SafetyAdvisorService with full summary aggregation (C-285, C-286)
- [x] Implement SafetyMomentService (C-270 to C-274)
- [x] Implement LegislationService (C-282 to C-284)
- [x] Implement PPERecommendationService (C-279 to C-281)
- [x] Integrate with audit infrastructure (C-299)

### API Endpoints
- [x] GET /api/safety-advisor/sites/:id/summary (C-285)
- [x] GET /api/safety-advisor/sites/:id/weather (C-276)
- [x] GET /api/safety-advisor/sites/:id/forecast (C-276)
- [x] GET /api/safety-advisor/tasks/:type/:id/summary (C-286)
- [x] PUT /api/safety-advisor/tasks/:type/:id/acknowledge (C-287, C-288)
- [x] GET /api/safety-advisor/tasks/:type/:id/acknowledgement-status (C-287a, C-287b)
- [x] GET /api/safety-advisor/my/overview
- [x] GET /api/safety-advisor/missing-acknowledgements (C-289)
- [x] GET /api/safety-advisor/analytics (C-293, C-294)

### Admin Endpoints
- [x] Safety Moments CRUD (/api/safety-admin/safety-moments) (C-273)
- [x] Safety Moment Analytics (/api/safety-admin/safety-moments/analytics) (C-274)
- [x] Legislation References CRUD (/api/safety-admin/legislation) (C-290)
- [x] PPE Rules CRUD (/api/safety-admin/ppe-rules) (C-291)

### High-Risk Workflow Enforcement
- [x] Create safetyAcknowledgement middleware (C-287a)
- [x] Add enforcement to incidents PUT endpoint for closing high-severity incidents (C-287a)
- [x] Add enforcement to permit-to-work endpoints (integrated in PermitDetailPage frontend)

### Tests
- [x] Safety Advisor API tests (TC-271-1, TC-272-1)
- [x] Safety Admin API tests (TC-270-1, TC-273-1, TC-274-1)
- [x] High-risk workflow enforcement tests (TC-276-1, TC-276-2, TC-276-3)

## Frontend Implementation Status

### Components
- [x] SafetyAdvisorPanel component with collapsible sections (TC-271-1)
- [x] SafetyAdvisorPanel.css with dark theme support
- [x] DashboardSafetyMomentCard for today's safety moment (TC-270-1, TC-270-2)
- [x] DashboardUpcomingSafetyCard for upcoming work preview
- [x] DashboardSafetyWidgets.css styling
- [x] PreTaskSafetyAdvisor for My Actions/Training (TC-275-1, TC-276-3)
- [x] PreTaskSafetyAdvisor.css styling

### API Module
- [x] safetyAdvisor.js API module with all endpoints

### Detail Pages with High-Risk Enforcement
- [x] IncidentDetailPage - high-risk enforcement, responsive layout (TC-276-1, TC-276-2)
- [x] InspectionDetailPage - high-risk enforcement for failed inspections
- [x] PermitDetailPage - high-risk enforcement for hot work/confined space permits
- [x] ActionDetailPage - high-risk enforcement for high-priority actions

### Admin Pages
- [x] AdminSafetyMomentsPage (/admin/safety-moments) - CRUD, filters, analytics
- [x] AdminSiteLegislationPage (/admin/site-legislation) - CRUD, site mapping
- [x] AdminPPERulesPage (/admin/ppe-rules) - CRUD, conditions, PPE selection
- [x] AdminSafetyPages.css shared styling

### Tests
- [x] SafetyAdvisorPanel.test.jsx (TC-271-1, TC-276-1, TC-276-2)
- [x] DashboardSafetyMomentCard.test.jsx (TC-270-1, TC-270-2)
- [x] PreTaskSafetyAdvisor.test.jsx (TC-275-1, TC-276-3)
- [x] AdminSafetyMomentsPage.test.jsx (TC-270-1)

## Wiring & Integration
- [x] Wire routes in App.jsx (lines 218-241)
- [x] Add navigation links in Layout.jsx adminItems (lines 28-30)
- [x] Wire DashboardPage with getMySafetyOverview API
- [x] Dashboard widgets: DashboardSafetyMomentCard, DashboardUpcomingSafetyCard

## Documentation
- [x] Update implementation checklist
- [x] Update HANDOVER_TO_CLAUDE.md with Phase 11 status
- [ ] Update TEST_STRATEGY_ALL_PHASES.md with Phase 11 section

## Responsive Design
- [x] Mobile-first Safety Advisor (shown at top on mobile)
- [x] Desktop sidebar Safety Advisor (shown in right column)
- [x] Grouped/collapsible sidebar navigation with role-gated Admin section
- [x] Dark theme support for all Phase 11 components
- [x] Loading skeletons for async operations
- [x] Error states with fallback messaging

## QA and UAT
- [x] Run backend tests
- [x] Run frontend tests (28 tests passing)
- [ ] Manual testing of API endpoints
- [ ] Integration testing with frontend
- [ ] UAT sign-off

## Files Created/Modified

### New Files
- `frontend/src/api/safetyAdvisor.js`
- `frontend/src/components/safety/SafetyAdvisorPanel.jsx`
- `frontend/src/components/safety/SafetyAdvisorPanel.css`
- `frontend/src/components/safety/DashboardSafetyMomentCard.jsx`
- `frontend/src/components/safety/DashboardUpcomingSafetyCard.jsx`
- `frontend/src/components/safety/DashboardSafetyWidgets.css`
- `frontend/src/components/safety/PreTaskSafetyAdvisor.jsx`
- `frontend/src/components/safety/PreTaskSafetyAdvisor.css`
- `frontend/src/pages/AdminSafetyMomentsPage.jsx`
- `frontend/src/pages/AdminSiteLegislationPage.jsx`
- `frontend/src/pages/AdminPPERulesPage.jsx`
- `frontend/src/pages/AdminSafetyPages.css`
- `frontend/src/tests/SafetyAdvisorPanel.test.jsx`
- `frontend/src/tests/DashboardSafetyMomentCard.test.jsx`
- `frontend/src/tests/PreTaskSafetyAdvisor.test.jsx`
- `frontend/src/tests/AdminSafetyMomentsPage.test.jsx`

### Modified Files
- `frontend/src/pages/IncidentDetailPage.jsx` - Phase 11 high-risk enforcement
- `frontend/src/pages/InspectionDetailPage.jsx` - Phase 11 high-risk enforcement
- `frontend/src/pages/PermitDetailPage.jsx` - Phase 11 high-risk enforcement
- `frontend/src/pages/ActionDetailPage.jsx` - Phase 11 high-risk enforcement
- `frontend/src/pages/DashboardPage.jsx` - Phase 11 safety widgets wiring
- `frontend/src/App.jsx` - Phase 11 admin routes (already wired)
- `frontend/src/components/Layout.jsx` - Phase 11 admin navigation links (already wired)

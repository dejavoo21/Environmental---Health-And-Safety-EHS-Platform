# Implementation Plan - EHS Portal (Phase 1)

## 1. Overview

This document provides a step-by-step implementation plan for Phase 1 of the EHS Portal. Each step includes:
- Tasks to complete
- User stories addressed (US-IDs)
- Checklist items covered (C-IDs)
- Test cases that should pass (TC-IDs)

---

## 2. Implementation Steps

### Step 1: Backend Project Setup

**Goal:** Express app scaffolding with configuration

**Tasks:**
1. Create `backend/` directory
2. Initialize Node.js project with `package.json`
3. Install dependencies:
   - express
   - pg (PostgreSQL client)
   - bcryptjs
   - jsonwebtoken
   - cors
   - dotenv
4. Create folder structure:
   - `src/`
   - `src/config/`
   - `src/middleware/`
   - `src/routes/`
   - `src/services/`
   - `src/utils/`
5. Create `src/index.js` with basic Express app
6. Create `.env.example` with required variables
7. Add health check endpoint: `GET /health`

**Deliverables:**
- Backend project runs on port 3001
- `GET /health` returns `{ status: "ok" }`

**Stories/Checklist:** Foundation
**Test Cases:** Manual verification

---

### Step 2: Database Connection

**Goal:** PostgreSQL connection pool setup

**Tasks:**
1. Create `src/config/db.js` with pg Pool configuration
2. Create `src/config/env.js` for environment variable loading
3. Test database connection on startup
4. Log connection success/failure

**Environment Variables:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/ehs_portal
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ehs_portal
DB_USER=postgres
DB_PASSWORD=postgres
```

**Deliverables:**
- Backend connects to PostgreSQL on startup
- Connection errors logged clearly

**Stories/Checklist:** Foundation
**Test Cases:** Manual verification

---

### Step 3: Database Schema Migration

**Goal:** Create all Phase 1 tables

**Tasks:**
1. Create `migrations/001_initial_schema.sql`
2. Include all 8 tables:
   - users
   - sites
   - incident_types
   - incidents
   - inspection_templates
   - inspection_template_items
   - inspections
   - inspection_responses
3. Include all indexes
4. Run migration against database

**Deliverables:**
- All tables created in PostgreSQL
- Verified via `psql \dt`

**Stories/Checklist:** Foundation for all P1
**Test Cases:** Verify tables exist

---

### Step 4: Seed Data

**Goal:** Populate reference data and test users

**Tasks:**
1. Create `seeds/seed.sql` or `seeds/seed.js`
2. Insert 5 incident types:
   - Injury, Near Miss, Property Damage, Environmental, Other
3. Insert 3 sample sites:
   - Head Office (HO), Warehouse 1 (WH1), Distribution Center (DC1)
4. Insert 3 test users with hashed passwords:
   - admin@ehs.local / Admin123! (role: admin)
   - manager@ehs.local / Manager123! (role: manager)
   - worker@ehs.local / Worker123! (role: worker)
5. Create seed script that hashes passwords with bcrypt

**Deliverables:**
- Reference data available in database
- Test users can be used for development

**Stories/Checklist:** C6, C7, C16, C19, US-REF-01
**Test Cases:** TC-REF-01

---

### Step 5: Middleware Setup

**Goal:** Request logging, error handling, CORS

**Tasks:**
1. Create `src/middleware/requestLogger.js`
   - Log method, path, status code, duration
2. Create `src/middleware/errorHandler.js`
   - Catch all errors
   - Return consistent JSON format
   - Log errors with stack trace
3. Configure CORS in index.js
4. Configure express.json() parser

**Deliverables:**
- All requests logged to console
- Errors return `{ error: string, code: string }`

**Stories/Checklist:** NFR-LOG-01, NFR-REL-01
**Test Cases:** Manual verification

---

### Step 6: Auth Middleware

**Goal:** JWT verification and role-based middleware

**Tasks:**
1. Create `src/middleware/auth.js`
   - Extract token from Authorization header
   - Verify JWT signature
   - Attach user to request object
   - Return 401 if invalid/missing
2. Create `src/middleware/role.js`
   - Check user role against allowed roles
   - Return 403 if unauthorized
3. Create `src/services/authService.js`
   - `hashPassword(password)` - bcrypt hash
   - `comparePassword(password, hash)` - bcrypt compare
   - `generateToken(user)` - JWT sign
   - `verifyToken(token)` - JWT verify

**Deliverables:**
- Auth middleware can be applied to routes
- Role middleware can restrict by role

**Stories/Checklist:** C34, C35, C36, C37, US-AUTH-01, US-AUTH-02
**Test Cases:** TC-AUTH-03, TC-AUTH-06

---

### Step 7: Auth Routes

**Goal:** Login and profile endpoints

**Tasks:**
1. Create `src/routes/auth.js`
2. Implement `POST /api/auth/login`:
   - Find user by email
   - Compare password
   - Generate JWT
   - Return token and user
3. Implement `GET /api/auth/me`:
   - Apply auth middleware
   - Return current user from token
4. Register routes in main app

**Deliverables:**
- Users can log in and get profile
- All auth endpoints tested manually

**Stories/Checklist:** US-AUTH-01, US-AUTH-02 (C34, C35, C36, C37)
**Test Cases:** TC-AUTH-01, TC-AUTH-02, TC-AUTH-03, TC-AUTH-04, TC-AUTH-06

---

### Step 8: Sites Routes

**Goal:** CRUD for sites with admin protection

**Tasks:**
1. Create `src/routes/sites.js`
2. Implement `GET /api/sites`:
   - Apply auth middleware
   - Return all sites
3. Implement `POST /api/sites`:
   - Apply auth middleware
   - Apply role middleware (admin only)
   - Validate request body
   - Check code uniqueness
   - Insert site
4. Implement `PUT /api/sites/:id`:
   - Apply auth + role middleware (admin only)
   - Validate request body
   - Check code uniqueness (excluding current)
   - Update site
5. Register routes

**Deliverables:**
- Sites CRUD working
- Non-admins get 403 on write operations

**Stories/Checklist:** US-SITE-01 (C16, C17, C18)
**Test Cases:** TC-SITE-01, TC-SITE-02, TC-SITE-03, TC-AUTH-06

---

### Step 9: Incident Types Routes

**Goal:** Incident types CRUD (admin) + read-only for all users

**Tasks:**
1. Create `src/routes/incidentTypes.js`
2. Implement `GET /api/incident-types`:
   - Apply auth middleware
   - Return active incident types
3. Implement `POST /api/incident-types` (admin only):
   - Validate request body
   - Check name uniqueness
   - Insert incident type
4. Implement `PUT /api/incident-types/:id` (admin only):
   - Update name/description
5. Implement `PATCH /api/incident-types/:id` (admin only):
   - Deactivate/reactivate via is_active
6. Register routes

**Deliverables:**
- Incident types endpoints return seeded data and allow admin configurability

**Stories/Checklist:** US-REF-01, US-REF-02 (C6, C7, C19)
**Test Cases:** TC-REF-01, TC-REF-02, TC-REF-03, TC-REF-04

---

### Step 10: Incidents Routes

**Goal:** CRUD with role-based filtering

**Tasks:**
1. Create `src/routes/incidents.js`
2. Implement `GET /api/incidents`:
   - Apply auth middleware
   - Support query params: status, siteId
   - **Role-based filtering:**
     - Worker: only their incidents (reported_by = user.id)
     - Manager/Admin: all incidents
   - Join with incident_types, sites, users
3. Implement `GET /api/incidents/:id`:
   - Apply auth middleware
   - Return full incident with relations
4. Implement `POST /api/incidents`:
   - Apply auth middleware
   - Validate request body
   - Set status = 'open'
   - Set reported_by = current user
   - Insert incident
5. Implement `PUT /api/incidents/:id`:
   - Apply auth middleware
   - **Status change:** only manager/admin (return 403 for workers)
   - Update incident
6. Register routes

**Deliverables:**
- Incidents CRUD working
- Workers can only see their own incidents
- Workers cannot change status

**Stories/Checklist:** US-INC-01, US-INC-02, US-INC-03 (C1-C5, C38, C39)
**Test Cases:** TC-INC-01 through TC-INC-08

---

### Step 11: Inspection Templates Routes

**Goal:** CRUD for templates and items (admin only)

**Tasks:**
1. Create `src/routes/inspectionTemplates.js`
2. Implement `GET /api/inspection-templates`:
   - Apply auth middleware
   - Return templates with item count
3. Implement `GET /api/inspection-templates/:id`:
   - Apply auth middleware
   - Return template with all items
4. Implement `POST /api/inspection-templates`:
   - Apply auth + role middleware (admin only)
   - Validate request body
   - Insert template
   - Insert items with sort_order
5. Implement `PUT /api/inspection-templates/:id`:
   - Apply auth + role middleware (admin only)
   - Update template
   - Delete existing items, insert new items (or diff)
6. Register routes

**Deliverables:**
- Templates CRUD working with items
- Admin-only for write operations

**Stories/Checklist:** US-INSP-01 (C8, C9, C10, C11)
**Test Cases:** TC-INSP-01, TC-INSP-02, TC-INSP-03

---

### Step 12: Inspections Routes (with TDD for overall_result)

**Goal:** Create and view inspections with overall_result calculation

**Tasks:**
1. **TDD: Create unit tests first** for `calculateOverallResult`:
   ```javascript
   // Test cases:
   // - All 'ok' ' 'pass'
   // - All 'ok' or 'na' ' 'pass'
   // - Any 'not_ok' ' 'fail'
   // - Empty array ' 'pass'
   ```
2. Implement `src/services/inspectionService.js`:
   - `calculateOverallResult(responses)` function
3. Create `src/routes/inspections.js`
4. Implement `GET /api/inspections`:
   - Apply auth middleware
   - Support query params: siteId, templateId, result
   - Join with templates, sites, users
5. Implement `GET /api/inspections/:id`:
   - Return inspection with all responses
   - Join template items for labels
6. Implement `POST /api/inspections`:
   - Apply auth + role middleware (manager/admin)
   - Validate request body
   - Set performed_by = current user
   - **Calculate overall_result** using service
   - Insert inspection and responses in transaction
7. Register routes

**Deliverables:**
- Inspections CRUD working
- overall_result calculated correctly
- Unit tests pass for calculation logic

**Stories/Checklist:** US-INSP-02, US-INSP-03 (C12, C13, C14, C15)
**Test Cases:** TC-INSP-04, TC-INSP-05, TC-INSP-06, TC-INSP-07, TC-INSP-08

---

### Step 13: Dashboard Route

**Goal:** Summary endpoint with all KPIs

**Tasks:**
1. Create `src/routes/dashboard.js`
2. Create `src/services/dashboardService.js`
3. Implement `GET /api/dashboard/summary`:
   - Apply auth middleware
   - Query KPIs:
     - Total incidents: `SELECT COUNT(*) FROM incidents`
     - Open incidents: `WHERE status = 'open'`
     - Incidents last 30 days: `WHERE created_at > NOW() - INTERVAL '30 days'`
     - Inspections last 30 days
     - Failed inspections last 30 days
   - Query incidentsByType: Group by incident_type_id
   - Query severityTrend: Group by month and severity (last 12 months)
   - Query recentIncidents: ORDER BY created_at DESC LIMIT 10
   - Query recentInspections: ORDER BY created_at DESC LIMIT 10
4. Register routes

**Deliverables:**
- Dashboard summary returns all required data
- Queries are efficient

**Stories/Checklist:** US-DASH-01 (C47-C55)
**Test Cases:** TC-DASH-01

---

### Step 14: Backend Integration Tests

**Goal:** Verify all API endpoints work correctly

**Tasks:**
1. Set up Jest with supertest
2. Create test database configuration
3. Write integration tests for:
   - Auth endpoints (login, me)
   - Sites CRUD
   - Incident types
   - Incidents CRUD with role checks
   - Templates CRUD
   - Inspections CRUD
   - Dashboard summary
4. Run tests and fix any issues

**Deliverables:**
- All API tests passing
- Test coverage report

**Stories/Checklist:** All backend stories
**Test Cases:** All API-type TC-IDs

---

### Step 15: Frontend Project Setup

**Goal:** Vite + React scaffolding

**Tasks:**
1. Create `frontend/` directory
2. Initialize Vite React project
3. Install dependencies:
   - react-router-dom
   - axios
   - recharts
4. Create folder structure:
   - `src/api/`
   - `src/context/`
   - `src/hooks/`
   - `src/components/`
   - `src/pages/`
5. Configure vite.config.js with proxy to backend
6. Create basic App.jsx with router setup

**Deliverables:**
- Frontend runs on port 5173
- Proxy to backend configured

**Stories/Checklist:** C59 (foundation)
**Test Cases:** Manual verification

---

### Step 16: Auth Context & API Client

**Goal:** Authentication state management and API wrapper

**Tasks:**
1. Create `src/api/client.js`:
   - Axios instance with base URL
   - Request interceptor to add auth header
   - Response interceptor for error handling
2. Create `src/context/AuthContext.jsx`:
   - Provide: user, token, isAuthenticated, login, logout
   - Store token in localStorage
   - Load token on app startup
   - Fetch user profile on load
3. Create `src/hooks/useAuth.js`:
   - Custom hook to access auth context
4. Create protected route component

**Deliverables:**
- Auth context available throughout app
- API calls include auth header automatically

**Stories/Checklist:** US-AUTH-01, US-AUTH-02
**Test Cases:** Foundation for auth tests

---

### Step 17: Login Page

**Goal:** Functional login with redirect

**Tasks:**
1. Create `src/pages/LoginPage.jsx`:
   - Email input
   - Password input
   - Login button
   - Error message display
2. Implement login flow:
   - Call auth context login
   - On success: redirect to dashboard
   - On error: show message
3. Style the page

**Deliverables:**
- Users can log in
- Redirects to dashboard on success

**Stories/Checklist:** US-AUTH-01 (C34, C35)
**Test Cases:** TC-AUTH-01, TC-AUTH-02

---

### Step 18: Layout & Navigation

**Goal:** Main layout with role-based navigation

**Tasks:**
1. Create `src/components/Layout/Header.jsx`:
   - Logo
   - Navigation links
   - User menu (logout)
2. Create `src/components/Layout/MainLayout.jsx`:
   - Header
   - Main content area
3. Implement role-based navigation:
   - Hide Admin menu for non-admins
4. Set up React Router with all routes
5. Apply layout to all authenticated pages

**Deliverables:**
- Navigation visible on all pages
- Admin menu hidden for workers/managers

**Stories/Checklist:** C59, C60
**Test Cases:** TC-AUTH-05

---

### Step 19: Dashboard Page

**Goal:** KPIs, charts, recent tables

**Tasks:**
1. Create `src/pages/DashboardPage.jsx`
2. Create `src/components/Dashboard/KPICard.jsx`
3. Create `src/components/Dashboard/IncidentsByTypeChart.jsx`:
   - Recharts BarChart
4. Create `src/components/Dashboard/SeverityTrendChart.jsx`:
   - Recharts LineChart
5. Create recent incidents table
6. Create recent inspections table
7. Fetch data from /api/dashboard/summary
8. Implement click navigation to detail pages

**Deliverables:**
- Dashboard displays all KPIs and charts
- Tables are clickable

**Stories/Checklist:** US-DASH-01 (C47-C55)
**Test Cases:** TC-DASH-02, TC-DASH-03, TC-DASH-04

---

### Step 20: Incidents Module

**Goal:** List, create, detail pages

**Tasks:**
1. Create common components:
   - `DataTable.jsx`
   - `FilterBar.jsx`
   - `Badge.jsx` (for severity/status)
2. Create `src/pages/IncidentsPage.jsx`:
   - Filter bar (status, site)
   - Data table
   - New Incident button
3. Create `src/pages/NewIncidentPage.jsx`:
   - Form with all fields
   - Validation
   - Submit handling
4. Create `src/pages/IncidentDetailPage.jsx`:
   - Display all incident data
   - Status dropdown for managers
5. Implement API calls for each page

**Deliverables:**
- Full incidents workflow working
- Role-based status editing

**Stories/Checklist:** US-INC-01, US-INC-02, US-INC-03 (C1-C5)
**Test Cases:** TC-INC-01 through TC-INC-08

---

### Step 21: Inspections Module

**Goal:** List, create, detail pages

**Tasks:**
1. Create `src/pages/InspectionsPage.jsx`:
   - Filter bar (site, template, result)
   - Data table
   - New Inspection button (manager/admin)
2. Create `src/pages/NewInspectionPage.jsx`:
   - Site and template dropdowns
   - Dynamic checklist loading
   - Result selection for each item
   - Submit handling
3. Create `src/pages/InspectionDetailPage.jsx`:
   - Display inspection header
   - Display all responses in table

**Deliverables:**
- Full inspections workflow working
- Checklist loads dynamically

**Stories/Checklist:** US-INSP-02, US-INSP-03 (C12-C15)
**Test Cases:** TC-INSP-04, TC-INSP-05, TC-INSP-07, TC-INSP-08

---

### Step 22: Admin Module

**Goal:** Sites, Incident Types, and Templates management (admin only)

**Tasks:**
1. Create `src/pages/AdminPage.jsx`:
   - Sub-navigation: Sites, Incident Types, Templates
2. Create `src/components/Admin/SitesManager.jsx`:
   - Sites table
   - Add/Edit modal
3. Create `src/components/Admin/IncidentTypesManager.jsx`:
   - Incident types table
   - Add/Edit modal
   - Deactivate/reactivate action
4. Create `src/components/Admin/TemplatesManager.jsx`:
   - Templates table
   - Link to template detail
5. Create `src/pages/TemplateDetailPage.jsx`:
   - Template name/description
   - Items management
   - Save functionality
6. Protect admin routes from non-admins

**Deliverables:**
- Admin can manage sites, incident types, and templates
- Non-admins cannot access admin pages

**Stories/Checklist:** US-SITE-01, US-REF-02, US-INSP-01 (C16-C19, C8-C11)
**Test Cases:** TC-SITE-01, TC-SITE-02, TC-REF-03, TC-REF-04, TC-AUTH-05, TC-AUTH-06

---

### Step 23: Polish & Testing

**Goal:** Execute all P1 test cases, fix defects

**Tasks:**
1. Execute all 28 Phase 1 test cases
2. Document results (Pass/Fail/Blocked)
3. Fix any failing tests
4. Improve error messages (C62)
5. Add empty state messages
6. Verify form validation is clear
7. Make tables sortable (C61)
8. Test responsiveness on tablet (C63)
9. Verify no broken buttons (C72)
10. Verify no 500 errors (C73)

**Deliverables:**
- All test cases passing
- UX polished

**Stories/Checklist:** All P1, C59-C63, C71-C75
**Test Cases:** All P1 TC-IDs

---

## 3. Implementation Summary

| Step | Focus | Duration Estimate | Dependencies |
|------|-------|-------------------|--------------|
| 1-5 | Backend foundation | - | None |
| 6-7 | Auth | - | Steps 1-5 |
| 8-9 | Sites & Types | - | Step 7 |
| 10 | Incidents | - | Steps 8-9 |
| 11-12 | Inspections | - | Steps 8-9 |
| 13 | Dashboard | - | Steps 10-12 |
| 14 | Backend tests | - | Steps 6-13 |
| 15-16 | Frontend foundation | - | None |
| 17 | Login | - | Steps 15-16 |
| 18 | Layout | - | Step 17 |
| 19 | Dashboard UI | - | Steps 13, 18 |
| 20 | Incidents UI | - | Steps 10, 18 |
| 21 | Inspections UI | - | Steps 11-12, 18 |
| 22 | Admin UI | - | Steps 8, 11, 18 |
| 23 | Polish | - | All above |

---

## 4. Definition of Done (Per Step)

Each step is complete when:
- [ ] All tasks completed
- [ ] Code follows project structure
- [ ] No linting errors
- [ ] Related test cases pass
- [ ] Manually tested in browser/Postman
- [ ] No console errors

---

## 5. Phase 1 Completion Criteria

Phase 1 is complete when:
- [ ] All 23 implementation steps done
- [ ] All 28 Phase 1 test cases pass
- [ ] All 27 Phase 1 checklist items satisfied
- [ ] All 7 Phase 1 user journeys executable
- [ ] No critical/high defects open
- [ ] Code committed and documented

---

## 6. Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DATA_MODEL.md](./DATA_MODEL.md) - Database schema
- [API_SPEC_PHASE1.md](./API_SPEC_PHASE1.md) - API specifications
- [FRONTEND_UX_PHASE1.md](./FRONTEND_UX_PHASE1.md) - UI screens
- [TEST_STRATEGY_PHASE1.md](./TEST_STRATEGY_PHASE1.md) - Testing approach
- [USER_STORIES.md](./USER_STORIES.md) - User stories
- [USER_JOURNEYS.md](./USER_JOURNEYS.md) - User flows




# Phase 1 Implementation Checklist


## Backend


### Foundation

- [ ] **Create backend project skeleton** – Set up Node + Express project, package.json, basic folder structure (src/routes, src/middleware, src/config, etc.).
- [ ] **Configure environment and DB connection** – Add .env.example, configure Postgres connection module, and ensure connection works against local/dev DB.
- [ ] **Add core middleware** – Implement JSON body parsing, CORS (if needed), request logging, global error handler, and 404 handling.

### Auth

- [ ] **Implement JWT auth utilities and middleware** – Create utilities for signing/verifying JWT and middleware that attaches user/role to req or rejects invalid tokens.

### DB Schema & Migrations

- [ ] **Create Users migration** – Table with id, email, password hash, role ('admin' etc.) plus timestamps; matches DATA_MODEL_PHASE1.md.
- [ ] **Create Sites migration** – Sites table as per data model; includes name/code and any required fields and constraints.
- [ ] **Create IncidentTypes migration** – IncidentTypes table with fields/constraints and support for admin-configurable types (C6/C19).
- [ ] **Create Incidents migration** – Incidents table with fields for site, type, severity, status, occurred_at, reported_by, etc., matching data model.
- [ ] **Create InspectionTemplates & Items migrations** – Tables for templates and their checklist items with correct relationships and constraints.
- [ ] **Create Inspections & InspectionResponses migrations** – Tables for inspections and responses including enum values (ok, not_ok, na) and overall_result field.

### Auth APIs

- [ ] **POST /api/auth/login** – Implements login, checks credentials, returns JWT on success, proper 401/403 on failure as per API spec.
- [ ] **GET /api/auth/me** – Returns current user profile and role based on JWT; rejects unauthenticated requests.

### Sites APIs

- [ ] **GET /api/sites** – Returns list of sites for authenticated users; supports any filters required in API spec.
- [ ] **POST /api/sites (admin only)** – Allows admins to create sites with validation and proper error responses.
- [ ] **PUT /api/sites/:id (admin only)** – Allows admins to edit existing sites; enforces uniqueness and constraints.

### IncidentTypes APIs

- [ ] **GET /api/incident-types** – Returns active incident types; used by forms and templates.
- [ ] **Admin CRUD for incident types** – Endpoints for create/update/deactivate incident types; access controlled to admin role; satisfies C6/C19.

### Incidents APIs

- [ ] **POST /api/incidents** – Creates new incident with default status and links to site/type; validates required fields.
- [ ] **GET /api/incidents with filters** – Lists incidents with filters exactly as per API spec (e.g., status, siteId, date range).
- [ ] **GET /api/incidents/:id** – Returns full incident detail including site/type data.
- [ ] **Update incident status** – Implements status update endpoint(s) using the approved HTTP method/path; enforces allowed transitions and RBAC.

### Inspection Templates APIs

- [ ] **Template management endpoints** – Create/list/detail/update templates and items, restricted to admin where specified.

### Inspections APIs

- [ ] **Create inspection from template** – POST /api/inspections creates an inspection with responses based on selected template items.
- [ ] **List and detail inspections** – GET /api/inspections and GET /api/inspections/:id implemented as per spec.

### Inspections Logic

- [ ] **Overall result calculation** – Implements service logic to calculate 'pass'/'fail' from responses (any not_ok = fail) and unit tests for it.

### Dashboard API

- [ ] **GET /api/dashboard/summary** – Implements aggregations for incident/inspection counts and trends defined for Phase 1.

### Tests

- [ ] **Implement backend tests for auth & sites** – Write and run tests mapped to auth and site TC-IDs in test_cases_phase1.csv.
- [ ] **Implement backend tests for incidents & inspections** – Write and run tests for core incident and inspection flows mapped to Phase 1 TC-IDs.
- [ ] **Implement backend tests for dashboard & templates** – Tests for dashboard aggregations and inspection template endpoints mapped to relevant TC-IDs.

### Handover

- [ ] **Update HANDOVER_TO_CLAUDE.md for backend work** – Summarize backend implementation status, US-IDs, C-IDs, TC-IDs covered, files changed, and remaining backend tasks.

## Frontend


### Foundation

- [x] **Create frontend project skeleton** – Set up React + Vite project, base folder structure (routes, components, api, styles).
- [x] **Implement app shell/layout** – Create main layout with sidebar/topbar, content area, and role-aware navigation matching FRONTEND_UX_PHASE1.md (including disabled Actions item for C60).

### Auth Flow

- [x] **Login page UI** – Build login form with email/password fields and basic validation/error states.
- [x] **Login API integration** – Wire login form to POST /api/auth/login; on success, store token and redirect to dashboard; on error, show message.
- [x] **Session handling and /auth/me** – On app load, call GET /api/auth/me when token present, set user/role in state, and handle invalid token by redirecting to login.

### Dashboard

- [x] **Dashboard UI layout** – Build dashboard page layout with KPI cards, charts, and recent lists as defined in FRONTEND_UX_PHASE1.md.
- [x] **Dashboard data integration** – Call GET /api/dashboard/summary and bind data to KPI cards, charts, and tables; handle loading/empty/error states.

### Incidents

- [x] **Incidents list UI** – Implement incidents list table with columns, filters, and pagination (if required) per UX spec.
- [x] **Incidents list API integration** – Wire list to GET /api/incidents with the supported filters; ensure UI filters match API query parameters.
- [x] **New incident form UI** – Build create incident form with fields defined in UX and validation messages.
- [x] **New incident API integration** – Connect form to POST /api/incidents; show success/failure and navigate appropriately.
- [x] **Incident detail view & status update** – Implement detail page and status update controls that call the appropriate incident status endpoint (PUT as per spec).

### Inspections

- [x] **Inspections list UI** – Create inspections list page showing key columns and status, per UX design.
- [x] **Inspection creation UI from template** – Build flow to select site + template and render checklist items with ok/not_ok/na selectors and comments.
- [x] **Inspections API integration** – Wire inspection create/list/detail pages to /api/inspections endpoints with proper payloads and error handling.

### Admin: Sites

- [x] **Sites admin UI** – Create admin page for listing, creating, and editing sites with form validation and error messages.
- [x] **Sites admin API wiring** – Connect Sites admin UI to sites CRUD endpoints and restrict access to admin role in the UI.

### Admin: Incident Types

- [x] **Incident types admin UI** – Create admin page for managing incident types (list/add/edit/deactivate) as per UX and C6/C19.
- [x] **Incident types API wiring** – Connect incident type admin UI to incident type admin endpoints; enforce admin-only access in UI.

### Admin: Inspection Templates

- [x] **Inspection templates UI** – Implement template management UI with ability to add/edit/delete template items.
- [x] **Templates API wiring** – Connect template UI to inspection template endpoints; restrict editing to admin role.

### UX Polish

- [x] **Loading, empty, and error states** – Ensure key pages (login, dashboard, incidents, inspections, admin screens) show sensible loading, empty, and error UI states.

### Tests

- [x] **Basic frontend tests/smoke checks** – Add basic tests or smoke checks for critical flows (login, incident create, inspection create) mapped to selected TC-IDs.

### Handover

- [x] **Update HANDOVER_TO_CLAUDE.md for frontend work** – Summarize frontend implementation status, US-IDs, C-IDs, TC-IDs covered, files changed, and remaining tasks.
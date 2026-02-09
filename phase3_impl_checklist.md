# Phase 3 Implementation Checklist

## Overview

This checklist tracks the implementation progress for Phase 3: Multi-Organisation & Enterprise Reporting.

**Status Key:**
- [ ] Not started
- [x] Complete
- [~] In progress
- [!] Blocked

---

## 1. Database & Migration

### 1.1 Migration Script
- [x] Create `migrations/003_phase3_multitenant.sql`
- [x] Create `organisations` table with all columns
- [x] Add `is_active` column to `users` table
- [x] Add `organisation_id` to `attachments` table
- [x] Add `organisation_id` to `audit_log` table
- [x] Add foreign key constraints for all tables
- [x] Create performance indexes for org-scoped queries
- [x] Create composite indexes for export queries
- [ ] Test migration on empty database
- [ ] Test migration on database with existing data

### 1.2 Seed Script
- [x] Create `seed-org` CLI script
- [x] Script creates organisation with name, slug
- [x] Script creates first admin user
- [x] Script handles password hashing
- [x] Script validates input parameters
- [ ] Document CLI usage in README

---

## 2. Backend - Foundation (P3.1)

### 2.1 Organisation Repository
- [x] Create `OrganisationRepository` class (inline in routes)
- [x] Implement `findById(id)`
- [x] Implement `update(id, data)`
- [x] Implement `updateSettings(id, settings)`
- [x] Implement `updateLogo(id, logoUrl)`

### 2.2 Organisation Service
- [x] Create `OrganisationService` class (inline in routes/organisation.js)
- [x] Implement `getById(orgId)` method
- [x] Implement `update(orgId, data)` method
- [x] Implement `uploadLogo(orgId, file)` method
- [x] Implement `deleteLogo(orgId)` method
- [x] Implement `updateDashboardSettings(orgId, settings)` method
- [x] Add timezone validation (IANA format)
- [x] Add threshold validation (critical >= warning)

### 2.3 JWT & Auth Updates
- [x] Update JWT payload to include `organisationId`
- [x] Update JWT payload to include `organisationSlug`
- [x] Update login to fetch user's organisation
- [x] Update login response with org info
- [x] Update login to check `user.is_active`
- [x] Return 401 with `ACCOUNT_DISABLED` for inactive users

### 2.4 Org Scope Middleware
- [x] Create `orgScopeMiddleware`
- [x] Extract `organisationId` from JWT
- [x] Validate organisation exists
- [x] Validate organisation is active
- [x] Inject `req.orgId` and `req.organisation`
- [x] Return 403 for inactive organisations

### 2.5 Route Updates
- [x] Apply `orgScopeMiddleware` to Phase 3 routes
- [ ] Update incidents routes to use `req.orgId` (Phase 3.5)
- [ ] Update inspections routes to use `req.orgId` (Phase 3.5)
- [ ] Update actions routes to use `req.orgId` (Phase 3.5)
- [ ] Update sites routes to use `req.orgId` (Phase 3.5)
- [ ] Update templates routes to use `req.orgId` (Phase 3.5)
- [ ] Update dashboard routes to use `req.orgId` (Phase 3.5)
- [ ] Update incident-types routes for org + system types (Phase 3.5)

### 2.6 Repository Updates
- [ ] Update `IncidentRepository` to filter by org_id (Phase 3.5)
- [ ] Update `InspectionRepository` to filter by org_id (Phase 3.5)
- [ ] Update `ActionRepository` to filter by org_id (Phase 3.5)
- [ ] Update `SiteRepository` to filter by org_id (Phase 3.5)
- [ ] Update `TemplateRepository` to filter by org_id (Phase 3.5)
- [ ] Update `AttachmentRepository` to filter by org_id (Phase 3.5)
- [x] Update `AuditLogRepository` to support org_id
- [ ] Update all INSERT queries to include org_id (Phase 3.5)

---

## 3. Backend - User Management (P3.2)

### 3.1 User Admin Service
- [x] Create `UserAdminService` class (inline in routes/orgUsers.js)
- [x] Implement `listByOrganisation(orgId)` method
- [x] Implement `getById(orgId, userId)` method
- [x] Implement `create(orgId, userData)` method
- [x] Implement `update(orgId, userId, data)` method
- [x] Implement `setActive(orgId, userId, isActive)` method
- [x] Implement `resetPassword(orgId, userId, newPassword)` method
- [x] Add email uniqueness validation within org
- [x] Add last-admin protection on disable
- [x] Add cannot-change-own-role validation

### 3.2 User Management Routes
- [x] Create `GET /api/org-users` endpoint
- [x] Create `POST /api/org-users` endpoint
- [x] Create `GET /api/org-users/:id` endpoint
- [x] Create `PUT /api/org-users/:id` endpoint
- [x] Create `POST /api/org-users/:id/disable` endpoint
- [x] Create `POST /api/org-users/:id/enable` endpoint
- [x] Create `POST /api/org-users/:id/reset-password` endpoint
- [x] Apply admin-only middleware to all endpoints
- [x] Validate user belongs to admin's org

---

## 4. Backend - Organisation Settings (P3.3)

### 4.1 Organisation Routes
- [x] Create `GET /api/organisation` endpoint
- [x] Create `PUT /api/organisation` endpoint
- [x] Create `POST /api/organisation/logo` endpoint
- [x] Create `DELETE /api/organisation/logo` endpoint
- [x] Create `PUT /api/organisation/dashboard-settings` endpoint
- [x] Apply role checks (admin for write, all for read)

### 4.2 Logo Handling
- [x] Configure multer for logo uploads
- [x] Validate file type (PNG, JPEG, SVG)
- [x] Validate file size (max 2MB)
- [x] Store in `/uploads/logos/{orgId}/`
- [x] Generate unique filename
- [x] Delete old logo on replacement
- [x] Delete file on logo removal

---

## 5. Backend - Exports (P3.4)

### 5.1 Export Service
- [x] Create `ExportService` class (inline in routes/exports.js)
- [x] Implement `exportIncidents(orgId, filters, res)` method
- [x] Implement `exportInspections(orgId, filters, res)` method
- [x] Implement `exportActions(orgId, filters, res)` method
- [x] Implement CSV streaming (native - no fast-csv dependency)
- [x] Set correct response headers
- [x] Generate filename with org-slug and date

### 5.2 Export Filters
- [x] Implement date range filter (startDate, endDate)
- [x] Implement site filter
- [x] Implement status filter
- [x] Implement severity filter (incidents)
- [x] Implement result filter (inspections)
- [x] Implement due date filter (actions)
- [x] Validate filter parameters

### 5.3 Export Limits
- [x] Implement row count check (max 10,000)
- [x] Return 400 with `TOO_MANY_ROWS` if exceeded
- [x] Include helpful error message

### 5.4 Rate Limiting
- [x] Create rate limit middleware for exports
- [x] Configure 30-second window per user
- [x] Store rate limit state (in-memory)
- [x] Return 429 with `RATE_LIMITED` error
- [x] Include `Retry-After` header
- [x] Include `X-RateLimit-*` headers

### 5.5 Export Routes
- [x] Create `GET /api/exports/incidents` endpoint
- [x] Create `GET /api/exports/inspections` endpoint
- [x] Create `GET /api/exports/actions` endpoint
- [x] Apply manager/admin role check
- [x] Apply rate limit middleware

---

## 6. Backend - Integration (P3.5)

### 6.1 Dashboard Updates
- [ ] Update dashboard service to use org thresholds
- [ ] Return threshold-based status for KPIs
- [ ] Fall back to defaults if no custom thresholds

### 6.2 Audit Logging
- [ ] Add org_id to all audit log entries
- [ ] Log organisation settings changes
- [ ] Log user management events
- [ ] Log export events (optional)

---

## 7. Frontend - Foundation (P3.1)

### 7.1 Context Updates
- [ ] Create `OrgContext` provider
- [ ] Implement `useOrg` hook
- [ ] Fetch organisation on app mount
- [ ] Store organisation in context
- [ ] Implement `refetchOrg` function
- [ ] Update `AuthContext` with organisationId

### 7.2 Header Updates
- [ ] Create `OrgLogo` component
- [ ] Display logo if `logoUrl` exists
- [ ] Display org name as fallback
- [ ] Update `Header` component to use `OrgLogo`

---

## 8. Frontend - User Management (P3.2)

### 8.1 User Management Page
- [ ] Create `UserManagementPage` component
- [ ] Add route `/admin/users`
- [ ] Implement loading state
- [ ] Implement error state
- [ ] Implement empty state

### 8.2 User Table Component
- [ ] Create `UserTable` component
- [ ] Display user name, email, role, status
- [ ] Implement role badges (color-coded)
- [ ] Implement status badges (Active/Disabled)
- [ ] Implement actions menu (dropdown)

### 8.3 User Form Modal
- [ ] Create `UserFormModal` component
- [ ] Implement create mode
- [ ] Implement edit mode (no password field)
- [ ] Add form validation
- [ ] Handle API errors (duplicate email, etc.)

### 8.4 Other Modals
- [ ] Create `ResetPasswordModal` component
- [ ] Create `DisableUserModal` component (confirmation)
- [ ] Implement password match validation
- [ ] Implement success/error handling

### 8.5 Navigation
- [ ] Add "Users" link to Admin sidebar
- [ ] Show only for Admin role

---

## 9. Frontend - Organisation Settings (P3.3)

### 9.1 Organisation Settings Page
- [ ] Create `OrgSettingsPage` component
- [ ] Add route `/admin/organisation`
- [ ] Layout with three sections (Profile, Logo, Thresholds)

### 9.2 Profile Section
- [ ] Create `OrgProfileForm` component
- [ ] Name input with validation
- [ ] Timezone selector (searchable dropdown)
- [ ] Save button with loading state

### 9.3 Logo Section
- [ ] Create `LogoUploader` component
- [ ] Display current logo preview
- [ ] File input for upload
- [ ] Delete button
- [ ] Show file type/size requirements
- [ ] Handle upload progress

### 9.4 Threshold Section
- [ ] Create `ThresholdSettings` component
- [ ] Inputs for warning/critical thresholds
- [ ] Validation (critical >= warning)
- [ ] Save button with loading state

### 9.5 Navigation
- [ ] Add "Organisation" link to Admin sidebar
- [ ] Show only for Admin role

---

## 10. Frontend - Exports (P3.4)

### 10.1 Reports Page
- [ ] Create `ReportsPage` component
- [ ] Add route `/reports`
- [ ] Layout with three export sections

### 10.2 Export Panels
- [ ] Create `ExportPanel` component
- [ ] Date range inputs
- [ ] Filter dropdowns (site, status, etc.)
- [ ] Export button

### 10.3 Export Button
- [ ] Create `ExportButton` component
- [ ] Default state
- [ ] Loading state (exporting...)
- [ ] Rate limited state (countdown)

### 10.4 Error Handling
- [ ] Create row limit error modal
- [ ] Handle 429 response with toast
- [ ] Show countdown timer

### 10.5 Navigation
- [ ] Add "Reports" link to sidebar
- [ ] Show for Manager and Admin roles

---

## 11. Frontend - Dashboard Updates (P3.5)

### 11.1 KPI Card Updates
- [ ] Update `KPICard` component for threshold colors
- [ ] Fetch thresholds from org settings
- [ ] Implement color logic (green/yellow/red)
- [ ] Style updates for each state

---

## 12. Testing

### 12.1 Backend Unit Tests
- [x] OrganisationService tests (tests/organisation.test.js)
- [x] UserAdminService tests (tests/orgUsers.test.js)
- [x] ExportService tests (tests/exports.test.js)
- [x] orgScopeMiddleware tests (covered in organisation.test.js)
- [x] Auth/disabled user tests (tests/authPhase3.test.js)

### 12.2 Backend Integration Tests
- [x] Organisation endpoints tests
- [x] User management endpoints tests
- [x] Export endpoints tests
- [ ] Cross-org access prevention tests (needs multiple orgs)
- [x] Rate limiting tests

### 12.3 Frontend Component Tests
- [ ] OrgLogo component tests
- [ ] UserTable component tests
- [ ] UserFormModal component tests
- [ ] ExportButton component tests
- [ ] ThresholdSettings component tests

### 12.4 End-to-End Tests
- [ ] Admin configures organisation flow
- [ ] Admin manages users flow
- [ ] Manager exports data flow
- [ ] Cross-org access blocked flow
- [ ] Disabled user cannot login flow

### 12.5 Regression Tests
- [ ] Phase 1 regression suite passes
- [ ] Phase 2 regression suite passes

---

## 13. Documentation

- [ ] Update API documentation
- [ ] Update user guide
- [ ] Document CLI tool usage
- [ ] Update deployment guide
- [ ] Create Phase 3 release notes

---

## 14. UAT Sign-off

### 14.1 Organisation Settings
- [ ] Admin can view settings
- [ ] Admin can update name
- [ ] Admin can update timezone
- [ ] Admin can upload logo
- [ ] Logo displays in header
- [ ] Admin can configure thresholds
- [ ] Dashboard reflects thresholds

### 14.2 User Management
- [ ] Admin can list users
- [ ] Admin can create user
- [ ] New user can login
- [ ] Admin can update user
- [ ] Admin can disable user
- [ ] Disabled user cannot login
- [ ] Admin can enable user
- [ ] Admin can reset password

### 14.3 Exports
- [ ] Manager can export incidents
- [ ] Manager can export inspections
- [ ] Manager can export actions
- [ ] Filters work correctly
- [ ] Row limit enforced
- [ ] Rate limit works
- [ ] Files download correctly

### 14.4 Data Isolation
- [ ] Users only see their org's data
- [ ] Exports only include org's data
- [ ] Cannot access other org's resources

---

## 15. Deployment

- [ ] Database migration tested
- [ ] Seed script tested
- [ ] Environment variables configured
- [ ] Feature flags (if any) enabled
- [ ] Monitoring configured
- [ ] Rollback plan documented

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | | | |
| QA Lead | | | |
| Product Owner | | | |

---

*Last Updated: [DATE]*

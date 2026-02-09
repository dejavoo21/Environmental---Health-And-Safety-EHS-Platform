# Test Strategy - EHS Portal Phase 3: Multi-Organisation & Enterprise Reporting

## 1. Overview

This document defines the test strategy for Phase 3 of the EHS Portal. Phase 3 introduces multi-organisation support, user management, and data export capabilities, which require careful testing to ensure data isolation and security.

**Test Scope:**
- Multi-tenant data isolation
- Organisation settings and branding
- User management (CRUD, disable/enable, password reset)
- Data exports (CSV streaming, filtering, rate limiting)
- Dashboard threshold integration

**Critical Risks:**
- Cross-tenant data leakage
- Disabled user authentication bypass
- Export security and performance
- Rate limiting effectiveness

---

## 2. Test Levels

### 2.1 Unit Tests

**Focus:** Individual functions and services in isolation.

| Component | Test Focus |
|-----------|------------|
| OrganisationService | Settings validation, logo handling |
| UserAdminService | User CRUD, validation rules |
| ExportService | CSV generation, filtering logic |
| orgScopeMiddleware | Org context extraction and validation |
| Validators | Timezone format, threshold values, file types |

**Tools:** Jest, Vitest

### 2.2 Integration Tests

**Focus:** Service interactions and database operations.

| Area | Test Focus |
|------|------------|
| Organisation endpoints | Full request/response cycle |
| User management endpoints | CRUD with database state |
| Export endpoints | Query execution, CSV output |
| Org scoping | Cross-org access attempts |

**Tools:** Jest + Supertest, test database

### 2.3 API Tests

**Focus:** REST API contract validation.

| Endpoint Group | Test Focus |
|----------------|------------|
| /api/organisation | GET, PUT, POST logo, DELETE logo, PUT settings |
| /api/org-users | GET list, POST create, PUT update, disable, enable, reset |
| /api/exports | All three export types with filters |

**Tools:** Supertest, Postman collections

### 2.4 Frontend Component Tests

**Focus:** React component behavior.

| Component | Test Focus |
|-----------|------------|
| OrgLogo | Logo display, fallback text |
| UserTable | List rendering, action menus |
| UserFormModal | Form validation, submission |
| ExportButton | States (default, loading, rate-limited) |
| ExportPanel | Filter changes, export triggering |
| ThresholdSettings | Validation (critical >= warning) |

**Tools:** Vitest + React Testing Library

### 2.5 End-to-End Tests

**Focus:** Complete user journeys through the application.

| Journey | Description |
|---------|-------------|
| P3-J1 | Admin configures organisation settings |
| P3-J2 | Admin manages users (create, update, disable) |
| P3-J3 | Manager exports incidents with filters |
| P3-J4 | Cross-org access attempt fails |
| P3-J5 | Disabled user cannot login |

**Tools:** Playwright

### 2.6 User Acceptance Tests (UAT)

**Focus:** Business stakeholder validation.

| Scenario | Stakeholder |
|----------|-------------|
| Organisation branding works | Admin |
| User management complete | Admin |
| Exports useful for reporting | Manager |
| Data isolation verified | Security |

---

## 3. Traceability Model

```
C-ID (Checklist) → US-ID (User Story) → WF-ID (Workflow) → TC-ID (Test Case)
```

### 3.1 Phase 3 Traceability Matrix

| C-ID | US-ID | WF-ID | TC-IDs |
|------|-------|-------|--------|
| C71 | US-P3-01 | WF-P3-01 | TC-P3-001 to TC-P3-005 |
| C72 | US-P3-06 | WF-P3-06 | TC-P3-006 to TC-P3-010 |
| C73 | - | - | TC-P3-011 to TC-P3-020 |
| C74 | - | - | TC-P3-021 to TC-P3-030 |
| C77 | US-P3-05 | WF-P3-05 | TC-P3-031 to TC-P3-035 |
| C78 | US-P3-06 | WF-P3-06 | TC-P3-036 to TC-P3-045 |
| C79 | US-P3-07 | WF-P3-07 | TC-P3-046 to TC-P3-055 |
| C80 | US-P3-08 | WF-P3-08 | TC-P3-056 to TC-P3-065 |
| C81 | US-P3-06, US-P3-07 | WF-P3-06, WF-P3-07 | TC-P3-066 to TC-P3-070 |
| C82 | US-P3-06 | WF-P3-06 | TC-P3-071 to TC-P3-073 |
| C83 | US-P3-09 | WF-P3-09 | TC-P3-074 to TC-P3-080 |
| C84 | US-P3-10 | WF-P3-10 | TC-P3-081 to TC-P3-090 |
| C85 | US-P3-11 | WF-P3-11 | TC-P3-091 to TC-P3-100 |
| C86 | US-P3-12 | WF-P3-12 | TC-P3-101 to TC-P3-110 |
| C87 | US-P3-10-12 | WF-P3-10-12 | TC-P3-111 to TC-P3-120 |
| C88 | US-P3-10-12 | WF-P3-10-12 | TC-P3-121 to TC-P3-125 |
| C89 | US-P3-10-12 | WF-P3-10-12 | TC-P3-126 to TC-P3-128 |
| C90 | US-P3-10-12 | WF-P3-10-12 | TC-P3-129 to TC-P3-140 |
| C91 | US-P3-01, US-P3-02 | WF-P3-01, WF-P3-02 | TC-P3-141 to TC-P3-150 |
| C92 | US-P3-03 | WF-P3-03 | TC-P3-151 to TC-P3-160 |
| C93 | US-P3-02 | WF-P3-02 | TC-P3-161 to TC-P3-165 |
| C94 | US-P3-04 | WF-P3-04 | TC-P3-166 to TC-P3-175 |
| C95 | US-P3-02-04 | WF-P3-02-04 | TC-P3-176 to TC-P3-180 |

---

## 4. Test Categories

### 4.1 Multi-Tenant Isolation Tests

**Priority:** CRITICAL

These tests verify that data isolation between organisations is enforced.

| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| TC-P3-021 | User A (Org 1) tries GET /api/incidents | Returns only Org 1 incidents |
| TC-P3-022 | User A (Org 1) tries GET /api/incidents/:id for Org 2 incident | 404 Not Found |
| TC-P3-023 | User A (Org 1) tries POST /api/incidents with Org 2 site_id | 400 or 404 |
| TC-P3-024 | User A (Org 1) tries GET /api/org-users for Org 2 | 403 Forbidden |
| TC-P3-025 | User A (Org 1) tries GET /api/exports/incidents | Returns only Org 1 data |
| TC-P3-026 | User A (Org 1) tries PUT /api/organisation for Org 2 | 403 Forbidden |
| TC-P3-027 | JWT with invalid org_id | 401 or 403 |
| TC-P3-028 | JWT with inactive org | 403 Forbidden |

### 4.2 User Management Tests

**Priority:** HIGH

| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| TC-P3-036 | Admin creates user with valid data | 201 Created |
| TC-P3-037 | Admin creates user with duplicate email in same org | 409 Conflict |
| TC-P3-038 | Admin creates user with duplicate email in different org | 201 Created |
| TC-P3-039 | Admin creates user with invalid role | 400 Bad Request |
| TC-P3-040 | Admin creates user with short password | 400 Bad Request |
| TC-P3-041 | Non-admin tries to create user | 403 Forbidden |
| TC-P3-056 | Admin disables user | User.isActive = false |
| TC-P3-057 | Disabled user tries to login | 401 Account Disabled |
| TC-P3-058 | Admin tries to disable themselves | 400 Cannot disable self |
| TC-P3-059 | Admin tries to disable last admin | 400 Last admin |
| TC-P3-060 | Admin enables disabled user | User.isActive = true |
| TC-P3-046 | Admin changes user role | Role updated |
| TC-P3-047 | Admin tries to change own role | 400 Cannot change own role |
| TC-P3-074 | Admin resets user password | Password updated |
| TC-P3-075 | Password reset with short password | 400 Bad Request |

### 4.3 Organisation Settings Tests

**Priority:** HIGH

| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| TC-P3-141 | GET organisation returns current settings | 200 OK with org data |
| TC-P3-142 | Worker can GET organisation | 200 OK |
| TC-P3-143 | Admin updates org name | Name updated |
| TC-P3-144 | Worker tries PUT organisation | 403 Forbidden |
| TC-P3-161 | Admin updates timezone | Timezone updated |
| TC-P3-162 | Admin sets invalid timezone | 400 Bad Request |
| TC-P3-151 | Admin uploads PNG logo | Logo saved, URL returned |
| TC-P3-152 | Admin uploads JPEG logo | Logo saved, URL returned |
| TC-P3-153 | Admin uploads SVG logo | Logo saved, URL returned |
| TC-P3-154 | Admin uploads PDF (invalid) | 400 Invalid file type |
| TC-P3-155 | Admin uploads 3MB file (too large) | 400 File too large |
| TC-P3-156 | Admin deletes logo | Logo removed |
| TC-P3-166 | Admin sets dashboard thresholds | Thresholds saved |
| TC-P3-167 | Admin sets critical < warning | 400 Invalid threshold |
| TC-P3-168 | Dashboard uses custom thresholds | KPI colors reflect settings |

### 4.4 Export Tests

**Priority:** HIGH

| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| TC-P3-081 | Manager exports incidents | CSV file downloads |
| TC-P3-082 | Worker tries to export | 403 Forbidden |
| TC-P3-083 | Export with date range filter | Only filtered records |
| TC-P3-084 | Export with site filter | Only filtered records |
| TC-P3-085 | Export with status filter | Only filtered records |
| TC-P3-086 | Export with severity filter | Only filtered records |
| TC-P3-087 | Export has correct columns | All expected columns present |
| TC-P3-088 | Export filename includes org-slug | Correct filename format |
| TC-P3-089 | Export only includes org's data | No cross-tenant data |
| TC-P3-129 | Export > 10K rows | 400 Too many rows |
| TC-P3-130 | Export rate limited | 429 after first export |
| TC-P3-131 | Rate limit resets after 30s | Export succeeds |
| TC-P3-132 | Rate limit headers present | X-RateLimit-* headers |
| TC-P3-133 | Retry-After header on 429 | Header present |

### 4.5 Dashboard Integration Tests

| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| TC-P3-168 | Dashboard with default thresholds | Green/yellow/red based on defaults |
| TC-P3-169 | Dashboard with custom thresholds | Colors reflect custom settings |
| TC-P3-170 | KPI value at warning threshold | Yellow indicator |
| TC-P3-171 | KPI value at critical threshold | Red indicator |
| TC-P3-172 | KPI value below warning | Green indicator |

---

## 5. Security Test Scenarios

### 5.1 Cross-Tenant Access

| Scenario | Test Method |
|----------|-------------|
| Direct ID access | Attempt to access resources by guessing UUIDs |
| Query parameter manipulation | Add org_id to query params |
| JWT tampering | Modify organisationId in token |
| Disabled org access | Access after org is disabled |

### 5.2 Authentication Bypass

| Scenario | Test Method |
|----------|-------------|
| Disabled user login | Login after admin disables account |
| Existing session after disable | Use existing JWT after disable |
| Invalid token | Expired, malformed, or missing token |

### 5.3 Authorization Bypass

| Scenario | Test Method |
|----------|-------------|
| Worker accesses admin endpoints | Try /api/org-users as worker |
| Manager accesses admin settings | Try PUT /api/organisation as manager |
| Worker exports data | Try /api/exports as worker |

---

## 6. Performance Test Scenarios

### 6.1 Export Performance

| Scenario | Target |
|----------|--------|
| Export 1,000 records | < 3 seconds |
| Export 5,000 records | < 10 seconds |
| Export 10,000 records | < 30 seconds |
| Export with complex filters | < 15 seconds |

### 6.2 User List Performance

| Scenario | Target |
|----------|--------|
| List 50 users | < 500ms |
| List 100 users | < 1 second |

### 6.3 Rate Limiting

| Scenario | Expected |
|----------|----------|
| Concurrent export requests | Only one succeeds, others get 429 |
| Rate limit accuracy | 30s ± 1s window |

---

## 7. Test Data Requirements

### 7.1 Multi-Org Test Data

```
Organisation 1: "Acme Corp"
  - Admin: admin1@acme.com
  - Manager: manager1@acme.com
  - Worker: worker1@acme.com
  - Sites: 3
  - Incidents: 50
  - Inspections: 30
  - Actions: 40

Organisation 2: "Beta Inc"
  - Admin: admin2@beta.com
  - Manager: manager2@beta.com
  - Worker: worker2@beta.com
  - Sites: 2
  - Incidents: 25
  - Inspections: 15
  - Actions: 20
```

### 7.2 Edge Case Data

- User with very long name (200 chars)
- Organisation with special characters in name
- Export with 10,001 records (just over limit)
- User with disabled status
- Organisation with custom thresholds

---

## 8. Test Environment

### 8.1 Environment Setup

```
Test Database: ehs_portal_test
- Separate from development
- Reset between test runs
- Contains multi-org test data

Test File Storage:
- Temporary directory for logo uploads
- Cleaned after each test

Rate Limit Configuration:
- Reduced to 5 seconds for faster testing
- Configurable via environment variable
```

### 8.2 Test Isolation

- Each test suite uses transactions that rollback
- File uploads use temp directories
- Rate limit state cleared between tests

---

## 9. Regression Testing

### 9.1 Phase 1 & 2 Regression Scope

All Phase 1 and Phase 2 functionality must continue to work with org scoping:

| Feature | Regression Focus |
|---------|------------------|
| Login/Auth | Works with org context |
| Incidents | CRUD scoped to org |
| Inspections | CRUD scoped to org |
| Actions | CRUD scoped to org |
| Attachments | Scoped to org |
| Audit Log | Includes org_id |
| Dashboard | Shows org's data only |

### 9.2 Regression Test Execution

- Run full Phase 1 test suite with org-scoped user
- Run full Phase 2 test suite with org-scoped user
- Verify no cross-org data leakage

---

## 10. UAT Checklist

### 10.1 Organisation Settings UAT

- [ ] Admin can view organisation settings
- [ ] Admin can update organisation name
- [ ] Admin can change timezone
- [ ] Admin can upload logo
- [ ] Logo appears in header for all users
- [ ] Admin can remove logo
- [ ] Admin can set dashboard thresholds
- [ ] Dashboard colors reflect thresholds
- [ ] Non-admin cannot edit settings

### 10.2 User Management UAT

- [ ] Admin can see list of users
- [ ] Admin can create new user
- [ ] New user can login
- [ ] Admin can edit user details
- [ ] Admin can change user role
- [ ] Admin can disable user
- [ ] Disabled user cannot login
- [ ] Admin can enable user
- [ ] Re-enabled user can login
- [ ] Admin can reset password
- [ ] User can login with new password

### 10.3 Exports UAT

- [ ] Manager can access Reports page
- [ ] Manager can export incidents
- [ ] Export file downloads correctly
- [ ] Export has correct data
- [ ] Date filter works
- [ ] Site filter works
- [ ] Status filter works
- [ ] Cannot export more than 10K rows
- [ ] Rate limit message appears after export
- [ ] Can export again after 30 seconds

### 10.4 Data Isolation UAT

- [ ] User only sees their org's data
- [ ] Export only includes org's data
- [ ] Cannot access other org's settings
- [ ] Cannot manage other org's users

---

## 11. Exit Criteria

### 11.1 Test Coverage Requirements

| Category | Required Coverage |
|----------|-------------------|
| Unit Tests | 80% line coverage |
| API Tests | 100% endpoint coverage |
| Critical Paths | 100% test coverage |
| Security Tests | All scenarios executed |

### 11.2 Defect Criteria

| Severity | Exit Requirement |
|----------|------------------|
| Critical | 0 open |
| High | 0 open |
| Medium | < 3 open (with workarounds) |
| Low | No blocking issues |

### 11.3 Sign-off Requirements

- [ ] All test cases executed
- [ ] All critical/high defects resolved
- [ ] UAT scenarios approved by stakeholders
- [ ] Security review completed
- [ ] Performance targets met

---

## 12. Related Documents

- [BRD_EHS_PORTAL_PHASE3.md](./BRD_EHS_PORTAL_PHASE3.md) - Requirements
- [API_SPEC_PHASE3.md](./API_SPEC_PHASE3.md) - API specification
- [WORKFLOWS_PHASE3.md](./WORKFLOWS_PHASE3.md) - Workflows
- [test_cases_phase3.csv](../qa/test_cases_phase3.csv) - Test case details

---

*End of Document*

# Test Strategy - EHS Portal (Phase 1)

## 1. Overview

This document defines the testing approach for Phase 1 of the EHS Portal, aligned with:
- `TEST_STRATEGY_ALL_PHASES.md` - Overall test principles
- `test_cases_all_phases.csv` - Test case catalogue

### Testing Principles

| Principle | Application |
|-----------|-------------|
| **Shift-Left** | Testing starts at requirements; test cases defined before coding |
| **ATDD** | Acceptance criteria written for each story in Given/When/Then format |
| **TDD** | Critical logic (overall_result, aggregations) tested first |

---

## 2. Phase 1 Scope

### In-Scope Test Areas

| Area | Checklist IDs | Stories |
|------|---------------|---------|
| Auth & Users | C34-C39 | US-AUTH-01, US-AUTH-02 |
| Sites | C16-C18 | US-SITE-01 |
| Incident Types | C6, C7, C19 | US-REF-01, US-REF-02 |
| Incidents | C1-C5 | US-INC-01, US-INC-02, US-INC-03 |
| Inspection Templates | C8-C11 | US-INSP-01 |
| Inspections | C12-C15 | US-INSP-02, US-INSP-03 |
| Dashboard | C47-C55 | US-DASH-01 |
| UX | C59-C63 | Cross-cutting |

### Out-of-Scope (Deferred to Phase 2+)

- Actions/CAPA (C20-C33)
- Attachments (C28-C33)
- Audit logging (C40-C46)
- Multi-org (Phase 3)
- Analytics (Phase 4)
- Notifications (Phase 5)

---

## 3. Test Levels

### 3.1 Unit Tests

**Scope:** Pure functions, service logic

**Tool:** Jest

**Coverage Areas:**
- `inspectionService.calculateOverallResult()` - TDD required
- `dashboardService` aggregation functions
- Validation utilities
- Date/time formatting utilities

**Approach:** Test-Driven Development
1. Write failing test
2. Implement minimum code to pass
3. Refactor

### 3.2 API/Integration Tests

**Scope:** Express routes with database

**Tool:** Jest + Supertest

**Coverage Areas:**
- All API endpoints defined in API_SPEC_PHASE1.md
- Authentication flows
- Role-based access control
- Validation error handling

**Test Database:**
- Separate database or schema for tests
- Reset/seed before each test suite

### 3.3 UI/E2E Tests

**Scope:** User journeys through browser

**Tool:** Manual (Phase 1); Playwright/Cypress (later)

**Coverage Areas:**
- All 7 Phase 1 user journeys (P1-J1 to P1-J7)
- Form submissions
- Navigation flows
- Error states

### 3.4 Non-Functional Tests (Light)

**Scope:** Security, performance basics

**Coverage:**
- Protected endpoints reject unauthenticated requests
- No passwords in logs or responses
- Basic load time verification

---

## 4. ATDD - Acceptance Test Mapping

### Epic E1: Authentication

| Story | Acceptance Criteria (Given/When/Then) | TC-ID |
|-------|--------------------------------------|-------|
| US-AUTH-01 | **Given** valid credentials exist<br>**When** I login<br>**Then** I am redirected to dashboard with token stored | TC-AUTH-01 |
| US-AUTH-01 | **Given** invalid password<br>**When** I login<br>**Then** I see error message, no token stored | TC-AUTH-02 |
| US-AUTH-01 | **Given** no auth token<br>**When** I access protected route<br>**Then** API returns 401/403 | TC-AUTH-03 |
| US-AUTH-02 | **Given** logged in<br>**When** I call GET /auth/me<br>**Then** response includes my role | TC-AUTH-04 |
| US-AUTH-02 | **Given** logged in as worker<br>**When** I view navigation<br>**Then** Admin menu is hidden | TC-AUTH-05 |
| US-AUTH-02 | **Given** logged in as worker<br>**When** I call admin API<br>**Then** API returns 403 | TC-AUTH-06 |

### Epic E2: Sites

| Story | Acceptance Criteria | TC-ID |
|-------|---------------------|-------|
| US-SITE-01 | **Given** admin logged in<br>**When** I create site<br>**Then** site appears in list and dropdowns | TC-SITE-01 |
| US-SITE-01 | **Given** admin and site exists<br>**When** I edit site<br>**Then** updated values shown | TC-SITE-02 |
| US-SITE-01 | **Given** duplicate code<br>**When** I create site<br>**Then** validation error shown | TC-SITE-03 |

### Epic E2: Reference Data

| Story | Acceptance Criteria | TC-ID |
|-------|---------------------|-------|
| US-REF-01 | **Given** DB initialized<br>**When** GET /incident-types<br>**Then** seeded types returned | TC-REF-01 |
| US-REF-01 | **Given** on new incident form<br>**When** open type dropdown<br>**Then** types shown | TC-REF-02 |
| US-REF-02 | **Given** admin logged in<br>**When** I create an incident type<br>**Then** it appears in lists and forms | TC-REF-03 |
| US-REF-02 | **Given** admin logged in<br>**When** I update or deactivate an incident type<br>**Then** changes are persisted | TC-REF-04 |

### Epic E3: Incidents

| Story | Acceptance Criteria | TC-ID |
|-------|---------------------|-------|
| US-INC-01 | **Given** worker logged in<br>**When** I submit valid incident<br>**Then** created with status=open, appears in list | TC-INC-01 |
| US-INC-01 | **Given** missing required field<br>**When** I submit<br>**Then** validation error shown | TC-INC-02 |
| US-INC-01 | **Given** valid data<br>**When** POST /incidents<br>**Then** persisted correctly | TC-INC-03 |
| US-INC-02 | **Given** incidents exist<br>**When** I view list<br>**Then** correct columns shown | TC-INC-04 |
| US-INC-02 | **Given** multiple statuses<br>**When** filter by open<br>**Then** only open shown | TC-INC-05 |
| US-INC-02 | **Given** multiple sites<br>**When** filter by site<br>**Then** only that site shown | TC-INC-06 |
| US-INC-03 | **Given** manager logged in<br>**When** change status<br>**Then** saved and reflected | TC-INC-07 |
| US-INC-03 | **Given** worker logged in<br>**When** try to change status<br>**Then** blocked | TC-INC-08 |

### Epic E4: Inspections

| Story | Acceptance Criteria | TC-ID |
|-------|---------------------|-------|
| US-INSP-01 | **Given** admin logged in<br>**When** create template<br>**Then** appears in list | TC-INSP-01 |
| US-INSP-01 | **Given** template exists<br>**When** add/edit/delete items<br>**Then** changes saved | TC-INSP-02 |
| US-INSP-01 | **Given** template created<br>**When** GET API<br>**Then** correct data returned | TC-INSP-03 |
| US-INSP-02 | **Given** site and template exist<br>**When** I select them<br>**Then** checklist shown | TC-INSP-04 |
| US-INSP-02 | **Given** checklist shown<br>**When** set results and submit<br>**Then** saved | TC-INSP-05 |
| US-INSP-02 | **Given** any not_ok<br>**When** compute<br>**Then** overall_result=fail | TC-INSP-06 |
| US-INSP-03 | **Given** inspections exist<br>**When** view list<br>**Then** correct columns | TC-INSP-07 |
| US-INSP-03 | **Given** inspection exists<br>**When** click row<br>**Then** detail with items shown | TC-INSP-08 |

### Epic E5: Dashboard

| Story | Acceptance Criteria | TC-ID |
|-------|---------------------|-------|
| US-DASH-01 | **Given** data exists<br>**When** GET /dashboard/summary<br>**Then** all metrics returned | TC-DASH-01 |
| US-DASH-01 | **Given** on dashboard<br>**When** view KPI cards<br>**Then** correct values | TC-DASH-02 |
| US-DASH-01 | **Given** data exists<br>**When** view charts<br>**Then** rendered correctly | TC-DASH-03 |
| US-DASH-01 | **Given** recent records<br>**When** click table row<br>**Then** navigate to detail | TC-DASH-04 |

---

## 5. TDD Areas

### 5.1 Inspection overall_result

**Logic:**
- `fail` if ANY response.result = 'not_ok'
- `pass` if all responses are 'ok' or 'na'

**Unit Tests (Write First):**

```javascript
// backend/tests/unit/inspectionService.test.js

const { calculateOverallResult } = require('../../src/services/inspectionService');

describe('calculateOverallResult', () => {
  test('returns "pass" when all items are "ok"', () => {
    const responses = [
      { result: 'ok' },
      { result: 'ok' },
      { result: 'ok' }
    ];
    expect(calculateOverallResult(responses)).toBe('pass');
  });

  test('returns "pass" when items are "ok" or "na"', () => {
    const responses = [
      { result: 'ok' },
      { result: 'na' },
      { result: 'ok' }
    ];
    expect(calculateOverallResult(responses)).toBe('pass');
  });

  test('returns "fail" when any item is "not_ok"', () => {
    const responses = [
      { result: 'ok' },
      { result: 'not_ok' },
      { result: 'ok' }
    ];
    expect(calculateOverallResult(responses)).toBe('fail');
  });

  test('returns "fail" when multiple items are "not_ok"', () => {
    const responses = [
      { result: 'not_ok' },
      { result: 'not_ok' }
    ];
    expect(calculateOverallResult(responses)).toBe('fail');
  });

  test('returns "pass" for empty responses array', () => {
    expect(calculateOverallResult([])).toBe('pass');
  });

  test('returns "pass" when all items are "na"', () => {
    const responses = [
      { result: 'na' },
      { result: 'na' }
    ];
    expect(calculateOverallResult(responses)).toBe('pass');
  });
});
```

**Implementation (After Tests):**

```javascript
// backend/src/services/inspectionService.js

function calculateOverallResult(responses) {
  if (!responses || responses.length === 0) {
    return 'pass';
  }
  const hasNotOk = responses.some(r => r.result === 'not_ok');
  return hasNotOk ? 'fail' : 'pass';
}

module.exports = { calculateOverallResult };
```

### 5.2 Role Authorization

**Tests First:**

```javascript
// backend/tests/integration/auth.test.js

describe('Role-based access', () => {
  test('worker cannot POST to /api/sites', async () => {
    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ name: 'Test Site' });

    expect(res.status).toBe(403);
  });

  test('worker cannot PUT incident status', async () => {
    const res = await request(app)
      .put(`/api/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: 'closed' });

    expect(res.status).toBe(403);
  });
});
```

---

## 6. Test Case Catalogue (Phase 1)

| TC-ID | Type | Priority | Story | Checklist | Journey | Method |
|-------|------|----------|-------|-----------|---------|--------|
| TC-AUTH-01 | UI | High | US-AUTH-01 | C34, C35 | P1-J1 | Manual |
| TC-AUTH-02 | UI | High | US-AUTH-01 | C34, C35 | P1-J1 | Manual |
| TC-AUTH-03 | API | High | US-AUTH-01 | C34, C35 | P1-J1 | Jest |
| TC-AUTH-04 | API | High | US-AUTH-02 | C36 | P1-J1 | Jest |
| TC-AUTH-05 | UI | Medium | US-AUTH-02 | C37, C60 | P1-J1, P1-J4 | Manual |
| TC-AUTH-06 | API | High | US-AUTH-02 | C37 | P1-J4 | Jest |
| TC-SITE-01 | UI | Medium | US-SITE-01 | C16, C17 | P1-J4 | Manual |
| TC-SITE-02 | UI | Medium | US-SITE-01 | C16, C17 | P1-J4 | Manual |
| TC-SITE-03 | API | Medium | US-SITE-01 | C18 | P1-J4 | Jest |
| TC-REF-01 | API | High | US-REF-01 | C6, C7, C19 | P1-J2 | Jest |
| TC-REF-02 | UI | Medium | US-REF-01 | C6, C7 | P1-J2 | Manual |
| TC-REF-03 | UI | Medium | US-REF-02 | C6, C19 | P1-J4 | Manual |
| TC-REF-04 | API | Medium | US-REF-02 | C6, C19 | P1-J4 | Jest |
| TC-INC-01 | UI | High | US-INC-01 | C1, C2, C3 | P1-J2 | Manual |
| TC-INC-02 | UI | High | US-INC-01 | C1, C2 | P1-J2 | Manual |
| TC-INC-03 | API | High | US-INC-01 | C1, C3 | P1-J2 | Jest |
| TC-INC-04 | UI | High | US-INC-02 | C2, C3, C4 | P1-J2, P1-J3 | Manual |
| TC-INC-05 | UI | Medium | US-INC-02 | C2, C4 | P1-J2, P1-J3 | Manual |
| TC-INC-06 | UI | Medium | US-INC-02 | C2, C4 | P1-J2, P1-J3 | Manual |
| TC-INC-07 | UI | High | US-INC-03 | C4, C5 | P1-J3 | Manual |
| TC-INC-08 | API | High | US-INC-03 | C5 | P1-J3 | Jest |
| TC-INSP-01 | UI | High | US-INSP-01 | C8, C9 | P1-J5 | Manual |
| TC-INSP-02 | UI | High | US-INSP-01 | C8, C9 | P1-J5 | Manual |
| TC-INSP-03 | API | High | US-INSP-01 | C8, C9, C10, C11 | P1-J5 | Jest |
| TC-INSP-04 | UI | High | US-INSP-02 | C10, C11 | P1-J6 | Manual |
| TC-INSP-05 | UI | High | US-INSP-02 | C12 | P1-J6 | Manual |
| TC-INSP-06 | UNIT | High | US-INSP-02 | C13 | P1-J6 | Jest |
| TC-INSP-07 | UI | Medium | US-INSP-03 | C14 | P1-J6 | Manual |
| TC-INSP-08 | UI | Medium | US-INSP-03 | C15 | P1-J6 | Manual |
| TC-DASH-01 | API | High | US-DASH-01 | C47, C48, C49, C50, C51 | P1-J7 | Jest |
| TC-DASH-02 | UI | High | US-DASH-01 | C47, C48, C49, C50, C51 | P1-J1, P1-J7 | Manual |
| TC-DASH-03 | UI | Medium | US-DASH-01 | C52, C53 | P1-J7 | Manual |
| TC-DASH-04 | UI | Medium | US-DASH-01 | C54, C55 | P1-J7 | Manual |

---

## 7. Checklist Coverage Matrix

| C-ID | Description | Test Coverage |
|------|-------------|---------------|
| C1 | Create incident with fields | TC-INC-01, TC-INC-02, TC-INC-03 |
| C2 | See incidents in list | TC-INC-04, TC-INC-05, TC-INC-06 |
| C3 | Open incident, see details | TC-INC-04 |
| C4 | Incident statuses | TC-INC-04, TC-INC-05, TC-INC-07 |
| C5 | Update incident status | TC-INC-07, TC-INC-08 |
| C6 | Incident types configurable | TC-REF-01, TC-REF-02, TC-REF-03, TC-REF-04 |
| C7 | Incidents linked to site | TC-INC-01, TC-INC-03, TC-REF-01 |
| C8 | Create inspection templates | TC-INSP-01, TC-INSP-03 |
| C9 | Template contains items | TC-INSP-02, TC-INSP-03 |
| C10 | Start inspection by choosing site/template | TC-INSP-04 |
| C11 | Checklist auto-generated | TC-INSP-04 |
| C12 | Record result + comment | TC-INSP-05 |
| C13 | overall_result calculation | TC-INSP-06 |
| C14 | Inspections list | TC-INSP-07 |
| C15 | Inspection detail | TC-INSP-08 |
| C16 | Admin creates sites | TC-SITE-01 |
| C17 | Admin edits sites | TC-SITE-02 |
| C18 | Sites used consistently | TC-SITE-03, TC-INC-01 |
| C19 | Incident types seeded/extensible | TC-REF-01, TC-REF-03, TC-REF-04 |
| C34 | Passwords hashed (bcrypt) | TC-AUTH-01, TC-AUTH-03 |
| C35 | JWT auth required | TC-AUTH-01, TC-AUTH-02, TC-AUTH-03 |
| C36 | Roles: admin/manager/worker | TC-AUTH-04 |
| C37 | Admin routes protected | TC-AUTH-05, TC-AUTH-06 |
| C38 | Workers see own incidents | TC-INC-04 |
| C39 | Managers see all incidents | TC-INC-04 |
| C47 | Dashboard: total incidents | TC-DASH-01, TC-DASH-02 |
| C48 | Dashboard: open incidents | TC-DASH-01, TC-DASH-02 |
| C49 | Dashboard: incidents last 30 days | TC-DASH-01, TC-DASH-02 |
| C50 | Dashboard: inspections last 30 days | TC-DASH-01, TC-DASH-02 |
| C51 | Dashboard: failed inspections 30 days | TC-DASH-01, TC-DASH-02 |
| C52 | Dashboard: bar chart (by type) | TC-DASH-03 |
| C53 | Dashboard: line chart (severity trend) | TC-DASH-03 |
| C54 | Dashboard: recent incidents table | TC-DASH-04 |
| C55 | Dashboard: recent inspections table | TC-DASH-04 |
| C59 | Clean, consistent layout | Manual review |
| C60 | Clear navigation (Actions visible but disabled in P1) | TC-AUTH-05, Manual review |
| C61 | Sortable tables | Manual review |
| C62 | Form validation messages | TC-INC-02 |
| C63 | Responsive (desktop/tablet) | Manual review |

---

## 8. Test Data Requirements

### Seed Data for Testing

| Entity | Data |
|--------|------|
| Users | admin@ehs.local, manager@ehs.local, worker@ehs.local |
| Sites | Head Office (HO), Warehouse 1 (WH1), Distribution Center (DC1) |
| Incident Types | Injury, Near Miss, Property Damage, Environmental, Other |
| Incidents | 5-10 sample incidents across sites and types |
| Templates | 2-3 templates with 5-10 items each |
| Inspections | 5-10 sample inspections with responses |

### Test Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | admin@ehs.local | Admin123! | admin |
| Manager | manager@ehs.local | Manager123! | manager |
| Worker | worker@ehs.local | Worker123! | worker |

---

## 9. Exit Criteria

### Phase 1 Test Completion

| Criterion | Target |
|-----------|--------|
| Test cases executed | 28/28 |
| Test cases passing | 28/28 (100%) |
| Checklist items covered | 27/27 |
| Critical defects | 0 |
| High defects | 0 |
| User journeys executable | 7/7 |

### Quality Gates

Before Phase 1 release:
- [ ] All unit tests pass
- [ ] All API integration tests pass
- [ ] All UI tests pass (manual)
- [ ] No security vulnerabilities (passwords exposed, missing auth)
- [ ] No 500 errors on normal operations
- [ ] No broken buttons or dead links

---

## 10. Defect Management

### Severity Levels

| Level | Definition | Example |
|-------|------------|---------|
| Critical | System unusable, data loss | Cannot login, incidents not saved |
| High | Major feature broken | Cannot create inspection, dashboard empty |
| Medium | Feature impaired but workaround exists | Filter not working correctly |
| Low | Minor issue, cosmetic | Alignment issue, typo |

### Defect Template

```
Title: [Brief description]
Severity: [Critical/High/Medium/Low]
Steps to Reproduce:
1. ...
2. ...
3. ...
Expected: [What should happen]
Actual: [What actually happens]
Test Case: TC-XXX
Story: US-XXX
Checklist: C-XX
```

---

## 11. Related Documents

- [TEST_STRATEGY_ALL_PHASES.md](./TEST_STRATEGY_ALL_PHASES.md) - Overall strategy
- [USER_STORIES.md](./USER_STORIES.md) - Acceptance criteria
- [USER_JOURNEYS.md](./USER_JOURNEYS.md) - User flows
- [test_cases_all_phases.csv](../qa/Test%20Guide/test_cases_all_phases.csv) - Full test catalogue
- [API_SPEC_PHASE1.md](./API_SPEC_PHASE1.md) - API specifications




# Implementation Plan - EHS Portal (Phase 2)

## 1. Overview

This document provides a step-by-step implementation plan for Phase 2 of the EHS Portal.
Each step includes:
- Tasks to complete
- User stories addressed (US-IDs)
- Checklist items covered (C-IDs)
- Test cases that should pass (TC-IDs)

**Current focus:** Backend migrations + Actions/Attachments/Audit/Help APIs (Phase 2 backend only)

---

## 2. Implementation Steps

### Sprint 1: Actions / CAPA (Backend + Frontend)

**Goal:** Deliver actions data model, API, and UI foundations.

**Backend Tasks:**
1. Add Phase 2 migration for actions table and enums.
2. Implement Actions routes:
   - GET /api/actions (my/all with filters)
   - GET /api/incidents/:id/actions
   - GET /api/inspections/:id/actions
   - POST /api/actions
   - PUT /api/actions/:id
3. Enforce RBAC on all endpoints.
4. Add overdue status job (daily scheduled task).

**Frontend Tasks:**
1. Implement My Actions page (`/actions`).
2. Implement All Actions page (`/actions/all`) with filters.
3. Implement Action Detail page with status updates.

**Stories/Checklist:** US-ACT-01..04 (C20-C27)  
**Test Cases:** TC-ACT-01..TC-ACT-07

---

### Sprint 2: Attachments / Evidence (Backend + Frontend)

**Goal:** Deliver attachment upload, list, and download for incidents, inspections, actions.

**Backend Tasks:**
1. Add attachments table and enums (if not already).
2. Implement attachment upload endpoint (multipart).
3. Implement attachments list endpoint by entity.
4. Implement attachment download endpoint.
5. Add validation for file size and type.

**Frontend Tasks:**
1. Add attachments panel to Incident Detail.
2. Add attachments panel to Inspection Detail.
3. Add attachments panel to Action Detail.
4. Show file metadata and download links.

**Stories/Checklist:** US-ATT-01..03 (C28-C33)  
**Test Cases:** TC-ATT-01..TC-ATT-05

---

### Sprint 3: Audit Log + Help (Backend + Frontend)

**Goal:** Deliver audit history views and help content access.

**Backend Tasks:**
1. Add audit_log table and immutability triggers.
2. Add audit logging hooks for:
   - Incident create/status/severity change
   - Inspection create
   - Action create/status change
   - Attachment upload
3. Implement audit log endpoints by entity.
4. Implement admin audit log endpoint.
5. Implement help content endpoints (list + detail).

**Frontend Tasks:**
1. Add Activity Log panels to:
   - Incident Detail
   - Inspection Detail
   - Action Detail
2. Add Help page and navigation entry.

**Stories/Checklist:** US-AUD-01..03 (C40-C46), US-HELP-01 (C68-C70)  
**Test Cases:** TC-AUD-01..TC-AUD-04, TC-HELP-01

---

### Sprint 4: Testing, Regression, and UAT

**Goal:** Validate Phase 2 and re-run Phase 1 regression.

**Tasks:**
1. Execute all Phase 2 test cases (TC-ACT, TC-ATT, TC-AUD, TC-HELP).
2. Re-run Phase 1 smoke tests to detect regressions.
3. Fix defects and re-run tests.
4. Document test status in test_cases_all_phases.csv.

**Stories/Checklist:** All Phase 2 C-IDs  
**Test Cases:** All Phase 2 TC-IDs

---

## 3. Dependency Summary

| Dependency | Needed For |
|------------|------------|
| Actions API | My Actions / All Actions UI |
| Attachments API | Attachment panels in detail pages |
| Audit logging hooks | Activity Log UI |
| Help API | Help page |

---

## 4. Definition of Done (Phase 2)

- [ ] All Phase 2 API endpoints implemented and documented
- [ ] All Phase 2 UI screens completed
- [ ] All Phase 2 test cases executed
- [ ] All Phase 2 checklist items covered (C20-C27, C28-C33, C40-C46, C68-C70)
- [ ] No critical or high defects

---

## 5. Related Documents

- [ARCHITECTURE_PHASE2.md](./ARCHITECTURE_PHASE2.md) - Phase 2 architecture
- [API_SPEC_PHASE2.md](./API_SPEC_PHASE2.md) - Phase 2 API specification
- [FRONTEND_UX_PHASE2.md](./FRONTEND_UX_PHASE2.md) - Phase 2 UI design
- [TEST_STRATEGY_PHASE2.md](./TEST_STRATEGY_PHASE2.md) - Phase 2 testing approach
- [USER_STORIES.md](./USER_STORIES.md) - Phase 2 user stories

# Test Strategy - EHS Portal (Phase 2)

## 1. Overview

This document defines the testing approach for Phase 2, aligned with:
- `TEST_STRATEGY_ALL_PHASES.md`
- `test_cases_phase2.csv`
- `test_cases_all_phases.csv`

### Testing Principles

| Principle | Application |
|-----------|-------------|
| Shift-Left | Test cases defined alongside requirements |
| ATDD | Acceptance criteria per story in Given/When/Then |
| TDD | Core logic (overdue status, validation) tested first |

---

## 2. Phase 2 Scope

### In-Scope Test Areas

| Area | Checklist IDs | Stories |
|------|---------------|---------|
| Actions / CAPA | C20-C27 | US-ACT-01..04 |
| Attachments / Evidence | C28-C33 | US-ATT-01..03 |
| Audit Logging | C40-C46 | US-AUD-01..03 |
| Help / Docs | C68-C70 | US-HELP-01 |

### Out-of-Scope (Deferred)

- Multi-org (Phase 3)
- Exports (Phase 3)
- Analytics and risk register (Phase 4)
- Notifications / integrations (Phase 5)

---

## 3. Test Levels

### 3.1 Unit Tests

**Scope:** Pure functions and service logic

**Targets:**
- Overdue status logic for actions
- Attachment type/size validation helpers
- Audit log event formatting

**Approach:** TDD for core logic

### 3.2 API / Integration Tests

**Scope:** Express routes + database

**Targets:**
- Actions endpoints (create, list, update, filters)
- Attachments endpoints (upload, list, download, validation)
- Audit log endpoints (entity logs, admin log)
- Help endpoints (list and detail)

### 3.3 UI / Journey Tests

**Scope:** P2-J1 through P2-J11

**Targets:**
- Create action from incident and inspection
- My Actions and All Actions lists with filters
- Attachment upload and visibility
- Activity log visibility and immutability
- Help access

### 3.4 Non-Functional (Light)

**Performance:**
- Actions list loads within acceptable time for moderate data sets
- Attachment upload within acceptable time for 10 MB files

**Security:**
- RBAC enforced for all actions and audit endpoints
- Disallowed file types rejected
- Activity logs visible only for entities the user can access

---

## 4. Traceability

Phase 2 traceability uses:
- Checklist IDs (C-IDs)
- User stories (US-IDs)
- Journeys (P2-Jx)
- Test cases (TC-IDs)

Example:
- C20 (Create actions from incidents) -> US-ACT-01 -> P2-J1 -> TC-ACT-01

All Phase 2 test cases are cataloged in `test_cases_phase2.csv` and appended to `test_cases_all_phases.csv`.

---

## 5. Test Data Requirements

| Entity | Required Data |
|--------|---------------|
| Users | admin, manager, worker |
| Incidents | At least 2 incidents across sites |
| Inspections | At least 1 inspection with not_ok item |
| Actions | At least 3 actions with varying status |
| Attachments | At least one attachment per entity type |

---

## 6. Exit Criteria

| Criterion | Target |
|-----------|--------|
| Phase 2 test cases executed | 100% |
| Phase 2 test cases passing | 100% or documented exceptions |
| C20-C27 coverage | All mapped to at least one TC-ID |
| C28-C33 coverage | All mapped to at least one TC-ID |
| C40-C46 coverage | All mapped to at least one TC-ID |
| C68-C70 coverage | All mapped to at least one TC-ID |

---

## 7. Related Documents

- [TEST_STRATEGY_ALL_PHASES.md](./TEST_STRATEGY_ALL_PHASES.md)
- [API_SPEC_PHASE2.md](./API_SPEC_PHASE2.md)
- [FRONTEND_UX_PHASE2.md](./FRONTEND_UX_PHASE2.md)
- [WORKFLOWS_PHASE2.md](./WORKFLOWS_PHASE2.md)

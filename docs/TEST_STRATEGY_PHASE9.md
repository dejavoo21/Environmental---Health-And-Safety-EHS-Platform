# Test Strategy – EHS Portal Phase 9
## Risk Register & Enterprise Risk Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | QA Lead |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 9 – Risk Register & Enterprise Risk Management |

---

## 1. Overview

This document defines the test strategy for Phase 9 Risk Register & Enterprise Risk Management functionality.

### 1.1 Scope

**In Scope:**
- Risk register CRUD operations
- Risk scoring (inherent and residual)
- Control management
- Entity linking (incidents, actions, inspections, training, chemicals, permits)
- Review workflow and history
- Heatmap visualisation
- Risk analytics and dashboards
- Export functionality (Excel, PDF)
- Notification triggers
- Background jobs

**Out of Scope:**
- Integration with external risk management systems
- AI/ML risk prediction
- Monte Carlo simulation

### 1.2 Quality Objectives

| Objective | Target |
|-----------|--------|
| Unit test coverage | ≥80% |
| Integration test coverage | 100% of API endpoints |
| E2E test coverage | 100% of user journeys |
| Critical bugs at release | 0 |
| High bugs at release | 0 |
| Performance (API response) | <200ms (P95) |
| Performance (page load) | <2s |
| Accessibility | WCAG 2.1 AA |

---

## 2. Test Levels

### 2.1 Unit Testing

**Objective:** Verify individual functions and components work correctly in isolation.

**Tools:** Jest, React Testing Library

**Scope:**
- Service methods
- Repository methods
- Validator functions
- Helper functions
- React components
- Custom hooks

**Coverage Target:** 80%

### 2.2 Integration Testing

**Objective:** Verify API endpoints work correctly with database.

**Tools:** Jest, Supertest, Test containers

**Scope:**
- All REST API endpoints
- Database operations
- Service interactions
- Middleware functions

**Coverage Target:** 100% of endpoints

### 2.3 End-to-End Testing

**Objective:** Verify complete user workflows function correctly.

**Tools:** Playwright

**Scope:**
- All user journeys (P9-J1 to P9-J4)
- Cross-browser testing
- Responsive testing

### 2.4 Performance Testing

**Objective:** Verify system meets performance requirements.

**Tools:** k6, Lighthouse

**Scope:**
- API response times
- Page load times
- Database query performance
- Export file generation

### 2.5 Security Testing

**Objective:** Verify application is secure.

**Tools:** OWASP ZAP, npm audit

**Scope:**
- Authentication/authorisation
- Input validation
- SQL injection prevention
- XSS prevention
- CSRF protection

### 2.6 Accessibility Testing

**Objective:** Verify WCAG 2.1 AA compliance.

**Tools:** axe-core, manual testing

**Scope:**
- All new pages
- All new components
- Keyboard navigation
- Screen reader compatibility

---

## 3. Test Approach by Feature

### 3.1 Risk Register CRUD

| Test Type | Test Cases |
|-----------|------------|
| Unit | Score calculation, level determination, reference generation |
| Integration | Create, read, update, delete risks via API |
| E2E | Full risk creation workflow, edit existing risk |

**Key Scenarios:**
- Create risk with minimum required fields
- Create risk with all optional fields
- Update risk scores and verify recalculation
- Delete risk and verify soft delete
- Filter risks by multiple criteria
- Search risks by text
- Paginate risk list

### 3.2 Risk Scoring

| Test Type | Test Cases |
|-----------|------------|
| Unit | Score calculation (L × I), level thresholds |
| Integration | Score updates via API, tolerance checks |
| E2E | Inherent/residual score entry, level badge display |

**Key Scenarios:**
- Score 1 (1×1) → LOW
- Score 4 (2×2) → LOW
- Score 5 (1×5) → MEDIUM
- Score 9 (3×3) → MEDIUM
- Score 10 (2×5) → HIGH
- Score 16 (4×4) → HIGH
- Score 17 (5×5-8) → EXTREME
- Score 25 (5×5) → EXTREME

**Edge Cases:**
- Score exactly on threshold (4, 9, 16)
- Residual score higher than inherent (validation)
- Null residual scores

### 3.3 Risk Controls

| Test Type | Test Cases |
|-----------|------------|
| Unit | Control type validation, hierarchy levels |
| Integration | Add, update, remove controls via API |
| E2E | Add control form, link control to entity |

**Key Scenarios:**
- Add control with all types (preventive, detective, corrective)
- Add control with all hierarchy levels
- Update control effectiveness
- Link control to action
- Link control to training course
- Link control to permit
- Remove control link
- Delete control

### 3.4 Risk Entity Linking

| Test Type | Test Cases |
|-----------|------------|
| Unit | Entity type validation, link reason handling |
| Integration | Create, delete links via API, entity validation |
| E2E | Link entity modal, unlink entity |

**Key Scenarios:**
- Link risk to existing incident
- Link risk to existing action
- Link risk to existing inspection
- Link risk to training course
- Link risk to chemical
- Link risk to permit
- Prevent duplicate links
- Handle non-existent entity gracefully
- Unlink entity
- View all links by type

### 3.5 Risk Reviews

| Test Type | Test Cases |
|-----------|------------|
| Unit | Review date calculation, score snapshot |
| Integration | Record review via API, update next review date |
| E2E | Record review modal, view review history |

**Key Scenarios:**
- Record review with no score change
- Record review with improved scores
- Record review with deteriorated scores
- Recommend close via review
- Verify control effectiveness during review
- View review history chronologically
- Calculate next review date correctly

**Review Frequency Tests:**
- Monthly → next review in 30 days
- Quarterly → next review in 90 days
- Biannually → next review in 180 days
- Annually → next review in 365 days

### 3.6 Risk Heatmap

| Test Type | Test Cases |
|-----------|------------|
| Unit | Aggregation logic, cell count |
| Integration | Heatmap API response format |
| E2E | Heatmap render, cell click drill-down |

**Key Scenarios:**
- Heatmap displays correct risk counts per cell
- Inherent vs residual toggle
- Filter by category
- Filter by site
- Click cell shows filtered risk list
- Empty cells display correctly
- Colour coding matches level

### 3.7 Risk Export

| Test Type | Test Cases |
|-----------|------------|
| Unit | Export data formatting |
| Integration | Export generation via API |
| E2E | Export button, file download |

**Key Scenarios:**
- Export to Excel with all risks
- Export to PDF with all risks
- Export with filters applied
- Export includes controls (option)
- Export includes links (option)
- Export includes heatmap summary
- Large export (500+ risks) performance

### 3.8 Notifications

| Test Type | Test Cases |
|-----------|------------|
| Unit | Notification template rendering |
| Integration | Notification trigger on events |
| E2E | Notification appears in-app |

**Key Scenarios:**
- Review due reminder (7, 3, 1 days before)
- Review overdue notification
- Extreme risk creation alert
- Tolerance breach escalation
- Control verification reminder

### 3.9 Background Jobs

| Test Type | Test Cases |
|-----------|------------|
| Unit | Job logic, date calculations |
| Integration | Job execution, database updates |
| E2E | N/A (manual verification) |

**Key Scenarios:**
- Review reminder job finds correct risks
- Overdue reviews identified correctly
- Analytics aggregation produces correct data
- Job handles errors gracefully
- Job runs on schedule

---

## 4. Test Data Requirements

### 4.1 Seed Data

| Entity | Count | Purpose |
|--------|-------|---------|
| Risk Categories | 8 | Category filtering |
| Risks | 50 | List, filter, pagination testing |
| Risk Controls | 100 | Control management testing |
| Risk Links | 80 | Entity linking testing |
| Risk Reviews | 40 | Review history testing |
| Users (various roles) | 10 | Permission testing |
| Sites | 5 | Multi-site testing |

### 4.2 Test Data Distribution

**Risks by Level:**
- Extreme: 3
- High: 12
- Medium: 20
- Low: 15

**Risks by Status:**
- Draft: 5
- Open: 30
- Under Review: 5
- Treating: 7
- Closed: 3

**Review Status:**
- Overdue: 4
- Due within 7 days: 6
- Due within 30 days: 15
- Not due: 25

### 4.3 Test Accounts

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | admin@test.com | TestPass1! | Full access testing |
| Manager | manager@test.com | TestPass1! | Create/edit risks |
| Supervisor | supervisor@test.com | TestPass1! | View site risks |
| Worker | worker@test.com | TestPass1! | Limited view testing |

---

## 5. Test Scenarios Matrix

### 5.1 Risk Register Page

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-P9-001 | View risk register as Manager | List displays with all columns | P1 |
| TC-P9-002 | Filter by status | Only matching risks displayed | P1 |
| TC-P9-003 | Filter by level | Only matching risks displayed | P1 |
| TC-P9-004 | Filter by category | Only matching risks displayed | P1 |
| TC-P9-005 | Filter by site | Only matching risks displayed | P2 |
| TC-P9-006 | Search by title | Matching risks displayed | P1 |
| TC-P9-007 | Sort by score | Risks sorted correctly | P2 |
| TC-P9-008 | Paginate results | Page navigation works | P1 |
| TC-P9-009 | Click risk row | Navigate to detail page | P1 |
| TC-P9-010 | View as Worker | Only site risks visible | P2 |

### 5.2 Risk Creation

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-P9-011 | Create risk with required fields | Risk created, reference generated | P1 |
| TC-P9-012 | Create risk with all fields | Risk created with all data | P1 |
| TC-P9-013 | Validation: missing title | Error displayed | P1 |
| TC-P9-014 | Validation: missing category | Error displayed | P1 |
| TC-P9-015 | Validation: invalid likelihood | Error displayed | P2 |
| TC-P9-016 | Create extreme risk | Notification sent to admins | P2 |
| TC-P9-017 | Create as Worker | Access denied | P2 |

### 5.3 Risk Detail Page

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-P9-018 | View risk detail | All tabs displayed | P1 |
| TC-P9-019 | View inherent/residual scores | Correct scores and levels | P1 |
| TC-P9-020 | Edit risk | Changes saved | P1 |
| TC-P9-021 | Change status | Status updated | P1 |
| TC-P9-022 | Invalid status transition | Error displayed | P2 |
| TC-P9-023 | Delete risk | Soft delete, status=closed | P2 |

### 5.4 Controls Management

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-P9-024 | Add control | Control added to list | P1 |
| TC-P9-025 | Edit control | Control updated | P1 |
| TC-P9-026 | Delete control | Control removed | P2 |
| TC-P9-027 | Link control to action | Link created | P1 |
| TC-P9-028 | Link control to training | Link created | P2 |
| TC-P9-029 | Link control to permit | Link created | P2 |
| TC-P9-030 | Remove control link | Link removed | P2 |

### 5.5 Entity Linking

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-P9-031 | Link to incident | Link created with preview | P1 |
| TC-P9-032 | Link to action | Link created with preview | P1 |
| TC-P9-033 | Link to inspection | Link created with preview | P2 |
| TC-P9-034 | Link to training | Link created with preview | P2 |
| TC-P9-035 | Link to chemical | Link created with preview | P2 |
| TC-P9-036 | Link to permit | Link created with preview | P2 |
| TC-P9-037 | Duplicate link | Error displayed | P2 |
| TC-P9-038 | Unlink entity | Link removed | P1 |
| TC-P9-039 | View links grouped | Links shown by type | P1 |

### 5.6 Reviews

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-P9-040 | Record review - no change | Review saved, scores unchanged | P1 |
| TC-P9-041 | Record review - improved | Scores updated, review saved | P1 |
| TC-P9-042 | Record review - deteriorated | Scores updated, review saved | P1 |
| TC-P9-043 | Recommend close | Status changed, review saved | P2 |
| TC-P9-044 | View review history | All reviews displayed | P1 |
| TC-P9-045 | Next review date calculated | Date matches frequency | P1 |

### 5.7 Heatmap

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-P9-046 | View heatmap | 5×5 matrix displayed | P1 |
| TC-P9-047 | Click cell | Risk list shown | P1 |
| TC-P9-048 | Toggle inherent/residual | Heatmap recalculates | P1 |
| TC-P9-049 | Filter by category | Heatmap filters | P2 |
| TC-P9-050 | Empty cell | No count, grey | P2 |

### 5.8 Export

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-P9-051 | Export to Excel | File downloads | P1 |
| TC-P9-052 | Export to PDF | File downloads | P1 |
| TC-P9-053 | Export with filters | Filtered data in file | P2 |
| TC-P9-054 | Export with controls | Controls included | P2 |
| TC-P9-055 | Large export | Completes within 30s | P2 |

### 5.9 Permissions

| ID | Scenario | Expected Result | Priority |
|----|----------|-----------------|----------|
| TC-P9-056 | Worker view register | Site risks only | P1 |
| TC-P9-057 | Manager create risk | Allowed | P1 |
| TC-P9-058 | Worker create risk | Denied | P1 |
| TC-P9-059 | Manager edit own risk | Allowed | P1 |
| TC-P9-060 | Manager edit other's risk | Denied | P2 |
| TC-P9-061 | Admin edit any risk | Allowed | P1 |
| TC-P9-062 | Admin access settings | Allowed | P1 |
| TC-P9-063 | Manager access settings | Denied | P2 |

---

## 6. Entry & Exit Criteria

### 6.1 Entry Criteria

- Development complete for the feature
- Code reviewed and merged
- Unit tests passing
- Deployment to test environment successful
- Test data seeded

### 6.2 Exit Criteria

- All P1 test cases executed and passed
- 95% of P2 test cases passed
- All critical/high bugs fixed and verified
- Performance tests passed
- Security tests passed
- Accessibility tests passed
- Test summary report approved

---

## 7. Defect Management

### 7.1 Severity Levels

| Severity | Definition | SLA |
|----------|------------|-----|
| Critical | System crash, data loss, security breach | 4 hours |
| High | Major feature broken, no workaround | 24 hours |
| Medium | Feature impacted, workaround exists | 72 hours |
| Low | Minor issue, cosmetic | Next sprint |

### 7.2 Bug Workflow

```
New → Triage → Assigned → In Progress → Code Review → Ready for Test → Verified → Closed
                                                                    ↓
                                                               Reopened
```

---

## 8. Test Environment

### 8.1 Environment Details

| Component | Specification |
|-----------|---------------|
| Server | Node.js 18+ |
| Database | PostgreSQL 14+ |
| Browser | Chrome, Firefox, Safari, Edge (latest) |
| Mobile | iOS Safari, Android Chrome |

### 8.2 Test Data Reset

- Test environment reset daily at 00:00
- Seed data reloaded on reset
- Test users preserved

---

## 9. Risk & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Test data dependencies | Medium | High | Create isolated test data sets |
| Environment instability | Low | High | Dedicated test environment |
| Entity linking complexity | High | Medium | Early integration testing |
| Performance under load | Medium | Medium | Early performance testing |

---

## 10. Deliverables

- Test Plan (this document)
- Test Cases CSV
- Test Execution Report
- Defect Report
- UAT Sign-off Document

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | QA Lead | Initial Phase 9 test strategy |

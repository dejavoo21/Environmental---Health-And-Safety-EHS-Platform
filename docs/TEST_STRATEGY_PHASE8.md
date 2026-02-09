# Test Strategy – EHS Portal Phase 8
## Training & Competence Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 8 – Training & Competence Management |

---

## 1. Overview

This document defines the testing strategy for Phase 8: Training & Competence Management.

---

## 2. Test Scope

### 2.1 In Scope

| Area | Coverage |
|------|----------|
| Training Categories | CRUD operations, filtering |
| Training Courses | CRUD, prerequisites, attachments, search |
| Training Sessions | Scheduling, capacity, enrollments, attendance |
| Training Assignments | Individual, bulk (role/site), rules, waiving |
| Training Completions | Recording, verification, expiry, evidence |
| Training Matrix | Views, filtering, gap analysis |
| Requirements | Role requirements, site requirements |
| Reports | PDF/Excel export, all report types |
| Background Jobs | Expiry check, reminders, auto-assignment |
| Notifications | All training event notifications |
| Integrations | Actions, Incidents, Analytics, Notifications |

### 2.2 Out of Scope

- SCORM player integration (future)
- In-portal quiz engine (future)
- Mobile offline mode (future)
- External LMS sync (future)

---

## 3. Test Types

### 3.1 Unit Tests

| Area | Framework | Coverage Target |
|------|-----------|-----------------|
| Services | Jest | ≥80% |
| Repositories | Jest | ≥80% |
| Utilities | Jest | ≥90% |
| React Components | Jest + RTL | ≥75% |

### 3.2 Integration Tests

| Area | Framework | Focus |
|------|-----------|-------|
| API Endpoints | Jest + Supertest | Request/response validation |
| Database | Jest + Test DB | Transaction integrity |
| File Upload | Jest + Supertest | Attachment handling |

### 3.3 End-to-End Tests

| Framework | Scope |
|-----------|-------|
| Playwright | Critical user journeys |

### 3.4 Performance Tests

| Tool | Focus |
|------|-------|
| k6 / Artillery | API load testing |
| Lighthouse | Frontend performance |

### 3.5 Security Tests

| Focus | Method |
|-------|--------|
| RBAC | Manual + automated |
| Input validation | Automated |
| File upload security | Manual |

---

## 4. Test Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| Local | Development testing | Seed data |
| CI/CD | Automated test runs | Fresh + seed |
| Staging | UAT, integration | Anonymized production-like |
| Production | Smoke tests post-deploy | Production |

---

## 5. Test Data Requirements

### 5.1 Categories

| Name | Code | System |
|------|------|--------|
| Safety Training | SAFETY | Yes |
| Health Training | HEALTH | Yes |
| Environmental | ENV | Yes |
| Technical Skills | TECHNICAL | Yes |
| Custom Category | CUSTOM-1 | No |

### 5.2 Courses

| Code | Title | Delivery | Validity | Mandatory |
|------|-------|----------|----------|-----------|
| IND-001 | General Induction | Classroom | None | Yes |
| FS-001 | Fire Safety Awareness | Classroom | 12 months | Yes |
| FS-002 | Fire Safety Refresher | Classroom | 12 months | Yes |
| CS-001 | Confined Space Entry | Classroom | 12 months | Yes |
| FA-001 | First Aid | Blended | 24 months | Yes |
| MH-001 | Manual Handling | Online | 12 months | No |
| WH-001 | Working at Height | Classroom | 12 months | Yes |
| LOTO-001 | Lockout Tagout | Classroom | 12 months | Yes |

### 5.3 Sessions

| Course | Date | Capacity | Status |
|--------|------|----------|--------|
| FS-001 | Future +14d | 20 | Scheduled |
| FS-001 | Future +28d | 20 | Scheduled |
| CS-001 | Future +7d | 15 | Full (waitlist) |
| FA-001 | Past -7d | 15 | Completed |

### 5.4 Users for Testing

| Role | Count | Training Status |
|------|-------|-----------------|
| Admin | 2 | Various |
| Manager | 3 | Various |
| Supervisor | 5 | Various |
| Worker | 20 | Mixed (assigned, completed, overdue, expired) |

---

## 6. Test Cases by Feature

### 6.1 Training Categories

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-CAT-001 | List all categories | High |
| TC-TRAIN-CAT-002 | Filter active categories only | Medium |
| TC-TRAIN-CAT-003 | Create custom category | High |
| TC-TRAIN-CAT-004 | Update category | Medium |
| TC-TRAIN-CAT-005 | Deactivate category | Medium |
| TC-TRAIN-CAT-006 | Cannot delete system category | High |

### 6.2 Training Courses

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-CRS-001 | List courses with pagination | High |
| TC-TRAIN-CRS-002 | Filter courses by category | High |
| TC-TRAIN-CRS-003 | Filter courses by delivery type | Medium |
| TC-TRAIN-CRS-004 | Filter courses by status | Medium |
| TC-TRAIN-CRS-005 | Search courses by title | High |
| TC-TRAIN-CRS-006 | Search courses by code | High |
| TC-TRAIN-CRS-007 | Create course with all fields | High |
| TC-TRAIN-CRS-008 | Create course - mandatory fields only | High |
| TC-TRAIN-CRS-009 | Create course with prerequisites | High |
| TC-TRAIN-CRS-010 | Create course with refresher link | Medium |
| TC-TRAIN-CRS-011 | Update course details | High |
| TC-TRAIN-CRS-012 | Archive course | Medium |
| TC-TRAIN-CRS-013 | Upload course attachment | High |
| TC-TRAIN-CRS-014 | Delete course attachment | Medium |
| TC-TRAIN-CRS-015 | View course statistics | Medium |
| TC-TRAIN-CRS-016 | Cannot modify archived course | High |

### 6.3 Training Sessions

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-SES-001 | List sessions with filters | High |
| TC-TRAIN-SES-002 | Filter sessions by date range | High |
| TC-TRAIN-SES-003 | Filter sessions by course | High |
| TC-TRAIN-SES-004 | Schedule new session | High |
| TC-TRAIN-SES-005 | Schedule session with pre-enrollments | Medium |
| TC-TRAIN-SES-006 | Update session details | Medium |
| TC-TRAIN-SES-007 | Cancel session | Medium |
| TC-TRAIN-SES-008 | View session enrollments | High |

### 6.4 Session Enrollments

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-ENR-001 | Enroll single user | High |
| TC-TRAIN-ENR-002 | Enroll multiple users | High |
| TC-TRAIN-ENR-003 | Enroll to waitlist when full | High |
| TC-TRAIN-ENR-004 | Auto-promote from waitlist | Medium |
| TC-TRAIN-ENR-005 | Self-enroll (permitted course) | High |
| TC-TRAIN-ENR-006 | Self-enroll blocked (not permitted) | High |
| TC-TRAIN-ENR-007 | Cancel enrollment | Medium |
| TC-TRAIN-ENR-008 | Prevent duplicate enrollment | High |
| TC-TRAIN-ENR-009 | Prerequisites check on enrollment | High |

### 6.5 Session Attendance & Completion

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-ATT-001 | Record attendance - attended | High |
| TC-TRAIN-ATT-002 | Record attendance - absent | High |
| TC-TRAIN-ATT-003 | Record attendance - partial | Medium |
| TC-TRAIN-ATT-004 | Record completion with score | High |
| TC-TRAIN-ATT-005 | Mark session complete | High |
| TC-TRAIN-ATT-006 | Auto-create completions on session complete | High |
| TC-TRAIN-ATT-007 | Auto-close assignments on completion | High |

### 6.6 Training Assignments

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-ASN-001 | List assignments with filters | High |
| TC-TRAIN-ASN-002 | Filter by status (assigned, completed, overdue) | High |
| TC-TRAIN-ASN-003 | Filter by user | High |
| TC-TRAIN-ASN-004 | Filter by course | High |
| TC-TRAIN-ASN-005 | Create individual assignment | High |
| TC-TRAIN-ASN-006 | Prevent duplicate assignment | High |
| TC-TRAIN-ASN-007 | Bulk assign by role | High |
| TC-TRAIN-ASN-008 | Bulk assign by site | High |
| TC-TRAIN-ASN-009 | Bulk assign - skip already assigned | High |
| TC-TRAIN-ASN-010 | Update assignment due date | Medium |
| TC-TRAIN-ASN-011 | Update assignment priority | Medium |
| TC-TRAIN-ASN-012 | Waive assignment | Medium |
| TC-TRAIN-ASN-013 | Cancel assignment | Medium |

### 6.7 Assignment Rules

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-RUL-001 | List assignment rules | High |
| TC-TRAIN-RUL-002 | Create role-based rule | High |
| TC-TRAIN-RUL-003 | Create site-based rule | High |
| TC-TRAIN-RUL-004 | Auto-assign on new user (role match) | High |
| TC-TRAIN-RUL-005 | Auto-assign on user role change | Medium |
| TC-TRAIN-RUL-006 | Disable rule | Medium |
| TC-TRAIN-RUL-007 | Delete rule | Medium |

### 6.8 Training Completions

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-CMP-001 | List completions with filters | High |
| TC-TRAIN-CMP-002 | Filter by user | High |
| TC-TRAIN-CMP-003 | Filter by course | High |
| TC-TRAIN-CMP-004 | Filter expiring within X days | High |
| TC-TRAIN-CMP-005 | Filter expired | High |
| TC-TRAIN-CMP-006 | Record completion manually | High |
| TC-TRAIN-CMP-007 | Record completion - close assignment | High |
| TC-TRAIN-CMP-008 | Calculate expiry date correctly | High |
| TC-TRAIN-CMP-009 | Record external training | High |
| TC-TRAIN-CMP-010 | External training requires verification | High |
| TC-TRAIN-CMP-011 | Verify external completion | High |
| TC-TRAIN-CMP-012 | Reject external completion | High |
| TC-TRAIN-CMP-013 | Upload evidence attachment | High |
| TC-TRAIN-CMP-014 | View evidence attachment | Medium |

### 6.9 My Training

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-MY-001 | View my training summary | High |
| TC-TRAIN-MY-002 | View my assignments | High |
| TC-TRAIN-MY-003 | View upcoming sessions | High |
| TC-TRAIN-MY-004 | View expiring training | High |
| TC-TRAIN-MY-005 | View recent completions | High |
| TC-TRAIN-MY-006 | Self-enroll in session | High |
| TC-TRAIN-MY-007 | Cancel my enrollment | Medium |
| TC-TRAIN-MY-008 | Download training history | Medium |

### 6.10 Training Matrix

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-MTX-001 | View user×course matrix | High |
| TC-TRAIN-MTX-002 | Filter matrix by site | High |
| TC-TRAIN-MTX-003 | Filter matrix by role | High |
| TC-TRAIN-MTX-004 | Filter mandatory courses only | Medium |
| TC-TRAIN-MTX-005 | Filter gaps only | High |
| TC-TRAIN-MTX-006 | Filter expiring only | High |
| TC-TRAIN-MTX-007 | Filter overdue only | High |
| TC-TRAIN-MTX-008 | Cell shows correct status | High |
| TC-TRAIN-MTX-009 | Cell popover shows details | Medium |
| TC-TRAIN-MTX-010 | Matrix compliance rate calculation | High |
| TC-TRAIN-MTX-011 | Export matrix to Excel | High |

### 6.11 Gap Analysis

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-GAP-001 | Identify not-assigned gaps | High |
| TC-TRAIN-GAP-002 | Identify expired gaps | High |
| TC-TRAIN-GAP-003 | Gap analysis for single user | High |
| TC-TRAIN-GAP-004 | Gap analysis for role | Medium |

### 6.12 Role/Site Requirements

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-REQ-001 | View role requirements | High |
| TC-TRAIN-REQ-002 | Set role requirements | High |
| TC-TRAIN-REQ-003 | Update role requirements | Medium |
| TC-TRAIN-REQ-004 | View site requirements | Medium |
| TC-TRAIN-REQ-005 | Set site requirements | Medium |

### 6.13 Reports

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-RPT-001 | Generate compliance overview PDF | High |
| TC-TRAIN-RPT-002 | Generate user training history PDF | High |
| TC-TRAIN-RPT-003 | Export course completions Excel | High |
| TC-TRAIN-RPT-004 | Export training matrix Excel | High |
| TC-TRAIN-RPT-005 | Export session attendance Excel | Medium |
| TC-TRAIN-RPT-006 | Filter reports by date range | Medium |
| TC-TRAIN-RPT-007 | Filter reports by site | Medium |

### 6.14 Background Jobs

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-JOB-001 | Expiry check identifies expiring (30d) | High |
| TC-TRAIN-JOB-002 | Expiry check identifies expiring (14d) | High |
| TC-TRAIN-JOB-003 | Expiry check identifies expiring (7d) | High |
| TC-TRAIN-JOB-004 | Expiry check marks expired | High |
| TC-TRAIN-JOB-005 | Reminder job sends assignment reminders | High |
| TC-TRAIN-JOB-006 | Reminder job sends session reminders | High |
| TC-TRAIN-JOB-007 | Auto-assignment job applies role rules | High |
| TC-TRAIN-JOB-008 | Analytics aggregation job runs | Medium |

### 6.15 Notifications

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-NOT-001 | Notification on training assigned | High |
| TC-TRAIN-NOT-002 | Notification on session enrollment | High |
| TC-TRAIN-NOT-003 | Notification on session reminder | High |
| TC-TRAIN-NOT-004 | Notification on assignment overdue | High |
| TC-TRAIN-NOT-005 | Notification on training expiring | High |
| TC-TRAIN-NOT-006 | Notification on completion recorded | Medium |
| TC-TRAIN-NOT-007 | Notification for pending verification | Medium |

### 6.16 Integrations

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-INT-001 | Action links to training course | High |
| TC-TRAIN-INT-002 | Training metrics in analytics | High |
| TC-TRAIN-INT-003 | Notifications via Phase 4 | High |

### 6.17 RBAC

| TC ID | Scenario | Priority |
|-------|----------|----------|
| TC-TRAIN-SEC-001 | Worker can view My Training only | High |
| TC-TRAIN-SEC-002 | Supervisor can view matrix for their users | High |
| TC-TRAIN-SEC-003 | Supervisor can assign training | High |
| TC-TRAIN-SEC-004 | Manager can manage courses | High |
| TC-TRAIN-SEC-005 | Admin can manage all settings | High |
| TC-TRAIN-SEC-006 | User cannot access other org training | Critical |

---

## 7. E2E Test Scenarios

### 7.1 Assignment Workflow (P8-E2E-001)

```
1. Admin creates a new training course
2. Admin schedules a session for the course
3. Supervisor assigns training to a worker
4. Worker views assignment in My Training
5. Worker self-enrolls in a session
6. Trainer records attendance and completion
7. Assignment closed automatically
8. Completion appears in worker's history
9. Matrix shows completed status
```

### 7.2 Expiry & Refresher Workflow (P8-E2E-002)

```
1. Worker has completion expiring in 30 days
2. Expiry check job runs
3. Worker receives expiry notification
4. Refresher course is auto-assigned (if configured)
5. Worker completes refresher
6. New completion replaces expired one
7. Matrix shows updated status
```

### 7.3 Bulk Assignment Workflow (P8-E2E-003)

```
1. Admin creates assignment rule for role
2. Existing users with role receive assignments
3. New user joins with matching role
4. Auto-assignment job runs
5. New user receives assignment
6. Notifications sent
```

### 7.4 Training Matrix Workflow (P8-E2E-004)

```
1. Supervisor opens training matrix
2. Filters by their site
3. Identifies gaps and overdue
4. Clicks cell to view details
5. Assigns training from popover
6. Exports matrix to Excel
```

---

## 8. Performance Test Scenarios

| Scenario | Target | Method |
|----------|--------|--------|
| List courses (100 courses) | <200ms | Load test |
| Matrix load (100 users × 50 courses) | <1s | Load test |
| Matrix load (500 users × 100 courses) | <3s | Load test |
| Bulk assignment (50 users) | <5s | Load test |
| Report generation (1000 completions) | <10s | Load test |
| Concurrent users (50) | No errors | Stress test |

---

## 9. Security Test Scenarios

| Scenario | Method |
|----------|--------|
| XSS in course description | Automated |
| SQL injection in search | Automated |
| Unauthorized access to other org | Manual + automated |
| File upload - malicious file | Manual |
| API rate limiting | Automated |
| JWT token validation | Automated |

---

## 10. Regression Testing

### 10.1 Impact Areas

| Phase | Potential Impact | Regression Focus |
|-------|------------------|------------------|
| Phase 1 | User management | User list, role assignment |
| Phase 2 | Actions | Action creation, linking |
| Phase 4 | Notifications | Notification delivery |
| Phase 5 | Analytics | Dashboard widgets |

### 10.2 Regression Suite

Run full regression for:
- User CRUD operations
- Action CRUD operations
- Notification preferences
- Dashboard loading

---

## 11. Test Automation

### 11.1 CI/CD Integration

```yaml
# Test stages
- unit-tests       # Run on every commit
- integration-tests # Run on PR
- e2e-tests        # Run on merge to main
- performance-tests # Run weekly / pre-release
```

### 11.2 Coverage Requirements

| Test Type | Minimum Coverage |
|-----------|------------------|
| Unit tests | 80% |
| Integration tests | Core APIs covered |
| E2E tests | All critical paths |

---

## 12. Defect Management

### 12.1 Severity Levels

| Level | Description | SLA |
|-------|-------------|-----|
| Critical | System unusable, data loss | Fix immediately |
| High | Major feature broken | Fix within 24h |
| Medium | Feature degraded | Fix within sprint |
| Low | Minor issue, cosmetic | Backlog |

### 12.2 Defect Categories

- Functional
- Performance
- Security
- Usability
- Data integrity

---

## 13. UAT Plan

### 13.1 UAT Participants

| Role | Count | Focus |
|------|-------|-------|
| Training Manager | 2 | Course management, matrix |
| Supervisor | 3 | Assignments, completions |
| Worker | 5 | My Training, self-enrollment |
| Admin | 1 | Settings, reports |

### 13.2 UAT Scenarios

1. Create and configure a new training course
2. Schedule a session and enroll participants
3. Assign training to team members
4. Record session attendance and completions
5. View training matrix and identify gaps
6. Generate compliance reports
7. Configure role requirements
8. Verify notifications are received

### 13.3 UAT Sign-off Criteria

- [ ] All critical scenarios pass
- [ ] No critical/high defects open
- [ ] Performance acceptable
- [ ] Usability feedback addressed
- [ ] Stakeholder approval obtained

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 8 test strategy |

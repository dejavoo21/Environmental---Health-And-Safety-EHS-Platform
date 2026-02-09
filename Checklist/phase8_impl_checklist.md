# Phase 8 Implementation Checklist
## Training & Competence Management

| Document Version | 1.0 |
|------------------|-----|
| Created | 2026-02-05 |
| Phase | 8 |

---

## Stage P8.1: Database & Core Models

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 1.1 | Create migration 008_phase8_training.sql | US-TRAIN-01 | C-200 | High | ⬜ Not Started | |
| 1.2 | Create training_categories table | US-TRAIN-01 | C-200 | High | ⬜ Not Started | |
| 1.3 | Create training_courses table | US-TRAIN-02 | C-201 | High | ⬜ Not Started | |
| 1.4 | Create training_course_prerequisites table | US-TRAIN-02 | C-202 | High | ⬜ Not Started | |
| 1.5 | Create training_sessions table | US-TRAIN-03 | C-204 | High | ⬜ Not Started | |
| 1.6 | Create training_session_enrollments table | US-TRAIN-04 | C-205 | High | ⬜ Not Started | |
| 1.7 | Create training_assignments table | US-TRAIN-06 | C-210 | High | ⬜ Not Started | |
| 1.8 | Create training_assignment_rules table | US-TRAIN-08 | C-214 | High | ⬜ Not Started | |
| 1.9 | Create training_completions table | US-TRAIN-09 | C-209 | High | ⬜ Not Started | |
| 1.10 | Create training_role_requirements table | US-TRAIN-14 | C-223 | High | ⬜ Not Started | |
| 1.11 | Create training_site_requirements table | US-TRAIN-14 | C-224 | High | ⬜ Not Started | |
| 1.12 | Add training columns to attachments | US-TRAIN-02 | C-203 | High | ⬜ Not Started | |
| 1.13 | Add training columns to actions | US-TRAIN-18 | C-230 | Medium | ⬜ Not Started | |
| 1.14 | Create all indexes and constraints | - | - | High | ⬜ Not Started | |
| 1.15 | Write seed data for categories | US-TRAIN-01 | C-200 | Medium | ⬜ Not Started | |
| 1.16 | Create TypeScript entity models | - | - | High | ⬜ Not Started | |

---

## Stage P8.2: Course Catalogue Backend

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 2.1 | Implement CategoryRepository | US-TRAIN-01 | C-200 | High | ⬜ Not Started | |
| 2.2 | Implement CategoryService | US-TRAIN-01 | C-200 | High | ⬜ Not Started | |
| 2.3 | Create category API endpoints | US-TRAIN-01 | C-200 | High | ⬜ Not Started | |
| 2.4 | Implement CourseRepository | US-TRAIN-02 | C-201 | High | ⬜ Not Started | |
| 2.5 | Implement CourseService | US-TRAIN-02 | C-201 | High | ⬜ Not Started | |
| 2.6 | Implement course prerequisite logic | US-TRAIN-02 | C-207 | High | ⬜ Not Started | |
| 2.7 | Create course CRUD endpoints | US-TRAIN-02 | C-202 | High | ⬜ Not Started | |
| 2.8 | Implement course attachment handling | US-TRAIN-02 | C-203 | High | ⬜ Not Started | |
| 2.9 | Write unit tests for CategoryService | US-TRAIN-01 | C-200 | High | ⬜ Not Started | |
| 2.10 | Write unit tests for CourseService | US-TRAIN-02 | C-201 | High | ⬜ Not Started | |
| 2.11 | Write integration tests for course API | US-TRAIN-02 | C-201 | High | ⬜ Not Started | |

---

## Stage P8.3: Sessions & Enrollments Backend

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 3.1 | Implement SessionRepository | US-TRAIN-03 | C-204 | High | ⬜ Not Started | |
| 3.2 | Implement SessionService | US-TRAIN-03 | C-204 | High | ⬜ Not Started | |
| 3.3 | Create session CRUD endpoints | US-TRAIN-03 | C-204 | High | ⬜ Not Started | |
| 3.4 | Implement EnrollmentService | US-TRAIN-04 | C-205 | High | ⬜ Not Started | |
| 3.5 | Implement waitlist logic | US-TRAIN-04 | C-205 | High | ⬜ Not Started | |
| 3.6 | Implement self-enrollment logic | US-TRAIN-04 | C-206 | High | ⬜ Not Started | |
| 3.7 | Create enrollment API endpoints | US-TRAIN-04 | C-205 | High | ⬜ Not Started | |
| 3.8 | Implement attendance recording | US-TRAIN-05 | C-208 | High | ⬜ Not Started | |
| 3.9 | Session completion workflow | US-TRAIN-05 | C-209 | High | ⬜ Not Started | |
| 3.10 | Write unit tests for SessionService | US-TRAIN-03 | C-204 | High | ⬜ Not Started | |
| 3.11 | Write unit tests for EnrollmentService | US-TRAIN-04 | C-205 | High | ⬜ Not Started | |
| 3.12 | Write integration tests | - | - | High | ⬜ Not Started | |

---

## Stage P8.4: Assignments & Completions Backend

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 4.1 | Implement AssignmentRepository | US-TRAIN-06 | C-210 | High | ⬜ Not Started | |
| 4.2 | Implement AssignmentService | US-TRAIN-06 | C-210 | High | ⬜ Not Started | |
| 4.3 | Implement individual assignment logic | US-TRAIN-06 | C-211 | High | ⬜ Not Started | |
| 4.4 | Implement bulk assignment (role/site) | US-TRAIN-07 | C-212 | High | ⬜ Not Started | |
| 4.5 | Implement AssignmentRuleService | US-TRAIN-08 | C-214 | High | ⬜ Not Started | |
| 4.6 | Create assignment API endpoints | US-TRAIN-06 | C-210 | High | ⬜ Not Started | |
| 4.7 | Implement CompletionRepository | US-TRAIN-09 | C-209 | High | ⬜ Not Started | |
| 4.8 | Implement CompletionService | US-TRAIN-09 | C-209 | High | ⬜ Not Started | |
| 4.9 | Implement expiry date calculation | US-TRAIN-09 | C-215 | High | ⬜ Not Started | |
| 4.10 | Implement verification workflow | US-TRAIN-10 | C-217 | High | ⬜ Not Started | |
| 4.11 | Create completion API endpoints | US-TRAIN-09 | C-209 | High | ⬜ Not Started | |
| 4.12 | Implement evidence attachment handling | US-TRAIN-10 | C-218 | High | ⬜ Not Started | |
| 4.13 | Implement waive assignment logic | US-TRAIN-06 | C-213 | Medium | ⬜ Not Started | |
| 4.14 | Write unit tests for AssignmentService | US-TRAIN-06 | C-210 | High | ⬜ Not Started | |
| 4.15 | Write unit tests for CompletionService | US-TRAIN-09 | C-209 | High | ⬜ Not Started | |
| 4.16 | Write integration tests | - | - | High | ⬜ Not Started | |

---

## Stage P8.5: Training Matrix Backend

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 5.1 | Implement MatrixRepository | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 5.2 | Implement MatrixService | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 5.3 | Optimize matrix query performance | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 5.4 | Implement user×course matrix view | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 5.5 | Implement role×course matrix view | US-TRAIN-12 | C-220 | Medium | ⬜ Not Started | |
| 5.6 | Implement gap analysis | US-TRAIN-13 | C-221 | High | ⬜ Not Started | |
| 5.7 | Create matrix API endpoints | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 5.8 | Implement RoleRequirementsService | US-TRAIN-14 | C-223 | High | ⬜ Not Started | |
| 5.9 | Implement SiteRequirementsService | US-TRAIN-14 | C-224 | Medium | ⬜ Not Started | |
| 5.10 | Create requirements API endpoints | US-TRAIN-14 | C-223 | High | ⬜ Not Started | |
| 5.11 | Write unit tests | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 5.12 | Write integration tests | - | - | High | ⬜ Not Started | |

---

## Stage P8.6: Background Jobs & Notifications

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 6.1 | Implement ExpiryCheckJob | US-TRAIN-16 | C-215 | High | ⬜ Not Started | |
| 6.2 | Implement ReminderJob | US-TRAIN-16 | C-227 | High | ⬜ Not Started | |
| 6.3 | Implement AutoAssignmentJob | US-TRAIN-16 | C-214 | High | ⬜ Not Started | |
| 6.4 | Implement TrainingAnalyticsAggregationJob | US-TRAIN-16 | C-228 | Medium | ⬜ Not Started | |
| 6.5 | Configure job schedules | US-TRAIN-16 | - | High | ⬜ Not Started | |
| 6.6 | Integrate with Phase 4 notifications | US-TRAIN-17 | C-229 | High | ⬜ Not Started | |
| 6.7 | Create notification templates | US-TRAIN-17 | C-229 | High | ⬜ Not Started | |
| 6.8 | Write unit tests for jobs | US-TRAIN-16 | - | High | ⬜ Not Started | |
| 6.9 | Write integration tests | - | - | High | ⬜ Not Started | |

---

## Stage P8.7: Frontend Implementation

### P8.7a: My Training

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 7a.1 | Create My Training page | US-TRAIN-11 | C-219 | High | ⬜ Not Started | |
| 7a.2 | Implement training summary cards | US-TRAIN-11 | C-219 | High | ⬜ Not Started | |
| 7a.3 | Create assignments list component | US-TRAIN-11 | C-219 | High | ⬜ Not Started | |
| 7a.4 | Implement session booking dropdown | US-TRAIN-11 | C-206 | High | ⬜ Not Started | |
| 7a.5 | Create upcoming sessions component | US-TRAIN-11 | C-219 | High | ⬜ Not Started | |
| 7a.6 | Create expiring training component | US-TRAIN-11 | C-219 | High | ⬜ Not Started | |
| 7a.7 | Create recent completions component | US-TRAIN-11 | C-219 | High | ⬜ Not Started | |
| 7a.8 | Implement self-enrollment flow | US-TRAIN-11 | C-206 | High | ⬜ Not Started | |
| 7a.9 | Add export training history | US-TRAIN-11 | C-220 | Medium | ⬜ Not Started | |

### P8.7b: Training Catalogue

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 7b.1 | Create course list page | US-TRAIN-02 | C-201 | High | ⬜ Not Started | |
| 7b.2 | Create course filter bar | US-TRAIN-02 | C-201 | High | ⬜ Not Started | |
| 7b.3 | Create course card component | US-TRAIN-02 | C-201 | High | ⬜ Not Started | |
| 7b.4 | Create course detail modal | US-TRAIN-02 | C-201 | High | ⬜ Not Started | |
| 7b.5 | Create add/edit course form | US-TRAIN-02 | C-202 | High | ⬜ Not Started | |
| 7b.6 | Implement prerequisite selection | US-TRAIN-02 | C-207 | High | ⬜ Not Started | |
| 7b.7 | Implement file attachments | US-TRAIN-02 | C-203 | High | ⬜ Not Started | |

### P8.7c: Training Sessions

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 7c.1 | Create sessions list page | US-TRAIN-03 | C-204 | High | ⬜ Not Started | |
| 7c.2 | Create calendar view component | US-TRAIN-03 | C-204 | High | ⬜ Not Started | |
| 7c.3 | Create session detail modal | US-TRAIN-03 | C-204 | High | ⬜ Not Started | |
| 7c.4 | Create schedule session form | US-TRAIN-03 | C-204 | High | ⬜ Not Started | |
| 7c.5 | Create enrollment management modal | US-TRAIN-04 | C-205 | High | ⬜ Not Started | |
| 7c.6 | Create attendance recording form | US-TRAIN-05 | C-208 | High | ⬜ Not Started | |

### P8.7d: Assignment Management

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 7d.1 | Create assign training page | US-TRAIN-06 | C-211 | High | ⬜ Not Started | |
| 7d.2 | Create individual assignment tab | US-TRAIN-06 | C-211 | High | ⬜ Not Started | |
| 7d.3 | Create role-based assignment tab | US-TRAIN-07 | C-212 | High | ⬜ Not Started | |
| 7d.4 | Create site-based assignment tab | US-TRAIN-07 | C-212 | High | ⬜ Not Started | |
| 7d.5 | Implement assignment preview | US-TRAIN-06 | C-211 | High | ⬜ Not Started | |
| 7d.6 | Create assignment rules page | US-TRAIN-08 | C-214 | High | ⬜ Not Started | |

### P8.7e: Record Completions

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 7e.1 | Create record completion page | US-TRAIN-09 | C-209 | High | ⬜ Not Started | |
| 7e.2 | Create individual completion form | US-TRAIN-09 | C-209 | High | ⬜ Not Started | |
| 7e.3 | Create external training form | US-TRAIN-10 | C-216 | High | ⬜ Not Started | |
| 7e.4 | Create session attendance form | US-TRAIN-05 | C-208 | High | ⬜ Not Started | |
| 7e.5 | Implement evidence upload | US-TRAIN-10 | C-218 | High | ⬜ Not Started | |
| 7e.6 | Create verification queue (admin) | US-TRAIN-10 | C-217 | High | ⬜ Not Started | |

### P8.7f: Training Matrix

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 7f.1 | Create training matrix page | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 7f.2 | Create matrix grid component | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 7f.3 | Create matrix cell component | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 7f.4 | Create cell popover component | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 7f.5 | Implement matrix filters | US-TRAIN-12 | C-220 | High | ⬜ Not Started | |
| 7f.6 | Add matrix export | US-TRAIN-12 | C-222 | High | ⬜ Not Started | |

### P8.7g: Settings Pages

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 7g.1 | Create categories management page | US-TRAIN-01 | C-200 | High | ⬜ Not Started | |
| 7g.2 | Create role requirements page | US-TRAIN-14 | C-223 | High | ⬜ Not Started | |
| 7g.3 | Create assignment rules page | US-TRAIN-08 | C-214 | High | ⬜ Not Started | |

---

## Stage P8.8: Reports & Exports

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 8.1 | Implement TrainingReportService | US-TRAIN-15 | C-225 | High | ⬜ Not Started | |
| 8.2 | Create user training history PDF | US-TRAIN-15 | C-225 | High | ⬜ Not Started | |
| 8.3 | Create course completions Excel export | US-TRAIN-15 | C-226 | High | ⬜ Not Started | |
| 8.4 | Create matrix Excel export | US-TRAIN-15 | C-222 | High | ⬜ Not Started | |
| 8.5 | Create compliance overview PDF | US-TRAIN-15 | C-225 | High | ⬜ Not Started | |
| 8.6 | Create session attendance Excel export | US-TRAIN-15 | C-226 | Medium | ⬜ Not Started | |
| 8.7 | Create reports API endpoints | US-TRAIN-15 | C-225 | High | ⬜ Not Started | |
| 8.8 | Create Training Reports page | US-TRAIN-15 | C-225 | High | ⬜ Not Started | |
| 8.9 | Implement report generation UI | US-TRAIN-15 | C-225 | High | ⬜ Not Started | |
| 8.10 | Write unit tests | US-TRAIN-15 | C-225 | High | ⬜ Not Started | |
| 8.11 | Write integration tests | - | - | High | ⬜ Not Started | |

---

## Stage P8.9: Integration & Testing

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 9.1 | Integrate with Phase 1 (Users, Sites) | US-TRAIN-18 | - | High | ⬜ Not Started | |
| 9.2 | Integrate with Phase 2 (Actions) | US-TRAIN-18 | C-230 | High | ⬜ Not Started | |
| 9.3 | Integrate with Phase 4 (Notifications) | US-TRAIN-17 | C-229 | High | ⬜ Not Started | |
| 9.4 | Integrate with Phase 5 (Analytics) | US-TRAIN-18 | C-228 | High | ⬜ Not Started | |
| 9.5 | E2E test: Assignment workflow | - | - | High | ⬜ Not Started | |
| 9.6 | E2E test: Session workflow | - | - | High | ⬜ Not Started | |
| 9.7 | E2E test: Completion workflow | - | - | High | ⬜ Not Started | |
| 9.8 | E2E test: Matrix visualization | - | - | High | ⬜ Not Started | |
| 9.9 | E2E test: Report generation | - | - | High | ⬜ Not Started | |
| 9.10 | Performance testing | - | - | High | ⬜ Not Started | |
| 9.11 | Security testing | US-TRAIN-19 | C-231 | High | ⬜ Not Started | |
| 9.12 | Cross-browser testing | - | - | Medium | ⬜ Not Started | |
| 9.13 | Mobile responsiveness testing | - | - | Medium | ⬜ Not Started | |
| 9.14 | Fix identified issues | - | - | High | ⬜ Not Started | |

---

## Stage P8.10: UAT & Documentation

| # | Task | US-ID | C-ID | Priority | Status | Notes |
|---|------|-------|------|----------|--------|-------|
| 10.1 | Prepare UAT environment | - | - | High | ⬜ Not Started | |
| 10.2 | Create UAT test scenarios | - | - | High | ⬜ Not Started | |
| 10.3 | Conduct UAT session 1 | - | - | High | ⬜ Not Started | |
| 10.4 | Document UAT findings | - | - | High | ⬜ Not Started | |
| 10.5 | Implement UAT feedback | - | - | High | ⬜ Not Started | |
| 10.6 | Conduct UAT session 2 | - | - | High | ⬜ Not Started | |
| 10.7 | Update API documentation | - | - | High | ⬜ Not Started | |
| 10.8 | Create user guides | - | - | High | ⬜ Not Started | |
| 10.9 | Update runbook | - | - | Medium | ⬜ Not Started | |
| 10.10 | Final UAT sign-off | - | - | High | ⬜ Not Started | |

---

## Summary

| Stage | Total Tasks | Completed | In Progress | Not Started |
|-------|-------------|-----------|-------------|-------------|
| P8.1 | 16 | 0 | 0 | 16 |
| P8.2 | 11 | 0 | 0 | 11 |
| P8.3 | 12 | 0 | 0 | 12 |
| P8.4 | 16 | 0 | 0 | 16 |
| P8.5 | 12 | 0 | 0 | 12 |
| P8.6 | 9 | 0 | 0 | 9 |
| P8.7a | 9 | 0 | 0 | 9 |
| P8.7b | 7 | 0 | 0 | 7 |
| P8.7c | 6 | 0 | 0 | 6 |
| P8.7d | 6 | 0 | 0 | 6 |
| P8.7e | 6 | 0 | 0 | 6 |
| P8.7f | 6 | 0 | 0 | 6 |
| P8.7g | 3 | 0 | 0 | 3 |
| P8.8 | 11 | 0 | 0 | 11 |
| P8.9 | 14 | 0 | 0 | 14 |
| P8.10 | 10 | 0 | 0 | 10 |
| **TOTAL** | **154** | **0** | **0** | **154** |

---

## Capability Coverage

| Capability ID | Description | Covered By Tasks |
|---------------|-------------|------------------|
| C-200 | Training Categories CRUD | P8.1, P8.2, P8.7g |
| C-201 | Training Course Listing | P8.2, P8.7b |
| C-202 | Training Course CRUD | P8.2, P8.7b |
| C-203 | Course Attachments | P8.2, P8.7b |
| C-204 | Training Sessions | P8.3, P8.7c |
| C-205 | Session Enrollments | P8.3, P8.7c |
| C-206 | Self-Enrollment | P8.3, P8.7a |
| C-207 | Course Prerequisites | P8.2, P8.7b |
| C-208 | Attendance Recording | P8.3, P8.7e |
| C-209 | Training Completions | P8.4, P8.7e |
| C-210 | Training Assignments | P8.4, P8.7d |
| C-211 | Individual Assignment | P8.4, P8.7d |
| C-212 | Bulk Assignment | P8.4, P8.7d |
| C-213 | Waive Assignment | P8.4 |
| C-214 | Assignment Rules | P8.4, P8.6, P8.7g |
| C-215 | Expiry Management | P8.4, P8.6 |
| C-216 | External Training | P8.4, P8.7e |
| C-217 | Verification Workflow | P8.4, P8.7e |
| C-218 | Evidence Attachments | P8.4, P8.7e |
| C-219 | My Training Dashboard | P8.7a |
| C-220 | Training Matrix | P8.5, P8.7f |
| C-221 | Gap Analysis | P8.5 |
| C-222 | Matrix Export | P8.8 |
| C-223 | Role Requirements | P8.5, P8.7g |
| C-224 | Site Requirements | P8.5 |
| C-225 | Training Reports PDF | P8.8 |
| C-226 | Training Reports Excel | P8.8 |
| C-227 | Training Reminders | P8.6 |
| C-228 | Training Analytics | P8.6, P8.9 |
| C-229 | Training Notifications | P8.6, P8.9 |
| C-230 | Action Integration | P8.9 |
| C-231 | Training RBAC | P8.9 |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 8 checklist |

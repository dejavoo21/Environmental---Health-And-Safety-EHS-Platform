# Implementation Plan – EHS Portal Phase 8
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

This document outlines the implementation plan for Phase 8: Training & Competence Management.

**Phase Duration:** 6 weeks  
**Team Composition:** 2 Backend + 2 Frontend + 1 QA

---

## 2. Implementation Stages

### Stage Summary

| Stage | Name | Duration | Dependencies |
|-------|------|----------|--------------|
| P8.1 | Database & Core Models | Week 1 | Phase 7 complete |
| P8.2 | Course Catalogue Backend | Week 1-2 | P8.1 |
| P8.3 | Sessions & Enrollments Backend | Week 2 | P8.2 |
| P8.4 | Assignments & Completions Backend | Week 2-3 | P8.2 |
| P8.5 | Training Matrix Backend | Week 3 | P8.4 |
| P8.6 | Background Jobs & Notifications | Week 3-4 | P8.4 |
| P8.7 | Frontend Implementation | Week 3-5 | P8.2+ progressive |
| P8.8 | Reports & Exports | Week 4-5 | P8.5 |
| P8.9 | Integration & Testing | Week 5-6 | All previous |
| P8.10 | UAT & Documentation | Week 6 | P8.9 |

---

## 3. Stage Details

---

### Stage P8.1: Database & Core Models

**Duration:** 4 days  
**Assignee:** Backend Developer 1

#### Tasks

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.1.1 | Create migration 008_phase8_training.sql | 4 | Not Started |
| P8.1.2 | Create training_categories table | 2 | Not Started |
| P8.1.3 | Create training_courses table | 3 | Not Started |
| P8.1.4 | Create training_course_prerequisites table | 1 | Not Started |
| P8.1.5 | Create training_sessions table | 3 | Not Started |
| P8.1.6 | Create training_session_enrollments table | 2 | Not Started |
| P8.1.7 | Create training_assignments table | 3 | Not Started |
| P8.1.8 | Create training_assignment_rules table | 2 | Not Started |
| P8.1.9 | Create training_completions table | 3 | Not Started |
| P8.1.10 | Create training_role_requirements table | 2 | Not Started |
| P8.1.11 | Create training_site_requirements table | 2 | Not Started |
| P8.1.12 | Add training columns to attachments table | 1 | Not Started |
| P8.1.13 | Add training columns to actions table | 1 | Not Started |
| P8.1.14 | Create indexes and constraints | 2 | Not Started |
| P8.1.15 | Write seed data for categories | 2 | Not Started |
| P8.1.16 | Create TypeScript entity models | 4 | Not Started |

#### Deliverables
- Migration file 008_phase8_training.sql
- Entity models for all training tables
- Seed data for default categories

#### Acceptance Criteria
- [ ] Migration runs successfully
- [ ] All tables created with proper constraints
- [ ] Entity models type-safe
- [ ] Seed data populates default categories

---

### Stage P8.2: Course Catalogue Backend

**Duration:** 5 days  
**Assignee:** Backend Developer 1

#### Tasks

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.2.1 | Implement CategoryRepository | 4 | Not Started |
| P8.2.2 | Implement CategoryService | 4 | Not Started |
| P8.2.3 | Create category API endpoints | 3 | Not Started |
| P8.2.4 | Implement CourseRepository | 6 | Not Started |
| P8.2.5 | Implement CourseService | 8 | Not Started |
| P8.2.6 | Implement course prerequisite logic | 4 | Not Started |
| P8.2.7 | Create course CRUD endpoints | 6 | Not Started |
| P8.2.8 | Implement course attachment handling | 4 | Not Started |
| P8.2.9 | Write unit tests for CategoryService | 3 | Not Started |
| P8.2.10 | Write unit tests for CourseService | 4 | Not Started |
| P8.2.11 | Write integration tests for course API | 4 | Not Started |

#### Deliverables
- CategoryService with CRUD operations
- CourseService with CRUD, prerequisites, attachments
- Category and Course API endpoints
- Unit and integration tests

#### Acceptance Criteria
- [ ] Categories can be listed, created, updated
- [ ] Courses can be listed with filtering and search
- [ ] Course CRUD operations work correctly
- [ ] Prerequisites validated on course creation
- [ ] File attachments upload to course
- [ ] All tests passing

---

### Stage P8.3: Sessions & Enrollments Backend

**Duration:** 5 days  
**Assignee:** Backend Developer 2

#### Tasks

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.3.1 | Implement SessionRepository | 5 | Not Started |
| P8.3.2 | Implement SessionService | 8 | Not Started |
| P8.3.3 | Create session CRUD endpoints | 5 | Not Started |
| P8.3.4 | Implement EnrollmentService | 6 | Not Started |
| P8.3.5 | Implement waitlist logic | 3 | Not Started |
| P8.3.6 | Implement self-enrollment logic | 3 | Not Started |
| P8.3.7 | Create enrollment API endpoints | 4 | Not Started |
| P8.3.8 | Implement attendance recording | 4 | Not Started |
| P8.3.9 | Session completion workflow | 4 | Not Started |
| P8.3.10 | Write unit tests for SessionService | 4 | Not Started |
| P8.3.11 | Write unit tests for EnrollmentService | 3 | Not Started |
| P8.3.12 | Write integration tests | 4 | Not Started |

#### Deliverables
- SessionService with scheduling, capacity management
- EnrollmentService with waitlist support
- Attendance recording functionality
- Session and enrollment API endpoints
- Unit and integration tests

#### Acceptance Criteria
- [ ] Sessions can be scheduled with capacity limits
- [ ] Users can be enrolled (manager or self)
- [ ] Waitlist works when at capacity
- [ ] Attendance can be recorded
- [ ] Session completion creates completions
- [ ] All tests passing

---

### Stage P8.4: Assignments & Completions Backend

**Duration:** 6 days  
**Assignee:** Backend Developer 1 + 2

#### Tasks

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.4.1 | Implement AssignmentRepository | 5 | Not Started |
| P8.4.2 | Implement AssignmentService | 8 | Not Started |
| P8.4.3 | Implement individual assignment logic | 4 | Not Started |
| P8.4.4 | Implement bulk assignment (role/site) | 6 | Not Started |
| P8.4.5 | Implement AssignmentRuleService | 6 | Not Started |
| P8.4.6 | Create assignment API endpoints | 5 | Not Started |
| P8.4.7 | Implement CompletionRepository | 4 | Not Started |
| P8.4.8 | Implement CompletionService | 8 | Not Started |
| P8.4.9 | Implement expiry date calculation | 3 | Not Started |
| P8.4.10 | Implement verification workflow | 4 | Not Started |
| P8.4.11 | Create completion API endpoints | 5 | Not Started |
| P8.4.12 | Implement evidence attachment handling | 3 | Not Started |
| P8.4.13 | Write unit tests for AssignmentService | 4 | Not Started |
| P8.4.14 | Write unit tests for CompletionService | 4 | Not Started |
| P8.4.15 | Write integration tests | 5 | Not Started |

#### Deliverables
- AssignmentService with individual and bulk assignment
- AssignmentRuleService for auto-assignment rules
- CompletionService with verification workflow
- Assignment and completion API endpoints
- Unit and integration tests

#### Acceptance Criteria
- [ ] Individual assignments can be created
- [ ] Bulk assignments work by role and site
- [ ] Assignment rules auto-assign to new users
- [ ] Completions recorded with expiry calculation
- [ ] External completions require verification
- [ ] Evidence attachments work
- [ ] All tests passing

---

### Stage P8.5: Training Matrix Backend

**Duration:** 4 days  
**Assignee:** Backend Developer 2

#### Tasks

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.5.1 | Implement MatrixRepository | 6 | Not Started |
| P8.5.2 | Implement MatrixService | 8 | Not Started |
| P8.5.3 | Optimize matrix query performance | 4 | Not Started |
| P8.5.4 | Implement user×course matrix view | 4 | Not Started |
| P8.5.5 | Implement role×course matrix view | 3 | Not Started |
| P8.5.6 | Implement gap analysis | 4 | Not Started |
| P8.5.7 | Create matrix API endpoints | 4 | Not Started |
| P8.5.8 | Implement requirements service | 4 | Not Started |
| P8.5.9 | Create requirements API endpoints | 3 | Not Started |
| P8.5.10 | Write unit tests | 4 | Not Started |
| P8.5.11 | Write integration tests | 3 | Not Started |

#### Deliverables
- MatrixService with multiple view types
- Gap analysis functionality
- Role/site requirements configuration
- Matrix and requirements API endpoints
- Unit and integration tests

#### Acceptance Criteria
- [ ] Matrix returns correct status for each user/course combination
- [ ] Matrix query performs well (<1s for 100 users × 50 courses)
- [ ] Gap analysis identifies missing/expired training
- [ ] Requirements can be configured by role and site
- [ ] All tests passing

---

### Stage P8.6: Background Jobs & Notifications

**Duration:** 4 days  
**Assignee:** Backend Developer 1

#### Tasks

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.6.1 | Implement ExpiryCheckJob | 4 | Not Started |
| P8.6.2 | Implement ReminderJob | 4 | Not Started |
| P8.6.3 | Implement AutoAssignmentJob | 4 | Not Started |
| P8.6.4 | Implement TrainingAnalyticsAggregationJob | 4 | Not Started |
| P8.6.5 | Configure job schedules | 2 | Not Started |
| P8.6.6 | Integrate with Phase 4 notifications | 4 | Not Started |
| P8.6.7 | Create notification templates | 4 | Not Started |
| P8.6.8 | Write unit tests for jobs | 4 | Not Started |
| P8.6.9 | Write integration tests | 3 | Not Started |

#### Deliverables
- ExpiryCheckJob running at 01:00 UTC
- ReminderJob running at 06:00 UTC
- AutoAssignmentJob running at 02:00 UTC
- TrainingAnalyticsAggregationJob running at 03:00 UTC
- Notification templates for all training events
- Unit and integration tests

#### Acceptance Criteria
- [ ] Expiry check correctly identifies expiring/expired training
- [ ] Reminders sent at configured intervals
- [ ] Auto-assignment applies to new users matching rules
- [ ] Analytics aggregation populates dashboard data
- [ ] Notifications sent through Phase 4 system
- [ ] All tests passing

---

### Stage P8.7: Frontend Implementation

**Duration:** 10 days  
**Assignee:** Frontend Developer 1 + 2

#### Sub-stages

##### P8.7a: My Training (3 days)

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.7a.1 | Create My Training page | 6 | Not Started |
| P8.7a.2 | Implement training summary cards | 4 | Not Started |
| P8.7a.3 | Create assignments list component | 4 | Not Started |
| P8.7a.4 | Implement session booking dropdown | 4 | Not Started |
| P8.7a.5 | Create upcoming sessions component | 3 | Not Started |
| P8.7a.6 | Create expiring training component | 3 | Not Started |
| P8.7a.7 | Create recent completions component | 3 | Not Started |
| P8.7a.8 | Implement self-enrollment flow | 4 | Not Started |
| P8.7a.9 | Add export training history | 2 | Not Started |

##### P8.7b: Training Catalogue (3 days)

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.7b.1 | Create course list page | 5 | Not Started |
| P8.7b.2 | Create course filter bar | 3 | Not Started |
| P8.7b.3 | Create course card component | 4 | Not Started |
| P8.7b.4 | Create course detail modal | 5 | Not Started |
| P8.7b.5 | Create add/edit course form | 6 | Not Started |
| P8.7b.6 | Implement prerequisite selection | 3 | Not Started |
| P8.7b.7 | Implement file attachments | 3 | Not Started |

##### P8.7c: Training Sessions (2 days)

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.7c.1 | Create sessions list page | 4 | Not Started |
| P8.7c.2 | Create calendar view component | 6 | Not Started |
| P8.7c.3 | Create session detail modal | 4 | Not Started |
| P8.7c.4 | Create schedule session form | 5 | Not Started |
| P8.7c.5 | Create enrollment management modal | 4 | Not Started |
| P8.7c.6 | Create attendance recording form | 4 | Not Started |

##### P8.7d: Assignment Management (2 days)

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.7d.1 | Create assign training page | 5 | Not Started |
| P8.7d.2 | Create individual assignment tab | 4 | Not Started |
| P8.7d.3 | Create role-based assignment tab | 4 | Not Started |
| P8.7d.4 | Create site-based assignment tab | 3 | Not Started |
| P8.7d.5 | Implement assignment preview | 3 | Not Started |
| P8.7d.6 | Create assignment rules page | 4 | Not Started |

##### P8.7e: Record Completions (1.5 days)

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.7e.1 | Create record completion page | 4 | Not Started |
| P8.7e.2 | Create individual completion form | 4 | Not Started |
| P8.7e.3 | Create external training form | 4 | Not Started |
| P8.7e.4 | Create session attendance form | 4 | Not Started |
| P8.7e.5 | Implement evidence upload | 3 | Not Started |
| P8.7e.6 | Create verification queue (admin) | 3 | Not Started |

##### P8.7f: Training Matrix (2 days)

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.7f.1 | Create training matrix page | 5 | Not Started |
| P8.7f.2 | Create matrix grid component | 8 | Not Started |
| P8.7f.3 | Create matrix cell component | 4 | Not Started |
| P8.7f.4 | Create cell popover component | 4 | Not Started |
| P8.7f.5 | Implement matrix filters | 4 | Not Started |
| P8.7f.6 | Add matrix export | 2 | Not Started |

##### P8.7g: Settings Pages (1.5 days)

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.7g.1 | Create categories management page | 4 | Not Started |
| P8.7g.2 | Create role requirements page | 5 | Not Started |
| P8.7g.3 | Create assignment rules page | 4 | Not Started |

#### Deliverables
- All training screens implemented
- Components reusable and tested
- State management configured
- API integration complete

#### Acceptance Criteria
- [ ] All screens match UX specifications
- [ ] Responsive on desktop, tablet, mobile
- [ ] Accessibility requirements met
- [ ] Loading and error states handled
- [ ] All component tests passing

---

### Stage P8.8: Reports & Exports

**Duration:** 4 days  
**Assignee:** Backend Developer 2 + Frontend Developer 2

#### Tasks

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.8.1 | Implement TrainingReportService | 6 | Not Started |
| P8.8.2 | Create user training history PDF | 4 | Not Started |
| P8.8.3 | Create course completions Excel export | 4 | Not Started |
| P8.8.4 | Create matrix Excel export | 4 | Not Started |
| P8.8.5 | Create compliance overview PDF | 5 | Not Started |
| P8.8.6 | Create session attendance Excel export | 3 | Not Started |
| P8.8.7 | Create reports API endpoints | 4 | Not Started |
| P8.8.8 | Create Training Reports page | 4 | Not Started |
| P8.8.9 | Implement report generation UI | 4 | Not Started |
| P8.8.10 | Write unit tests | 3 | Not Started |
| P8.8.11 | Write integration tests | 3 | Not Started |

#### Deliverables
- TrainingReportService with all report types
- PDF and Excel export capabilities
- Reports API endpoints
- Training Reports frontend page
- Unit and integration tests

#### Acceptance Criteria
- [ ] User training history exports as PDF
- [ ] Course completions export as Excel
- [ ] Matrix exports with all status indicators
- [ ] Compliance overview includes all sections
- [ ] Report generation handles large datasets
- [ ] All tests passing

---

### Stage P8.9: Integration & Testing

**Duration:** 5 days  
**Assignee:** QA + All Developers

#### Tasks

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.9.1 | Integrate with Phase 1 (Users, Sites) | 4 | Not Started |
| P8.9.2 | Integrate with Phase 2 (Actions) | 4 | Not Started |
| P8.9.3 | Integrate with Phase 4 (Notifications) | 4 | Not Started |
| P8.9.4 | Integrate with Phase 5 (Analytics) | 6 | Not Started |
| P8.9.5 | End-to-end test: Assignment workflow | 4 | Not Started |
| P8.9.6 | End-to-end test: Session workflow | 4 | Not Started |
| P8.9.7 | End-to-end test: Completion workflow | 4 | Not Started |
| P8.9.8 | End-to-end test: Matrix visualization | 3 | Not Started |
| P8.9.9 | End-to-end test: Report generation | 3 | Not Started |
| P8.9.10 | Performance testing | 4 | Not Started |
| P8.9.11 | Security testing | 4 | Not Started |
| P8.9.12 | Cross-browser testing | 3 | Not Started |
| P8.9.13 | Mobile responsiveness testing | 3 | Not Started |
| P8.9.14 | Fix identified issues | 8 | Not Started |

#### Deliverables
- All phase integrations verified
- E2E test suite for training module
- Performance test results
- Security test results
- Bug fixes

#### Acceptance Criteria
- [ ] Actions can link to training courses
- [ ] Notifications sent for all training events
- [ ] Training metrics appear in analytics dashboards
- [ ] All E2E tests passing
- [ ] Performance meets targets
- [ ] No security vulnerabilities

---

### Stage P8.10: UAT & Documentation

**Duration:** 4 days  
**Assignee:** QA + Solution Architect

#### Tasks

| ID | Task | Est. Hours | Status |
|----|------|------------|--------|
| P8.10.1 | Prepare UAT environment | 4 | Not Started |
| P8.10.2 | Create UAT test scenarios | 6 | Not Started |
| P8.10.3 | Conduct UAT session 1 | 4 | Not Started |
| P8.10.4 | Document UAT findings | 3 | Not Started |
| P8.10.5 | Implement UAT feedback | 6 | Not Started |
| P8.10.6 | Conduct UAT session 2 | 4 | Not Started |
| P8.10.7 | Update API documentation | 4 | Not Started |
| P8.10.8 | Create user guides | 6 | Not Started |
| P8.10.9 | Update runbook | 3 | Not Started |
| P8.10.10 | Final UAT sign-off | 2 | Not Started |

#### Deliverables
- UAT test scenarios
- UAT sign-off documentation
- Updated API documentation
- User guides for training module
- Updated operations runbook

#### Acceptance Criteria
- [ ] All UAT scenarios pass
- [ ] Stakeholder sign-off obtained
- [ ] Documentation complete and accurate
- [ ] Runbook updated with training jobs

---

## 4. Dependencies

### 4.1 Internal Dependencies

| Dependency | Required By | Phase |
|------------|-------------|-------|
| User management | All stages | Phase 1 |
| Site management | Assignments, Matrix | Phase 1 |
| Action management | Action integration | Phase 2 |
| Notification service | Background jobs | Phase 4 |
| Analytics aggregation | Dashboard widgets | Phase 5 |

### 4.2 External Dependencies

| Dependency | Required By | Notes |
|------------|-------------|-------|
| PDF generation library | P8.8 | ExcelJS, PDFKit |
| Email service | P8.6 | AWS SES / SendGrid |
| File storage | P8.2, P8.4 | S3-compatible |

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Matrix performance issues | Medium | High | Early optimization, pagination, caching |
| Complex bulk assignment logic | Medium | Medium | Thorough testing, preview before commit |
| Notification flooding | Low | Medium | Rate limiting, digest options |
| Data migration for existing users | Low | High | Clear migration strategy, dry-run |

---

## 6. Definition of Done

A stage is complete when:
- [ ] All tasks marked complete
- [ ] Unit tests written and passing (≥80% coverage)
- [ ] Integration tests passing
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] No critical bugs open
- [ ] Acceptance criteria verified

---

## 7. Milestones

| Milestone | Target Date | Criteria |
|-----------|-------------|----------|
| Backend Core Complete | End Week 3 | P8.1-P8.6 complete |
| Frontend Complete | End Week 5 | P8.7 complete |
| Integration Complete | End Week 5 | P8.8-P8.9 complete |
| Phase 8 Go-Live | End Week 6 | P8.10 complete, sign-off |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 8 implementation plan |

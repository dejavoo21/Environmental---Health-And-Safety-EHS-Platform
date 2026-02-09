# Implementation Plan – EHS Portal Phase 9
## Risk Register & Enterprise Risk Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Technical Lead |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 9 – Risk Register & Enterprise Risk Management |

---

## 1. Overview

This document outlines the implementation plan for Phase 9 Risk Register & Enterprise Risk Management. The phase is divided into 6 stages with defined deliverables and acceptance criteria.

**Estimated Duration:** 6 weeks

**Dependencies:**
- Phase 2 (Actions) - for control linking
- Phase 4 (Notifications) - for review reminders
- Phase 5 (Analytics) - for dashboard integration
- Phase 7 (Chemicals & Permits) - for entity linking
- Phase 8 (Training) - for training linkage

---

## 2. Stage Breakdown

### Stage P9.1: Foundation & Data Model (Week 1)

**Objective:** Establish database schema and core services.

#### Tasks

| ID | Task | Est. Hours | Owner |
|----|------|------------|-------|
| P9.1.1 | Create migration file `009_phase9_risk_register.sql` | 4 | Backend |
| P9.1.2 | Create enum types (risk_status, control_type, etc.) | 2 | Backend |
| P9.1.3 | Create tables (risks, risk_controls, risk_links, etc.) | 4 | Backend |
| P9.1.4 | Add indexes and foreign key constraints | 2 | Backend |
| P9.1.5 | Create helper functions (calculate_risk_level, etc.) | 3 | Backend |
| P9.1.6 | Create seed data for risk categories | 2 | Backend |
| P9.1.7 | Create riskRepository.js | 4 | Backend |
| P9.1.8 | Create riskControlRepository.js | 3 | Backend |
| P9.1.9 | Create riskLinkRepository.js | 3 | Backend |
| P9.1.10 | Create riskReviewRepository.js | 3 | Backend |
| P9.1.11 | Create riskCategoryRepository.js | 2 | Backend |
| P9.1.12 | Unit tests for repositories | 6 | Backend |

**Total:** 38 hours

#### Deliverables
- [x] Migration script executed successfully
- [x] All repository files with CRUD operations
- [x] Seed data for default risk categories
- [x] Unit tests passing (>80% coverage)

#### Acceptance Criteria
- Database tables created with correct structure
- Repository tests pass
- Rollback migration works correctly

---

### Stage P9.2: Core Services & API (Week 2)

**Objective:** Implement core risk management services and REST API.

#### Tasks

| ID | Task | Est. Hours | Owner |
|----|------|------------|-------|
| P9.2.1 | Create riskService.js (CRUD, search, status) | 8 | Backend |
| P9.2.2 | Create riskScoringService.js | 4 | Backend |
| P9.2.3 | Create riskValidator.js | 3 | Backend |
| P9.2.4 | Create risks.js route file | 6 | Backend |
| P9.2.5 | Implement GET /api/risks (list with filters) | 4 | Backend |
| P9.2.6 | Implement POST /api/risks (create) | 3 | Backend |
| P9.2.7 | Implement GET /api/risks/:id (detail) | 3 | Backend |
| P9.2.8 | Implement PUT /api/risks/:id (update) | 3 | Backend |
| P9.2.9 | Implement POST /api/risks/:id/status (change status) | 2 | Backend |
| P9.2.10 | Implement DELETE /api/risks/:id (soft delete) | 2 | Backend |
| P9.2.11 | Create riskCategories.js route file | 4 | Backend |
| P9.2.12 | Integration tests for risk endpoints | 8 | Backend |

**Total:** 50 hours

#### Deliverables
- [x] RiskService with all core operations
- [x] RiskScoringService for level calculations
- [x] Risk API endpoints functional
- [x] Category management endpoints
- [x] Integration tests passing

#### Acceptance Criteria
- CRUD operations work correctly
- Scoring calculations accurate (1-25 scale)
- Status transitions validated
- API response times < 200ms

---

### Stage P9.3: Controls, Links & Reviews (Week 3)

**Objective:** Implement control management, entity linking, and review functionality.

#### Tasks

| ID | Task | Est. Hours | Owner |
|----|------|------------|-------|
| P9.3.1 | Create riskControlService.js | 6 | Backend |
| P9.3.2 | Implement control CRUD endpoints | 4 | Backend |
| P9.3.3 | Implement control-entity linking | 4 | Backend |
| P9.3.4 | Create riskLinkService.js | 6 | Backend |
| P9.3.5 | Implement entity validation for links | 4 | Backend |
| P9.3.6 | Implement risk-entity link endpoints | 4 | Backend |
| P9.3.7 | Create riskReviewService.js | 6 | Backend |
| P9.3.8 | Implement review recording endpoint | 3 | Backend |
| P9.3.9 | Implement review history endpoint | 2 | Backend |
| P9.3.10 | Implement score snapshot on review | 3 | Backend |
| P9.3.11 | Calculate next review date logic | 2 | Backend |
| P9.3.12 | Integration tests for controls/links/reviews | 8 | Backend |

**Total:** 52 hours

#### Deliverables
- [x] Control management fully functional
- [x] Entity linking operational
- [x] Review recording with score snapshots
- [x] All linking validations working
- [x] Integration tests passing

#### Acceptance Criteria
- Controls can be added/edited/removed
- Links validated against target entities
- Reviews update risk scores and next review date
- Score history preserved in reviews

---

### Stage P9.4: Analytics, Heatmap & Export (Week 4)

**Objective:** Implement analytics endpoints, heatmap data, and export functionality.

#### Tasks

| ID | Task | Est. Hours | Owner |
|----|------|------------|-------|
| P9.4.1 | Create riskAnalyticsService.js | 8 | Backend |
| P9.4.2 | Implement heatmap aggregation | 4 | Backend |
| P9.4.3 | Implement GET /api/risks/heatmap | 3 | Backend |
| P9.4.4 | Implement GET /api/risks/top | 2 | Backend |
| P9.4.5 | Implement GET /api/risks/upcoming-reviews | 2 | Backend |
| P9.4.6 | Implement GET /api/risks/overdue-reviews | 2 | Backend |
| P9.4.7 | Create riskExportService.js | 6 | Backend |
| P9.4.8 | Implement Excel export | 4 | Backend |
| P9.4.9 | Implement PDF export | 4 | Backend |
| P9.4.10 | Implement POST /api/risks/export | 3 | Backend |
| P9.4.11 | Create risk settings endpoints | 4 | Backend |
| P9.4.12 | Integration tests for analytics/export | 6 | Backend |

**Total:** 48 hours

#### Deliverables
- [x] Heatmap data API functional
- [x] Top risks and review tracking endpoints
- [x] Excel and PDF export working
- [x] Settings API for scoring/tolerances
- [x] Integration tests passing

#### Acceptance Criteria
- Heatmap aggregates correctly by L×I
- Export files contain correct data
- Analytics queries performant (<500ms)
- Settings can be updated by admins

---

### Stage P9.5: Frontend Implementation (Weeks 5-6)

**Objective:** Build React frontend components and pages.

#### Tasks

| ID | Task | Est. Hours | Owner |
|----|------|------------|-------|
| P9.5.1 | Create useRisks hook | 4 | Frontend |
| P9.5.2 | Create useRiskDetail hook | 3 | Frontend |
| P9.5.3 | Create useRiskHeatmap hook | 2 | Frontend |
| P9.5.4 | Create useRiskMutation hook | 3 | Frontend |
| P9.5.5 | Create RiskLevelBadge component | 2 | Frontend |
| P9.5.6 | Create RiskScoreCard component | 3 | Frontend |
| P9.5.7 | Create RiskHeatmap component | 8 | Frontend |
| P9.5.8 | Create ScoringSelector component | 4 | Frontend |
| P9.5.9 | Create RiskForm component (multi-step) | 10 | Frontend |
| P9.5.10 | Create ControlCard component | 3 | Frontend |
| P9.5.11 | Create LinkCard component | 2 | Frontend |
| P9.5.12 | Create ReviewCard component | 2 | Frontend |
| P9.5.13 | Create ReviewModal component | 6 | Frontend |
| P9.5.14 | Create LinkEntityModal component | 5 | Frontend |
| P9.5.15 | Create RiskRegisterPage | 10 | Frontend |
| P9.5.16 | Create RiskDetailPage with tabs | 12 | Frontend |
| P9.5.17 | Create RiskHeatmapPage | 8 | Frontend |
| P9.5.18 | Create RiskSettingsPage (admin) | 6 | Frontend |
| P9.5.19 | Add navigation items | 2 | Frontend |
| P9.5.20 | Responsive design adjustments | 6 | Frontend |
| P9.5.21 | Component unit tests | 10 | Frontend |
| P9.5.22 | E2E tests for risk workflows | 12 | QA |

**Total:** 123 hours (Frontend: 101, QA: 22)

#### Deliverables
- [x] All components implemented
- [x] All pages functional
- [x] Navigation integrated
- [x] Responsive on all breakpoints
- [x] Unit tests passing
- [x] E2E tests passing

#### Acceptance Criteria
- Risk register displays with filters and pagination
- Risk form creates risks correctly
- Heatmap interactive with drill-down
- Review modal records reviews
- All user journeys complete successfully

---

### Stage P9.6: Notifications & Background Jobs (Week 6)

**Objective:** Implement notification triggers and background jobs.

#### Tasks

| ID | Task | Est. Hours | Owner |
|----|------|------------|-------|
| P9.6.1 | Create riskReviewReminder.js job | 4 | Backend |
| P9.6.2 | Create controlVerificationReminder.js job | 3 | Backend |
| P9.6.3 | Create riskAnalyticsAggregation.js job | 3 | Backend |
| P9.6.4 | Add risk notification templates | 4 | Backend |
| P9.6.5 | Integrate with NotificationService | 4 | Backend |
| P9.6.6 | Implement tolerance breach escalation | 4 | Backend |
| P9.6.7 | Add extreme risk creation alerts | 2 | Backend |
| P9.6.8 | Configure job schedules | 2 | Backend |
| P9.6.9 | Job execution tests | 4 | Backend |
| P9.6.10 | Notification delivery tests | 4 | Backend |

**Total:** 34 hours

#### Deliverables
- [x] Review reminder job running
- [x] Control verification reminders sent
- [x] Analytics aggregation job running
- [x] Notification templates configured
- [x] All tests passing

#### Acceptance Criteria
- Reminders sent at 7, 3, 1 days before review
- Overdue reviews escalate to managers
- Extreme risks notify admins immediately
- Jobs execute on schedule without errors

---

## 3. Resource Allocation

### Team Members

| Role | Name | Allocation |
|------|------|------------|
| Backend Lead | TBD | 100% |
| Backend Developer | TBD | 100% |
| Frontend Lead | TBD | 100% |
| Frontend Developer | TBD | 100% |
| QA Engineer | TBD | 50% |
| UX Designer | TBD | 25% |

### Hours by Role

| Role | P9.1 | P9.2 | P9.3 | P9.4 | P9.5 | P9.6 | Total |
|------|------|------|------|------|------|------|-------|
| Backend | 38 | 50 | 52 | 48 | 0 | 34 | 222 |
| Frontend | 0 | 0 | 0 | 0 | 101 | 0 | 101 |
| QA | 0 | 0 | 0 | 0 | 22 | 0 | 22 |
| **Total** | 38 | 50 | 52 | 48 | 123 | 34 | **345** |

---

## 4. Dependencies Map

```
                    ┌─────────────────────┐
                    │   P9.1 Foundation   │
                    │   (Week 1)          │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   P9.2 Core API     │
                    │   (Week 2)          │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼─────────┐ ┌────────▼────────┐ ┌────────▼────────┐
│   P9.3 Controls   │ │  P9.4 Analytics │ │  P9.6 Notifs    │
│   Links, Reviews  │ │  Export         │ │  Jobs           │
│   (Week 3)        │ │  (Week 4)       │ │  (Week 6)       │
└─────────┬─────────┘ └────────┬────────┘ └────────┬────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   P9.5 Frontend     │
                    │   (Weeks 5-6)       │
                    └─────────────────────┘
```

---

## 5. Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Entity linking complexity | Medium | High | Start with core entities, extend incrementally |
| Heatmap performance | Low | Medium | Pre-aggregate data, cache results |
| Export file size | Low | Low | Paginate and stream large exports |
| Scoring matrix customisation | Medium | Low | Lock down matrix structure, allow label edits only |

### Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Frontend complexity | Medium | High | Start frontend in Week 4 in parallel |
| Integration with Phase 7/8 | Low | Medium | Early validation of entity APIs |
| Testing coverage | Low | Medium | Write tests alongside development |

---

## 6. Quality Gates

### Per-Stage Gates

| Gate | Criteria |
|------|----------|
| Code Review | All PRs reviewed and approved |
| Unit Tests | >80% coverage, all passing |
| Integration Tests | All API tests passing |
| E2E Tests | All user journeys passing |
| Performance | API response <200ms, page load <2s |
| Security | No high/critical vulnerabilities |
| Accessibility | WCAG 2.1 AA compliance |

### Phase Completion Criteria

- [ ] All 6 stages completed
- [ ] All test suites passing
- [ ] Documentation updated
- [ ] UAT sign-off obtained
- [ ] No critical bugs outstanding
- [ ] Performance benchmarks met
- [ ] Security review passed

---

## 7. Testing Strategy

### Unit Tests

| Area | Tool | Coverage Target |
|------|------|-----------------|
| Services | Jest | 80% |
| Repositories | Jest | 80% |
| Validators | Jest | 90% |
| Components | React Testing Library | 70% |
| Hooks | React Testing Library | 80% |

### Integration Tests

| Area | Tool | Coverage Target |
|------|------|-----------------|
| API Endpoints | Supertest | 100% |
| Database | Jest + pg | 90% |

### E2E Tests

| Journey | Tool | Priority |
|---------|------|----------|
| Create risk end-to-end | Playwright | P1 |
| Add controls and links | Playwright | P1 |
| Record review | Playwright | P1 |
| View heatmap drill-down | Playwright | P2 |
| Export risk register | Playwright | P2 |

---

## 8. Deployment Plan

### Pre-Deployment

1. Run full test suite
2. Execute migration on staging
3. Verify seed data
4. Test all API endpoints
5. Complete UAT on staging

### Deployment Steps

1. Enable maintenance mode
2. Backup production database
3. Run migration `009_phase9_risk_register.sql`
4. Deploy backend services
5. Deploy frontend build
6. Verify health checks
7. Disable maintenance mode
8. Smoke test production

### Rollback Plan

1. Restore database backup
2. Deploy previous backend version
3. Deploy previous frontend version
4. Verify rollback successful

---

## 9. Documentation Updates

| Document | Updates Required |
|----------|------------------|
| USER_JOURNEYS.md | Add P9-J1 to P9-J4 |
| USER_STORIES.md | Add Epic E16 with US-RISK-01 to US-RISK-15 |
| DATA_MODEL.md | Add Phase 9 summary |
| ARCHITECTURE.md | Add Phase 9 services |
| API_SPEC.md | Reference API_SPEC_PHASE9.md |
| TEST_STRATEGY_ALL_PHASES.md | Add Phase 9 test requirements |

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Technical Lead | Initial Phase 9 implementation plan |

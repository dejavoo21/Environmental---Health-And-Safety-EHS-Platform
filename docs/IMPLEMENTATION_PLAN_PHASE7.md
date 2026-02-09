# Implementation Plan – EHS Portal Phase 7
## Chemical & Permit Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Status | Draft |
| Phase | 7 – Chemical & Permit Management |

---

## 1. Overview

### 1.1 Scope

Phase 7 implements two major capabilities:
1. **Chemical Management** – Chemical register, SDS, storage locations
2. **Permit-to-Work Management** – Permit types, lifecycle, board

### 1.2 Duration

- **Total Duration:** 8 weeks (7 sprints)
- **Sprint Length:** 1 week
- **Team Size:** 2 full-stack developers, 1 QA engineer

### 1.3 Dependencies

| Dependency | Phase | Status |
|------------|-------|--------|
| Attachment uploads | Phase 2 | ✅ Complete |
| Multi-tenant data isolation | Phase 3 | ✅ Complete |
| Notification service | Phase 4 | ✅ Complete |
| Analytics service | Phase 5 | ✅ Complete |
| Incident/Action linking | Phase 1 | ✅ Complete |

---

## 2. Sprint Breakdown

### Sprint P7.1: Data Model & Core Backend (Week 1)

**Focus:** Database migrations and core service scaffolding

**Tasks:**
| ID | Task | Estimate | Owner |
|----|------|----------|-------|
| P7.1.1 | Create database migration 007_phase7_chemicals_permits.sql | 4h | Dev 1 |
| P7.1.2 | Seed data for GHS hazard classes | 2h | Dev 1 |
| P7.1.3 | Seed data for system permit types and controls | 4h | Dev 1 |
| P7.1.4 | Create Chemical model and repository | 4h | Dev 1 |
| P7.1.5 | Create ChemicalLocation model and repository | 3h | Dev 1 |
| P7.1.6 | Create PermitType model and repository | 3h | Dev 2 |
| P7.1.7 | Create Permit model and repository | 4h | Dev 2 |
| P7.1.8 | Create PermitControl model and repository | 3h | Dev 2 |
| P7.1.9 | Create linking tables (incident_chemicals, etc.) | 3h | Dev 2 |
| P7.1.10 | Unit tests for models | 4h | Dev 1/2 |

**Deliverables:**
- [ ] Migration script executed successfully
- [ ] All models created with TypeScript types
- [ ] Repository layer with basic CRUD
- [ ] Unit tests passing (≥80% coverage)

**Exit Criteria:**
- All 14 tables created in development database
- Seed data loaded for GHS classes and permit types
- Repository tests green

---

### Sprint P7.2: Chemical Management APIs (Week 2)

**Focus:** REST API endpoints for chemicals

**Tasks:**
| ID | Task | Estimate | Owner |
|----|------|----------|-------|
| P7.2.1 | ChemicalService - CRUD operations | 6h | Dev 1 |
| P7.2.2 | Chemical search and filtering | 4h | Dev 1 |
| P7.2.3 | GHS hazard management | 3h | Dev 1 |
| P7.2.4 | SDS upload integration (AttachmentService) | 4h | Dev 1 |
| P7.2.5 | SDS version management | 3h | Dev 1 |
| P7.2.6 | SDS expiry notifications setup | 2h | Dev 1 |
| P7.2.7 | ChemicalLocationService | 4h | Dev 2 |
| P7.2.8 | Chemical inventory tracking | 3h | Dev 2 |
| P7.2.9 | Chemical linking to incidents/actions | 4h | Dev 2 |
| P7.2.10 | Chemical controller and routes | 4h | Dev 2 |
| P7.2.11 | API integration tests | 4h | QA |

**Deliverables:**
- [ ] GET/POST/PUT/PATCH /api/chemicals endpoints
- [ ] GET/POST /api/chemicals/:id/sds endpoints
- [ ] GET/POST /api/chemicals/:id/locations endpoints
- [ ] POST /api/incidents/:id/chemicals endpoint
- [ ] Integration tests passing

**Exit Criteria:**
- All chemical APIs documented in Postman
- Integration tests cover happy paths
- SDS upload working with file validation

---

### Sprint P7.3: Permit Management APIs (Week 3)

**Focus:** REST API endpoints for permits

**Tasks:**
| ID | Task | Estimate | Owner |
|----|------|----------|-------|
| P7.3.1 | PermitTypeService - CRUD operations | 4h | Dev 1 |
| P7.3.2 | PermitTypeControlService | 3h | Dev 1 |
| P7.3.3 | PermitService - create, read, update | 6h | Dev 2 |
| P7.3.4 | Permit state machine implementation | 6h | Dev 2 |
| P7.3.5 | Permit lifecycle transitions (submit, approve, activate, close) | 6h | Dev 2 |
| P7.3.6 | PermitControlService - check/complete controls | 4h | Dev 1 |
| P7.3.7 | PermitWorkerService | 3h | Dev 1 |
| P7.3.8 | PermitNumberService (auto-generate) | 2h | Dev 1 |
| P7.3.9 | Permit controller and routes | 4h | Dev 2 |
| P7.3.10 | API integration tests | 4h | QA |

**Deliverables:**
- [ ] GET/POST/PUT /api/permit-types endpoints
- [ ] GET/POST/PUT /api/permits endpoints
- [ ] Lifecycle endpoints: submit, approve, reject, activate, suspend, resume, close, cancel
- [ ] PATCH /api/permits/:id/controls/:controlId endpoint
- [ ] Integration tests passing

**Exit Criteria:**
- Permit state machine enforces valid transitions
- Pre-work/post-work control validation working
- Auto-generated permit numbers unique

---

### Sprint P7.4: Permit Board & Conflict Detection (Week 4)

**Focus:** Permit board and advanced permit features

**Tasks:**
| ID | Task | Estimate | Owner |
|----|------|----------|-------|
| P7.4.1 | Permit board query service | 4h | Dev 1 |
| P7.4.2 | Permit board grouping/filtering | 3h | Dev 1 |
| P7.4.3 | PermitConflictService | 6h | Dev 1 |
| P7.4.4 | Conflict detection algorithm | 4h | Dev 1 |
| P7.4.5 | Permit expiry auto-status update (cron job) | 4h | Dev 2 |
| P7.4.6 | Permit PDF generation | 6h | Dev 2 |
| P7.4.7 | Permit-incident/inspection linking | 3h | Dev 2 |
| P7.4.8 | Permit notifications (submitted, approved, expiring) | 4h | Dev 2 |
| P7.4.9 | API integration tests for board | 3h | QA |

**Deliverables:**
- [ ] GET /api/permits/board endpoint
- [ ] POST /api/permits/check-conflicts endpoint
- [ ] GET /api/permits/:id/pdf endpoint
- [ ] Cron job for auto-expiry
- [ ] Notification integration

**Exit Criteria:**
- Board returns permits grouped by status
- Conflict detection identifies overlapping permits
- PDF includes all permit details and controls

---

### Sprint P7.5: Chemical Management Frontend (Week 5)

**Focus:** React components for chemicals

**Tasks:**
| ID | Task | Estimate | Owner |
|----|------|----------|-------|
| P7.5.1 | ChemicalRegisterPage (list view) | 6h | Dev 1 |
| P7.5.2 | ChemicalDetailPage | 6h | Dev 1 |
| P7.5.3 | ChemicalCreateForm | 4h | Dev 1 |
| P7.5.4 | ChemicalEditForm | 3h | Dev 1 |
| P7.5.5 | GHSHazardIcons component | 3h | Dev 2 |
| P7.5.6 | GHSClassificationSelector component | 4h | Dev 2 |
| P7.5.7 | SDSUploadModal component | 4h | Dev 2 |
| P7.5.8 | SDSDocumentList component | 3h | Dev 2 |
| P7.5.9 | StorageLocationModal component | 3h | Dev 2 |
| P7.5.10 | Navigation updates for Chemicals | 2h | Dev 1 |
| P7.5.11 | E2E tests for chemical flows | 4h | QA |

**Deliverables:**
- [ ] /chemicals route with list view
- [ ] /chemicals/:id route with detail view
- [ ] /chemicals/new and /chemicals/:id/edit routes
- [ ] SDS upload modal functional
- [ ] Storage location modal functional

**Exit Criteria:**
- Chemical CRUD flows working end-to-end
- SDS upload with version tracking
- GHS pictograms displaying correctly
- E2E tests passing

---

### Sprint P7.6: Permit Management Frontend (Week 6)

**Focus:** React components for permits

**Tasks:**
| ID | Task | Estimate | Owner |
|----|------|----------|-------|
| P7.6.1 | PermitBoardPage | 8h | Dev 1 |
| P7.6.2 | PermitCard component | 4h | Dev 1 |
| P7.6.3 | CountdownTimer component | 3h | Dev 1 |
| P7.6.4 | PermitListPage | 4h | Dev 2 |
| P7.6.5 | PermitDetailPage | 6h | Dev 2 |
| P7.6.6 | ControlChecklistTabs component | 4h | Dev 2 |
| P7.6.7 | StateHistoryTimeline component | 3h | Dev 2 |
| P7.6.8 | PermitFormWizard (3-step) | 8h | Dev 1 |
| P7.6.9 | WorkerSelector component | 3h | Dev 1 |
| P7.6.10 | ConflictWarning component | 2h | Dev 1 |
| P7.6.11 | Navigation updates for Permits | 2h | Dev 2 |

**Deliverables:**
- [ ] /permits/board route with live board
- [ ] /permits route with list view
- [ ] /permits/:id route with detail view
- [ ] /permits/new route with multi-step form
- [ ] Permit lifecycle actions working

**Exit Criteria:**
- Permit board auto-refreshes
- Countdown timers update in real-time
- All lifecycle transitions working
- Control completion working

---

### Sprint P7.7: Integration, Analytics & Hardening (Week 7)

**Focus:** Analytics dashboards, final testing, hardening

**Tasks:**
| ID | Task | Estimate | Owner |
|----|------|----------|-------|
| P7.7.1 | Chemical analytics endpoints | 4h | Dev 1 |
| P7.7.2 | Permit analytics endpoints | 4h | Dev 1 |
| P7.7.3 | Analytics dashboard widgets for chemicals | 4h | Dev 2 |
| P7.7.4 | Analytics dashboard widgets for permits | 4h | Dev 2 |
| P7.7.5 | Approval modals (approve, reject) | 3h | Dev 1 |
| P7.7.6 | Activation and Close modals | 3h | Dev 1 |
| P7.7.7 | Suspend/Resume modals | 2h | Dev 1 |
| P7.7.8 | Full E2E test suite | 8h | QA |
| P7.7.9 | Performance testing (permit board) | 4h | QA |
| P7.7.10 | Security review (RBAC enforcement) | 4h | Dev 2 |
| P7.7.11 | Documentation updates | 4h | Dev 1/2 |
| P7.7.12 | Bug fixes and polish | 8h | All |

**Deliverables:**
- [ ] Analytics endpoints for chemicals and permits
- [ ] Dashboard widgets integrated
- [ ] All modal dialogs functional
- [ ] E2E test suite complete
- [ ] Performance benchmarks met
- [ ] Documentation complete

**Exit Criteria:**
- All acceptance criteria from BRD met
- E2E tests passing (≥90% coverage)
- Performance: Board loads in <2s with 50 permits
- No critical/high bugs open
- User documentation complete

---

## 3. Risk Management

### 3.1 Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Permit state machine complexity | Medium | High | Extensive unit testing, state diagram review |
| Conflict detection performance | Medium | Medium | Index optimization, algorithm testing |
| SDS file storage limits | Low | Medium | Cloud storage integration, size limits |
| Real-time board updates | Medium | Medium | WebSocket fallback to polling |
| Dual approval workflow complexity | Medium | Medium | Clear state transitions, logging |

### 3.2 Contingency Plan

If behind schedule:
1. **Week 5:** Defer analytics widgets to Sprint P7.8
2. **Week 6:** Defer PDF generation to Sprint P7.8
3. **Week 7:** Defer custom permit types to post-release

---

## 4. Testing Strategy

### 4.1 Test Coverage Targets

| Test Type | Target Coverage |
|-----------|----------------|
| Unit Tests | ≥80% |
| Integration Tests | ≥70% |
| E2E Tests | All critical flows |

### 4.2 Critical Test Scenarios

**Chemicals:**
- Create chemical with GHS hazards
- Upload SDS with version management
- SDS expiry notification trigger
- Chemical status change
- Link chemical to incident

**Permits:**
- Full permit lifecycle (draft → active → closed)
- Permit rejection and resubmission
- Pre-work control enforcement
- Conflict detection accuracy
- Auto-expiry job
- Permit board filtering

---

## 5. Deployment Plan

### 5.1 Pre-Deployment Checklist

- [ ] All migrations tested in staging
- [ ] Seed data verified (GHS classes, permit types)
- [ ] Feature flags configured
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] User documentation published

### 5.2 Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `feature.chemicals.enabled` | Enable Chemical Management module | false |
| `feature.permits.enabled` | Enable Permit Management module | false |
| `feature.permits.pdf` | Enable PDF generation | false |

### 5.3 Rollout Plan

| Phase | Action | Duration |
|-------|--------|----------|
| 1 | Deploy to staging | Day 1 |
| 2 | Internal testing (QA) | Days 2-3 |
| 3 | UAT with selected users | Days 4-7 |
| 4 | Production deploy (feature flags off) | Day 8 |
| 5 | Enable for pilot organisations | Day 9 |
| 6 | General availability | Day 14 |

---

## 6. Resource Allocation

### 6.1 Team Assignments

| Role | Name | Allocation |
|------|------|------------|
| Tech Lead | TBD | 50% |
| Developer 1 | TBD | 100% |
| Developer 2 | TBD | 100% |
| QA Engineer | TBD | 100% |
| Product Owner | TBD | 25% |

### 6.2 Sprint Assignments

| Sprint | Dev 1 Focus | Dev 2 Focus |
|--------|-------------|-------------|
| P7.1 | Chemical models | Permit models |
| P7.2 | Chemical APIs | Location/linking APIs |
| P7.3 | Permit type APIs | Permit lifecycle APIs |
| P7.4 | Board, conflicts | PDF, notifications |
| P7.5 | List/detail pages | GHS, SDS components |
| P7.6 | Board, wizard | List, detail, controls |
| P7.7 | Analytics, modals | Analytics, security |

---

## 7. Definition of Done

### 7.1 Sprint-Level DoD

- [ ] All tasks complete
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No critical bugs

### 7.2 Phase-Level DoD

- [ ] All BRD requirements implemented
- [ ] All API endpoints documented
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security review complete
- [ ] UAT sign-off obtained
- [ ] User documentation published
- [ ] Deployed to production

---

## 8. Success Metrics

### 8.1 Phase 7 KPIs

| Metric | Target |
|--------|--------|
| Chemical Register Adoption | 80% of active chemicals logged within 30 days |
| SDS Currency Rate | 95% of active chemicals have valid SDS |
| Permit Compliance | 100% of high-risk work has active permit |
| Permit Closure Rate | 90% of permits closed within validity period |
| Permit Board Usage | Checked 5x daily by safety officers |

### 8.2 Technical Metrics

| Metric | Target |
|--------|--------|
| API Response Time (p95) | <500ms |
| Permit Board Load Time | <2s |
| Test Coverage | ≥80% |
| Bug Escape Rate | <2 critical bugs post-release |

---

## 9. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

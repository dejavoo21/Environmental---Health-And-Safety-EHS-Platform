# Test Strategy – EHS Portal Phase 7
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

This document defines the testing strategy for Phase 7:
- **Chemical Management:** Register, SDS, storage locations, linking
- **Permit-to-Work:** Types, lifecycle, controls, board, conflicts

### 1.2 Quality Objectives

| Objective | Target |
|-----------|--------|
| Defect Detection Rate | ≥95% defects found before production |
| Test Coverage (Unit) | ≥80% |
| Test Coverage (Integration) | ≥70% |
| Critical Path Coverage | 100% |
| Regression Test Pass Rate | 100% |

---

## 2. Test Levels

### 2.1 Unit Testing

**Scope:** Individual functions, classes, and components

**Tools:**
- Backend: Jest
- Frontend: Jest + React Testing Library

**Focus Areas:**
- ChemicalService business logic
- PermitService state machine transitions
- PermitConflictService detection algorithm
- GHS hazard mapping
- Permit number generation
- Date/time calculations (expiry, countdown)

**Example Test Cases:**

```typescript
// Permit State Machine Tests
describe('PermitStateMachine', () => {
  it('should transition from draft to submitted', async () => {
    const permit = await createPermitInState('draft');
    const result = await permitService.submit(permit.id, userId);
    expect(result.status).toBe('submitted');
  });

  it('should not allow direct transition from draft to active', async () => {
    const permit = await createPermitInState('draft');
    await expect(permitService.activate(permit.id, userId))
      .rejects.toThrow('INVALID_STATE_TRANSITION');
  });

  it('should enforce pre-work controls before activation', async () => {
    const permit = await createApprovedPermitWithIncompleteControls();
    await expect(permitService.activate(permit.id, userId))
      .rejects.toThrow('PRE_WORK_INCOMPLETE');
  });
});
```

---

### 2.2 Integration Testing

**Scope:** API endpoints with database

**Tools:** Jest + Supertest

**Database Strategy:** Test database with transaction rollback

**Focus Areas:**
- Chemical CRUD with GHS hazard persistence
- SDS upload and attachment linking
- Permit lifecycle transitions with state history
- Control completion with validation
- Multi-tenant isolation

**Example Test Cases:**

```typescript
describe('POST /api/permits/:id/activate', () => {
  it('should activate approved permit with all pre-work controls complete', async () => {
    const permit = await seedApprovedPermit();
    await completeAllPreWorkControls(permit.id);

    const response = await request(app)
      .post(`/api/permits/${permit.id}/activate`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('active');
    expect(response.body.data.actualStart).toBeDefined();
  });

  it('should reject activation with incomplete mandatory controls', async () => {
    const permit = await seedApprovedPermit();
    // Leave pre-work controls incomplete

    const response = await request(app)
      .post(`/api/permits/${permit.id}/activate`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send();

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PRE_WORK_INCOMPLETE');
  });
});
```

---

### 2.3 End-to-End Testing

**Scope:** Full user flows through UI

**Tools:** Playwright

**Environments:** 
- Local (development)
- Staging (CI/CD pipeline)

**Focus Areas:**
- Complete chemical creation with SDS upload
- Permit lifecycle from creation to closure
- Permit board real-time updates
- Conflict detection warnings
- Role-based access enforcement

---

### 2.4 Performance Testing

**Scope:** API response times, concurrent users

**Tools:** k6, Artillery

**Scenarios:**

| Scenario | Target |
|----------|--------|
| Permit board load (50 active permits) | <2s |
| Chemical search (1000 chemicals) | <1s |
| Concurrent permit submissions (10 users) | No failures |
| SDS upload (10MB PDF) | <5s |

---

## 3. Test Categories

### 3.1 Chemical Management Tests

#### 3.1.1 Chemical Register

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-CHEM-001 | Create chemical with basic info | High |
| TC-CHEM-002 | Create chemical with multiple GHS hazards | High |
| TC-CHEM-003 | Edit chemical details | Medium |
| TC-CHEM-004 | Search chemicals by name | High |
| TC-CHEM-005 | Search chemicals by CAS number | High |
| TC-CHEM-006 | Filter by GHS hazard class | Medium |
| TC-CHEM-007 | Filter by status (active/phase_out/banned) | Medium |
| TC-CHEM-008 | Change chemical status to phase_out | Medium |
| TC-CHEM-009 | Change chemical status to banned | Medium |
| TC-CHEM-010 | Bulk status change | Low |

#### 3.1.2 SDS Management

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-SDS-001 | Upload SDS PDF document | High |
| TC-SDS-002 | Upload SDS with version and expiry | High |
| TC-SDS-003 | Replace current SDS (supersede) | High |
| TC-SDS-004 | View SDS version history | Medium |
| TC-SDS-005 | Download SDS document | High |
| TC-SDS-006 | Filter chemicals with expired SDS | High |
| TC-SDS-007 | Filter chemicals with SDS expiring in 30 days | Medium |
| TC-SDS-008 | Reject non-PDF upload | Medium |
| TC-SDS-009 | Reject file exceeding 10MB | Low |

#### 3.1.3 Storage Locations

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-LOC-001 | Add storage location to chemical | Medium |
| TC-LOC-002 | Specify max storage amount | Medium |
| TC-LOC-003 | Record inventory quantity | Medium |
| TC-LOC-004 | Filter chemicals by site | Medium |
| TC-LOC-005 | Deactivate storage location | Low |

#### 3.1.4 Chemical Linking

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-LINK-001 | Link chemical to incident | High |
| TC-LINK-002 | Link chemical to action | Medium |
| TC-LINK-003 | View incidents linked to chemical | Medium |
| TC-LINK-004 | View actions linked to chemical | Medium |

---

### 3.2 Permit Management Tests

#### 3.2.1 Permit Types

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-PTYPE-001 | View system permit types | High |
| TC-PTYPE-002 | Create custom permit type | Medium |
| TC-PTYPE-003 | Add control to permit type | Medium |
| TC-PTYPE-004 | Edit permit type controls | Medium |
| TC-PTYPE-005 | Deactivate custom permit type | Low |

#### 3.2.2 Permit Creation

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-PERM-001 | Create draft permit | High |
| TC-PERM-002 | Add workers to permit | High |
| TC-PERM-003 | Add external worker (name only) | Medium |
| TC-PERM-004 | Set planned start/end times | High |
| TC-PERM-005 | Auto-generate permit number | High |
| TC-PERM-006 | Attach documents to permit | Medium |
| TC-PERM-007 | Save permit as draft | High |

#### 3.2.3 Permit Lifecycle

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-LIFE-001 | Submit permit for approval | High |
| TC-LIFE-002 | Approve submitted permit | High |
| TC-LIFE-003 | Reject submitted permit with reason | High |
| TC-LIFE-004 | Activate approved permit | High |
| TC-LIFE-005 | Reject activation if pre-work incomplete | Critical |
| TC-LIFE-006 | Complete pre-work control | High |
| TC-LIFE-007 | Complete during-work control | Medium |
| TC-LIFE-008 | Complete post-work control | High |
| TC-LIFE-009 | Close active permit | High |
| TC-LIFE-010 | Reject closure if post-work incomplete | Critical |
| TC-LIFE-011 | Suspend active permit | Medium |
| TC-LIFE-012 | Resume suspended permit | Medium |
| TC-LIFE-013 | Cancel permit (any pre-active state) | Medium |
| TC-LIFE-014 | Auto-expire permit past valid_until | High |

#### 3.2.4 Permit Board

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-BOARD-001 | View active permits on board | High |
| TC-BOARD-002 | Filter board by site | Medium |
| TC-BOARD-003 | Filter board by permit type | Medium |
| TC-BOARD-004 | View countdown timer | High |
| TC-BOARD-005 | See warning color when <2h remaining | High |
| TC-BOARD-006 | See critical color when <30min remaining | High |
| TC-BOARD-007 | Auto-refresh board | Medium |
| TC-BOARD-008 | Quick actions from board card | Medium |

#### 3.2.5 Conflict Detection

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-CONF-001 | Detect overlapping permits same location | High |
| TC-CONF-002 | Detect incompatible permit types | Medium |
| TC-CONF-003 | Show conflict warning on permit creation | High |
| TC-CONF-004 | Allow permit creation despite warning | Medium |

#### 3.2.6 Permit PDF

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-PDF-001 | Generate permit PDF | Medium |
| TC-PDF-002 | PDF includes all controls | Medium |
| TC-PDF-003 | PDF includes worker list | Medium |
| TC-PDF-004 | PDF includes approval signature | Low |

---

### 3.3 Security Tests

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-SEC-001 | Viewer cannot create chemicals | High |
| TC-SEC-002 | Reporter cannot approve permits | High |
| TC-SEC-003 | Supervisor can approve permits | High |
| TC-SEC-004 | Manager can approve and activate | High |
| TC-SEC-005 | Cross-org chemical access blocked | Critical |
| TC-SEC-006 | Cross-org permit access blocked | Critical |
| TC-SEC-007 | JWT validation on all endpoints | Critical |

---

### 3.4 Multi-Tenant Tests

| TC-ID | Description | Priority |
|-------|-------------|----------|
| TC-MT-001 | Chemicals scoped to organisation | Critical |
| TC-MT-002 | Permits scoped to organisation | Critical |
| TC-MT-003 | Permit types scoped to organisation | High |
| TC-MT-004 | Storage locations scoped to organisation sites | High |

---

## 4. E2E Test Scenarios

### 4.1 Chemical Creation Flow (E2E-CHEM-01)

**Preconditions:** User logged in as Manager

**Steps:**
1. Navigate to Chemicals → Chemical Register
2. Click "+ Add Chemical"
3. Enter chemical name: "Isopropyl Alcohol"
4. Enter CAS number: "67-63-0"
5. Select physical state: "Liquid"
6. Select GHS hazards: "Flammable Liquid", "Eye Irritation"
7. Enter PPE requirements: "Safety goggles, nitrile gloves"
8. Click "Save & Continue"
9. Upload SDS PDF document
10. Enter SDS version: "1.0"
11. Enter expiry date: 2 years from today
12. Click "Upload"
13. Click "Add Location"
14. Select site: "Warehouse A"
15. Enter location: "Flammables Cabinet"
16. Enter max storage: 25 L
17. Click "Add Location"

**Expected Results:**
- Chemical created with ID
- GHS hazards displayed with pictograms
- SDS marked as current
- Storage location added
- Chemical appears in register list

---

### 4.2 Permit Full Lifecycle (E2E-PERM-01)

**Preconditions:** User logged in as Reporter, Supervisor available

**Steps:**

**As Reporter:**
1. Navigate to Permits → "+ New Permit"
2. Select permit type: "Hot Work"
3. Select site: "Warehouse A"
4. Enter location: "Loading dock Bay 3"
5. Enter work description: "Welding repair"
6. Click "Next"
7. Enter planned start: Today 08:00
8. Enter planned end: Today 16:00
9. Enter valid until: Today 17:00
10. Add worker: Select "John Welder" as Lead Welder
11. Add worker: Enter "Tom Helper" as Fire Watch
12. Click "Next"
13. Complete pre-work controls
14. Click "Submit for Approval"

**As Supervisor:**
15. Navigate to Permits → Find submitted permit
16. Click "Approve"
17. Enter notes: "Approved"
18. Click "Approve"
19. Navigate to permit detail
20. Click "Activate"
21. Confirm all pre-work controls complete
22. Click "Activate"

**As Reporter (later):**
23. Complete during-work controls
24. Complete post-work controls
25. Click "Close Permit"
26. Enter notes: "Work completed"
27. Click "Close"

**Expected Results:**
- Permit number generated
- Status transitions: draft → submitted → approved → active → closed
- State history shows all transitions
- Permit board shows permit when active
- Permit removed from board when closed

---

### 4.3 Permit Rejection and Resubmission (E2E-PERM-02)

**Preconditions:** Permit in submitted state

**Steps:**

**As Supervisor:**
1. Navigate to submitted permit
2. Click "Reject"
3. Enter reason: "Missing JSA document"
4. Click "Reject"

**As Reporter:**
5. Navigate to rejected permit
6. See rejection reason displayed
7. Edit permit
8. Upload JSA document
9. Click "Submit for Approval"

**As Supervisor:**
10. Approve permit

**Expected Results:**
- Status: submitted → rejected → submitted → approved
- Rejection reason visible to requester
- Notification sent on rejection
- Notification sent on re-approval

---

### 4.4 Permit Board Real-Time (E2E-BOARD-01)

**Preconditions:** 3 active permits at different expiry times

**Steps:**
1. Navigate to Permits → Permit Board
2. Observe permits displayed as cards
3. Note countdown timers updating
4. Wait for permit to enter warning zone (<2h)
5. Observe yellow warning color
6. Close one permit from another browser
7. Observe board updates (auto-refresh or manual)

**Expected Results:**
- All active permits visible
- Timers count down in real-time
- Color changes at threshold
- Closed permit removed from board

---

### 4.5 Conflict Detection (E2E-CONF-01)

**Preconditions:** Active Hot Work permit in "Loading dock"

**Steps:**
1. Create new Hot Work permit
2. Select same site
3. Enter location: "Loading dock" (same as existing)
4. Select overlapping time range

**Expected Results:**
- Conflict warning displayed
- Existing permit details shown
- User can proceed with warning acknowledged

---

## 5. Regression Test Suite

### 5.1 Previous Phase Regression

Ensure Phase 7 changes do not break:

| Phase | Feature | Test Cases |
|-------|---------|------------|
| 1 | Incident CRUD | TC-INC-001 to TC-INC-010 |
| 1 | Action management | TC-ACT-001 to TC-ACT-008 |
| 2 | File attachments | TC-ATT-001 to TC-ATT-005 |
| 3 | Multi-tenant isolation | TC-MT-001 to TC-MT-004 |
| 4 | Notifications | TC-NOT-001 to TC-NOT-006 |
| 5 | Analytics dashboard | TC-ANA-001 to TC-ANA-008 |

---

## 6. Test Data Requirements

### 6.1 Seed Data

| Entity | Quantity | Description |
|--------|----------|-------------|
| Chemicals | 50 | Various with GHS hazards |
| GHS Hazard Classes | 9 | All GHS classes |
| Permit Types | 6 | System types |
| Permits | 100 | Various states |
| Users | 20 | Various roles |
| Sites | 5 | Test sites |

### 6.2 Test Data Files

- SDS PDF samples (5MB, 10MB, 15MB)
- Permit attachment samples

---

## 7. Defect Management

### 7.1 Severity Levels

| Severity | Description | Example |
|----------|-------------|---------|
| Critical | System unusable | Permit cannot be closed |
| High | Major feature broken | SDS upload fails |
| Medium | Feature impaired | Conflict detection inaccurate |
| Low | Minor issue | UI alignment |

### 7.2 Resolution SLA

| Severity | Resolution Target |
|----------|-------------------|
| Critical | 4 hours |
| High | 1 business day |
| Medium | 3 business days |
| Low | Next sprint |

---

## 8. Test Environment

### 8.1 Environment Configuration

| Environment | Purpose | Data |
|-------------|---------|------|
| Local | Development testing | Minimal seed |
| CI | Automated tests | Reset per run |
| Staging | Integration/UAT | Production-like |

### 8.2 Test Database

- Separate schema per test suite
- Transaction rollback for isolation
- Seeded with standard test data

---

## 9. Test Automation

### 9.1 CI/CD Integration

- Unit tests run on every commit
- Integration tests run on PR
- E2E tests run on merge to main
- Nightly regression suite

### 9.2 Test Reports

- Jest coverage report
- Playwright HTML report
- Test results in CI dashboard

---

## 10. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

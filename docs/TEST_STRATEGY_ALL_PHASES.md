# Test Strategy – All Phases (EHS Portal)

## 1. Purpose & Scope

This document defines the testing approach for the EHS Portal from Phase 1 (MVP) through Phase 10 (Integrations, SSO & External Connectivity).

It covers:
- Principles (shift-left, ATDD, TDD)
- Test levels and types
- Phase-by-phase focus
- Artefacts and traceability
- Environments and data
- Execution in an Agile process
- Exit criteria and quality gates

---

## 2. Testing Principles

### 2.1 Shift-Left

- Testing starts at **requirements and design**, not after coding.
- Testers (Claude in tester role) and BA/PM (Codex) are involved from the start:
  - Reviewing user journeys and requirements.
  - Challenging ambiguous requirements.
  - Defining acceptance criteria before implementation.

Shift-left activities:
- During Phase 1 design:
  - Review data model and API for testability.
  - Draft acceptance tests and test cases alongside the API spec.
- For later phases:
  - When designing CAPA, analytics, notifications, ensure test hooks and logging are planned early.

### 2.2 ATDD – Acceptance Test-Driven Development

- For each user story, we write acceptance tests **first**.
- These are written in business language and are understandable to non-technical stakeholders.

Format (example):
- **Story:** US-INC-01 – Worker logs an incident.
- **Acceptance tests:**
  1. Given I am a logged-in worker
     When I submit a valid incident
     Then I see it in the incident list with the correct fields and status = open
  2. Given I submit an invalid incident (missing title)
     Then I see a clear validation message and the incident is not created

ATDD is used across all phases:
- Phase 1: core flows (login, incidents, inspections, dashboard).
- Phase 2: actions, attachments, audit trail.
- Phase 3: exports, multi-org isolation.
- Phase 4: notifications, digests, escalations, preferences.
- Phase 5: analytics, risk scoring, saved views.
- Phase 6: access requests, password reset, 2FA, security audit, themes.
- Phase 7: chemical register, SDS management, permit-to-work lifecycle, permit board, conflict detection.
- Phase 8: training catalogue, sessions, assignments, completions, training matrix, gap analysis.
- Phase 9: risk register, inherent/residual scoring, controls, links, reviews, heatmaps, ERM analytics.

### 2.3 TDD – Test-Driven Development

- For critical logic, we apply TDD:
  - Write unit test → see it fail → implement → refactor.

Examples:
- Phase 1:
  - Inspection `overall_result` calculation.
  - Dashboard severity trend aggregation.
- Phase 2:
  - Overdue status calculation for actions.
  - Attachment validation (file type/size).
- Phase 4:
  - Notification creation on action assignment.
  - Digest email content generation.
  - Escalation threshold checking.
- Phase 5:
  - Risk score calculation and classification.
- Phase 6:
  - Password reset token generation and hashing.
  - TOTP code verification with window tolerance.
  - Backup code hashing and validation.
  - Account lockout after failed attempts.
- Phase 7:
  - Permit state machine transitions.
  - Permit number auto-generation.
  - Control checklist completion validation.
  - Conflict detection for overlapping permits.
  - SDS expiry notification scheduling.
  - GHS hazard class icon mapping.
- Phase 8+:
  - Signature verification for webhooks.
  - Training expiry date calculation.
  - Training gap analysis for role/site requirements.
  - Auto-assignment rule matching.
- Phase 9:
  - Risk score calculation (L × I matrix).
  - Risk level classification from score thresholds.
  - Tolerance comparison and breach detection.
  - Control effectiveness aggregation.
  - Review date calculation based on frequency.
  - Risk reference number generation.

---

## 3. Test Levels & Types

### 3.1 Unit Tests

- Scope:
  - Pure functions and service-level logic.
- Tools:
  - Node test framework (e.g. Jest) for backend.
  - Optional React component/unit tests for frontend (where valuable).

### 3.2 Integration / API Tests

- Validate Express routes + DB together:
  - Auth (register, login, me).
  - Sites, incidents, inspection templates, inspections.
  - Dashboard summary.
- Use a separate test database with seed data.

### 3.3 UI / End-to-End Tests

- Focus on critical journeys:
  - Login → Dashboard.
  - Create incident → see in list.
  - Create inspection → see in list → drill into detail.
  - Create actions & mark done (Phase 2).
  - Analytics usage (Phase 4).
- Can start as manual tests (documented) and later be automated with a tool (e.g. Playwright/Cypress).

### 3.4 Non-Functional Tests (Light)

- **Performance**:
  - Basic checks: dashboard and lists load quickly with realistic data volumes.
- **Security**:
  - All protected endpoints reject unauthenticated requests.
  - Basic role checks (workers vs managers vs admins) enforced.
  - No passwords or secrets in logs.
- **Usability**:
  - Simple UX review vs user journeys.
  - Clear error messages and empty states.

---

## 4. Phase-by-Phase Test Focus

### Phase 1 – Core Operational MVP

**Key areas:**
- Auth & session
- Sites
- Incidents
- Inspection templates & inspections
- Dashboard

**Testing:**
- ATDD:
  - Acceptance criteria for login, incident flow, inspection flow, dashboard.
- TDD:
  - Overall inspection result logic.
  - Dashboard aggregation logic.
- Unit tests:
  - Utility functions, some service logic.
- API tests:
  - Auth, incidents CRUD (where applicable), templates, inspections, dashboard summary.
- UI tests:
  - Manual smoke tests for all user journeys P1-J1 to P1-J7.

**Exit criteria:**
- All P1 Must-have checklist items have:
  - At least one acceptance test.
  - All critical acceptance tests pass.
- No critical/blocker defects in core flows.

---

### Phase 2 – Operational Excellence

**New areas:**
- Actions / CAPA
- Attachments
- RBAC enforcement
- Audit logging
- Help/Docs

**Testing:**
- ATDD:
  - Stories for creating actions, assigning them, closure.
  - Stories for uploading and viewing attachments.
- TDD:
  - Overdue detection for actions.
- Unit/API tests:
  - Action endpoints (create/list/update).
  - Attachment metadata and upload validation.
  - Audit log creation on key events.
  - Help content endpoints.
- UI tests:
  - Journeys P2-J1 to P2-J11.
- Regression:
  - Re-run Phase 1 tests to ensure no breakage.

**Exit criteria:**
- All new P2 checklist items covered by acceptance tests.
- Actions and attachments stable in normal use.
- Audit log reliably records key events.
- Help content accessible with support contact.

---

### Phase 3 – Multi-Organisation & Enterprise Reporting

**New areas:**
- Multi-organisation (multi-tenant) model
- Organisation settings & branding (name, logo, timezone, thresholds)
- User management (create, update, disable/enable, reset password)
- CSV exports (incidents, inspections, actions with filters)
- Rate limiting for exports

**Testing:**
- ATDD:
  - Stories around org branding, user management, exports, and data isolation.
- TDD:
  - Org scoping middleware
  - Export streaming and filtering
  - Rate limiting logic
- Unit/API tests:
  - Organisation endpoints (GET, PUT, logo upload)
  - User management endpoints (CRUD, disable, reset password)
  - Export endpoints (all three types with filters)
  - Cross-org access prevention
  - Rate limiting behavior
- UI tests:
  - Organisation settings page
  - User management page
  - Reports/exports page
  - Journeys P3-J1–P3-J5
- Security:
  - Cross-tenant access attempts (must be denied)
  - Disabled user login attempts
  - Export data isolation
  - JWT manipulation attempts

**Test cases:** See `qa/test_cases_phase3.csv` (180 test cases)

**Exit criteria:**
- No cross-org data leakage (verified with multi-org test data)
- Exports are accurate, filtered correctly, and scoped to organisation
- User management fully functional (create, update, disable, reset)
- Organisation settings applied consistently (logo in header, thresholds on dashboard)
- Rate limiting enforced (1 export per 30 seconds)
- All 180 Phase 3 test cases executed and passing
- No Critical/High defects open

---

### Phase 4 – Notifications & Escalations

**New areas:**
- In-app notification centre (bell icon, dropdown, full page)
- Email notifications on key events
- Daily/weekly digest emails
- Escalation rules for overdue actions
- Per-user notification preferences

**Testing:**
- ATDD:
  - Stories for notification viewing, marking as read, preferences.
  - Stories for digest configuration and escalation alerts.
- TDD:
  - Notification creation on action assignment.
  - Digest content generation logic.
  - Escalation threshold detection.
- Unit/API tests:
  - Notification endpoints (GET, PUT read, mark-all-read, DELETE)
  - Preferences endpoints (GET, PUT)
  - Admin job endpoints (GET runs, POST trigger, PUT escalation settings)
  - Email service methods (sendNotificationEmail, sendDigest, retry)
- UI tests:
  - NotificationBell badge updates
  - NotificationDropdown interaction
  - NotificationsPage filtering and pagination
  - NotificationPreferencesPage form submission
- Scheduled Job tests:
  - DailyDigestJob execution and email generation
  - WeeklyDigestJob execution
  - EscalationJob threshold detection
  - EmailRetryJob retry logic
  - CleanupJob expiration and deletion

**Test cases:** See `qa/test_cases_phase4.csv` (60 test cases)

**Exit criteria:**
- Notifications created reliably on trigger events
- Bell icon badge updates correctly via polling
- Preferences save and apply to notification/email generation
- Digests sent to correct users based on preferences
- Escalations trigger for overdue actions beyond threshold
- All 60 Phase 4 test cases executed and passing
- No Critical/High defects open
- 85%+ code coverage on new services

---

### Phase 5 – Analytics & Risk

**New areas:**
- Analytics dashboard
- Hotspot identification
- Risk register & risk matrix

**Testing:**
- ATDD:
  - Stories for analytics use cases and risk management.
- TDD:
  - Risk score calculation (likelihood × impact or mapping).
- Tests:
  - Analytics queries return consistent results vs underlying data.
  - Risk register CRUD and filters.
  - Risk matrix representation matches scores.

**Exit criteria:**
- Analytics charts match expected numbers for controlled datasets.
- Risk register usable and accurate for typical scenarios.

---

### Phase 6 – SSO & External Integrations

**New areas:**
- SSO via OIDC
- External API for incidents
- Webhooks

**Testing:**
- ATDD:
  - Stories for SSO login and external integrations.
- Tests:
  - External API endpoints validate API keys and payloads.
  - Webhooks are delivered with correct payloads to test endpoints.
  - SSO flow works (basic success and failure).

**Exit criteria:**
- External integrations can create incidents and consume webhooks.
- SSO login works with test IdP.
- No security regressions (API keys/SSO handled safely).

---

### Phase 7 – Chemical & Permit Management

**New areas:**
- Chemical register with GHS hazard classification
- SDS document management with expiry tracking
- Storage locations and inventory tracking
- Incident-chemical and action-chemical linking
- Permit types and control templates
- Permit-to-work lifecycle management
- Permit board with real-time oversight
- Conflict detection for overlapping permits

**Testing:**
- ATDD:
  - Stories for chemical registration, SDS upload, storage management.
  - Stories for permit creation, approval workflow, and closure.
  - Stories for permit board and conflict detection.
- TDD:
  - Permit state machine transitions (draft → submitted → approved → active → closed).
  - Pre-work control completion enforcement before activation.
  - Post-work control completion enforcement before closure.
  - Permit number auto-generation (TYPE-SITE-DATE-SEQ).
  - Conflict detection algorithm for overlapping permits.
  - SDS expiry notification scheduling (30-day warning).
- Unit/API tests:
  - Chemical endpoints (CRUD, GHS hazards, SDS upload/download).
  - Storage location endpoints (CRUD, inventory tracking).
  - Chemical linking endpoints (incident-chemical, action-chemical).
  - Permit type endpoints (CRUD, control templates).
  - Permit lifecycle endpoints (submit, approve, reject, activate, close).
  - Permit control endpoints (complete/incomplete with notes).
  - Permit board endpoint (filters, sorting, countdown).
  - Conflict detection endpoint.
- UI tests:
  - ChemicalRegisterPage filtering and sorting.
  - ChemicalDetailPage with GHS icons and SDS management.
  - PermitBoardPage with countdown timers and status cards.
  - PermitCreatePage 3-step wizard flow.
  - PermitDetailPage control checklist completion.
  - Journeys P7-J1 to P7-J17.
- Scheduled Job tests:
  - SDS expiry notification job.
  - Permit expiry warning job.
- Security:
  - Multi-tenant isolation for chemicals and permits.
  - Role-based access (only managers/admins can approve permits).
  - Permit modification restrictions after activation.

**Test cases:** See `qa/test_cases_phase7.csv` (70+ test cases)

**Exit criteria:**
- Chemical register fully functional with GHS hazard display.
- SDS documents upload, download, and expiry tracking working.
- Permit lifecycle transitions correctly enforced.
- Pre-work and post-work controls enforced at correct stages.
- Permit board displays active permits with accurate countdowns.
- Conflict detection prevents overlapping hazardous permits.
- All 70+ Phase 7 test cases executed and passing.
- No Critical/High defects open.
- 80%+ code coverage on new services.

---

### Phase 8 – Training & Competence Management

**New areas:**
- Training course catalogue with prerequisites and refresher linking
- Training categories (hierarchical)
- Instructor-led training (ILT) session scheduling with capacity
- Session enrollment and attendance tracking
- Training assignments (individual, bulk by role/site, auto-assignment)
- Training completions with evidence upload
- External training verification
- Validity/expiry tracking with reminder notifications
- Training matrix with visual gap analysis
- Role and site training requirements configuration
- Training compliance reports
- Integration with Actions (training as corrective action)
- Integration with Analytics (training metrics)

**Testing:**
- ATDD:
  - Stories for course creation, session scheduling, enrollment.
  - Stories for individual and bulk training assignment.
  - Stories for completion recording and external training submission.
  - Stories for training matrix view and gap analysis.
  - Stories for expiry notifications and refresher workflows.
- TDD:
  - Expiry date calculation (completion_date + validity_months).
  - Gap analysis algorithm (role requirements vs completions).
  - Auto-assignment rule matching for new users.
  - Training compliance percentage calculation.
  - Prerequisite validation before enrollment.
  - Session capacity enforcement.
- Unit/API tests:
  - Category endpoints (CRUD, hierarchy).
  - Course endpoints (CRUD, prerequisites, refresher linking).
  - Session endpoints (CRUD, enrollment, attendance).
  - Assignment endpoints (individual, bulk, rules).
  - Completion endpoints (record, verify, external).
  - My Training endpoint (assignments, completions, expiring).
  - Matrix endpoint (users vs courses with status).
  - Requirements endpoints (role, site).
  - Reports endpoints (compliance, history, expiring).
- UI tests:
  - TrainingCataloguePage filtering and sorting.
  - CourseDetailPage with prerequisites and materials.
  - SessionSchedulePage with capacity management.
  - AssignTrainingPage (individual, by role, by site).
  - RecordCompletionsPage with evidence upload.
  - MyTrainingPage with summary cards.
  - TrainingMatrixPage with gap indicators.
  - Journeys P8-J1 to P8-J16.
- Background Job tests:
  - ExpiryCheckJob creates notifications at correct thresholds.
  - ReminderJob sends due date reminders.
  - AutoAssignmentJob matches rules and creates assignments.
  - TrainingAnalyticsAggregationJob updates daily metrics.
- Security:
  - Multi-tenant isolation for all training data.
  - Role-based access (workers can only view own training).
  - Evidence upload validation (file type/size).
  - External completion verification workflow.

**Test cases:** See `qa/test_cases_phase8.csv` (120+ test cases)

**Exit criteria:**
- Training catalogue fully functional with categories and prerequisites.
- Sessions can be scheduled with capacity limits enforced.
- Assignments created individually, by role/site, and via auto-rules.
- Completions recorded with evidence and proper expiry calculation.
- External training submissions flow through verification.
- Training matrix displays accurate status with gap indicators.
- Expiry notifications sent at 30/14/7/1 day thresholds.
- Training reports generate accurate compliance data.
- Integration with Actions module functional.
- All 120+ Phase 8 test cases executed and passing.
- No Critical/High defects open.
- 80%+ code coverage on new services.

---

## 5. Artefacts & Traceability

We maintain traceability across:

- Requirements / checklist: CIDs (C1, C2, …) mapped to Phases.
- User stories: US-XXX IDs linked to:
  - Checklist IDs.
  - User journeys.
- Test cases: TC-XXX IDs linked to:
  - User stories.
  - Checklist items / phases.

Phase 2 test catalogue:
- `qa/test_cases_phase2.csv`

Example:

- C5 – “User can create incident with all fields”  
  → US-INC-01  
  → TC-INC-01, TC-INC-02

This allows Codex to check coverage easily.

---

## 6. Environments & Test Data

- **Local Dev Environment**
  - Backend, frontend, and Postgres running locally.
- **Test Database**
  - Separate DB/schema for tests.
  - Seed with:
    - Sites: Head Office, Warehouse 1
    - Incident types: Injury, Near Miss, Property Damage
    - Users: admin, manager, worker

Data guidelines:
- No real personal data.
- Known seeds to make analytics assertions predictable.

---

## 7. Agile Execution & Reporting

Each sprint/iteration:

1. **Planning**
   - Select user stories and map to checklist IDs.
   - Define acceptance criteria and ATDD tests up front.

2. **During sprint**
   - Apply TDD to core logic.
   - Keep unit/API tests updated.
   - Run smoke UI tests periodically.

3. **End of sprint**
   - Update test case statuses (Pass/Fail/Blocked).
   - Record defects with links to stories and tests.
   - Summarise quality:
     - Coverage vs checklist (per phase).
     - Open defects and severity.

---

## 8. Defect Management

- Severity levels: Critical / High / Medium / Low.
- Critical/High:
  - Must be fixed or have an accepted workaround before promoting to the next phase.
- All defects:
  - Include steps to reproduce.
  - Link to:
    - Story ID
    - Test Case ID
    - Checklist IDs affected.

---

## 9. Overall Quality Gates

- **Before releasing Phase 1:**
  - All P1 Must-have items tested and passing.
  - No Critical/High defects in core flows.

- **Before adding Phase 3+ enterprise features to production:**
  - Multi-org isolation verified.
  - Exports and analytics validated with realistic data.

- **Before releasing Phase 6 security features:**
  - Password reset flow fully tested (happy path and edge cases).
  - 2FA setup and login tested with multiple authenticator apps.
  - Security audit log captures all required events.
  - Rate limiting verified for all protected endpoints.
  - OWASP Top 10 security testing completed.
  - Penetration testing passed (no critical/high findings).

- **Before declaring "market-ready":**
  - Core flows stable across all phases.
  - Integrations and notifications behave reliably.
  - User journeys from P1–P7 can be executed without major friction.
  - Security features meet industry standards.
  - Chemical and permit management validated against regulatory requirements.

---

## 10. Phase 6 Security Testing Focus

Phase 6 introduces security features requiring specialised testing:

### 10.1 Security Test Categories

| Category | Focus |
|----------|-------|
| Authentication Testing | Password reset, 2FA, backup codes |
| Authorisation Testing | Access request approval, role assignment |
| Cryptographic Testing | Token hashing, TOTP encryption, secret storage |
| Rate Limiting Testing | Brute force protection verification |
| Session Management | Account lockout, session invalidation |
| Audit Trail Testing | Event logging completeness and immutability |

### 10.2 OWASP Top 10 Coverage

| Vulnerability | Test Approach |
|---------------|---------------|
| A01 Broken Access Control | 2FA bypass attempts, admin endpoint protection |
| A02 Cryptographic Failures | TOTP secret encryption verification |
| A03 Injection | SQL injection on all Phase 6 inputs |
| A07 Authentication Failures | Brute force, credential stuffing tests |

### 10.3 Test Cases

See [test_cases_phase6.csv](../qa/test_cases_phase6.csv) for 50 detailed test cases covering:
- Access request flows (8 test cases)
- Password reset flows (9 test cases)
- Two-factor authentication (12 test cases)
- Security centre (4 test cases)
- Security audit log (6 test cases)
- Theme customisation (5 test cases)
- Account lockout (4 test cases)
- Security vulnerability testing (6 test cases)

### 10.4 Related Documents

- [TEST_STRATEGY_PHASE6.md](./TEST_STRATEGY_PHASE6.md) - Detailed Phase 6 test strategy

---

## 11. Phase 7 Chemical & Permit Testing Focus

Phase 7 introduces chemical register and permit-to-work management requiring specialised testing approaches.

### 11.1 Chemical Management Test Categories

| Category | Focus |
|----------|-------|
| Chemical Register | CRUD operations, search, filtering, pagination |
| GHS Hazard Classification | Correct hazard class assignment and icon display |
| SDS Management | Upload, download, versioning, expiry tracking |
| Storage Locations | Location assignment, inventory tracking |
| Chemical Linking | Incident-chemical and action-chemical associations |
| Notifications | SDS expiry warnings (30-day advance) |

### 11.2 Permit-to-Work Test Categories

| Category | Focus |
|----------|-------|
| Permit Types | Configuration of permit types and control templates |
| Lifecycle Management | State transitions (draft → submitted → approved → active → closed) |
| Control Completion | Pre-work, during-work, post-work control enforcement |
| Approval Workflow | Manager/admin approval with notes |
| Permit Board | Real-time display, countdown timers, filtering |
| Conflict Detection | Overlapping permit identification |
| Number Generation | Unique permit number format (TYPE-SITE-DATE-SEQ) |

### 11.3 State Machine Testing

The permit state machine requires exhaustive transition testing:

| From State | To State | Valid? | Preconditions |
|------------|----------|--------|---------------|
| draft | submitted | ✓ | All required fields completed |
| draft | cancelled | ✓ | None |
| submitted | approved | ✓ | Approver is manager/admin |
| submitted | rejected | ✓ | Rejection reason provided |
| submitted | draft | ✓ | Requester recalls |
| approved | active | ✓ | All pre-work controls completed |
| approved | cancelled | ✓ | Reason provided |
| active | suspended | ✓ | Safety concern reason |
| active | closed | ✓ | All post-work controls completed |
| active | expired | ✓ | Valid_until timestamp passed (system) |
| suspended | active | ✓ | Resume reason provided |
| suspended | cancelled | ✓ | Reason provided |

**Invalid transitions must be rejected with clear error messages.**

### 11.4 Conflict Detection Testing

Test scenarios for conflict detection:

| Scenario | Expected Result |
|----------|-----------------|
| Same location, overlapping time, same type | Conflict detected |
| Same location, non-overlapping time | No conflict |
| Different location, overlapping time | No conflict |
| Same location, overlapping time, compatible types | No conflict |
| Existing active permit, new permit same location | Warning with existing permit details |

### 11.5 Test Cases

See [test_cases_phase7.csv](../qa/test_cases_phase7.csv) for 70+ detailed test cases covering:
- Chemical register operations (12 test cases)
- SDS management (8 test cases)
- Storage and inventory (6 test cases)
- Chemical linking (8 test cases)
- Permit type configuration (6 test cases)
- Permit lifecycle (14 test cases)
- Permit board (8 test cases)
- Conflict detection (6 test cases)
- Security and multi-tenant (6 test cases)

### 11.6 Related Documents

- [TEST_STRATEGY_PHASE7.md](./TEST_STRATEGY_PHASE7.md) - Detailed Phase 7 test strategy
- [DATA_MODEL_PHASE7.md](./DATA_MODEL_PHASE7.md) - Phase 7 database schema
- [API_SPEC_PHASE7.md](./API_SPEC_PHASE7.md) - Phase 7 API specification
- [WORKFLOWS_PHASE7.md](./WORKFLOWS_PHASE7.md) - Phase 7 workflow definitions

---

## 12. Phase 10 Integrations Testing Focus

Phase 10 introduces SSO/OIDC authentication, public REST API, and webhooks requiring specialised testing approaches.

### 12.1 SSO/OIDC Test Categories

| Category | Focus |
|----------|-------|
| OIDC Flow | Authorization redirect, token exchange, callback handling |
| Token Validation | ID token signature, claims, nonce, expiration |
| JIT Provisioning | User creation on first SSO login |
| Role Mapping | IdP group to EHS role assignment |
| SSO-Only Mode | Password login blocked when enabled |
| Security | State validation, PKCE, replay prevention |

### 12.2 API Authentication Test Categories

| Category | Focus |
|----------|-------|
| API Key Authentication | Valid key, invalid key, revoked client |
| Rate Limiting | Limit enforcement, header accuracy, window reset |
| Scope Authorization | Within-scope access, out-of-scope denial |
| IP Allowlist | Allowed IPs pass, denied IPs blocked |
| Secret Security | Key hashed, not logged, not exposed |

### 12.3 Webhook Test Categories

| Category | Focus |
|----------|-------|
| Webhook Delivery | Event triggers delivery, payload complete |
| Signature Verification | HMAC signature correct and verifiable |
| Retry Logic | Failed deliveries retried with backoff |
| Auto-Suspend | Consecutive failures suspend webhook |
| Teams Format | Adaptive Card formatting for Teams |
| Manual Retry | Admin can retry failed events |

### 12.4 Mock Services for Testing

Phase 10 requires mock services for testing:

| Mock Service | Purpose |
|--------------|---------|
| Mock IdP | OIDC provider for SSO testing (discovery, authorize, token, jwks) |
| Mock Webhook Receiver | Capture and verify webhook deliveries |
| Mock Teams Endpoint | Verify Adaptive Card formatting |

### 12.5 Security Testing Focus

| Area | Tests |
|------|-------|
| Authentication Bypass | Invalid tokens rejected, expired tokens rejected |
| State/Nonce Validation | Prevent CSRF and replay attacks |
| Secret Exposure | No secrets in logs, encrypted at rest |
| Rate Limit Effectiveness | Prevents API abuse |
| IP Allowlist Enforcement | Blocks unauthorised networks |
| Scope Enforcement | Proper 403 responses |

### 12.6 Performance Testing

| Metric | Target | Approach |
|--------|--------|----------|
| SSO Callback | <2s | End-to-end timer |
| API Response P95 | <500ms | Load testing |
| Rate Limit Accuracy | ±5% | Boundary testing |
| Webhook Delivery | <30s initial | Delivery timer |

### 12.7 Test Cases

See [test_cases_phase10.csv](../qa/test_cases_phase10.csv) for 75 detailed test cases covering:
- SSO configuration and login (15 test cases)
- API client management (15 test cases)
- Webhook configuration and delivery (15 test cases)
- Public API endpoints (15 test cases)
- Admin UI and activity log (7 test cases)
- Security and audit (8 test cases)

### 12.8 Related Documents

- [TEST_STRATEGY_PHASE10.md](./TEST_STRATEGY_PHASE10.md) - Detailed Phase 10 test strategy
- [DATA_MODEL_PHASE10.md](./DATA_MODEL_PHASE10.md) - Phase 10 database schema
- [API_SPEC_PHASE10.md](./API_SPEC_PHASE10.md) - Phase 10 API specification
- [WORKFLOWS_PHASE10.md](./WORKFLOWS_PHASE10.md) - Phase 10 workflow definitions

# UAT Execution Plan – EHS Portal Phase 8
## Training & Competence Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | [Tester Name] |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 8 – Training & Competence Management |
| Related Documents | BRD_EHS_PORTAL_PHASE8.md, API_SPEC_PHASE8.md, TEST_STRATEGY_PHASE8.md |

---

## 1. Introduction & Objectives

### 1.1 Purpose

This document provides a practical, step-by-step guide for executing User Acceptance Testing (UAT) for Phase 8 of the EHS Portal: **Training & Competence Management**. It is designed to be used by testers, business stakeholders, and quality assurance personnel to validate that the delivered functionality meets business requirements.

### 1.2 Phase 8 Overview

Phase 8 introduces comprehensive Training & Competence Management capabilities, including:

| Capability | Description |
|------------|-------------|
| **Training Catalogue** | Course management with categories, delivery types, validity periods, prerequisites |
| **Training Sessions** | Scheduling instructor-led sessions, capacity management, enrollments |
| **Training Assignments** | Individual and bulk assignment by user, role, or site |
| **My Training** | Personal dashboard for workers to view assignments, upcoming sessions, and completions |
| **Completions & Evidence** | Recording training completions with pass/fail, scores, evidence uploads |
| **Training Matrix** | User × Course matrix view with gap analysis and compliance rates |
| **Reports & Exports** | PDF/Excel exports for compliance reporting and audits |
| **Notifications** | Automated alerts for assignments, reminders, expiry warnings |
| **Role Requirements** | Configure mandatory training per role or site |
| **Security & RBAC** | Role-based access control for training features |

### 1.3 UAT Goals

| Goal | Description |
|------|-------------|
| **Business Flow Validation** | Confirm end-to-end training workflows function as specified |
| **Data Correctness** | Verify calculations (expiry dates, compliance rates, pass/fail logic) |
| **Security & Roles** | Ensure role-based access controls are enforced |
| **Integration Verification** | Confirm Phase 8 integrates correctly with Actions, Notifications, and Analytics |
| **User Experience** | Validate usability for all user personas (Worker, Supervisor, Manager, Admin) |

---

## 2. Scope

### 2.1 In Scope

This UAT covers **Phase 8 – Training & Competence Management only**, including:

- Training Categories (CRUD, filtering)
- Training Courses (CRUD, attachments, prerequisites, refresher linking)
- Training Sessions (scheduling, enrollment, attendance, completion)
- Training Assignments (individual, bulk, waiving, cancellation)
- My Training (personal dashboard, self-enrollment)
- Training Completions (manual, session-based, external, evidence)
- Training Matrix (views, filtering, gap analysis, export)
- Reports & Exports (PDF compliance, Excel matrix)
- Notifications (assignment, reminder, expiry, session alerts)
- Role/Site Requirements configuration
- Integration with Actions (training as corrective action)
- RBAC enforcement

### 2.2 Out of Scope

- Phases 1–7 functional regression (covered by separate regression suite)
- SCORM/LMS integration (future phase)
- Mobile offline mode (future phase)
- External training provider API integrations (future phase)

### 2.3 Test Case Sources

UAT test cases are derived from:

| Source | Location |
|--------|----------|
| UAT Test Sheet | `EHS_UAT_Phase8_Training.xlsx` |
| Detailed Test Cases | `Checklist/test_cases_phase8.csv` |
| Business Requirements | `docs/BRD_EHS_PORTAL_PHASE8.md` |
| API Specification | `docs/API_SPEC_PHASE8.md` |
| Frontend/UX Specification | `docs/FRONTEND_UX_PHASE8.md` |
| Test Strategy | `docs/TEST_STRATEGY_PHASE8.md` |

---

## 3. Roles & Test Accounts

### 3.1 Testing Roles

| Role | UAT Focus Areas | Typical Permissions |
|------|-----------------|---------------------|
| **Admin** | Course management, settings, categories, role requirements, all reports | Full access to all training features |
| **Manager** | Course creation/editing, matrix views, gap analysis, reports | Manage training across site/organisation |
| **Supervisor** | Assignments, session attendance, completions, team matrix | Manage training for direct reports |
| **Worker** | My Training dashboard, self-enrollment, view completions | View and complete assigned training only |
| **Trainer** | Session attendance, record completions | Record attendance for sessions they conduct |

### 3.2 Suggested Test Accounts

> **Note:** These are example accounts. Actual credentials should be provided separately for the UAT environment.

| Username | Role | Organisation | Notes |
|----------|------|--------------|-------|
| `uat.admin@ehs.local` | Admin | Test Org 1 | Full admin access |
| `uat.manager@ehs.local` | Manager | Test Org 1 | Training manager |
| `uat.supervisor@ehs.local` | Supervisor | Test Org 1 | Team lead with direct reports |
| `uat.worker1@ehs.local` | Worker | Test Org 1 | Worker with assignments |
| `uat.worker2@ehs.local` | Worker | Test Org 1 | Worker with overdue/expiring training |
| `uat.worker3@ehs.local` | Worker | Test Org 1 | New worker (no training history) |
| `uat.admin2@ehs.local` | Admin | Test Org 2 | Multi-tenancy testing |
| `uat.worker.org2@ehs.local` | Worker | Test Org 2 | Multi-tenancy testing |

---

## 4. Environment & Data Setup

### 4.1 UAT Environment Requirements

| Component | Requirement |
|-----------|-------------|
| **Environment** | Dedicated UAT/Staging environment (isolated from Production) |
| **Frontend URL** | `https://uat.ehs-portal.example.com` (to be provided) |
| **Backend API** | `https://uat-api.ehs-portal.example.com` (to be provided) |
| **Database** | Seeded with UAT test data |
| **Phases 1–7** | Deployed and functional (prerequisite) |
| **Phase 8** | Deployed with all migrations applied |

### 4.2 Minimum Seed Data Requirements

The following data must be seeded before UAT execution:

#### Organisations & Sites

| Data Type | Minimum Count | Notes |
|-----------|---------------|-------|
| Organisations | 2 | For multi-tenancy testing |
| Sites | 3 per org | Head Office, Site A, Site B |

#### Users

| Role | Minimum Count | Conditions |
|------|---------------|------------|
| Admin | 2 (1 per org) | Full access |
| Manager | 2 | Training management |
| Supervisor | 3 | Team leads |
| Worker | 10 | Mixed training statuses |

#### Training Data

| Data Type | Minimum Count | Notes |
|-----------|---------------|-------|
| Categories | 6 | Safety, Health, Environmental, Technical, Management, Custom |
| Courses | 10 | Mix of delivery types, validity periods, mandatory/optional |
| Sessions | 5 | Past (completed), Current, Future, Full (waitlist test) |
| Assignments | 20 | Various statuses: assigned, completed, overdue, waived |
| Completions | 30 | Mix of pass/fail, valid/expiring/expired |
| Role Requirements | 3 | Courses required per role |
| Assignment Rules | 2 | Auto-assignment rules |

#### Required Course Examples

| Code | Title | Delivery | Validity | Mandatory | Prerequisite |
|------|-------|----------|----------|-----------|--------------|
| IND-001 | General Induction | Classroom | None | Yes | — |
| FS-001 | Fire Safety Awareness | Classroom | 12 months | Yes | IND-001 |
| FS-002 | Fire Safety Refresher | Classroom | 12 months | Yes | FS-001 |
| CS-001 | Confined Space Entry | Classroom | 12 months | Yes | IND-001 |
| FA-001 | First Aid | Blended | 24 months | Yes | — |
| MH-001 | Manual Handling | Online | 12 months | No | — |
| WH-001 | Working at Height | Classroom | 12 months | Yes | — |

---

## 5. UAT Waves / Phases of Testing

UAT execution is structured in 4 waves to ensure logical progression and dependency management.

---

### 5.1 Wave 1 – Catalogue, Sessions, Assignments & My Training

**Purpose:** Validate core training setup and assignment workflows.

**Recommended Roles:** Admin, Manager, Supervisor, Worker

**Duration:** 2–3 days

#### Included UAT IDs

| Category | UAT IDs | Description |
|----------|---------|-------------|
| **Catalogue** | P8-UAT-CAT-01, P8-UAT-CAT-02, P8-UAT-CAT-03 | Course creation, categories, search/filter |
| **Sessions** | P8-UAT-SES-01, P8-UAT-SES-02, P8-UAT-SES-03 | Session scheduling, enrollment, capacity |
| **Assignments** | P8-UAT-ASN-01, P8-UAT-ASN-02, P8-UAT-ASN-03 | Individual/bulk assignment, due dates |
| **My Training** | P8-UAT-MYT-01, P8-UAT-MYT-02, P8-UAT-MYT-03 | Personal dashboard, self-enrollment |

#### Key Test Scenarios

1. Admin creates a new training course with all fields populated
2. Admin schedules a training session with capacity limits
3. Manager bulk-assigns training to all workers in a role
4. Worker views assigned training in My Training dashboard
5. Worker self-enrolls in an available session
6. Session capacity reached → user added to waitlist

---

### 5.2 Wave 2 – Completions, Evidence & Matrix

**Purpose:** Validate completion recording, evidence management, and matrix visualisation.

**Recommended Roles:** Admin, Supervisor, Worker

**Duration:** 2 days

#### Included UAT IDs

| Category | UAT IDs | Description |
|----------|---------|-------------|
| **Completions** | P8-UAT-CMP-01, P8-UAT-CMP-02, P8-UAT-CMP-03, P8-UAT-CMP-04 | Manual completion, evidence upload, external training |
| **Matrix** | P8-UAT-MTX-01, P8-UAT-MTX-02, P8-UAT-MTX-03 | Matrix view, filtering, gap identification |

#### Key Test Scenarios

1. Supervisor records attendance for a completed session
2. Session completion auto-creates completion records
3. Completion auto-closes related assignment
4. Worker uploads evidence document for external training
5. Admin verifies/rejects external training completion
6. Manager views training matrix with gap analysis
7. Matrix shows correct status icons (completed, expiring, expired, overdue, not assigned)
8. Compliance rate calculation matches expected values

---

### 5.3 Wave 3 – Reporting, Exports & Notifications

**Purpose:** Validate report generation, data exports, and notification triggers.

**Recommended Roles:** Manager, Admin

**Duration:** 1–2 days

#### Included UAT IDs

| Category | UAT IDs | Description |
|----------|---------|-------------|
| **Reporting** | P8-UAT-RPT-01, P8-UAT-RPT-02, P8-UAT-RPT-03 | Compliance reports, exports |
| **Notifications** | P8-UAT-NOT-01 | Assignment, reminder, expiry notifications |

#### Key Test Scenarios

1. Generate compliance overview PDF report
2. Export training matrix to Excel
3. Export user training history PDF
4. Verify notification received on training assignment
5. Verify reminder notification for upcoming session
6. Verify expiry warning notification (30 days, 14 days, 7 days)
7. Verify overdue notification for missed deadline

---

### 5.4 Wave 4 – Integration & Security

**Purpose:** Validate cross-phase integrations and role-based access controls.

**Recommended Roles:** All roles (for RBAC testing), Admin

**Duration:** 1 day

#### Included UAT IDs

| Category | UAT IDs | Description |
|----------|---------|-------------|
| **Integration** | P8-UAT-INT-01 | Actions integration, Analytics integration |
| **Security** | P8-UAT-SEC-01, P8-UAT-SEC-02 | RBAC, multi-tenancy isolation |

#### Key Test Scenarios

1. Create an Action linked to a training course
2. Verify training metrics appear in Analytics dashboard
3. **RBAC Testing:**
   - Worker cannot access Training Catalogue admin
   - Worker cannot view other users' training records
   - Supervisor can only see their team's matrix
   - Manager can create/edit courses
   - Admin has full access to all settings
4. **Multi-Tenancy Testing:**
   - User from Org 1 cannot see training data from Org 2
   - Admin from Org 1 cannot modify courses in Org 2

---

## 6. Execution Instructions

### 6.1 How to Execute a Test

For each row/UAT ID in `EHS_UAT_Phase8_Training.xlsx`:

#### Step 1: Prepare

1. Review the **Preconditions** column
2. Ensure test data and environment are ready
3. Log in with the appropriate test account

#### Step 2: Execute

1. Follow the **Steps** column exactly as written
2. Observe system behaviour at each step

#### Step 3: Capture Evidence

For each test case, capture:

| Evidence Type | When to Capture |
|---------------|-----------------|
| **Before screenshot** | Initial state before performing action |
| **Action screenshot** | Key interaction (form filled, button clicked) |
| **After screenshot** | Result/confirmation screen |
| **Error screenshot** | If test fails, capture the error |

**Screenshot Naming Convention:**
```
{UAT_ID}-{Step#}_{Description}.png
```
Example: `P8-UAT-CAT-01-2_CourseCreated.png`

#### Step 4: Record Result

In the UAT spreadsheet, update:

| Column | Value |
|--------|-------|
| **Status** | `Pass` / `Fail` / `Blocked` |
| **Evidence** | Path to screenshot(s) or notes |
| **Actual Result** | What actually happened (especially if Fail) |
| **Defect ID** | Link to bug if Fail (e.g., `BUG-P8-001`) |
| **Tester** | Your name |
| **Test Date** | Date of execution |

### 6.2 Test Status Definitions

| Status | Definition |
|--------|------------|
| **Pass** | Actual result matches expected result |
| **Fail** | Actual result differs from expected result |
| **Blocked** | Cannot execute due to environment issue or dependency failure |
| **Not Run** | Test not yet executed |
| **Deferred** | Test intentionally postponed |

---

## 7. Defect Management

### 7.1 How to Log a Defect

When a test fails, create a defect with the following information:

| Field | Description | Example |
|-------|-------------|---------|
| **Defect ID** | Unique identifier | `BUG-P8-001` |
| **UAT ID** | Related test case(s) | `P8-UAT-MTX-01` |
| **Summary** | Brief description | "Matrix shows incorrect status for expired completion" |
| **Severity** | Critical / High / Medium / Low | High |
| **Steps to Reproduce** | Numbered steps | 1. Log in as manager... 2. Navigate to... |
| **Expected Result** | What should happen | "Cell should show red 'Expired' icon" |
| **Actual Result** | What happened | "Cell shows green 'Completed' icon" |
| **Environment** | URL, browser, user | UAT, Chrome 120, uat.manager@ehs.local |
| **Screenshot** | Attach evidence | `BUG-P8-001_Screenshot.png` |
| **Reported By** | Tester name | John Smith |
| **Date Reported** | Date | 2026-02-10 |

### 7.2 Defect ID Pattern

Use the following pattern for defect IDs:

```
BUG-P8-{XXX}
```

Where `XXX` is a sequential number (001, 002, 003, etc.)

### 7.3 Defect Severity Definitions

| Severity | Definition | UAT Impact |
|----------|------------|------------|
| **Critical** | System crash, data loss, security breach | Blocks UAT sign-off |
| **High** | Major feature broken, no workaround | Blocks UAT sign-off |
| **Medium** | Feature works with workaround | Document for post-release fix |
| **Low** | Cosmetic, minor inconvenience | Document for backlog |

### 7.4 Defect Resolution Process

1. **Log defect** in defect tracker with all required information
2. **Triage** – Development team assigns severity and priority
3. **Fix** – Developer implements fix
4. **Deploy** – Fix deployed to UAT environment
5. **Retest** – Tester re-executes failed test case
6. **Close** – If pass, close defect; if fail, reopen

> **Important:** All Critical and High severity defects must be resolved (Closed) or formally accepted before UAT sign-off.

---

## 8. Entry & Exit Criteria

### 8.1 Entry Criteria

UAT can begin when ALL of the following are met:

| # | Criterion | Verified By |
|---|-----------|-------------|
| 1 | Phase 8 backend deployed to UAT environment | DevOps |
| 2 | Phase 8 frontend deployed to UAT environment | DevOps |
| 3 | All database migrations executed successfully | DevOps |
| 4 | Phases 1–7 functional in UAT environment | QA Lead |
| 5 | Test data seeded per Section 4.2 | DevOps / QA |
| 6 | Test accounts created and accessible | Admin |
| 7 | UAT execution sheet prepared (`EHS_UAT_Phase8_Training.xlsx`) | QA Lead |
| 8 | Testers briefed on test procedures | QA Lead |

### 8.2 Exit Criteria

UAT is complete when ALL of the following are met:

| # | Criterion | Verified By |
|---|-----------|-------------|
| 1 | All Phase 8 UAT scenarios executed (100% execution) | QA Lead |
| 2 | All Critical severity defects resolved | Dev Lead |
| 3 | All High severity defects resolved OR formally accepted | Business Owner |
| 4 | UAT pass rate ≥ 95% | QA Lead |
| 5 | UAT sign-off document completed | Business Owner |
| 6 | Evidence pack archived | QA Lead |

See: [UAT_PHASE8_SIGNOFF.md](./UAT_PHASE8_SIGNOFF.md)

---

## 9. Evidence Pack Structure

All UAT evidence should be organised in the following folder structure:

```
EHS_Portal_Phase8_UAT/
│
├── 01_UAT_Plan/
│   ├── UAT_PHASE8_EXECUTION_PLAN.md
│   └── UAT_PHASE8_SIGNOFF.md
│
├── 02_Test_Cases/
│   ├── EHS_UAT_Phase8_Training.xlsx
│   └── test_cases_phase8.csv
│
├── 03_Evidence/
│   ├── Wave1_Catalogue_Sessions/
│   │   ├── P8-UAT-CAT-01/
│   │   │   ├── P8-UAT-CAT-01-1_Before.png
│   │   │   ├── P8-UAT-CAT-01-2_CourseForm.png
│   │   │   └── P8-UAT-CAT-01-3_CourseCreated.png
│   │   ├── P8-UAT-CAT-02/
│   │   │   └── ...
│   │   ├── P8-UAT-SES-01/
│   │   │   └── ...
│   │   ├── P8-UAT-ASN-01/
│   │   │   └── ...
│   │   └── P8-UAT-MYT-01/
│   │       └── ...
│   │
│   ├── Wave2_Completions_Matrix/
│   │   ├── P8-UAT-CMP-01/
│   │   │   └── ...
│   │   └── P8-UAT-MTX-01/
│   │       └── ...
│   │
│   ├── Wave3_Reporting_Notifications/
│   │   ├── P8-UAT-RPT-01/
│   │   │   └── ...
│   │   └── P8-UAT-NOT-01/
│   │       └── ...
│   │
│   └── Wave4_Integration_Security/
│       ├── P8-UAT-INT-01/
│       │   └── ...
│       └── P8-UAT-SEC-01/
│           └── ...
│
├── 04_Defects/
│   ├── BUG-P8-001/
│   │   ├── BUG-P8-001_Screenshot.png
│   │   └── BUG-P8-001_Details.md
│   └── BUG-P8-002/
│       └── ...
│
├── 05_Reports/
│   ├── Sample_Compliance_Report.pdf
│   ├── Sample_Matrix_Export.xlsx
│   └── Sample_Training_History.pdf
│
└── 06_Summary/
    ├── UAT_PHASE8_SIGNOFF.md (completed)
    ├── Defect_Summary.xlsx
    └── UAT_Metrics.xlsx
```

### Folder Descriptions

| Folder | Contents |
|--------|----------|
| `01_UAT_Plan/` | This execution plan and sign-off template |
| `02_Test_Cases/` | UAT spreadsheet and test case CSV |
| `03_Evidence/` | Screenshots organised by wave and UAT ID |
| `04_Defects/` | Defect evidence and details |
| `05_Reports/` | Sample reports generated during UAT |
| `06_Summary/` | Final sign-off and summary documents |

> **Note:** This structure can be reused for future phases by replacing "Phase8" with the appropriate phase number.

---

## 10. Appendices

### Appendix A: UAT ID Reference

| UAT ID Pattern | Category | Count (Est.) |
|----------------|----------|--------------|
| P8-UAT-CAT-* | Catalogue (Courses, Categories) | 3–5 |
| P8-UAT-SES-* | Sessions (Scheduling, Enrollment) | 3–5 |
| P8-UAT-ASN-* | Assignments | 3–5 |
| P8-UAT-MYT-* | My Training | 3–5 |
| P8-UAT-CMP-* | Completions & Evidence | 4–6 |
| P8-UAT-MTX-* | Training Matrix | 3–5 |
| P8-UAT-RPT-* | Reporting & Exports | 3–5 |
| P8-UAT-NOT-* | Notifications | 1–3 |
| P8-UAT-INT-* | Integration (Actions, Analytics) | 1–2 |
| P8-UAT-SEC-* | Security & RBAC | 2–3 |

### Appendix B: Key Contacts

| Role | Name | Email | Responsibility |
|------|------|-------|----------------|
| UAT Lead | [Name] | [email] | UAT coordination |
| Business Owner | [Name] | [email] | Sign-off authority |
| Dev Lead | [Name] | [email] | Defect resolution |
| DevOps | [Name] | [email] | Environment support |

### Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Assignment** | A training requirement assigned to a user with a due date |
| **Completion** | Record of a user finishing a training course |
| **Expiry** | Date when a completion is no longer valid |
| **Gap** | Missing training where a requirement exists but no valid completion |
| **Matrix** | Grid view showing users vs. courses with status |
| **Refresher** | Follow-up training required after initial completion expires |
| **Session** | Scheduled instance of instructor-led training |
| **Validity Period** | Duration for which a completion remains valid |

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | [Author] | Initial UAT Execution Plan for Phase 8 |

---

*End of Document*

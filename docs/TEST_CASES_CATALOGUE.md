# Test Case Catalogue – EHS Portal (All Phases)

This catalogue defines test cases for the EHS Portal and links them to:

- User stories (US-IDs)
- User journeys (Px-Jy)
- Checklist items (C-IDs)
- Phases (P1–P5)

Each test case uses this structure:

- **TC ID**
- **Story ID**
- **Phase**
- **Type** (Unit / API / UI / E2E / Manual)
- **Related journey(s)**
- **Checklist IDs**
- **Pre-conditions**
- **Steps**
- **Expected result**

---

## 1. Phase 1 – Core MVP

### 1.1 Authentication & Session (E1)

#### US-AUTH-01 – User logs in

**Story summary:** As a registered user, I want to log in with email + password.

##### Test Cases

| TC ID       | Story ID     | Phase | Type | Journeys | Checklist IDs | Description                          |
|------------|--------------|-------|------|----------|---------------|--------------------------------------|
| TC-AUTH-01 | US-AUTH-01   | P1    | UI   | P1-J1    | C1, C20       | Successful login with valid creds    |
| TC-AUTH-02 | US-AUTH-01   | P1    | UI   | P1-J1    | C1, C20       | Login fails with invalid password    |
| TC-AUTH-03 | US-AUTH-01   | P1    | API  | P1-J1    | C20, C21      | Protected route rejects unauth user  |

**TC-AUTH-01 – Successful login with valid credentials**

- **Pre-conditions**
  - User account exists in DB with known email/password.
  - Backend and frontend running.
- **Steps**
  1. Navigate to login page.
  2. Enter valid email and password.
  3. Click **Login**.
- **Expected result**
  - User is redirected to the dashboard.
  - A valid token is stored (e.g. in localStorage).
  - Dashboard API calls succeed with 200 responses.

---

**TC-AUTH-02 – Login fails with invalid password**

- **Pre-conditions**
  - User account exists.
- **Steps**
  1. Navigate to login page.
  2. Enter valid email and an incorrect password.
  3. Click **Login**.
- **Expected result**
  - User remains on login page.
  - Clear error message displayed (e.g. “Invalid credentials”).
  - No token is stored.

---

**TC-AUTH-03 – Unauthorized access to protected route**

- **Pre-conditions**
  - No token in browser storage.
- **Steps**
  1. Try to access a protected URL directly (e.g. `/incidents`).
- **Expected result**
  - User is redirected to login page **or** receives appropriate 401/403 response (for direct API call).

---

#### US-AUTH-02 – System identifies user role

| TC ID       | Story ID     | Phase | Type | Journeys               | Checklist IDs | Description                                  |
|------------|--------------|-------|------|------------------------|---------------|----------------------------------------------|
| TC-AUTH-04 | US-AUTH-02   | P1    | API  | P1-J1,P1-J2,P1-J4      | C20, C21      | /auth/me returns correct role                |
| TC-AUTH-05 | US-AUTH-02   | P1    | UI   | P1-J1,P1-J4,P1-J5      | C22           | Worker cannot see admin-only navigation      |
| TC-AUTH-06 | US-AUTH-02   | P1    | API  | P1-J4                  | C22           | Worker blocked from admin-only endpoints     |

(You can flesh out pre-conditions/steps/results the same way as above.)

---

### 1.2 Sites & Reference Data (E2)

#### US-SITE-01 – Admin manages sites

| TC ID      | Story ID    | Phase | Type | Journeys | Checklist IDs | Description                  |
|-----------|-------------|-------|------|----------|---------------|------------------------------|
| TC-SITE-01| US-SITE-01  | P1    | UI   | P1-J4    | C16, C17      | Admin creates a new site     |
| TC-SITE-02| US-SITE-01  | P1    | UI   | P1-J4    | C16, C17      | Admin edits existing site    |
| TC-SITE-03| US-SITE-01  | P1    | API  | P1-J4    | C18, C19      | Duplicate site code rejected |

**TC-SITE-01 – Admin creates a new site**

- **Pre-conditions**
  - User logged in as admin.
- **Steps**
  1. Navigate to **Admin → Sites**.
  2. Click **Add Site**.
  3. Enter `Name = "Warehouse 1"`, `Code = "WH1"`.
  4. Click **Save**.
- **Expected result**
  - New site appears in sites list.
  - Site is available in incident and inspection site dropdowns.

---

#### US-REF-01 – System provides incident types

| TC ID        | Story ID    | Phase | Type | Journeys | Checklist IDs | Description                    |
|-------------|-------------|-------|------|----------|---------------|--------------------------------|
| TC-REF-01   | US-REF-01   | P1    | API  | P1-J2    | C6, C7        | GET /incident-types returns seeded types |
| TC-REF-02   | US-REF-01   | P1    | UI   | P1-J2    | C6, C7        | New incident form shows a types dropdown |

---

### 1.3 Incident Management (E3)

#### US-INC-01 – Worker creates incident

| TC ID       | Story ID     | Phase | Type | Journeys | Checklist IDs | Description                           |
|------------|--------------|-------|------|----------|---------------|---------------------------------------|
| TC-INC-01  | US-INC-01    | P1    | UI   | P1-J2    | C1, C2, C3    | Create incident – happy path          |
| TC-INC-02  | US-INC-01    | P1    | UI   | P1-J2    | C1, C2        | Validation on missing required field  |
| TC-INC-03  | US-INC-01    | P1    | API  | P1-J2    | C1, C3        | POST /incidents persists correct data |

**TC-INC-01 – Create incident (happy path)**

- **Pre-conditions**
  - Worker logged in.
  - At least one site and incident type exist.
- **Steps**
  1. Navigate to **Incidents → New Incident**.
  2. Fill all required fields with valid data.
  3. Click **Save**.
- **Expected result**
  - Incident is created with status `open`.
  - Incident appears at top of incident list.
  - Dashboard KPIs update (if relevant).

---

#### US-INC-02 – User views incident list and filters

| TC ID       | Story ID     | Phase | Type | Journeys | Checklist IDs | Description                                 |
|------------|--------------|-------|------|----------|---------------|---------------------------------------------|
| TC-INC-04  | US-INC-02    | P1    | UI   | P1-J2,P1-J3 | C3, C4, C24 | Incident list shows columns correctly        |
| TC-INC-05  | US-INC-02    | P1    | UI   | P1-J2,P1-J3 | C3, C4      | Filter incidents by status                   |
| TC-INC-06  | US-INC-02    | P1    | UI   | P1-J2,P1-J3 | C3, C4      | Filter incidents by site                     |

---

#### US-INC-03 – Manager updates incident status

| TC ID       | Story ID     | Phase | Type | Journeys | Checklist IDs | Description                           |
|------------|--------------|-------|------|----------|---------------|---------------------------------------|
| TC-INC-07  | US-INC-03    | P1    | UI   | P1-J3    | C4, C25       | Manager changes incident status       |
| TC-INC-08  | US-INC-03    | P1    | API  | P1-J3    | C25           | Worker cannot change status (blocked) |

---

### 1.4 Inspection Templates & Inspections (E4)

#### US-INSP-01 – Admin defines inspection templates

| TC ID         | Story ID      | Phase | Type | Journeys | Checklist IDs | Description                             |
|--------------|---------------|-------|------|----------|---------------|-----------------------------------------|
| TC-INSP-01   | US-INSP-01    | P1    | UI   | P1-J5    | C8, C9        | Create template with name & description|
| TC-INSP-02   | US-INSP-01    | P1    | UI   | P1-J5    | C10, C11      | Add/edit/delete checklist items         |
| TC-INSP-03   | US-INSP-01    | P1    | API  | P1-J5    | C8–C11        | Template and items stored correctly     |

---

#### US-INSP-02 – Manager performs an inspection

| TC ID         | Story ID      | Phase | Type | Journeys | Checklist IDs | Description                                |
|--------------|---------------|-------|------|----------|---------------|--------------------------------------------|
| TC-INSP-04   | US-INSP-02    | P1    | UI   | P1-J6    | C12, C13      | Inspection form shows template checklist   |
| TC-INSP-05   | US-INSP-02    | P1    | UI   | P1-J6    | C14           | Record results with `ok`, `not_ok`, `n/a` |
| TC-INSP-06   | US-INSP-02    | P1    | UNIT | P1-J6    | C15           | overall_result logic (pass/fail)          |

**TC-INSP-06 – overall_result logic**

- **Pre-conditions**
  - At least one template and item set up.
- **Steps**
  1. Simulate or call a function/service with:
     - Case 1: all `ok` → expect `pass`
     - Case 2: at least one `not_ok` → expect `fail`
- **Expected result**
  - Logic matches spec in all cases.

---

#### US-INSP-03 – User views inspection history

| TC ID         | Story ID      | Phase | Type | Journeys | Checklist IDs | Description                         |
|--------------|---------------|-------|------|----------|---------------|-------------------------------------|
| TC-INSP-07   | US-INSP-03    | P1    | UI   | P1-J6    | C26, C27      | Inspection list shows correct columns |
| TC-INSP-08   | US-INSP-03    | P1    | UI   | P1-J6    | C26, C27      | Inspection detail shows header + items |

---

### 1.5 Dashboard & Reporting (E5)

#### US-DASH-01 – User views KPIs and trends

| TC ID        | Story ID     | Phase | Type | Journeys     | Checklist IDs           | Description                             |
|-------------|--------------|-------|------|--------------|-------------------------|-----------------------------------------|
| TC-DASH-01  | US-DASH-01   | P1    | API  | P1-J7        | C28–C32                 | /dashboard/summary returns all metrics  |
| TC-DASH-02  | US-DASH-01   | P1    | UI   | P1-J1,P1-J7  | C28–C32                 | Dashboard shows KPI cards correctly     |
| TC-DASH-03  | US-DASH-01   | P1    | UI   | P1-J7        | C28–C32                 | Charts render incidents by type/severity|
| TC-DASH-04  | US-DASH-01   | P1    | UI   | P1-J7        | C28–C32                 | Recent incidents/inspections tables clickable |

---

## 2. Phase 2 – Actions, Attachments, Audit, Help

(*Here is the pattern; you/Claude can flesh out as you implement Phase 2*)

### Example: US-ACT-01 – Manager creates actions for an incident

| TC ID       | Story ID     | Phase | Type | Journeys | Checklist IDs | Description                      |
|------------|--------------|-------|------|----------|---------------|----------------------------------|
| TC-ACT-01  | US-ACT-01    | P2    | UI   | P2-J1    | C43, C44      | Create action from incident      |
| TC-ACT-02  | US-ACT-01    | P2    | UI   | P2-J1    | C43, C44      | Action appears in All Actions    |
| TC-ACT-03  | US-ACT-01    | P2    | API  | P2-J1    | C43, C45      | Overdue status auto-calculated   |

### Example: US-ATT-01 – Upload evidence

| TC ID       | Story ID     | Phase | Type | Journeys | Checklist IDs | Description                          |
|------------|--------------|-------|------|----------|---------------|--------------------------------------|
| TC-ATT-01  | US-ATT-01    | P2    | UI   | P2-J2    | C51, C52      | Upload allowed file to incident      |
| TC-ATT-02  | US-ATT-01    | P2    | UI   | P2-J2    | C51, C53      | Reject disallowed/oversized file     |
| TC-ATT-03  | US-ATT-01    | P2    | API  | P2-J2    | C51, C52, C53 | Attachment metadata stored correctly |

### Example: US-AUDIT-01 – Audit log

| TC ID        | Story ID      | Phase | Type | Journeys | Checklist IDs | Description                               |
|-------------|---------------|-------|------|----------|---------------|-------------------------------------------|
| TC-AUDIT-01 | US-AUDIT-01   | P2    | API  | P2-J4    | C48, C49      | Audit entry created on incident status change |
| TC-AUDIT-02 | US-AUDIT-01   | P2    | UI   | P2-J4    | C48, C50      | Activity Log tab shows audit entries      |

---

## 3. Phase 3 – Org, Exports & Multi-Tenancy

### Example: US-ORG-01 – Data isolation per org

| TC ID        | Story ID     | Phase | Type | Journeys | Checklist IDs | Description                           |
|-------------|--------------|-------|------|----------|---------------|---------------------------------------|
| TC-ORG-01   | US-ORG-01    | P3    | API  | P3-J3    | C60, C61      | Org A user cannot see Org B data      |
| TC-ORG-02   | US-ORG-01    | P3    | API  | P3-J3    | C60, C61      | Org B user cannot see Org A data      |

### Example: US-EXPORT-01 – Export data

| TC ID         | Story ID      | Phase | Type | Journeys | Checklist IDs | Description                                |
|--------------|---------------|-------|------|----------|---------------|--------------------------------------------|
| TC-EXP-01    | US-EXPORT-01  | P3    | UI   | P3-J2    | C40, C41      | Export incidents with active filters       |
| TC-EXP-02    | US-EXPORT-01  | P3    | Manual | P3-J2  | C40, C42      | Verify exported file matches UI data       |

---

## 4. Phase 4 – Analytics & Risk

### Example: US-AN-01 – Analytics & hotspots

| TC ID        | Story ID     | Phase | Type | Journeys | Checklist IDs | Description                        |
|-------------|--------------|-------|------|----------|---------------|------------------------------------|
| TC-AN-01    | US-AN-01     | P4    | API  | P4-J1    | C70, C71      | Analytics API returns correct data |
| TC-AN-02    | US-AN-01     | P4    | UI   | P4-J1    | C70, C71      | Analytics screen shows hotspots    |

### Example: US-RISK-01 – Risk register

| TC ID        | Story ID     | Phase | Type | Journeys | Checklist IDs | Description                           |
|-------------|--------------|-------|------|----------|---------------|---------------------------------------|
| TC-RISK-01  | US-RISK-01   | P4    | UI   | P4-J2    | C72, C73      | Create new risk with correct scoring |
| TC-RISK-02  | US-RISK-01   | P4    | UI   | P4-J2    | C72, C73      | Update risk status and verify matrix |

---

## 5. Phase 5 – Notifications, Integrations & SSO

### Example: US-NOTIF-01 – Notifications

| TC ID          | Story ID       | Phase | Type | Journeys | Checklist IDs | Description                                  |
|---------------|----------------|-------|------|----------|---------------|----------------------------------------------|
| TC-NOTIF-01   | US-NOTIF-01    | P5    | Manual | P5-J1   | C80, C81      | Email/Teams notification on new incident     |
| TC-NOTIF-02   | US-NOTIF-01    | P5    | Manual | P5-J1   | C80, C82      | Notification on new assigned action          |

### Example: US-INT-01 – External API incidents

| TC ID          | Story ID       | Phase | Type | Journeys | Checklist IDs | Description                             |
|---------------|----------------|-------|------|----------|---------------|-----------------------------------------|
| TC-EXT-01     | US-INT-01      | P5    | API  | P5-J2    | C83, C84      | Valid API key creates incident          |
| TC-EXT-02     | US-INT-01      | P5    | API  | P5-J2    | C83, C84      | Invalid key rejected                    |

### Example: US-SSO-01 – SSO login

| TC ID         | Story ID      | Phase | Type | Journeys | Checklist IDs | Description                        |
|--------------|---------------|-------|------|----------|---------------|------------------------------------|
| TC-SSO-01    | US-SSO-01     | P5    | E2E  | P5-J3    | C85, C86      | Successful SSO login               |
| TC-SSO-02    | US-SSO-01     | P5    | E2E  | P5-J3    | C85, C86      | Failed SSO login path              |

---

## 6. Notes

- **Claude (dev/tester)** should:
  - Flesh out missing pre-conditions/steps/expected results for all Phase 1 test cases.
  - Add new TC rows as Phase 2–5 features are implemented.
  - Keep TC IDs stable once created.

- **Codex (PM/BA/QA)** should:
  - Use this catalogue to check coverage vs checklist and user stories.
  - Flag any P1 stories without test cases before Phase 1 is considered “done”.

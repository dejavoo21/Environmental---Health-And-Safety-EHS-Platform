# UAT Plan – EHS Portal v0.1 (Phase 1 + Phase 2)

## 1. Introduction

This document defines the User Acceptance Testing (UAT) scope and scenarios for the EHS Portal v0.1, covering:

- **Phase 1**
  - Authentication and role-based access
  - Sites and Incident Types management
  - Incident creation and tracking
  - Inspection templates and inspections
  - Dashboard KPIs

- **Phase 2**
  - Actions / CAPA
  - Attachments on incidents, inspections, actions
  - Activity / audit history views
  - In-app Help

### 1.1 Roles in Scope

UAT will be executed for three roles:

- **Worker** – frontline staff who report incidents and complete assigned actions.
- **Manager** – supervises workers, performs inspections, assigns and tracks actions.
- **Admin** – configures reference data (sites, incident types, templates), manages users, and oversees system-wide usage.

### 1.2 Environments

- Environment: `UAT` (or `local` if running on developer machine)
- Backend: Node/Express, PostgreSQL
- Frontend: React + Vite

---

## 2. UAT Scenarios – Worker

> IDs: `UAT-W-xx`

### UAT-W-01 – Worker login and logout

**Preconditions**

- A Worker user account exists.
- Worker has valid credentials.

**Steps**

1. Navigate to the EHS Portal URL.
2. Enter Worker email + password.
3. Click **Login**.
4. After viewing at least one page, click **Logout**.

**Expected Results**

- Worker is authenticated and sees the dashboard.
- Worker sees only Worker-level navigation (no admin configuration items).
- After logout, Worker is returned to the login page and cannot access protected routes via back button.

---

### UAT-W-02 – Create a new incident

**Preconditions**

- Worker is logged in.
- At least one **Site** and **Incident Type** are configured.

**Steps**

1. Open **Incidents → New Incident**.
2. Fill in:
   - Title
   - Incident Type
   - Site
   - Severity
   - Date & Time
   - Description
3. Click **Create Incident**.
4. Navigate to **Incidents** list.
5. Open the created incident.

**Expected Results**

- Incident is created successfully (no validation error for valid data).
- Incident appears in the Incidents list.
- Incident detail shows the data entered.
- Audit / activity log shows a “created” entry.

---

### UAT-W-03 – View own incidents

**Preconditions**

- At least one incident created by this Worker exists.

**Steps**

1. Log in as Worker.
2. Navigate to **Incidents** list.
3. Use filters (if available) to focus on incidents created recently or by current user.
4. Open one of the Worker’s incidents.

**Expected Results**

- Worker can see incidents they created.
- Worker cannot see incidents that are restricted by role/scoping rules (if any).
- Activity log for their incident is visible and read-only.

---

### UAT-W-04 – Complete an assigned action (My Actions)

**Preconditions**

- There is at least one Action assigned to this Worker.
  - (Created by a Manager/Admin from incident or inspection detail.)

**Steps**

1. Log in as Worker.
2. Navigate to **My Actions**.
3. Observe the action list.
4. Open one assigned action.
5. Change status from *open* / *in_progress* to *done*.
6. Save changes.

**Expected Results**

- “My Actions” shows only actions assigned to this Worker.
- Worker can open and update the status of their own actions.
- Worker cannot change fields they are not allowed to edit (e.g. source incident, assignee).
- Activity log for the action shows the status change with the Worker’s identity.

---

### UAT-W-05 – Upload an attachment to an incident

**Preconditions**

- Worker has at least one incident they created.

**Steps**

1. Log in as Worker.
2. Open the incident detail page.
3. In **Attachments** panel, click **Upload**.
4. Select a valid file (e.g. small PDF/image).
5. Confirm upload.

**Expected Results**

- File upload succeeds and the attachment appears in the list with name, size, and uploader.
- Worker can download the file back.
- Activity log records the attachment event (if specified in design).
- Invalid file types or oversize files are rejected with a clear error message.

---

## 3. UAT Scenarios – Manager

> IDs: `UAT-M-xx`

### UAT-M-01 – Manager login and navigation

**Preconditions**

- Manager user account exists.

**Steps**

1. Log in as Manager.
2. Confirm navigation shows Incidents, Inspections, My Actions, All Actions, Help.
3. Ensure Admin-only items (Sites, Templates, etc.) are hidden if Manager is not Admin.

**Expected Results**

- Role-appropriate navigation is visible.
- Manager can access both Incidents and Inspections modules.
- All restricted admin functions are hidden/disabled as per RBAC.

---

### UAT-M-02 – Conduct inspection and record failed items

**Preconditions**

- At least one Site exists.
- At least one Inspection Template exists with at least one question.

**Steps**

1. Log in as Manager.
2. Go to **Inspections → New Inspection**.
3. Select site and template.
4. Answer questions, including at least one “fail” or “non-compliant” result.
5. Save/complete the inspection.
6. Open the inspection detail.

**Expected Results**

- Inspection is created and appears in **Inspections** list.
- Inspection detail shows all responses, including failed items clearly marked.
- Activity log is available and shows inspection creation.

---

### UAT-M-03 – Create actions from incidents and inspections

**Preconditions**

- At least one incident and one inspection with a failed response exist.
- Users (workers/managers) exist to assign actions to.

**Steps**

1. As Manager, open an incident detail page.
2. In **Actions** panel, click **Add Action**.
3. Fill in action title, description, due date.
4. Assign to a Worker or Manager.
5. Save.
6. Repeat for a failed item on an inspection.

**Expected Results**

- Actions appear in the incident’s and inspection’s Actions panel.
- Each action is correctly linked to its source incident/inspection.
- Assignee field is set correctly.
- Activity logs are updated accordingly for both the action and the source entity.

---

### UAT-M-04 – Use My Actions vs All Actions

**Preconditions**

- Multiple actions exist, assigned to various users.

**Steps**

1. Log in as Manager.
2. Go to **My Actions**:
   - Verify only actions assigned to this Manager appear.
3. Toggle or navigate to **All Actions**:
   - Verify all actions (within visibility rules) appear.
4. Apply filters:
   - By status (open, in_progress, done, overdue).
   - By site.
   - By due date range.

**Expected Results**

- “My Actions” is restricted to Manager’s assignments.
- “All Actions” shows broader portfolio.
- Filters behave correctly and combinations work (e.g. status + site).
- Overdue actions are visually highlighted as per UX spec.

---

### UAT-M-05 – View activity history for incidents, inspections, actions

**Preconditions**

- There are entities with a meaningful history (creates, updates, attachments, actions).

**Steps**

1. As Manager, open an incident with several updates.
2. View the **Activity Log** panel.
3. Do the same for:
   - A completed inspection.
   - An action that has changed status.

**Expected Results**

- Activity logs display a time-ordered timeline.
- Entries show who did what and when.
- Manager can see history for entities they are allowed to view.
- Logs are read-only.

---

## 4. UAT Scenarios – Admin

> IDs: `UAT-A-xx`

### UAT-A-01 – Admin configuration (Sites, Incident Types, Templates)

**Preconditions**

- Admin account exists.

**Steps**

1. Log in as Admin.
2. Navigate to **Sites**.
3. Create a new site.
4. Navigate to **Incident Types**.
5. Create a new incident type or edit an existing one.
6. Navigate to **Templates**.
7. Create or edit an inspection template (questions, response options).

**Expected Results**

- Admin can create and update reference data.
- New sites/types/templates appear in the relevant dropdowns for Incidents and Inspections.
- Validation prevents duplicate or invalid values.

---

### UAT-A-02 – Verify dashboard KPIs

**Preconditions**

- There are existing incidents, inspections, and actions.

**Steps**

1. Log in as Admin.
2. Navigate to **Dashboard**.
3. Observe KPI tiles and charts (incident counts, inspection status, actions, etc.).
4. Optionally create a new incident or action and refresh the dashboard.

**Expected Results**

- Dashboard loads without error.
- KPIs are consistent with underlying data (counts reflect what is in the lists).
- Charts update after new data is added.

---

### UAT-A-03 – Review Help content

**Preconditions**

- Help topics are configured.

**Steps**

1. Log in as Admin.
2. Navigate to **Help**.
3. Browse several topics (reporting an incident, inspections, managing actions, attachments, etc.).

**Expected Results**

- Help page loads topics and content correctly.
- No console warnings or errors related to list keys.
- Content matches current system behaviour.

---

## 5. UAT Exit Criteria

UAT is considered successful when:

- 100% of **critical** scenarios (Worker/Manager/Admin core flows) pass.
- ≥ 90% of all defined UAT scenarios pass.
- No open **Severity 1** or **Severity 2** defects remain.
- Any known limitations are documented in `RELEASE_NOTES_v0.1.md`.
- Business stakeholders for each role sign off that the system supports:
  - Incident reporting and tracking
  - Inspections and follow-up
  - Action management and evidence
  - Activity logging and oversight
  - Basic help content

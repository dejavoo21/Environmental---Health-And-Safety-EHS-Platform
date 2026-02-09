# User Journeys - EHS Portal (Phases 1-5)

## 1. Roles & Personas

- **Worker**
  - Front-line user at a site.
  - Main actions: log incidents, see their own incidents, view assigned actions (Phase 2+), see basic dashboard info.

- **Manager**
  - Responsible for one or more sites.
  - Main actions: review incidents and inspections, perform inspections, manage actions, monitor dashboard and analytics.

- **Admin**
  - Operational admin for an organisation.
  - Main actions: manage sites, incident types, inspection templates, org settings (branding, notifications), users (if implemented).

- **Org Owner / Compliance Lead** (Phase 3+)
  - Senior stakeholder.
  - Main actions: review exports, analytics, risk register, multi-site performance.

- **Integrator / External System** (Phase 5)
  - Systems that integrate via API or webhooks.
  - Main actions: submit incidents, consume incident/inspection events.

---

## 2. Phase 1 - Core Operations

### Journey P1-J1 - User logs in and reaches the dashboard

**Persona:** Any (Worker / Manager / Admin)  
**Trigger:** User receives login details and needs to access the portal.

**Preconditions:**
- User account exists with role.
- Application is deployed.

**Steps:**
1. User navigates to login page.
2. Enters email and password.
3. Clicks Login.
4. System verifies credentials, issues JWT, stores token in client (e.g. localStorage).
5. User is redirected to Dashboard.

**Postconditions:**
- User sees dashboard KPIs and navigation menu.
- Authenticated session is active for subsequent API calls.

---

### Journey P1-J2 - Worker reports an incident

**Persona:** Worker  
**Trigger:** Worker experiences or observes a safety incident.

**Preconditions:**
- Worker is logged in.
- At least one site and incident types exist.

**Steps:**
1. Worker clicks Incidents in nav, then New Incident.
2. Fills in:
   - Title
   - Site
   - Incident type
   - Severity
   - Date/time
   - Description
3. Submits the form.
4. Backend validates and creates incident with status `open`.
5. Worker is redirected to incident list.

**Postconditions:**
- New incident appears at top of list.
- Incident is included in dashboard counts and charts.

---

### Journey P1-J3 - Manager reviews and updates an incident

**Persona:** Manager  
**Trigger:** New incidents are reported at their site.

**Preconditions:**
- Incidents exist (status `open`).

**Steps:**
1. Manager logs in and opens Dashboard.
2. Sees widget Recent incidents and/or Open incidents.
3. Clicks an incident to open detail.
4. Reviews severity, description, site.
5. Changes status:
   - From `open` ' `under_investigation` (if follow-up needed).
   - Later from `under_investigation` ' `closed`.
6. Saves changes.

**Postconditions:**
- Incident status updated.
- Dashboard KPIs reflect updated number of open incidents.

---

### Journey P1-J4 - Admin manages sites

**Persona:** Admin  
**Trigger:** New site is created or existing site name/code changes.

**Preconditions:**
- Admin is logged in.

**Steps:**
1. Admin navigates to Admin -> Sites.
2. Sees list of existing sites.
3. Clicks Add Site:
   - Enters name and code.
   - Saves.
4. (Optional) Edits an existing sites name/code.

**Postconditions:**
- New site is available in incident and inspection forms.
- References stay consistent in lists and dashboard.

---

### Journey P1-J5 - Admin configures inspection templates

**Persona:** Admin  
**Trigger:** Needing a standardised inspection checklist.

**Preconditions:**
- Admin logged in.

**Steps:**
1. Admin goes to Admin -> Inspection Templates.
2. Clicks New Template:
   - Enters name and description.
3. After template creation, adds checklist items:
   - For each item: label, optional category.
4. Saves changes.

**Postconditions:**
- Template and its items appear as options when creating inspections.

---

### Journey P1-J6 - Manager performs an inspection

**Persona:** Manager or designated inspector user  
**Trigger:** Scheduled inspection at a site.

**Preconditions:**
- Template(s) and site(s) exist.
- Manager logged in.

**Steps:**
1. Manager navigates to Inspections -> New Inspection.
2. Selects:
   - Site
   - Template
   - Performed-at date/time
3. System loads template items.
4. For each item:
   - Sets result: `ok`, `not_ok`, or `na`.
   - Optionally adds a comment.
5. Submits inspection.
6. Backend calculates `overall_result`:
   - `fail` if any `not_ok`, else `pass`.

**Postconditions:**
- Inspection appears in list and dashboard.
- Dashboard counts for inspections and failed inspections update.

---

### Journey P1-J7 - User reviews the dashboard

**Persona:** Manager / Admin / Worker (read-only)  
**Trigger:** User wants to understand safety performance.

**Preconditions:**
- Existing incidents and inspections.

**Steps:**
1. User opens Dashboard.
2. Sees KPI cards:
   - Total incidents
   - Open incidents
   - Incidents last 30 days
   - Inspections last 30 days
   - Failed inspections last 30 days
3. Reviews:
   - Bar chart of incidents by type.
   - Line chart of incident severity over time.
4. Scrolls down to:
   - Recent incidents table (clickable).
   - Recent inspections table (clickable).
5. Clicks on a row to view detail if needed.

**Postconditions:**
- User can identify recent activity and trends.
- No data inconsistencies between lists and dashboard.

---

## 3. Phase 2 - Operational Excellence (CAPA, Attachments, RBAC, Audit, Docs)

### Journey P2-J1 - Manager creates and manages actions from an incident

**Persona:** Manager  
**Trigger:** Incident requires follow-up actions.

**Preconditions:**
- Incident exists.
- Actions module enabled (Phase 2).

**Steps:**
1. Manager opens incident detail.
2. Clicks Add Action.
3. Fills:
   - Title
   - Description
   - Assigned to (user)
   - Due date
4. Saves action.
5. Later, manager or assignee updates status:
   - `open` ' `in_progress` ' `done` (or overdue by date).

**Postconditions:**
- Action is visible in Actions -> All Actions.
- Assignee sees it in My Actions.
- Audit log records action creation and status changes.

**US-IDs:** US-ACT-02  
**C-IDs:** C20, C22, C23, C25, C26, C43

---

### Journey P2-J2 - Manager creates and manages actions from a failed inspection item

**Persona:** Manager / Admin  
**Trigger:** Failed inspection item requires corrective action.

**Preconditions:**
- Inspection exists with one or more `not_ok` items.

**Steps:**
1. Manager opens inspection detail.
2. Clicks Create Action on a failed item.
3. Fills:
   - Title
   - Description
   - Assigned to (user)
   - Due date
4. Saves action.
5. Later, manager or assignee updates status:
   - `open` ' `in_progress` ' `done` (or overdue by date).

**Postconditions:**
- Action is linked to the inspection (and optionally the response item).
- Action appears in All Actions; assignee sees it in My Actions.
- Audit log records action creation and status changes.

**US-IDs:** US-ACT-01  
**C-IDs:** C21, C22, C23, C25, C26, C43

---

### Journey P2-J3 - Worker manages their assigned actions (My Actions)

**Persona:** Worker  
**Trigger:** Worker receives an action from an incident or inspection finding.

**Preconditions:**
- Action assigned to worker.

**Steps:**
1. Worker logs in and navigates to Actions -> My Actions.
2. Filters by status (e.g. `open`).
3. Opens an action detail:
   - Reads description, due date.
4. Performs task in real life.
5. Updates status to `done` and adds resolution comment.
6. Saves.

**Postconditions:**
- Action no longer appears in open list.
- Manager sees updated status and comment in All Actions.

**US-IDs:** US-ACT-03  
**C-IDs:** C23, C24, C25

---

### Journey P2-J4 - Manager/Admin views and filters All Actions

**Persona:** Manager / Admin  
**Trigger:** Need oversight across actions.

**Preconditions:**
- Actions exist across sites.

**Steps:**
1. Manager navigates to Actions -> All Actions.
2. Applies filters:
   - Status
   - Site
   - Due date
3. Opens action detail if needed.

**Postconditions:**
- Actions list reflects filters.
- Oversight of overdue or blocked actions is possible.

**US-IDs:** US-ACT-04  
**C-IDs:** C26, C27

---

### Journey P2-J5 - Add and view attachments on incidents

**Persona:** Worker (own incident), Manager, Admin  
**Trigger:** Evidence needs to be attached to incident.

**Preconditions:**
- Incident exists.

**Steps:**
1. User opens incident detail.
2. Adds attachment (file type/size validated).
3. Upload succeeds and attachment appears in list.

**Postconditions:**
- Attachment metadata stored and linked to incident.
- Attachment can be downloaded by authorized users.

**US-IDs:** US-ATT-02  
**C-IDs:** C28, C31, C32, C33

---

### Journey P2-J6 - Add and view attachments on inspections

**Persona:** Manager / Admin  
**Trigger:** Evidence needs to be attached to inspection.

**Preconditions:**
- Inspection exists.

**Steps:**
1. User opens inspection detail.
2. Adds attachment (file type/size validated).
3. Upload succeeds and attachment appears in list.

**Postconditions:**
- Attachment metadata stored and linked to inspection.
- Attachment can be downloaded by authorized users.

**US-IDs:** US-ATT-03  
**C-IDs:** C29, C31, C32, C33

---

### Journey P2-J7 - Add and view attachments on actions

**Persona:** Assignee / Manager / Admin  
**Trigger:** Evidence needs to be attached to action completion.

**Preconditions:**
- Action exists.

**Steps:**
1. User opens action detail.
2. Adds attachment (file type/size validated).
3. Upload succeeds and attachment appears in list.

**Postconditions:**
- Attachment metadata stored and linked to action.
- Attachment can be downloaded by authorized users.

**US-IDs:** US-ATT-01  
**C-IDs:** C30, C31, C32, C33

---

### Journey P2-J8 - View activity log on incident detail

**Persona:** Manager / Admin (and Worker where permitted)  
**Trigger:** Need audit history for incident.

**Preconditions:**
- Audit logging enabled.
- Incident exists.

**Steps:**
1. User opens incident detail.
2. Opens Activity Log section.
3. Reviews chronological entries.

**Postconditions:**
- User sees immutable audit history for the incident.

**US-IDs:** US-AUD-01  
**C-IDs:** C40, C41, C44, C46

---

### Journey P2-J9 - View activity log on inspection detail

**Persona:** Manager / Admin (and Worker where permitted)  
**Trigger:** Need audit history for inspection.

**Preconditions:**
- Audit logging enabled.
- Inspection exists.

**Steps:**
1. User opens inspection detail.
2. Opens Activity Log section.
3. Reviews chronological entries.

**Postconditions:**
- User sees immutable audit history for the inspection.

**US-IDs:** US-AUD-02  
**C-IDs:** C42, C45, C46

---

### Journey P2-J10 - View activity log on action detail

**Persona:** Assignee / Manager / Admin  
**Trigger:** Need audit history for action.

**Preconditions:**
- Audit logging enabled.
- Action exists.

**Steps:**
1. User opens action detail.
2. Opens Activity Log section.
3. Reviews chronological entries.

**Postconditions:**
- User sees immutable audit history for the action.

**US-IDs:** US-AUD-03  
**C-IDs:** C43, C46

---

### Journey P2-J11 - Access in-app help

**Persona:** Any user  
**Trigger:** User needs guidance on incidents, inspections, or actions.

**Preconditions:**
- Help/FAQ link configured.

**Steps:**
1. User clicks Help or Support.
2. Reads FAQ or short how-to sections.
3. If needed, notes support email / contact method.

**Postconditions:**
- User gains clarity without external training.
- Support contact details are visible.

**US-IDs:** US-HELP-01  
**C-IDs:** C68, C69, C70

---

## 4. Phase 3 - Enterprise & Multi-Org, Exports & Org Settings

### Journey P3-J1 - Org admin configures organisation branding and settings

**Persona:** Admin / Org Owner  
**Trigger:** New org onboarding or rebranding.

**Preconditions:**
- Org exists; admin logged in.

**Steps:**
1. Admin opens Org Settings.
2. Updates:
   - Logo
   - Primary colour
   - Default notification emails (for incidents/actions).
3. Saves.

**Postconditions:**
- Branding visible across app.
- Notifications use configured recipients.

---

### Journey P3-J2 - Manager exports incident and inspection data

**Persona:** Manager / Compliance Lead  
**Trigger:** Needs data for external report, audit, or Power BI.

**Preconditions:**
- Export endpoints available.

**Steps:**
1. Manager applies filters in Incidents list (date range, site, severity).
2. Clicks Export CSV/Excel.
3. System generates file and downloads it.
4. Manager opens file in Excel or imports into another tool.

**Postconditions:**
- Data is reusable outside the app.
- User feels they are not locked-in.

---

### Journey P3-J3 - Org admin ensures data isolation across multiple orgs

**Persona:** Platform owner (you)  
**Trigger:** Multiple customer organisations onboarded.

**Preconditions:**
- Multi-tenant model (organisation_id) enforced.

**Steps:**
1. Org A admin logs in and checks:
   - Sees only Org A sites, incidents, inspections, actions.
2. Org B admin logs in and checks:
   - Sees only Org B data.
3. Platform owner optionally verifies via admin tools/queries.

**Postconditions:**
- Strong tenant isolation.
- No cross-org data leaks.

---

## 5. Phase 4 - Notifications & Escalations

### Journey P4-J1 - Worker receives action assignment notification

**Persona:** Worker
**Trigger:** Manager assigns an action to the worker.

**Preconditions:**
- Action assigned to worker with valid email.
- Notification preferences allow email notifications.

**Steps:**
1. Manager creates action and assigns to worker.
2. System creates in-app notification for worker.
3. If worker has `email_action_assigned = true`, system sends email.
4. Worker sees notification badge in header (unread count).
5. Worker clicks bell icon, sees notification in dropdown.
6. Worker clicks notification, navigates to action detail.
7. Notification marked as read automatically.

**Postconditions:**
- Worker aware of new assignment within minutes.
- Action detail page opens with full context.
- Unread badge count decremented.

**US-IDs:** US-NOTIF-01, US-NOTIF-02
**C-IDs:** C-096, C-103, C-104

---

### Journey P4-J2 - Manager views and manages notifications

**Persona:** Manager
**Trigger:** Bell icon shows unread notifications.

**Preconditions:**
- Manager has notifications (action updates, incidents, etc.).

**Steps:**
1. Manager sees badge "5" on bell icon in header.
2. Clicks bell, dropdown shows latest 10 notifications.
3. Scans titles and times (e.g., "New action assigned", "5 min ago").
4. Clicks "Mark all as read" to clear badge.
5. Clicks "View All" to open full notifications page.
6. On notifications page, filters by:
   - Type: "Actions" only
   - Status: "Unread"
7. Clicks individual notification to navigate to item.

**Postconditions:**
- Manager has processed notifications.
- Badge shows 0 unread.
- Can return to notifications page for history.

**US-IDs:** US-NOTIF-03, US-NOTIF-04
**C-IDs:** C-103, C-104, C-105

---

### Journey P4-J3 - User configures notification preferences

**Persona:** Any user (Worker / Manager / Admin)
**Trigger:** User wants to control notification frequency.

**Preconditions:**
- User is logged in.

**Steps:**
1. User clicks profile dropdown → "Notification Settings".
2. Sees preferences form:
   - Email toggles: Action assigned, Action overdue, High-severity incidents
   - Digest frequency: Daily / Weekly / None
   - Digest time: 07:00 (dropdown)
3. User disables "Action assigned" email (prefers in-app only).
4. User sets digest frequency to "Weekly".
5. Clicks Save.
6. Success toast: "Preferences saved".

**Postconditions:**
- User no longer receives action assignment emails.
- User will receive weekly digest on Monday morning.
- Preferences apply immediately to new notifications.

**US-IDs:** US-PREF-01, US-PREF-02
**C-IDs:** C-108, C-109

---

### Journey P4-J4 - Manager receives daily digest email

**Persona:** Manager
**Trigger:** Scheduled job runs at 07:00 UTC.

**Preconditions:**
- Manager has `digest_frequency = 'daily'`.
- Organisation has incidents/actions in the relevant period.

**Steps:**
1. System runs daily digest job at 07:00.
2. Job queries manager's org for:
   - New incidents since yesterday
   - Actions due in next 7 days
   - Overdue actions
3. System generates HTML email with summaries.
4. Email sent to manager's address.
5. Manager opens email, sees:
   - "3 new incidents yesterday"
   - "5 actions due this week"
   - "2 overdue actions"
6. Manager clicks link to view dashboard.

**Postconditions:**
- Manager starts day with safety overview.
- Can prioritize work based on digest content.
- Email logged for audit trail.

**US-IDs:** US-DIGEST-01, US-DIGEST-02
**C-IDs:** C-100, C-102

---

### Journey P4-J5 - Action escalation for overdue item

**Persona:** System → Worker, Manager
**Trigger:** Action overdue by X days (configurable, default 3).

**Preconditions:**
- Action is open/in_progress with past due date.
- Organisation has `escalation.enabled = true`.
- Action not previously escalated.

**Steps:**
1. Escalation job runs at 08:00.
2. Job finds action: due date was 4 days ago, status still "open".
3. Job checks org setting: `escalation.daysOverdue = 3` → qualifies.
4. System creates escalation notification for:
   - Assignee (worker)
   - All org managers
5. System sends escalation emails with:
   - Action title, days overdue
   - Link to action
   - Urgency indicator
6. Action metadata updated: `escalated_at = NOW()`.
7. Audit log entry created.

**Postconditions:**
- Assignee reminded of overdue action.
- Managers alerted to blocked work.
- Action won't be escalated again (one-time trigger).

**US-IDs:** US-ESC-01, US-ESC-02
**C-IDs:** C-106, C-107

---

### Journey P4-J6 - Admin receives high-severity incident alert

**Persona:** Admin / Manager
**Trigger:** Worker reports critical incident.

**Preconditions:**
- Worker logged in and creates incident.
- Incident severity = "high" or "critical".

**Steps:**
1. Worker submits incident with severity "critical".
2. System detects high-severity and triggers notification.
3. System finds all managers and admins in org.
4. Creates HIGH priority in-app notification for each.
5. Sends email immediately (bypasses normal preferences).
6. Admin sees red-highlighted notification in bell dropdown.
7. Admin clicks notification, opens incident detail.
8. Admin can begin immediate investigation.

**Postconditions:**
- Critical incident gets immediate attention.
- Response time minimized.
- Audit trail shows notification delivery.

**US-IDs:** US-NOTIF-05
**C-IDs:** C-098

---

### Journey P4-J7 - Admin configures organisation escalation settings

**Persona:** Admin
**Trigger:** Admin wants to customize escalation behaviour.

**Preconditions:**
- Admin logged in with access to org settings.

**Steps:**
1. Admin opens Admin → Organisation Settings.
2. Scrolls to "Escalation Settings" section.
3. Configures:
   - Enable escalations: Yes
   - Days overdue before escalation: 5 (was 3)
   - Notify managers: Yes
   - Custom escalation email: "safety-team@company.com"
4. Clicks Save.
5. Success toast: "Settings saved".

**Postconditions:**
- Escalations now trigger after 5 days overdue.
- safety-team@company.com receives escalation emails.
- Changes apply to next escalation job run.

**US-IDs:** US-ESC-03
**C-IDs:** C-107

---

## 6. Phase 5 - Analytics & Insights

### Journey P5-J1 - Manager reviews monthly analytics dashboard

**Persona:** Manager / Compliance Lead
**Trigger:** Monthly safety review meeting preparation.

**Preconditions:**
- Analytics module is enabled.
- Sufficient historical data exists (>30 days).

**Steps:**
1. Manager opens Analytics from navigation menu.
2. Default view loads (or saved default view if configured).
3. Reviews KPI cards at top of page:
   - Total incidents (with trend arrow)
   - % High severity incidents
   - Average resolution time
   - Open actions count
   - % Actions overdue
   - Inspection pass rate
4. Scrolls to time-series charts:
   - Incidents per month (stacked by severity)
   - Actions created vs completed
5. Reviews site comparison charts:
   - Incidents by site
   - Overdue actions by site
6. Notes any concerning trends for discussion.

**Postconditions:**
- Manager has data-driven view of safety performance.
- Prepared for monthly review meeting.

**US-IDs:** US-ANALYTICS-01, US-ANALYTICS-02
**C-IDs:** C-120, C-121, C-122, C-123

---

### Journey P5-J2 - Manager saves and reuses board view

**Persona:** Manager / Compliance Lead
**Trigger:** Need to quickly reproduce specific analytics configuration.

**Preconditions:**
- User has access to Analytics page.

**Steps:**
1. Manager opens Analytics page.
2. Applies filters:
   - Date range: Last 90 days
   - Sites: Warehouse A, Warehouse B
   - Severity: High, Critical only
3. Reviews filtered analytics.
4. Clicks "Save View" button.
5. Enters name: "Quarterly High-Risk Review".
6. Optionally: Checks "Share with organisation".
7. Optionally: Checks "Set as default".
8. Clicks Save.
9. View appears in saved views dropdown.
10. Next month, selects view from dropdown to instantly apply same filters.

**Postconditions:**
- View saved for future use.
- Other org users can see shared view.
- Time saved on repeated filter configuration.

**US-IDs:** US-VIEWS-01, US-VIEWS-02
**C-IDs:** C-128, C-129, C-130

---

### Journey P5-J3 - HSE Lead drills down from high-risk site to incident list

**Persona:** HSE Lead / Manager
**Trigger:** Noticed a site with high risk score in dashboard.

**Preconditions:**
- Risk scores have been calculated.
- Site has incidents/actions contributing to score.

**Steps:**
1. HSE Lead opens Analytics page.
2. Scrolls to "Top 5 High-Risk Sites" widget.
3. Sees "Warehouse A" with risk score 46 (High - Orange).
4. Notes primary factor: "7 high-severity incidents".
5. Clicks on "Warehouse A" row.
6. System navigates to Incidents page.
7. Incidents page opens with filters pre-applied:
   - Site: Warehouse A
   - Date range: Last 90 days (from analytics)
8. HSE Lead reviews individual incident records.
9. Identifies pattern (e.g., all related to forklift operations).
10. Creates targeted corrective actions.

**Postconditions:**
- Root cause investigation initiated.
- Specific incidents identified for follow-up.
- Targeted intervention planned.

**US-IDs:** US-DRILL-01, US-RISK-01
**C-IDs:** C-125, C-132

---

### Journey P5-J4 - Compliance Lead generates PDF board pack

**Persona:** Compliance Lead / HSE Director
**Trigger:** Board meeting requiring safety performance report.

**Preconditions:**
- Analytics data available for reporting period.

**Steps:**
1. Compliance Lead opens Analytics page.
2. Sets filters for board report:
   - Date range: Last quarter
   - All sites (no filter)
3. Reviews data to ensure accuracy.
4. Clicks "Export PDF" button.
5. System shows "Generating report..." progress indicator.
6. After ~15 seconds, PDF downloads automatically.
7. Opens PDF and reviews:
   - Cover page with org name and date range
   - Executive summary with KPIs
   - Charts (incidents over time, by site)
   - Risk insights table
   - Filter summary
8. Attaches PDF to board meeting materials.

**Postconditions:**
- Professional board-ready report generated.
- No manual chart screenshots needed.
- Consistent format for recurring reports.

**US-IDs:** US-REPORT-01
**C-IDs:** C-131

---

### Journey P5-J5 - Manager reviews risk score methodology

**Persona:** Manager
**Trigger:** Questions about how site risk scores are calculated.

**Preconditions:**
- Risk scores visible on Analytics page.

**Steps:**
1. Manager views Analytics page.
2. Sees site "Distribution Center" with score 52 (Critical).
3. Clicks info icon next to "Risk Score" header.
4. Tooltip/modal explains:
   - Formula: Weighted incidents + overdue actions + failed inspections
   - Current weights (Critical=10, High=5, etc.)
   - Category thresholds (0-10=Low, 11-30=Medium, etc.)
5. Clicks "View Details" for Distribution Center.
6. Modal shows breakdown:
   - Incidents: 2 critical, 3 high, 5 medium = (2×10)+(3×5)+(5×2) = 45
   - Overdue actions: 2 × 3 = 6
   - Failed inspections: 0 × 2 = 0
   - Total: 51 → Critical
7. Manager understands score composition.

**Postconditions:**
- Risk score methodology is transparent.
- Manager knows which factors to address for improvement.

**US-IDs:** US-RISK-02
**C-IDs:** C-124, C-127

---

### Journey P5-J6 - Admin manages saved views for organisation

**Persona:** Admin
**Trigger:** Need to create/manage shared views for team.

**Preconditions:**
- Admin has analytics access.

**Steps:**
1. Admin opens Analytics page.
2. Configures standard filters for weekly safety meeting.
3. Saves view as "Weekly Safety Huddle".
4. Checks "Share with organisation".
5. Later, needs to update the view:
   - Opens saved views management.
   - Selects "Weekly Safety Huddle".
   - Modifies filter (adds new site).
   - Clicks "Update View".
6. Deletes obsolete view:
   - Selects old view.
   - Clicks Delete.
   - Confirms deletion.

**Postconditions:**
- Team has access to standardised views.
- Views kept up-to-date with org changes.

**US-IDs:** US-VIEWS-03
**C-IDs:** C-130

---

## 7. Phase 5+ - Future (Risk Register, SSO, Integrations)

### Journey P5+-J1 - Risk owner manages risk register (Future)

**Persona:** Risk Owner / Compliance Lead
**Trigger:** Major incident or repeated issues.

**Preconditions:**
- Risk register module live (future phase).

**Steps:**
1. Risk owner opens Risk Register.
2. Clicks New Risk.
3. Fills:
   - Title, description
   - Linked site (optional)
   - Likelihood, impact (1-5)
   - Owner
   - Status (`open`, `mitigated`, `accepted`)
4. Saves risk.
5. Later updates status and risk score as mitigations are implemented.

**Postconditions:**
- Risks tracked centrally.
- Risk matrix dashboards reflect current risk profile.

---

### Journey P5+-J2 - External system creates incident via API (Future)

**Persona:** External system (e.g. maintenance app)
**Trigger:** An external event that should be treated as an incident.

**Preconditions:**
- API key created for the org (future feature).
- External integration configured.

**Steps:**
1. Org admin creates API key in Integrations.
2. External system calls `POST /api/external/incidents` with:
   - API key in header.
   - Incident payload (site, type, severity, description).
3. System validates and creates incident.
4. Incident appears in normal lists and dashboard.

**Postconditions:**
- External systems can feed the EHS Portal.
- No manual re-entry needed.

---

### Journey P5+-J3 - User logs in via SSO (Future)

**Persona:** Any user with IdP account
**Trigger:** Organisation enabled SSO (future feature).

**Preconditions:**
- OIDC configured for the org.

**Steps:**
1. User clicks Login with SSO.
2. Redirected to identity provider (e.g. Azure AD).
3. Authenticates and returns to app.
4. App issues its own session/JWT based on IdP claims.

**Postconditions:**
- User is logged in without separate password.
- Role and organisation derived from IdP attributes or mapping.

---

## 8. Phase 6 - Security, Trust & Self-Service

### Journey P6-J1 - New user requests access

**Persona:** Prospective User (no account)
**Trigger:** User needs access to the EHS Portal for their organisation.

**Preconditions:**
- Organisation exists with self-registration enabled.
- User knows organisation code.

**Steps:**
1. User navigates to `/request-access` page.
2. Enters full name, email address.
3. Enters organisation code (provided by employer).
4. Selects requested role (worker/manager).
5. Optionally enters reason for access.
6. Accepts terms of service.
7. Clicks Submit Request.
8. System validates org code, creates pending access request.
9. User sees confirmation with reference number.
10. Confirmation email sent to user.

**Postconditions:**
- Access request appears in admin queue.
- User can track request status via reference number.

**US-IDs:** US-ACCESS-01
**C-IDs:** C-140, C-141

---

### Journey P6-J2 - Admin approves access request

**Persona:** Admin
**Trigger:** Pending access request in queue.

**Preconditions:**
- Admin logged in.
- Pending access requests exist.

**Steps:**
1. Admin navigates to Admin > Access Requests.
2. Views pending requests tab.
3. Clicks on a request to view details.
4. Reviews requester's information and reason.
5. Clicks Approve.
6. Selects role to assign (may differ from requested).
7. Optionally assigns user to specific sites.
8. Clicks Approve & Create User.
9. System creates user account with temporary password.
10. Welcome email sent to new user.

**Postconditions:**
- User account created.
- User can log in with temporary password.
- Request status changed to approved.

**US-IDs:** US-ACCESS-02
**C-IDs:** C-142, C-143

---

### Journey P6-J3 - User resets forgotten password

**Persona:** Any registered user
**Trigger:** User has forgotten their password.

**Preconditions:**
- User account exists with valid email.
- User is not logged in.

**Steps:**
1. User navigates to login page.
2. Clicks "Forgot password?" link.
3. Enters email address.
4. Clicks Send Reset Link.
5. System sends email with secure reset link (if account exists).
6. User sees generic confirmation (no email enumeration).
7. User opens email and clicks reset link.
8. System validates token (not expired, not used).
9. User enters new password and confirmation.
10. System validates password strength and history.
11. User clicks Reset Password.
12. Password updated, user redirected to login.

**Postconditions:**
- Password changed.
- Reset token invalidated.
- Audit log records password change.

**US-IDs:** US-PWRESET-01, US-PWRESET-02
**C-IDs:** C-144, C-145, C-146

---

### Journey P6-J4 - User enables two-factor authentication

**Persona:** Any logged-in user
**Trigger:** User wants to improve account security.

**Preconditions:**
- User logged in.
- 2FA not already enabled.

**Steps:**
1. User navigates to Security Centre.
2. Clicks Enable Two-Factor Authentication.
3. Step 1: QR code displayed with TOTP secret.
4. User scans QR code with authenticator app (or enters manual key).
5. User clicks Continue.
6. Step 2: User enters 6-digit code from authenticator.
7. System verifies code is correct.
8. User clicks Verify & Continue.
9. Step 3: Backup codes displayed.
10. User downloads/prints backup codes.
11. User confirms they saved codes.
12. Clicks Complete Setup.
13. 2FA now required on all future logins.

**Postconditions:**
- 2FA enabled for account.
- 10 backup codes stored (hashed).
- Audit log records 2FA enabled.

**US-IDs:** US-2FA-01
**C-IDs:** C-148, C-149, C-150

---

### Journey P6-J5 - User logs in with two-factor authentication

**Persona:** User with 2FA enabled
**Trigger:** User needs to access the portal.

**Preconditions:**
- User has 2FA enabled.
- User has authenticator app or backup codes.

**Steps:**
1. User enters email and password on login page.
2. Clicks Login.
3. System validates credentials, detects 2FA is enabled.
4. 2FA prompt modal appears.
5. User opens authenticator app.
6. Enters 6-digit TOTP code.
7. Clicks Verify.
8. System validates code.
9. User granted full access, redirected to dashboard.

**Alternative: Backup Code**
5a. User clicks "Use backup code instead".
6a. Enters 8-character backup code.
7a. System validates and marks code as used.
8a. User granted access.

**Postconditions:**
- User logged in with full access.
- Login recorded in login history.
- If backup code used, remaining count decremented.

**US-IDs:** US-2FA-02, US-2FA-03
**C-IDs:** C-151, C-152

---

### Journey P6-J6 - User views Security Centre

**Persona:** Any logged-in user
**Trigger:** User wants to review account security.

**Preconditions:**
- User logged in.

**Steps:**
1. User clicks profile menu or navigates to Settings > Security.
2. Security Centre page loads.
3. User views:
   - Account status (active since date).
   - 2FA status (enabled/disabled, backup codes remaining).
   - Password section (last changed date).
   - Recent login history (last 10 attempts).
4. User can take actions:
   - Enable/disable 2FA.
   - Regenerate backup codes.
   - Change password.
   - View full login history.

**Postconditions:**
- User has visibility into account security.
- Actions available to improve security.

**US-IDs:** US-SECURITY-01
**C-IDs:** C-156, C-157

---

### Journey P6-J7 - Admin views security audit log

**Persona:** Admin
**Trigger:** Security review or incident investigation.

**Preconditions:**
- Admin logged in.
- Security events exist in audit log.

**Steps:**
1. Admin navigates to Admin > Security Audit.
2. Views list of security events (newest first).
3. Filters by:
   - Event type (login, password change, 2FA, etc.).
   - User.
   - Date range.
4. Reviews specific events.
5. Optionally exports filtered results to CSV.

**Postconditions:**
- Admin has visibility into security events.
- Audit trail supports compliance requirements.

**US-IDs:** US-AUDIT-01, US-AUDIT-02
**C-IDs:** C-154, C-155

---

### Journey P6-J8 - User switches theme preference

**Persona:** Any logged-in user
**Trigger:** User prefers different colour scheme.

**Preconditions:**
- User logged in.

**Steps:**
1. User clicks theme toggle in header (sun/moon icon).
2. Theme cycles: Light → Dark → System → Light.
3. UI immediately updates to selected theme.
4. Preference saved to browser (localStorage) and backend.

**Alternative: Via Settings**
1. User navigates to Settings > Appearance.
2. Selects theme option (Light/Dark/System).
3. Theme applied and saved.

**Postconditions:**
- Theme preference persists across sessions.
- All pages render in selected theme.

**US-IDs:** US-THEME-01
**C-IDs:** C-162, C-163, C-164

---

### Journey P6-J9 - Account lockout and recovery

**Persona:** User with multiple failed login attempts
**Trigger:** User (or attacker) enters wrong password 5 times.

**Preconditions:**
- User account exists.
- 4 failed login attempts already recorded.

**Steps:**
1. 5th failed login attempt made.
2. System locks account for 15 minutes.
3. Error message shown: "Account temporarily locked".
4. Lockout notification email sent to user.
5. User waits for lockout period to expire.
6. (Alternative) User requests password reset.
7. After 15 minutes, user can attempt login again.
8. Successful login resets failed attempt counter.

**Postconditions:**
- Account protected from brute force attacks.
- User notified of potential unauthorised access.
- Lockout recorded in audit log.

**US-IDs:** US-SECURITY-02
**C-IDs:** C-158, C-159

---

## 8. Phase 7 - Chemical & Permit Management

### Journey P7-J1 - Safety Officer registers a new chemical

**Persona:** Manager / Safety Officer
**Trigger:** New chemical is brought on site and needs to be added to the register.

**Preconditions:**
- User logged in with Manager role or above.
- Site exists in the system.

**Steps:**
1. User navigates to Chemicals > Chemical Register.
2. Clicks "+ Add Chemical".
3. Fills in:
   - Chemical name: "Isopropyl Alcohol"
   - CAS number: "67-63-0"
   - Supplier: "Chemical Supplies Ltd"
   - Physical state: Liquid
4. Selects GHS hazard classifications:
   - Flammable Liquid
   - Eye Irritation
5. Enters PPE requirements: "Safety goggles, nitrile gloves"
6. Enters handling notes: "Store away from ignition sources"
7. Clicks "Save & Continue".
8. System creates chemical with internal code (CHM-XXX).
9. User is prompted to upload SDS.

**Postconditions:**
- Chemical appears in register with GHS pictograms.
- Chemical available for linking to incidents/actions.

**US-IDs:** US-CHEM-01, US-CHEM-02
**C-IDs:** C-200, C-201, C-202

---

### Journey P7-J2 - Safety Officer uploads SDS document

**Persona:** Manager / Safety Officer
**Trigger:** New SDS received from supplier or annual SDS review.

**Preconditions:**
- Chemical exists in register.
- User has SDS PDF document.

**Steps:**
1. User opens chemical detail page.
2. Clicks "+ Upload New SDS".
3. Modal opens.
4. User drags PDF file into dropzone (or clicks to browse).
5. Enters SDS version: "2.1"
6. Enters expiry date: 2 years from today.
7. Checks "Set as current SDS".
8. Clicks "Upload".
9. System uploads file, links to chemical, marks as current.
10. Previous SDS (if any) marked as superseded.

**Postconditions:**
- New SDS visible in chemical SDS list.
- Current SDS indicator shown.
- Download available for all users.

**US-IDs:** US-CHEM-03, US-CHEM-04
**C-IDs:** C-203, C-204

---

### Journey P7-J3 - Admin adds chemical storage location

**Persona:** Admin / Manager
**Trigger:** Chemical is stored at a new location.

**Preconditions:**
- Chemical exists in register.
- Site exists.

**Steps:**
1. User opens chemical detail page.
2. Clicks "Storage Locations" tab.
3. Clicks "+ Add Location".
4. Selects site: "Warehouse A".
5. Enters location name: "Flammables Cabinet 1".
6. Enters max storage: 50 L.
7. Enters storage conditions: "Below 25°C, away from heat".
8. Clicks "Add Location".
9. Records initial inventory: 25 L.

**Postconditions:**
- Storage location linked to chemical.
- Chemical appears when filtering by site.
- Inventory tracked.

**US-IDs:** US-CHEM-05
**C-IDs:** C-206, C-207

---

### Journey P7-J4 - Safety Officer links chemical to incident

**Persona:** Manager investigating incident
**Trigger:** Incident involved a chemical exposure or spill.

**Preconditions:**
- Incident exists (open or under investigation).
- Chemical exists in register.

**Steps:**
1. User opens incident detail page.
2. Clicks "Add Chemical Involvement".
3. Searches for chemical: "Acetone".
4. Selects from dropdown.
5. Selects involvement type: "Spill".
6. Adds notes: "Approximately 2L spilled during transfer".
7. Clicks "Link".

**Postconditions:**
- Chemical linked to incident.
- Chemical appears in incident detail.
- Incident appears in chemical's "Related Incidents" tab.

**US-IDs:** US-CHEM-06
**C-IDs:** C-210, C-211

---

### Journey P7-J5 - Worker creates permit request

**Persona:** Worker / Reporter
**Trigger:** Worker needs to perform hot work and requires permit.

**Preconditions:**
- User logged in with Reporter role or above.
- Permit types configured.
- Site exists.

**Steps:**
1. User navigates to Permits > "+ New Permit".
2. Selects permit type: "Hot Work".
3. Selects site: "Warehouse A".
4. Enters location: "Loading dock near Bay 3".
5. Enters work description: "Welding repair on loading ramp".
6. Clicks "Next".
7. Enters planned start: Today 08:00.
8. Enters planned end: Today 16:00.
9. Sets valid until: Today 17:00.
10. Adds workers:
    - Selects "John Welder" as Lead Welder.
    - Enters "Tom Helper" as Fire Watch (external).
11. Enters special precautions.
12. Clicks "Next".
13. Reviews and saves as Draft (or submits).

**Postconditions:**
- Permit created with auto-generated number (HW-WH1-YYYYMMDD-NNN).
- Status: draft or submitted.
- Pre-work controls loaded from permit type template.

**US-IDs:** US-PERMIT-01, US-PERMIT-02
**C-IDs:** C-215, C-216, C-217, C-218

---

### Journey P7-J6 - Supervisor approves permit request

**Persona:** Supervisor / Manager
**Trigger:** Permit submitted for approval.

**Preconditions:**
- Permit in "submitted" status.
- User has Supervisor role or above.

**Steps:**
1. Supervisor navigates to Permits (or receives notification).
2. Sees pending permits in "Submitted" section.
3. Opens permit detail.
4. Reviews:
   - Work description
   - Location
   - Workers
   - Planned times
   - Attachments (JSA)
5. Clicks "Approve".
6. Enters approval notes: "Approved with standard precautions".
7. Clicks "Confirm".

**Alternative - Reject:**
5b. Clicks "Reject".
6b. Enters reason: "Missing JSA document. Please attach and resubmit."
7b. Clicks "Confirm".

**Postconditions:**
- Status changes to "approved" (or "rejected").
- Requester notified.
- State history updated.

**US-IDs:** US-PERMIT-03, US-PERMIT-04
**C-IDs:** C-220, C-221

---

### Journey P7-J7 - Supervisor activates (issues) permit

**Persona:** Supervisor / Manager
**Trigger:** Approved permit ready for work to commence.

**Preconditions:**
- Permit in "approved" status.
- Pre-work controls completed by requester.

**Steps:**
1. Supervisor opens approved permit.
2. Reviews pre-work controls - all marked complete.
3. Clicks "Activate".
4. Confirms actual start time: 08:15.
5. Clicks "Issue Permit".
6. System validates all mandatory pre-work controls complete.
7. Permit status changes to "active".
8. Permit appears on Permit Board.

**Error Path:**
6b. If pre-work controls incomplete, error displayed.
7b. Supervisor cannot activate until controls complete.

**Postconditions:**
- Permit status: active.
- Issuer and timestamp recorded.
- Countdown timer starts on board.

**US-IDs:** US-PERMIT-05
**C-IDs:** C-222, C-223

---

### Journey P7-J8 - Worker completes permit controls

**Persona:** Worker / Permit holder
**Trigger:** During active work, controls need completion.

**Preconditions:**
- Permit is active.
- User is listed as worker on permit.

**Steps:**
1. Worker opens active permit on mobile/tablet.
2. Views "During-Work Controls" tab.
3. Clicks checkbox for "Fire watch maintained".
4. Optionally enters notes.
5. Control saved with worker name and timestamp.
6. Repeats for other controls as required.

**Postconditions:**
- Control marked complete with audit trail.
- Control progress visible to supervisor.

**US-IDs:** US-PERMIT-06
**C-IDs:** C-224

---

### Journey P7-J9 - Supervisor closes permit

**Persona:** Supervisor / Manager
**Trigger:** Work completed, permit ready to close.

**Preconditions:**
- Permit is active.
- Post-work controls completed.

**Steps:**
1. Supervisor opens active permit.
2. Verifies all post-work controls complete.
3. Clicks "Close Permit".
4. Enters closing notes: "Work completed without incident. Area cleared."
5. Enters actual end time: 15:30.
6. Clicks "Confirm Close".
7. System validates post-work controls.

**Error Path:**
7b. If post-work incomplete, error displayed.
8b. Cannot close until controls complete.

**Postconditions:**
- Status: closed.
- Removed from Permit Board.
- Available in historical permit list.

**US-IDs:** US-PERMIT-07
**C-IDs:** C-225, C-226

---

### Journey P7-J10 - Safety Officer monitors Permit Board

**Persona:** Safety Officer / Manager
**Trigger:** Real-time oversight of active permits.

**Preconditions:**
- Active permits exist.

**Steps:**
1. User navigates to Permits > Permit Board.
2. Views cards for all active permits.
3. Filters by site: "Warehouse A".
4. Sees:
   - Hot Work permit - green (5h remaining).
   - Confined Space - yellow warning (1h remaining).
5. Clicks on Confined Space card.
6. Views permit detail.
7. (Optional) Takes quick action: Suspend, View, Close.
8. Board auto-refreshes every 60 seconds.

**Postconditions:**
- Real-time visibility into active high-risk work.
- Expiring permits highlighted.

**US-IDs:** US-PERMIT-08
**C-IDs:** C-227, C-228

---

### Journey P7-J11 - Supervisor suspends and resumes permit

**Persona:** Supervisor
**Trigger:** Emergency or safety concern requires work stoppage.

**Preconditions:**
- Permit is active.

**Steps:**
1. Supervisor opens active permit (or uses board quick action).
2. Clicks "Suspend".
3. Enters reason: "Severe weather warning - lightning".
4. Clicks "Confirm".
5. Workers notified.
6. Permit shows as suspended on board.

**Later - Resume:**
7. Conditions improve.
8. Supervisor opens suspended permit.
9. Clicks "Resume".
10. Adds notes: "Weather cleared, work may continue".
11. Permit returns to active status.

**Postconditions:**
- Work stoppage recorded with reason.
- Resume time tracked.
- Full audit trail.

**US-IDs:** US-PERMIT-09
**C-IDs:** C-229

---

### Journey P7-J12 - System auto-expires permits

**Persona:** System (automated)
**Trigger:** Permit valid_until time passed.

**Preconditions:**
- Active permit exists.
- Current time > valid_until.

**Steps:**
1. Scheduled job runs every 5 minutes.
2. Queries active permits where valid_until < now.
3. For each expired permit:
   - Status changed to "expired".
   - State history entry added.
   - Notification sent to requester and supervisor.
4. Permit removed from active board.

**Postconditions:**
- Expired permits clearly marked.
- Supervisors alerted to work that overran.

**US-IDs:** US-PERMIT-10
**C-IDs:** C-230

---

### Journey P7-J13 - System detects permit conflicts

**Persona:** Worker creating permit
**Trigger:** Overlapping permit detected during creation.

**Preconditions:**
- Active permit exists at location.
- User creating new permit for same location/time.

**Steps:**
1. User enters permit details.
2. System checks for conflicts:
   - Same location keyword match.
   - Overlapping time range.
   - Incompatible permit types.
3. Warning displayed:
   - "Another Hot Work permit (HW-WH1-...) is active in Loading dock until 10:00."
4. User reviews warning.
5. User can:
   - Modify times to avoid overlap.
   - Proceed with warning acknowledged.
6. If proceeding, conflict noted in permit record.

**Postconditions:**
- User aware of concurrent work.
- Conflict recorded for audit.

**US-IDs:** US-PERMIT-11
**C-IDs:** C-231

---

### Journey P7-J14 - Admin configures custom permit type

**Persona:** Admin
**Trigger:** Organisation needs a permit type not in system defaults.

**Preconditions:**
- User has Admin role.

**Steps:**
1. Admin navigates to Admin > Permit Types.
2. Views system permit types (read-only).
3. Clicks "+ Add Custom Type".
4. Enters:
   - Name: "Roof Access"
   - Code: "ROOF"
   - Default duration: 4 hours
   - Max duration: 8 hours
   - Approval workflow: Single approval
5. Adds pre-work controls:
   - "Fall protection equipment inspected" (mandatory)
   - "Weather conditions verified" (mandatory)
6. Adds post-work controls:
   - "All equipment removed from roof"
7. Clicks "Save".

**Postconditions:**
- Custom permit type available for use.
- Controls populated when permit created.

**US-IDs:** US-PERMIT-12
**C-IDs:** C-232, C-233

---

### Journey P7-J15 - Link permit to incident

**Persona:** Manager investigating incident
**Trigger:** Incident occurred during permitted work.

**Preconditions:**
- Incident exists.
- Permit exists (active or closed).

**Steps:**
1. Manager opens incident detail.
2. Clicks "Link Permit".
3. Searches by permit number or date.
4. Selects permit: HW-WH1-20260204-001.
5. Adds notes: "Incident occurred during permitted hot work".
6. Saves.

**Postconditions:**
- Permit linked to incident.
- Visible in both incident and permit detail.
- Supports root cause analysis.

**US-IDs:** US-PERMIT-13
**C-IDs:** C-234

---

### Journey P7-J16 - View chemical analytics dashboard

**Persona:** Safety Manager
**Trigger:** Monthly safety review meeting.

**Preconditions:**
- Chemicals registered with incidents linked.

**Steps:**
1. User navigates to Analytics > Chemicals.
2. Views widgets:
   - Incidents by Chemical (top 10).
   - Incidents by GHS Hazard Class.
   - SDS Compliance (% with valid SDS).
3. Filters by date range and site.
4. Drills down into specific chemical.
5. Exports report.

**Postconditions:**
- Data-driven insights into chemical-related incidents.
- Supports prioritisation of controls.

**US-IDs:** US-CHEM-07
**C-IDs:** C-212, C-213

---

### Journey P7-J17 - Receive SDS expiry notification

**Persona:** Safety Officer
**Trigger:** SDS approaching expiry (30 days).

**Preconditions:**
- Chemical has SDS with expiry date.
- Current date = expiry - 30 days.

**Steps:**
1. Scheduled notification job runs.
2. Queries SDS expiring within 30 days.
3. Generates notification for responsible user.
4. User receives:
   - Email: "SDS for Acetone expires in 30 days".
   - In-app notification (bell icon).
5. User clicks notification.
6. Taken to chemical detail page.
7. User contacts supplier for updated SDS.
8. Uploads new SDS (Journey P7-J2).

**Postconditions:**
- Proactive SDS management.
- Compliance maintained.

**US-IDs:** US-CHEM-04
**C-IDs:** C-205

---

## 9. Phase 8 - Training & Competence Management

### Journey P8-J1 - Admin creates training course

**Persona:** Admin
**Trigger:** New training course needs to be added to catalogue.

**Preconditions:**
- Admin logged in.
- Training categories exist.

**Steps:**
1. Admin navigates to Training Catalogue.
2. Clicks "Add Course".
3. Fills in course details:
   - Code: FS-003
   - Title: Fire Warden Training
   - Category: Safety Training
   - Delivery Type: Classroom
   - Duration: 8 hours
   - Validity: 12 months
   - Passing Score: 80%
4. Adds prerequisites: FS-001 (mandatory).
5. Links refresher course: FS-004.
6. Uploads course materials.
7. Sets status to Active.
8. Saves.

**Postconditions:**
- Course available in catalogue.
- Can be assigned and scheduled.

**US-IDs:** US-TRAIN-01, US-TRAIN-02
**C-IDs:** C-200, C-201, C-202, C-203, C-207

---

### Journey P8-J2 - Admin schedules training session

**Persona:** Admin / Training Coordinator
**Trigger:** Need to schedule instructor-led training.

**Preconditions:**
- Course exists (e.g., FS-003 Fire Warden Training).
- Trainer available.

**Steps:**
1. Admin navigates to Training Sessions.
2. Clicks "Schedule Session".
3. Selects course: FS-003.
4. Enters session details:
   - Date: 2026-02-20
   - Time: 09:00-17:00
   - Location: HQ Training Room A
   - Trainer: John Trainer
   - Capacity: 15
5. Sets enrollment deadline: 2026-02-18.
6. Optionally pre-enrolls users with pending assignments.
7. Saves.

**Postconditions:**
- Session visible in calendar.
- Available for enrollment.
- Pre-enrolled users notified.

**US-IDs:** US-TRAIN-03
**C-IDs:** C-204

---

### Journey P8-J3 - Supervisor assigns training to team member

**Persona:** Supervisor
**Trigger:** Team member needs specific training.

**Preconditions:**
- Supervisor logged in.
- Course exists.
- Team member exists.

**Steps:**
1. Supervisor navigates to Assign Training.
2. Selects Individual tab.
3. Searches and selects user: Mary Johnson.
4. Selects course: FS-003 Fire Warden Training.
5. Sets due date: 2026-03-31.
6. Sets priority: Normal.
7. Adds notes: "Required for fire warden duties".
8. Clicks Assign.

**Postconditions:**
- Assignment created.
- Mary receives notification.
- Assignment visible in Mary's My Training.

**US-IDs:** US-TRAIN-06
**C-IDs:** C-210, C-211

---

### Journey P8-J4 - Trainer records session attendance

**Persona:** Trainer
**Trigger:** Training session completed.

**Preconditions:**
- Session scheduled.
- Participants enrolled.
- Session date reached.

**Steps:**
1. Trainer navigates to session detail.
2. Clicks "Record Attendance".
3. For each participant:
   - Marks attendance: Attended/Absent/Partial.
   - For attended: enters result (Pass/Fail) and score.
4. Saves attendance.
5. Marks session as Complete.

**Postconditions:**
- Attendance recorded.
- Completions auto-created for passed participants.
- Related assignments marked complete.
- Expiry dates calculated.
- Participants notified of completion.

**US-IDs:** US-TRAIN-05
**C-IDs:** C-208, C-209

---

### Journey P8-J5 - Worker self-enrolls in session

**Persona:** Worker
**Trigger:** Worker has training assignment and wants to book a session.

**Preconditions:**
- Worker has assignment for course.
- Course allows self-enrollment.
- Sessions with capacity exist.

**Steps:**
1. Worker navigates to My Training.
2. Views assignment: FS-003 Fire Warden Training, due 31 Mar.
3. Clicks "Book Session".
4. Sees available sessions in dropdown.
5. Selects: 20 Feb 2026, 09:00-17:00, Training Room A.
6. Clicks Confirm.

**Postconditions:**
- Worker enrolled in session.
- Appears in Upcoming Sessions.
- Enrollment notification received.

**US-IDs:** US-TRAIN-11
**C-IDs:** C-206, C-219

---

### Journey P8-J6 - Admin bulk assigns training by role

**Persona:** Admin
**Trigger:** All Site Supervisors need specific training.

**Preconditions:**
- Course exists.
- Users with role exist.

**Steps:**
1. Admin navigates to Assign Training.
2. Selects "By Role" tab.
3. Selects role: Site Supervisor.
4. Selects course: CS-001 Confined Space Entry.
5. Sets due date: 30 days from assignment.
6. Checks "Create auto-assignment rule".
7. Previews: 12 users will receive assignment.
8. Clicks Assign.

**Postconditions:**
- 12 assignments created.
- Users notified.
- Auto-assignment rule active for future supervisors.

**US-IDs:** US-TRAIN-07, US-TRAIN-08
**C-IDs:** C-212, C-214

---

### Journey P8-J7 - System auto-assigns training to new employee

**Persona:** System
**Trigger:** New user joins with matching role.

**Preconditions:**
- Auto-assignment rules exist.
- New user created with role.

**Steps:**
1. Admin creates new user: Peter New, role: Site Supervisor.
2. Auto-Assignment Job runs (02:00 UTC).
3. Job finds rules matching Site Supervisor role.
4. Job creates assignments for each matching rule.
5. Peter notified of new assignments.

**Postconditions:**
- Peter has all role-required training assigned.
- Assignments visible in his My Training.

**US-IDs:** US-TRAIN-08
**C-IDs:** C-214

---

### Journey P8-J8 - Supervisor records external training

**Persona:** Supervisor
**Trigger:** Team member completed training with external provider.

**Preconditions:**
- User completed external training.
- Certificate received.

**Steps:**
1. Supervisor navigates to Record Completions.
2. Selects "External Training" tab.
3. Selects user: John Smith.
4. Selects course: FA-001 First Aid.
5. Enters details:
   - Provider: St John Ambulance
   - Trainer: External Instructor
   - Date: 2026-02-01
   - Certificate Number: SJA-12345
6. Uploads certificate PDF.
7. Submits.

**Postconditions:**
- Completion recorded as pending verification.
- Admin notified of pending verification.
- Evidence attached.

**US-IDs:** US-TRAIN-10
**C-IDs:** C-216, C-217, C-218

---

### Journey P8-J9 - Admin verifies external completion

**Persona:** Admin
**Trigger:** External training submission pending verification.

**Preconditions:**
- External completion submitted.
- Evidence attached.

**Steps:**
1. Admin sees notification: "External training pending verification".
2. Opens verification queue.
3. Reviews submission:
   - Views certificate.
   - Checks provider legitimacy.
4. Clicks "Verify".
5. Adds notes: "Certificate verified with provider".

**Postconditions:**
- Completion verified.
- Counts toward compliance.
- User notified.

**US-IDs:** US-TRAIN-10
**C-IDs:** C-217

---

### Journey P8-J10 - Worker views My Training dashboard

**Persona:** Worker
**Trigger:** Worker wants to check training status.

**Preconditions:**
- Worker logged in.
- Has assignments and completions.

**Steps:**
1. Worker navigates to My Training.
2. Views summary cards:
   - 3 Assigned
   - 1 Overdue
   - 2 Expiring Soon
   - 8 Completed This Year
3. Reviews assignments list.
4. Views upcoming enrolled sessions.
5. Checks expiring certifications.
6. Downloads training history as PDF.

**Postconditions:**
- Worker informed of training status.
- Can take action on overdue/expiring items.

**US-IDs:** US-TRAIN-11
**C-IDs:** C-219, C-220

---

### Journey P8-J11 - Manager views training matrix

**Persona:** Manager
**Trigger:** Need to assess team competency.

**Preconditions:**
- Team members have training data.
- Courses configured.

**Steps:**
1. Manager navigates to Training Matrix.
2. Filters by their site.
3. Views grid: users vs. courses.
4. Sees status indicators:
   - ✅ Completed
   - ⚠️ Expiring Soon
   - 🔴 Overdue
   - 📋 Assigned
5. Clicks cell to see details and actions.
6. Exports matrix to Excel.

**Postconditions:**
- Manager has visibility of team competency.
- Can identify and address gaps.

**US-IDs:** US-TRAIN-12
**C-IDs:** C-220, C-222

---

### Journey P8-J12 - Manager identifies training gaps

**Persona:** Manager
**Trigger:** Pre-audit compliance check.

**Preconditions:**
- Role requirements configured.
- Team data exists.

**Steps:**
1. Manager navigates to Training Matrix.
2. Clicks "Gaps Only" filter.
3. Views users with missing/expired training.
4. For each gap:
   - Clicks cell.
   - Views recommended action.
   - Clicks "Assign Training".
5. Reviews gap summary statistics.

**Postconditions:**
- All training gaps identified.
- Assignments created for gaps.
- Compliance improving.

**US-IDs:** US-TRAIN-13
**C-IDs:** C-221

---

### Journey P8-J13 - Admin configures role requirements

**Persona:** Admin
**Trigger:** Need to define mandatory training for role.

**Preconditions:**
- Courses exist.
- Roles defined.

**Steps:**
1. Admin navigates to Training Settings > Role Requirements.
2. Selects role: Site Supervisor.
3. Adds required courses:
   - FS-001 Fire Safety (Mandatory)
   - CS-001 Confined Space (Mandatory)
   - FA-001 First Aid (Mandatory)
   - MGT-001 Supervisor Skills (Optional)
4. Saves.

**Postconditions:**
- Requirements saved.
- Gap analysis uses requirements.
- Matrix shows compliance status.

**US-IDs:** US-TRAIN-14
**C-IDs:** C-223, C-224

---

### Journey P8-J14 - Manager generates compliance report

**Persona:** Manager
**Trigger:** Monthly compliance review.

**Preconditions:**
- Training data exists.

**Steps:**
1. Manager navigates to Training Reports.
2. Selects "Compliance Overview Report".
3. Filters by their site.
4. Clicks Generate.
5. Downloads PDF with:
   - Overall compliance rate: 85%.
   - Compliance by role.
   - Overdue list.
   - Expiring list (next 30 days).
6. Shares with stakeholders.

**Postconditions:**
- Compliance documented.
- Evidence for audits.

**US-IDs:** US-TRAIN-15
**C-IDs:** C-225, C-226

---

### Journey P8-J15 - System sends expiry notifications

**Persona:** System
**Trigger:** Training expiry approaching.

**Preconditions:**
- User has completion expiring within threshold.
- Notification job scheduled.

**Steps:**
1. Expiry Check Job runs (01:00 UTC).
2. Finds completions expiring in 30 days.
3. For each:
   - Generates in-app notification.
   - Sends email if configured.
4. User receives notification:
   - "Your First Aid certification expires in 30 days".
5. User clicks notification.
6. Taken to My Training.
7. Books refresher session.

**Postconditions:**
- User proactively renews certification.
- Compliance maintained.

**US-IDs:** US-TRAIN-16, US-TRAIN-17
**C-IDs:** C-215, C-227, C-229

---

### Journey P8-J16 - Action links to training course

**Persona:** Manager investigating incident
**Trigger:** Root cause analysis recommends training.

**Preconditions:**
- Incident investigated.
- Action created.
- Training course exists.

**Steps:**
1. Manager opens action from incident.
2. Edits action.
3. Links training course: FS-001 Fire Safety Awareness.
4. Assigns to responsible person.
5. Saves.
6. Responsible person receives notification.
7. Completes training.
8. Completion updates action progress.

**Postconditions:**
- Training linked to corrective action.
- Completion tracked against action.
- Full traceability maintained.

**US-IDs:** US-TRAIN-18
**C-IDs:** C-230

---

## 10. Phase 9 - Risk Register & Enterprise Risk Management

### Journey P9-J1 - Manager creates a new risk

**Persona:** Manager
**Trigger:** Risk assessment identifies new hazard requiring formal registration.

**Preconditions:**
- User logged in as Manager.
- Risk categories configured.
- Sites exist.

**Steps:**
1. Manager navigates to Risk Register > Add Risk.
2. Completes Step 1 - Basic Information:
   - Title
   - Description
   - Category
   - Source (risk assessment, audit, incident, external)
   - Site(s)
   - Owner
3. Completes Step 2 - Hazard Information:
   - Hazard description
   - Potential causes
   - Potential consequences
4. Completes Step 3 - Risk Scoring:
   - Inherent likelihood (1-5)
   - Inherent impact (1-5)
   - System calculates inherent score and level
   - Optionally sets residual scores
   - Review frequency
5. Submits as Open status.
6. System generates unique reference (RISK-2026-0001).
7. If Extreme level, system notifies Admins.
8. Manager redirected to risk detail page.

**Postconditions:**
- Risk created in register.
- Visible in heatmap.
- Review date scheduled.
- Audit log entry created.

**US-IDs:** US-RISK-01, US-RISK-02, US-RISK-03
**C-IDs:** C-240, C-241, C-244, C-245

---

### Journey P9-J2 - Manager adds controls and links entities

**Persona:** Manager
**Trigger:** Risk requires documented controls and related entities.

**Preconditions:**
- Risk exists in Open or Treating status.
- Manager owns the risk.
- Related entities exist (actions, training, incidents).

**Steps:**
1. Manager opens risk detail page.
2. Navigates to Controls tab.
3. Clicks Add Control.
4. Enters control details:
   - Description
   - Type (preventive/detective/corrective)
   - Hierarchy (elimination/substitution/engineering/admin/PPE)
   - Effectiveness
   - Owner
5. Optionally links control to:
   - Existing action
   - Training course
   - Permit
6. Saves control.
7. Navigates to Links tab.
8. Links risk to related entities:
   - Incident that triggered the risk
   - Inspection that identified it
   - Action for remediation
9. Updates residual scores based on controls.
10. Changes status to Treating if appropriate.

**Postconditions:**
- Controls documented with hierarchy.
- Entities linked for traceability.
- Residual score reflects controls.
- Status reflects treatment progress.

**US-IDs:** US-RISK-05, US-RISK-06, US-RISK-07
**C-IDs:** C-246, C-247, C-248, C-249

---

### Journey P9-J3 - Manager records risk review

**Persona:** Manager (Risk Owner)
**Trigger:** Review reminder notification received; next review date approaching.

**Preconditions:**
- Risk exists.
- Review due or overdue.
- User is risk owner.

**Steps:**
1. Manager receives review reminder notification.
2. Opens risk from notification link.
3. Clicks Record Review button.
4. Reviews current state:
   - Verifies each control effectiveness
   - Updates control verification dates
   - Notes any issues
5. Re-assesses residual scores:
   - Adjusts likelihood if changed
   - Adjusts impact if changed
6. Selects review outcome:
   - No change
   - Improved
   - Deteriorated
   - Recommend close
7. Enters review notes.
8. Submits review.
9. System:
   - Snapshots current scores
   - Updates residual scores
   - Calculates next review date
   - Creates review history entry
10. If recommend close, notification sent to Admin.

**Postconditions:**
- Review recorded with snapshot.
- Scores updated.
- Next review scheduled.
- History preserved.

**US-IDs:** US-RISK-08, US-RISK-09
**C-IDs:** C-250, C-251, C-254

---

### Journey P9-J4 - Manager analyses risk heatmap

**Persona:** Manager / Compliance Lead
**Trigger:** Need to understand risk profile for management review.

**Preconditions:**
- Risks exist with residual scores.
- User has Manager+ role.

**Steps:**
1. User navigates to Risk Register > Heatmap.
2. Views 5×5 risk matrix:
   - Likelihood on Y-axis (1-5)
   - Impact on X-axis (1-5)
   - Cells colour-coded by level
   - Cell contains risk count
3. Toggles between Inherent and Residual view.
4. Applies filters:
   - By category
   - By site
5. Clicks on cell (e.g., L=4, I=4).
6. Drill-down panel shows risks at that coordinate.
7. Clicks risk to navigate to detail.
8. Returns to heatmap for further analysis.
9. Exports heatmap image for reporting.

**Postconditions:**
- User understands risk distribution.
- Identified high-risk areas.
- Export available for presentations.

**US-IDs:** US-RISK-10, US-RISK-11
**C-IDs:** C-252, C-253, C-256

---

### Journey P9-J5 - Admin configures risk settings

**Persona:** Admin
**Trigger:** Organisation needs to customise scoring criteria and tolerances.

**Preconditions:**
- User is Admin.
- Risk module active.

**Steps:**
1. Admin navigates to Risk Settings.
2. Views Scoring Matrix tab:
   - Likelihood labels and descriptions
   - Impact labels and descriptions
   - Level thresholds (1-4 Low, 5-9 Medium, etc.)
3. Edits labels to match organisation terminology.
4. Saves scoring matrix.
5. Views Tolerance tab:
   - Acceptable level
   - Tolerable level
   - Escalation thresholds
6. Configures tolerance to Medium.
7. Saves tolerances.
8. Views Categories tab.
9. Adds new category "Cyber Security" with colour.
10. Saves category.

**Postconditions:**
- Scoring criteria customised.
- Tolerance thresholds set.
- New category available.
- Future risks use updated settings.

**US-IDs:** US-RISK-12, US-RISK-13
**C-IDs:** C-257, C-260

---

### Journey P9-J6 - Manager exports risk register for audit

**Persona:** Manager / Compliance Lead
**Trigger:** External audit requires risk register documentation.

**Preconditions:**
- Risks exist.
- User has Manager+ role.

**Steps:**
1. Manager navigates to Risk Register.
2. Applies any required filters (e.g., Active risks only).
3. Clicks Export button.
4. Selects format: Excel.
5. Configures options:
   - Include controls: Yes
   - Include links: Yes
   - Include review history: Yes
   - Include heatmap: Yes
6. Clicks Generate Export.
7. System generates Excel file:
   - Sheet 1: Risk summary
   - Sheet 2: Risk details
   - Sheet 3: Controls
   - Sheet 4: Links
   - Sheet 5: Heatmap summary
8. File downloads.
9. Audit log records export action.

**Postconditions:**
- Export file generated.
- Complete audit trail.
- Document suitable for external audit.

**US-IDs:** US-RISK-14, US-RISK-15
**C-IDs:** C-256

---

## 11. Phase 10 - Integrations, SSO & External Connectivity

### Journey P10-J1 - Admin configures SSO provider

**Persona:** Admin
**Trigger:** Organisation wants to enable Single Sign-On for users.

**Preconditions:**
- User has Admin role with manage_integrations permission.
- Identity Provider (IdP) is configured with EHS as a client app.
- IdP client credentials available.

**Steps:**
1. Admin navigates to Settings → Integrations.
2. Clicks SSO tab.
3. Clicks "Configure SSO" button.
4. Step 1 - Provider Details:
   - Enters provider name (e.g., "Azure AD").
   - Selects provider type: Azure AD.
   - Enters email domain (e.g., "@company.com").
   - Optionally uploads logo.
5. Clicks Next.
6. Step 2 - OIDC Configuration:
   - Enters Issuer URL (discovery endpoint).
   - Enters Client ID from IdP.
   - Enters Client Secret from IdP.
   - Specifies additional scopes if needed.
7. Clicks Next.
8. Step 3 - Role Mappings:
   - Adds mapping: IdP group "EHS-Admins" → EHS role "Admin", priority 100.
   - Adds mapping: IdP group "EHS-Managers" → EHS role "Manager", priority 50.
   - Adds mapping: IdP group "All-Staff" → EHS role "Worker", priority 0.
   - Sets default role: Worker.
9. Clicks Save.
10. System validates configuration by fetching IdP discovery document.
11. Provider created in "draft" status.
12. Admin clicks "Test Connection".
13. System performs test authentication flow (admin login required).
14. On success, Admin activates the provider.

**Postconditions:**
- SSO provider active for organisation.
- Login page shows "Sign in with Azure AD" button.
- Users with @company.com email can use SSO.
- Role mappings applied on SSO login.

**US-IDs:** US-SSO-01, US-SSO-02, US-SSO-03
**C-IDs:** C-270, C-273, C-274

---

### Journey P10-J2 - User logs in via SSO

**Persona:** Worker / Manager
**Trigger:** User wants to log into EHS Portal using corporate credentials.

**Preconditions:**
- SSO provider configured and active for organisation.
- User has account in corporate IdP.
- User email matches configured domain.

**Steps:**
1. User navigates to EHS Portal login page.
2. Enters email address.
3. System detects SSO domain on email blur.
4. "Sign in with [Provider Name]" button appears.
5. User clicks SSO button.
6. Frontend calls GET /auth/sso/init?email={email}.
7. Backend generates authorization URL with:
   - client_id, redirect_uri, scope
   - state (CSRF protection)
   - nonce (replay protection)
   - code_challenge (PKCE)
8. User redirected to IdP login page.
9. User authenticates with IdP (username/password, MFA if configured).
10. IdP redirects to /auth/sso/callback with code and state.
11. Backend:
    - Validates state parameter.
    - Exchanges code for tokens.
    - Validates ID token signature and nonce.
    - Extracts user claims (sub, email, name, groups).
    - Looks up or creates user (JIT provisioning).
    - Maps IdP groups to EHS role.
    - Creates EHS session and JWT.
12. User redirected to dashboard with valid session.
13. Login attempt recorded in sso_login_attempts.

**Postconditions:**
- User authenticated and on dashboard.
- User record exists (created if first login).
- Role assigned based on IdP groups.
- Session active for API calls.
- Audit log entry for SSO login.

**US-IDs:** US-SSO-04, US-SSO-05, US-SSO-06
**C-IDs:** C-271, C-272, C-296, C-297

---

### Journey P10-J3 - Admin creates API client for integration

**Persona:** Admin
**Trigger:** External system needs API access to EHS data.

**Preconditions:**
- User has Admin role with manage_integrations permission.
- External system ready to integrate.

**Steps:**
1. Admin navigates to Settings → Integrations.
2. Clicks API Clients tab.
3. Views list of existing API clients (if any).
4. Clicks "Create API Client" button.
5. Modal opens:
   - Enters name: "HR System Integration".
   - Enters description: "Sync user data and incident notifications".
   - Selects scopes: users:read, incidents:read.
   - Selects rate limit tier: Standard (1000 req/hour).
   - Optionally enters IP allowlist: 10.0.0.0/8.
   - Optionally sets expiration date.
6. Clicks Create.
7. Backend:
   - Generates secure API key (32+ characters).
   - Hashes key with bcrypt.
   - Stores client with hashed key.
   - Returns plaintext key (one-time only).
8. Modal shows API key with:
   - Warning: "This key will only be shown once".
   - Copy button.
   - Instructions for use.
9. Admin copies key and acknowledges.
10. Modal closes.
11. API client appears in list with status "Active".
12. Integration event logged.

**Postconditions:**
- API client created with specified scopes.
- API key generated (plaintext known to admin only).
- Only hash stored in database.
- External system can authenticate with key.
- Requests limited to allowed scopes.

**US-IDs:** US-API-01, US-API-02, US-API-03
**C-IDs:** C-276, C-277, C-278, C-279, C-280

---

### Journey P10-J4 - Admin configures webhook for notifications

**Persona:** Admin
**Trigger:** Organisation wants Teams notifications for safety incidents.

**Preconditions:**
- User has Admin role with manage_integrations permission.
- Teams incoming webhook URL available.

**Steps:**
1. Admin navigates to Settings → Integrations.
2. Clicks Webhooks tab.
3. Clicks "Create Webhook" button.
4. Modal opens:
   - Enters name: "Teams Safety Alerts".
   - Enters URL: Teams incoming webhook URL.
   - Selects content type: Microsoft Teams.
   - Selects event types:
     - incident.created
     - incident.severity_changed (when severity is critical)
   - Enables active toggle.
5. Clicks Create.
6. Backend:
   - Creates webhook configuration.
   - Generates signing secret.
   - Returns webhook ID.
7. Webhook appears in list as "Active".
8. Admin clicks "Test" button.
9. System sends test event to webhook URL.
10. Teams channel receives Adaptive Card notification.
11. Test result displayed (success/failure).

**Postconditions:**
- Webhook configured for incident events.
- Teams channel receives safety incident alerts.
- All deliveries signed with HMAC.
- Failed deliveries retried automatically.
- Webhook auto-suspended if failures exceed threshold.

**US-IDs:** US-WEBHOOK-01, US-WEBHOOK-02, US-WEBHOOK-03
**C-IDs:** C-283, C-284, C-285, C-286, C-287, C-288, C-289

# User Stories - EHS Portal

This document defines epics and user stories for the EHS Portal, across Phases 1-5.

Each story includes:
- Story ID
- Role-based description
- Phase
- Related user journey(s)
- Related checklist items (C-IDs)
- Acceptance criteria (ATDD style)

---

## 1. Epics Overview

- **E1 - Authentication & Session Management** (Phase 1)
- **E2 - Site & Reference Data Management** (Phase 1)
- **E3 - Incident Management** (Phase 1-2)
- **E4 - Inspection Templates & Inspections** (Phase 1-2)
- **E5 - Dashboard & Reporting** (Phase 1-4)
- **E6 - Actions / CAPA & Audit Logging** (Phase 2)
- **E7 - Attachments / Evidence** (Phase 2)
- **E8 - Organisation & Multi-Tenancy** (Phase 3)
- **E9 - Notifications & Escalations** (Phase 4)
- **E10 - Analytics & Insights** (Phase 5)
- **E11 - Help & Support** (Phase 2)
- **E12 - Future Capabilities** (Phase 5+: Risk Register, SSO, External Integrations)

---

## 2. Epic E1 - Authentication & Session Management (Phase 1)

### Story US-AUTH-01 - User logs in

- **As a** registered user
- **I want** to log into the portal using my email and password
- **So that** I can securely access my EHS data

- **Phase:** P1
- **Related journey(s):** P1-J1
- **Related checklist IDs:** C34, C35 (passwords hashed, JWT auth)  
- **Acceptance criteria (ATDD):**
  1. **Valid credentials**
     - Given I am a registered user with a valid email and password  
       When I enter my credentials and click Login  
       Then I am authenticated and redirected to the dashboard  
       And my session token is stored securely for subsequent requests
  2. **Invalid credentials**
     - Given I am not providing valid credentials  
       When I enter an incorrect password and click Login  
       Then I see a clear error message  
       And I am not logged in  
  3. **Protected routes**
     - Given I am not logged in  
       When I try to access a protected page (e.g. /incidents) directly  
       Then I am redirected to the login page

---

### Story US-AUTH-02 - System identifies user role

- **As a** logged-in user
- **I want** the system to know my role (worker, manager, admin)
- **So that** my permissions and navigation are appropriate

- **Phase:** P1
- **Related journey(s):** P1-J1, P1-J2, P1-J4, P1-J5
- **Related checklist IDs:** C36, C37, C38, C39 (roles, admin routes protected, worker/manager permissions)  
- **Acceptance criteria:**
  1. **Role returned on login**
     - Given I log in successfully  
       When the backend returns my user data  
       Then the response includes my role  
       And the frontend stores it for access control
  2. **Role-based UI**
     - Given I am a worker  
       When I log in  
       Then I do not see admin-only navigation items (e.g. Site management, Incident Types, Template management)
  3. **Protected APIs**
     - Given I am a worker  
       When I call an admin-only API (e.g. create site)  
       Then the system denies access with a 403 or similar error

---

## 3. Epic E2 - Site & Reference Data Management (Phase 1)

### Story US-SITE-01 - Admin manages sites

- **As an** admin  
- **I want** to create and edit site records  
- **So that** incidents and inspections are always linked to valid locations

- **Phase:** P1  
- **Related journey(s):** P1-J4  
- **Related checklist IDs:** C16, C17, C18, C19  
- **Acceptance criteria:**
  1. **Create site**
     - Given I am an admin  
       When I open the Sites page and click Add Site  
       And I enter a name (and optional code)  
       Then the site is saved  
       And it appears in the site list and incident/inspection forms
  2. **Edit site**
     - Given I am an admin and a site exists  
       When I edit the site name or code and save  
       Then the updated values appear in the site list and forms  
  3. **Validation**
     - Given I try to create a site with a duplicate site code  
       Then I see a clear validation error and the site is not created

---

### Story US-REF-01 - System provides incident types

- **As a** system or admin
- **I want** standard incident types to be available (Injury, Near Miss, etc.)
- **So that** incidents are categorised consistently

- **Phase:** P1
- **Related journey(s):** P1-J2
- **Related checklist IDs:** C6, C7, C19 (incident types configurable, seeded)
- **Acceptance criteria:**
  1. **Seed data**
     - Given the database is initialised
       When the application starts
       Then default incident types (e.g. Injury, Near Miss, Property Damage) are available
  2. **Retrieve types**
     - Given I am any logged-in user
       When I open the new incident form
       Then I can select from available incident types via API `/incident-types`

---

### Story US-REF-02 - Admin manages incident types

- **As an** admin
- **I want** to add, edit, and deactivate incident types
- **So that** the organisation can customise the types without requiring a code change

- **Phase:** P1
- **Related journey(s):** P1-J4
- **Related checklist IDs:** C6, C19 (incident types configurable by admin, extensible)
- **Acceptance criteria:**
  1. **Create incident type**
     - Given I am an admin
       When I open the Incident Types management page and click "Add Type"
       And I enter a name (and optional description)
       Then the type is saved
       And it appears in the incident type list and incident forms
  2. **Edit incident type**
     - Given I am an admin and an incident type exists
       When I edit the name or description and save
       Then the updated values appear in the type list and forms
  3. **Deactivate incident type**
     - Given I am an admin and an incident type exists
       When I deactivate the type
       Then it no longer appears in incident forms for new incidents
       And historical incidents retain the type reference
  4. **Validation**
     - Given I try to create a type with a duplicate name
       Then I see a clear validation error and the type is not created

---

## 4. Epic E3 - Incident Management (Phase 1-2)

### Story US-INC-01 - Worker creates incident

- **As a** worker  
- **I want** to create an incident record with essential details  
- **So that** the event is captured for follow-up

- **Phase:** P1  
- **Related journey(s):** P1-J2  
- **Related checklist IDs:** C1, C7  
- **Acceptance criteria:**
  1. **Successful creation**
     - Given I am logged in as a worker  
       When I fill in all required fields (title, site, type, severity, date/time, description)  
       And I submit the form  
       Then a new incident is created with status `open`  
       And it appears in the incident list
  2. **Validation**
     - Given I omit a required field (e.g. title)  
       When I submit the form  
       Then I see a clear validation message  
       And the incident is not created
  3. **Audit fields**
     - Given an incident is created  
       Then it is stored with the reporters user ID and timestamps

---

### Story US-INC-02 - User views incident list and filters

- **As a** manager or worker  
- **I want** to view and filter incident records  
- **So that** I can focus on the incidents relevant to me

- **Phase:** P1  
- **Related journey(s):** P1-J2, P1-J3, P1-J7  
- **Related checklist IDs:** C2, C3, C4  
- **Acceptance criteria:**
  1. **List view**
     - Given incidents exist  
       When I open the Incidents page  
       Then I see a table with columns: Date, Title, Type, Site, Severity, Status
  2. **Filter by status**
     - Given incidents with different statuses exist  
       When I filter by `open`  
       Then only open incidents are shown
  3. **Filter by site**
     - Given incidents for multiple sites exist  
       When I filter by a specific site  
       Then only incidents from that site are shown
  4. **Open details**
     - Given I see an incident in the list  
       When I click the incident row  
       Then I see the full incident detail

---

### Story US-INC-03 - Manager updates incident status

- **As a** manager  
- **I want** to change the status of an incident  
- **So that** investigation and closure progress is tracked

- **Phase:** P1  
- **Related journey(s):** P1-J3  
- **Related checklist IDs:** C4, C5  
- **Acceptance criteria:**
  1. **Status transition**
     - Given I am a manager  
       When I open an incident detail  
       And change status from `open` to `under_investigation` or `closed`  
       Then the new status is saved  
       And visible in the list and dashboard
  2. **Unauthorized update**
     - Given I am a worker  
       When I try to change an incident status  
       Then the system prevents the change (UI or backend enforcement)

---

## 5. Epic E4 - Inspection Templates & Inspections (Phase 1-2)

### Story US-INSP-01 - Admin defines inspection templates

- **As an** admin  
- **I want** to define inspection templates and items  
- **So that** inspections follow a consistent structure

- **Phase:** P1  
- **Related journey(s):** P1-J5  
- **Related checklist IDs:** C8, C9, C10, C11  
- **Acceptance criteria:**
  1. **Create template**
     - Given I am an admin  
       When I create a new inspection template with name and description  
       Then it appears in the templates list
  2. **Manage items**
     - Given a template exists  
       When I add items with labels (and optional category)  
       Then they are associated with that template in order
  3. **Edit/delete items**
     - Given template items exist  
       When I edit or delete an item  
       Then the change is reflected in the template and subsequent inspections

---

### Story US-INSP-02 - Manager performs an inspection

- **As a** manager  
- **I want** to perform inspections using templates  
- **So that** I can record findings consistently across sites

- **Phase:** P1  
- **Related journey(s):** P1-J6  
- **Related checklist IDs:** C10, C11, C12, C13  
- **Acceptance criteria:**
  1. **Checklist generated**
     - Given at least one template and site exist  
       When I create a new inspection and select site + template  
       Then the system shows all checklist items from the template
  2. **Record results**
     - Given I am filling an inspection  
       When I set each item result to `ok`, `not_ok`, or `na` and add comments where needed  
       Then these results are saved on submit
  3. **Overall result logic**
     - Given at least one item has result `not_ok`  
       When I submit the inspection  
       Then the inspection `overall_result` is set to `fail`  
       Otherwise, it is set to `pass`

---

### Story US-INSP-03 - User views inspection history

- **As a** manager or admin  
- **I want** to view past inspections and their results  
- **So that** I can see patterns and track compliance

- **Phase:** P1  
- **Related journey(s):** P1-J6, P1-J7  
- **Related checklist IDs:** C14, C15  
- **Acceptance criteria:**
  1. **Inspection list**
     - Given inspections exist  
       When I open the Inspections page  
       Then I see a table with Template, Site, Performed By, Date, Overall Result
  2. **Detail view**
     - Given I click an inspection row  
       When I open the detail view  
       Then I see header info and a full list of item results and comments

---

## 6. Epic E5 - Dashboard & Reporting (Phase 1-4)

### Story US-DASH-01 - User views KPIs and trends

- **As a** manager or admin
- **I want** to see high-level KPIs and trends on a dashboard
- **So that** I can quickly understand safety performance

- **Phase:** P1
- **Related journey(s):** P1-J1, P1-J7
- **Related checklist IDs:** C47, C48, C49, C50, C51, C52, C53, C54, C55 (dashboard KPIs, visuals, tables)  
- **Acceptance criteria:**
  1. **KPI cards**
     - Given incidents and inspections exist  
       When I open the dashboard  
       Then I see KPI cards for:
         - Total incidents
         - Open incidents
         - Incidents last 30 days
         - Inspections last 30 days
         - Failed inspections last 30 days
  2. **Charts**
     - Given there is incident data over multiple months  
       When I open the dashboard  
       Then I see:
         - A bar chart of incidents by type  
         - A line chart of incidents by severity over time
  3. **Recent lists**
     - Given incidents and inspections exist  
       When I open the dashboard  
       Then I see tables of recent incidents and recent inspections  
       And I can click through to details

---

### Story US-EXPORT-01 - Manager exports data

- **As a** manager  
- **I want** to export incidents, inspections, and actions to CSV/Excel  
- **So that** I can perform deeper analysis outside the portal

- **Phase:** P3  
- **Related journey(s):** P3-J2  
- **Related checklist IDs:** C40, C41, C42  
- **Acceptance criteria:**
  1. **Filtered export**
     - Given I apply filters (e.g. date range, site, status) on incidents  
       When I click Export  
       Then I receive a file containing records that match those filters
  2. **Consistency**
     - Given I export and then open the file  
       Then the columns and values match what I see on screen

---

## 7. Epic E6 - Actions / CAPA & Audit Logging (Phase 2)

### Story US-ACT-01 - Manager creates actions from an incident

- **As a** manager  
- **I want** to create action items from an incident  
- **So that** follow-up tasks are assigned and tracked

- **Phase:** P2  
- **Related journey(s):** P2-J1  
- **Related checklist IDs:** C20, C22, C23, C43  
- **Acceptance criteria:**
  1. **Create action**
     - Given I am a manager or admin viewing an incident detail  
       When I create an action with title, description, assignee, and due date  
       Then the action is saved with sourceType = incident and status = open
  2. **Single assignee**
     - Given I create an action  
       Then exactly one assignee is stored for the action
  3. **Audit record**
     - Given the action is created  
       Then an audit log entry is recorded for the action create event
  4. **Validation**
     - Given I submit missing required fields  
       Then the action is not created and I see validation errors

---

### Story US-ACT-02 - Manager creates actions from failed inspection items

- **As a** manager or admin  
- **I want** to create action items from failed inspection checklist items  
- **So that** remediation is tracked for inspection findings

- **Phase:** P2  
- **Related journey(s):** P2-J2  
- **Related checklist IDs:** C21, C22, C23, C43  
- **Acceptance criteria:**
  1. **Create from inspection**
     - Given I am viewing an inspection detail with failed items  
       When I create an action from a failed item  
       Then the action is linked to the inspection and the response item
  2. **Single assignee**
     - Given I create an action  
       Then exactly one assignee is stored for the action
  3. **Audit record**
     - Given the action is created  
       Then an audit log entry is recorded for the action create event
  4. **Validation**
     - Given I submit an action without a valid assignee  
       Then the action is not created and I see validation errors

---

### Story US-ACT-03 - Worker manages assigned actions (My Actions)

- **As a** worker  
- **I want** to view and update my assigned actions  
- **So that** I can complete tasks and keep status current

- **Phase:** P2  
- **Related journey(s):** P2-J3  
- **Related checklist IDs:** C23, C24, C25  
- **Acceptance criteria:**
  1. **My Actions list**
     - Given actions are assigned to me  
       When I open Actions -> My Actions  
       Then I see my actions with status and due dates
  2. **Update status**
     - Given I am assigned to an action  
       When I change its status to in_progress or done  
       Then the status is saved and visible in the list
  3. **Overdue status**
     - Given an action assigned to me is past due and not done  
       Then it appears with status overdue
  4. **Access control**
     - Given I am not the assignee  
       When I try to update another users action  
       Then the system rejects the change

---

### Story US-ACT-04 - Manager/Admin views and filters All Actions

- **As a** manager or admin  
- **I want** to view and filter all actions  
- **So that** I can oversee remediation across sites

- **Phase:** P2  
- **Related journey(s):** P2-J4  
- **Related checklist IDs:** C26, C27  
- **Acceptance criteria:**
  1. **All Actions list**
     - Given actions exist  
       When I open Actions -> All Actions  
       Then I see all actions across sites
  2. **Filter by status**
     - Given actions with different statuses exist  
       When I filter by status  
       Then only matching actions are shown
  3. **Filter by site**
     - Given actions linked to incidents or inspections across sites  
       When I filter by site  
       Then only actions for that site are shown
  4. **Filter by due date**
     - Given actions with different due dates exist  
       When I filter by due date range  
       Then only actions in that range are shown

---

### Story US-AUD-01 - View incident activity log

- **As a** manager or admin  
- **I want** to view an incident activity log  
- **So that** I can see who did what and when

- **Phase:** P2  
- **Related journey(s):** P2-J8  
- **Related checklist IDs:** C40, C41, C44, C46  
- **Acceptance criteria:**
  1. **Incident activity log**
     - Given I open an incident detail  
       When I view the Activity Log  
       Then I see entries for incident creation and status/severity changes
  2. **Chronological order**
     - Given the log has multiple entries  
       Then entries are shown in chronological order
  3. **Immutability**
     - Given I view the activity log  
       Then I cannot edit or delete entries

---

### Story US-AUD-02 - View inspection activity log

- **As a** manager or admin  
- **I want** to view an inspection activity log  
- **So that** I can see who performed the inspection and changes recorded

- **Phase:** P2  
- **Related journey(s):** P2-J9  
- **Related checklist IDs:** C42, C45, C46  
- **Acceptance criteria:**
  1. **Inspection activity log**
     - Given I open an inspection detail  
       When I view the Activity Log  
       Then I see entries for inspection creation and related actions
  2. **Chronological order**
     - Given the log has multiple entries  
       Then entries are shown in chronological order
  3. **Immutability**
     - Given I view the activity log  
       Then I cannot edit or delete entries

---

### Story US-AUD-03 - View action activity log

- **As a** manager, admin, or assignee  
- **I want** to view an action activity log  
- **So that** I can see action creation, status changes, and attachments

- **Phase:** P2  
- **Related journey(s):** P2-J10  
- **Related checklist IDs:** C43, C46  
- **Acceptance criteria:**
  1. **Action activity log**
     - Given I open an action detail  
       When I view the Activity Log  
       Then I see entries for action creation and status changes
  2. **Chronological order**
     - Given the log has multiple entries  
       Then entries are shown in chronological order
  3. **Immutability**
     - Given I view the activity log  
       Then I cannot edit or delete entries

---

## 8. Epic E7 - Attachments / Evidence (Phase 2)

### Story US-ATT-01 - User uploads evidence to an incident

- **As a** worker, manager, or admin  
- **I want** to attach files to incidents  
- **So that** evidence is stored with the incident record

- **Phase:** P2  
- **Related journey(s):** P2-J5  
- **Related checklist IDs:** C28, C31, C32, C33  
- **Acceptance criteria:**
  1. **Upload**
     - Given I am on an incident detail page  
       When I upload an allowed file type within size limits  
       Then the file is stored and shown in an attachments list
  2. **Download**
     - Given attachments exist  
       When I click an attachment link  
       Then the file is downloaded or displayed by the browser
  3. **Validation**
     - Given I attempt to upload a disallowed file type or oversized file  
       Then I see a clear error message and the upload is rejected

---

### Story US-ATT-02 - User uploads evidence to an inspection

- **As a** manager or admin  
- **I want** to attach files to inspections  
- **So that** evidence is stored with the inspection record

- **Phase:** P2  
- **Related journey(s):** P2-J6  
- **Related checklist IDs:** C29, C31, C32, C33  
- **Acceptance criteria:**
  1. **Upload**
     - Given I am on an inspection detail page  
       When I upload an allowed file type within size limits  
       Then the file is stored and shown in an attachments list
  2. **Download**
     - Given attachments exist  
       When I click an attachment link  
       Then the file is downloaded or displayed by the browser
  3. **Validation**
     - Given I attempt to upload a disallowed file type or oversized file  
       Then I see a clear error message and the upload is rejected

---

### Story US-ATT-03 - User uploads evidence to an action

- **As a** manager, admin, or assignee  
- **I want** to attach files to actions  
- **So that** completion evidence is stored with the action

- **Phase:** P2  
- **Related journey(s):** P2-J7  
- **Related checklist IDs:** C30, C31, C33  
- **Acceptance criteria:**
  1. **Upload**
     - Given I am on an action detail page  
       When I upload an allowed file type within size limits  
       Then the file is stored and shown in an attachments list
  2. **Download**
     - Given attachments exist  
       When I click an attachment link  
       Then the file is downloaded or displayed by the browser
  3. **Validation**
     - Given I attempt to upload a disallowed file type or oversized file  
       Then I see a clear error message and the upload is rejected

---

## 9. Epic E11 - Help & Support (Phase 2)

### Story US-HELP-01 - User accesses in-app help and support

- **As a** user  
- **I want** to access in-app help and support information  
- **So that** I can complete tasks without external training

- **Phase:** P2  
- **Related journey(s):** P2-J11  
- **Related checklist IDs:** C68, C69, C70  
- **Acceptance criteria:**
  1. **Help link**
     - Given I am logged in  
       When I click Help in the navigation  
       Then I see a help page or panel
  2. **FAQ content**
     - Given I view the help content  
       Then I see guidance for incidents, inspections, and actions
  3. **Support contact**
     - Given I view the help content  
       Then I can see a support contact method (e.g. email address)

---

## 10. Epic E8 - Organisation & Multi-Tenancy (Phase 3)

### Story US-ORG-01 - Data is isolated per organisation

- **As a** platform owner / org admin  
- **I want** each organisations data to be isolated  
- **So that** one customer cannot see anothers data

- **Phase:** P3  
- **Related journey(s):** P3-J3  
- **Related checklist IDs:** C60, C61  
- **Acceptance criteria:**
  1. **Org-scoped data**
     - Given two organisations exist (Org A and Org B)  
       When an Org A user logs in  
       Then they only see Org A sites, incidents, inspections, actions
  2. **Access enforcement**
     - Given I try to access resources belonging to another org  
       Then the system denies access

---

## 11. Epic E9 - Notifications & Escalations (Phase 4)

### Story US-NOTIF-01 - Action assignment creates notification

- **As a** worker assigned to an action
- **I want** to receive a notification when an action is assigned to me
- **So that** I am immediately aware of new work

- **Phase:** P4
- **Related journey(s):** P4-J1
- **Related checklist IDs:** C-096
- **Acceptance criteria:**
  1. **In-app notification created**
     - Given I am assigned to a new action
       When the action is created
       Then an in-app notification appears in my notification centre
       And the notification shows action title, source, and due date
  2. **Email sent (if preference enabled)**
     - Given my preference `email_action_assigned = true`
       When an action is assigned to me
       Then I receive an email with action details and a link
  3. **No email (if preference disabled)**
     - Given my preference `email_action_assigned = false`
       When an action is assigned to me
       Then I receive only an in-app notification (no email)

---

### Story US-NOTIF-02 - Action status change notification

- **As a** manager who created an action
- **I want** to be notified when the action status changes
- **So that** I know when work is progressing or completed

- **Phase:** P4
- **Related journey(s):** P4-J1
- **Related checklist IDs:** C-097
- **Acceptance criteria:**
  1. **Completion notification**
     - Given I created an action assigned to another user
       When the assignee marks it as "completed"
       Then I receive an in-app notification
  2. **Overdue notification**
     - Given an action I created passes its due date
       When the action is still not completed
       Then both assignee and I receive an overdue notification

---

### Story US-NOTIF-03 - View notifications in dropdown

- **As a** user
- **I want** to see my recent notifications in a dropdown
- **So that** I can quickly check what needs attention

- **Phase:** P4
- **Related journey(s):** P4-J2
- **Related checklist IDs:** C-103, C-104
- **Acceptance criteria:**
  1. **Bell icon with badge**
     - Given I have 5 unread notifications
       When I view the header
       Then I see a bell icon with badge showing "5"
  2. **Dropdown display**
     - Given I click the bell icon
       Then a dropdown shows my last 10 notifications
       And each shows icon, title, and time ago
  3. **Navigate from notification**
     - Given I click a notification in the dropdown
       Then I navigate to the related item (action/incident)
       And the notification is marked as read
  4. **Mark all as read**
     - Given I have unread notifications
       When I click "Mark all as read"
       Then all notifications are marked read
       And the badge count becomes 0

---

### Story US-NOTIF-04 - Full notifications page

- **As a** user
- **I want** a dedicated page to view all my notifications
- **So that** I can review history and filter by type

- **Phase:** P4
- **Related journey(s):** P4-J2
- **Related checklist IDs:** C-105
- **Acceptance criteria:**
  1. **Paginated list**
     - Given I have 50 notifications
       When I open /notifications
       Then I see 20 notifications per page with pagination
  2. **Filter by type**
     - Given notifications of different types exist
       When I filter by "Actions"
       Then only action-related notifications are shown
  3. **Filter by read/unread**
     - Given I filter by "Unread"
       Then only unread notifications are shown
  4. **Date range filter**
     - Given I filter by last 7 days
       Then only notifications from that period are shown

---

### Story US-NOTIF-05 - High-severity incident notification

- **As a** manager or admin
- **I want** to be immediately notified of high-severity incidents
- **So that** critical safety events get immediate attention

- **Phase:** P4
- **Related journey(s):** P4-J6
- **Related checklist IDs:** C-098
- **Acceptance criteria:**
  1. **Automatic notification**
     - Given an incident with severity "high" or "critical" is created
       When the incident is saved
       Then all managers and admins in the org receive a notification
  2. **High priority indicator**
     - Given I receive a high-severity incident notification
       Then it has a HIGH priority visual indicator (red)
  3. **Email always sent**
     - Given my preference `email_high_severity_incident = true`
       When a critical incident is created
       Then I receive an email immediately
  4. **Mandatory notification**
     - Given a critical incident is created
       Then managers/admins always see in-app notification (cannot fully disable)

---

### Story US-PREF-01 - Configure notification preferences

- **As a** user
- **I want** to configure which notifications I receive
- **So that** I control my notification volume

- **Phase:** P4
- **Related journey(s):** P4-J3
- **Related checklist IDs:** C-108
- **Acceptance criteria:**
  1. **Email toggles**
     - Given I open notification preferences
       When I see the form
       Then I can toggle: Action assigned, Action overdue, High-severity incidents
  2. **Save preferences**
     - Given I change a preference and click Save
       Then the preference is saved
       And applies to future notifications
  3. **Immediate effect**
     - Given I disable "Action assigned" email
       When a new action is assigned to me
       Then I do not receive an email (only in-app)

---

### Story US-PREF-02 - Configure digest frequency

- **As a** manager
- **I want** to choose my digest email frequency
- **So that** I get summaries at my preferred cadence

- **Phase:** P4
- **Related journey(s):** P4-J3
- **Related checklist IDs:** C-102, C-108
- **Acceptance criteria:**
  1. **Frequency options**
     - Given I open notification preferences
       Then I can select: Daily, Weekly, or None
  2. **Time preference**
     - Given I select Daily
       Then I can choose a preferred delivery time
  3. **Day of week (weekly)**
     - Given I select Weekly
       Then I can choose which day (default: Monday)

---

### Story US-DIGEST-01 - Receive daily digest email

- **As a** manager with daily digest enabled
- **I want** to receive a daily summary email
- **So that** I start my day with a safety overview

- **Phase:** P4
- **Related journey(s):** P4-J4
- **Related checklist IDs:** C-100
- **Acceptance criteria:**
  1. **Digest content**
     - Given the daily digest job runs
       When I have `digest_frequency = 'daily'`
       Then I receive an email containing:
         - New incidents since yesterday
         - Actions due in next 7 days
         - Overdue actions
  2. **Empty sections omitted**
     - Given there are no new incidents
       Then the "New Incidents" section is not shown
  3. **Link to dashboard**
     - Given I receive the digest
       Then it includes a link to the dashboard

---

### Story US-DIGEST-02 - Receive weekly digest email

- **As a** manager with weekly digest enabled
- **I want** to receive a weekly summary email
- **So that** I have a broader view of safety trends

- **Phase:** P4
- **Related journey(s):** P4-J4
- **Related checklist IDs:** C-101
- **Acceptance criteria:**
  1. **Weekly content**
     - Given the weekly digest job runs on Monday
       When I have `digest_frequency = 'weekly'`
       Then I receive an email covering the past 7 days
  2. **Comparison statistics**
     - Given I receive the weekly digest
       Then it includes week-over-week comparison (e.g., "5 incidents vs 3 last week")

---

### Story US-ESC-01 - Overdue action triggers escalation

- **As a** manager
- **I want** to be notified when actions are significantly overdue
- **So that** I can intervene on blocked work

- **Phase:** P4
- **Related journey(s):** P4-J5
- **Related checklist IDs:** C-106
- **Acceptance criteria:**
  1. **Escalation trigger**
     - Given an action is open and due date was X days ago (X = org threshold, default 3)
       When the escalation job runs
       Then escalation notifications are sent
  2. **Recipients**
     - Given an escalation triggers
       Then the assignee and all org managers receive notification
  3. **One-time escalation**
     - Given an action has been escalated
       When the job runs again
       Then the same action is not escalated again
  4. **Audit log**
     - Given an escalation triggers
       Then an audit log entry is created

---

### Story US-ESC-02 - Admin configures escalation settings

- **As an** admin
- **I want** to configure escalation rules for my organisation
- **So that** escalations match our operational needs

- **Phase:** P4
- **Related journey(s):** P4-J7
- **Related checklist IDs:** C-107
- **Acceptance criteria:**
  1. **Enable/disable escalations**
     - Given I am on org settings
       Then I can enable or disable escalations
  2. **Configure threshold**
     - Given escalations are enabled
       Then I can set "days overdue" threshold (e.g., 5 days)
  3. **Custom email**
     - Given I want escalations to go to a specific team
       Then I can enter a custom escalation email address
  4. **Immediate effect**
     - Given I save escalation settings
       Then they apply to the next escalation job run

---

### Story US-SYS-01 - Reliable notification delivery

- **As a** system administrator
- **I want** notifications to be reliably delivered
- **So that** no critical alerts are lost

- **Phase:** P4
- **Related journey(s):** N/A (system)
- **Related checklist IDs:** C-110, C-111
- **Acceptance criteria:**
  1. **In-app persistence**
     - Given a notification is created
       Then it is stored in the database (not lost on refresh)
  2. **Email retry**
     - Given an email send fails
       Then the system retries up to 3 times
  3. **Job execution**
     - Given the server restarts
       When scheduled job time arrives
       Then jobs execute as configured

---

## 12. Epic E10 - Analytics & Insights (Phase 5)

### Story US-AN-01 - Manager views time-series analytics

- **As a** manager
- **I want** to view time-series charts showing incidents, inspections, and actions over time
- **So that** I can identify trends and patterns in safety performance

- **Phase:** P5
- **Related journey(s):** P5-J1
- **Related checklist IDs:** C-120
- **Acceptance criteria:**
  1. **Incidents over time**
     - Given incident data exists for multiple months
       When I open the Analytics page
       Then I see a chart showing incidents per month stacked by severity
       And hovering shows exact values for each data point
  2. **Inspections over time**
     - Given inspection data exists
       When I view the time-series section
       Then I see a chart showing completed inspections per month
  3. **Actions over time**
     - Given action data exists
       When I view the time-series section
       Then I see a chart comparing actions created vs completed per month
  4. **Date range filtering**
     - Given I select a custom date range
       When the charts refresh
       Then only data within that range is displayed
       And empty months show zero (continuous timeline)

---

### Story US-AN-02 - Manager views site comparison charts

- **As a** manager
- **I want** to compare safety metrics across sites
- **So that** I can identify which sites need the most attention

- **Phase:** P5
- **Related journey(s):** P5-J1
- **Related checklist IDs:** C-121
- **Acceptance criteria:**
  1. **Incidents by site**
     - Given incidents exist across multiple sites
       When I view the site comparison section
       Then I see a bar chart showing incident counts per site
       And I can filter by severity or type
  2. **Overdue actions by site**
     - Given overdue actions exist
       When I view site comparison
       Then I see a chart showing overdue action distribution by site
  3. **Inspection pass/fail by site**
     - Given inspections exist
       When I view site comparison
       Then I see pass/fail rates per site
  4. **Sorting**
     - Given the site comparison chart is displayed
       When I choose to sort by value
       Then sites are ordered by highest count first
  5. **Maximum sites**
     - Given more than 20 sites have data
       When I view the chart
       Then the top 20 are shown and others grouped as "Other"

---

### Story US-AN-03 - Manager views KPI cards with trends

- **As a** manager
- **I want** to see KPI cards showing key metrics with trend indicators
- **So that** I can quickly understand if safety is improving or worsening

- **Phase:** P5
- **Related journey(s):** P5-J1
- **Related checklist IDs:** C-122
- **Acceptance criteria:**
  1. **KPI display**
     - Given I open the Analytics page
       Then I see KPI cards for:
         - Total Incidents (in period)
         - % High Severity
         - Avg Resolution Time
         - Open Actions
         - % Actions Overdue
         - Inspection Pass Rate
  2. **Trend indicators**
     - Given I view a KPI card
       Then I see a trend arrow (up/down/neutral)
       And the trend compares current period to previous equivalent period
  3. **Colour coding**
     - Given the trend is improving
       Then the indicator is green
       Given the trend is worsening
       Then the indicator is red
  4. **Clickable KPIs**
     - Given I click on a KPI card
       Then I navigate to the relevant list with appropriate filters applied

---

### Story US-AN-04 - Manager applies analytics filters

- **As a** manager
- **I want** to filter analytics by date range, sites, incident types, and severities
- **So that** I can focus on specific segments of data

- **Phase:** P5
- **Related journey(s):** P5-J1, P5-J2
- **Related checklist IDs:** C-123
- **Acceptance criteria:**
  1. **Date range filter**
     - Given I am on the Analytics page
       Then I can select preset ranges (Last 30/90/365 days, This Year)
       Or I can specify a custom date range
  2. **Multi-select filters**
     - Given I want to filter by sites
       Then I can select multiple sites
       And I can similarly multi-select incident types and severities
  3. **Filter persistence**
     - Given I apply filters
       When I navigate away and return
       Then my filters are still applied (within session)
  4. **Clear all**
     - Given I have multiple filters applied
       When I click "Clear All"
       Then all filters reset to defaults
  5. **URL updates**
     - Given I apply filters
       Then the URL updates to reflect my selections
       And I can share this URL to give others the same view

---

### Story US-RISK-01 - System calculates site risk scores

- **As a** manager or admin
- **I want** each site to have an automatically calculated risk score
- **So that** I can objectively identify high-risk sites

- **Phase:** P5
- **Related journey(s):** P5-J1
- **Related checklist IDs:** C-124
- **Acceptance criteria:**
  1. **Risk score calculation**
     - Given a site has incident, action, and inspection data
       When the nightly risk calculation runs
       Then a risk score is calculated using the formula:
         (Critical×10) + (High×5) + (Medium×2) + (Low×1) + (Overdue×3) + (FailedInspections×2)
  2. **Rolling window**
     - Given the risk score is calculated
       Then it uses a rolling 90-day window of data
  3. **Risk categories**
     - Given a risk score is calculated
       Then it is categorised as:
         - Low (0-10, Green)
         - Medium (11-30, Yellow)
         - High (31-50, Orange)
         - Critical (51+, Red)
  4. **History retention**
     - Given risk scores are calculated nightly
       Then historical scores are retained for trending

---

### Story US-RISK-02 - Manager views top high-risk sites widget

- **As a** manager
- **I want** to see a widget showing the top 5 high-risk sites
- **So that** I can prioritise my attention on the most concerning locations

- **Phase:** P5
- **Related journey(s):** P5-J1
- **Related checklist IDs:** C-125
- **Acceptance criteria:**
  1. **Widget display**
     - Given risk scores exist
       When I view the Analytics page
       Then I see a "Top 5 High-Risk Sites" widget
       And each row shows site name, risk score, category (with colour), and primary factor
  2. **Trend indicator**
     - Given risk history exists
       Then each site shows a trend arrow vs previous period
  3. **Drill-down**
     - Given I click on a site in the widget
       Then I navigate to the Incidents list filtered by that site
  4. **View all link**
     - Given I want to see all sites
       When I click "View All"
       Then I see a full ranking of all sites by risk score

---

### Story US-RISK-03 - Manager views top incident types widget

- **As a** manager
- **I want** to see the top 5 recurring incident types
- **So that** I can identify patterns and target prevention efforts

- **Phase:** P5
- **Related journey(s):** P5-J1
- **Related checklist IDs:** C-126
- **Acceptance criteria:**
  1. **Widget display**
     - Given incident data exists
       When I view the Analytics page
       Then I see a "Top 5 Incident Types" widget
       And each row shows type name, count, percentage of total, and trend
  2. **Sorted by count**
     - Given the widget displays
       Then types are sorted by count descending
  3. **Drill-down**
     - Given I click on an incident type
       Then I navigate to Incidents list filtered by that type
  4. **Filter respect**
     - Given I have date range filters applied
       Then the widget shows data only within that range

---

### Story US-RISK-04 - User views risk score transparency

- **As a** user
- **I want** to understand how risk scores are calculated
- **So that** I trust the scoring and can take appropriate action

- **Phase:** P5
- **Related journey(s):** P5-J5
- **Related checklist IDs:** C-127
- **Acceptance criteria:**
  1. **Help tooltip**
     - Given I hover over the risk score info icon
       Then I see a tooltip explaining the formula
  2. **Score breakdown**
     - Given I view a site's risk details
       Then I see the breakdown: Incident Score, Action Score, Inspection Score
  3. **Documentation link**
     - Given I want more details
       Then I can click a link to full methodology documentation

---

### Story US-VIEW-01 - Manager saves analytics view

- **As a** manager
- **I want** to save my current filter configuration as a named view
- **So that** I can quickly return to this view later

- **Phase:** P5
- **Related journey(s):** P5-J2
- **Related checklist IDs:** C-128
- **Acceptance criteria:**
  1. **Save view**
     - Given I have filters applied
       When I click "Save View"
       Then I can enter a name and optional description
       And choose visibility (Private or Shared)
  2. **View saved**
     - Given I save a view
       Then it appears in my saved views dropdown
  3. **Maximum views**
     - Given I have 20 saved views
       When I try to save another
       Then I see an error asking me to delete one first
  4. **Shared views**
     - Given I save a view as "Shared"
       Then all users in my organisation can see and load it

---

### Story US-VIEW-02 - Manager loads saved view

- **As a** manager
- **I want** to quickly load a previously saved view
- **So that** I don't have to manually reapply filters each time

- **Phase:** P5
- **Related journey(s):** P5-J2
- **Related checklist IDs:** C-129
- **Acceptance criteria:**
  1. **Load from dropdown**
     - Given I have saved views
       When I select one from the dropdown
       Then all filters are automatically applied
       And charts/KPIs refresh with that configuration
  2. **Load time**
     - Given I load a view
       Then it applies within 2 seconds
  3. **Indicator**
     - Given I have loaded a view
       Then I see "Currently viewing: [View Name]" indicator
  4. **Modifiable**
     - Given I have loaded a view
       When I change a filter
       Then the changes apply without permanently modifying the saved view

---

### Story US-VIEW-03 - Manager manages saved views

- **As a** manager
- **I want** to rename, update, delete, and set default views
- **So that** I can keep my saved views organised

- **Phase:** P5
- **Related journey(s):** P5-J6
- **Related checklist IDs:** C-130
- **Acceptance criteria:**
  1. **Rename view**
     - Given I have a saved view
       When I choose to rename it
       Then I can update the name and description
  2. **Update filters**
     - Given I have a view loaded and modified filters
       When I choose "Update View"
       Then the view's filters are overwritten with current selections
  3. **Delete view**
     - Given I want to delete a view
       When I click delete
       Then I see a confirmation dialog
       And upon confirming, the view is removed
  4. **Set default**
     - Given I want a view to load automatically
       When I set it as default
       Then it loads when I open the Analytics page
       And it shows a star icon in the dropdown

---

### Story US-VIEW-04 - Manager generates PDF analytics report

- **As a** manager or compliance lead
- **I want** to generate a PDF report of the current analytics view
- **So that** I can share it in board meetings or with stakeholders

- **Phase:** P5
- **Related journey(s):** P5-J4
- **Related checklist IDs:** C-131
- **Acceptance criteria:**
  1. **Generate PDF**
     - Given I am on the Analytics page
       When I click "Generate PDF Report"
       Then a PDF is generated within 30 seconds
  2. **Report contents**
     - Given the PDF is generated
       Then it includes:
         - Cover page with org name, period, generation date
         - Executive summary with KPI values and trends
         - Charts (incidents over time, site comparison, risk scores)
         - Tables (top 5 high-risk sites, top 5 incident types)
         - Filter summary showing what was included
  3. **Chart rendering**
     - Given the PDF includes charts
       Then they are rendered as images (not interactive)
  4. **File size**
     - Given a typical report
       Then the file size is under 5MB
  5. **Professional format**
     - Given the PDF is downloaded
       Then it has professional formatting suitable for board presentation

---

### Story US-DRILL-01 - User drills down from charts to lists

- **As a** user
- **I want** to click on chart elements to see the underlying data
- **So that** I can investigate specific data points

- **Phase:** P5
- **Related journey(s):** P5-J3
- **Related checklist IDs:** C-132
- **Acceptance criteria:**
  1. **Incident chart drill-down**
     - Given I click on a bar segment in the incidents-by-month chart
       Then I navigate to Incidents list filtered by that month and severity
  2. **Site chart drill-down**
     - Given I click on a site bar in the incidents-by-site chart
       Then I navigate to Incidents list filtered by that site
  3. **KPI drill-down**
     - Given I click on the "Open Actions" KPI card
       Then I navigate to Actions list filtered by status = Open
  4. **Filter preservation**
     - Given I drill down from analytics
       Then the date range filter is preserved on the target list
  5. **Back navigation**
     - Given I drill down to a list
       When I click the browser back button
       Then I return to the Analytics page with my filters intact
  6. **Bookmarkable URLs**
     - Given I drill down to a filtered list
       Then the URL reflects the filters
       And I can bookmark or share this URL

---

### Story US-DRILL-02 - User sees drill-down indicators on charts

- **As a** user
- **I want** visual cues showing which chart elements are clickable
- **So that** I know I can drill down for more details

- **Phase:** P5
- **Related journey(s):** P5-J3
- **Related checklist IDs:** C-133
- **Acceptance criteria:**
  1. **Cursor change**
     - Given I hover over a clickable chart element
       Then my cursor changes to a pointer
  2. **Tooltip hint**
     - Given I hover over a clickable element
       Then a tooltip shows "Click to view details"
  3. **Visual highlight**
     - Given I hover over a clickable bar or point
       Then it visually highlights (e.g., slight colour change or border)
  4. **Consistency**
     - Given all clickable chart elements
       Then they all behave the same way across charts

---

### Story US-PERF-01 - Analytics dashboard loads quickly

- **As a** user
- **I want** the analytics dashboard to load quickly
- **So that** I can access insights without long waits

- **Phase:** P5
- **Related journey(s):** P5-J1
- **Related checklist IDs:** C-134
- **Acceptance criteria:**
  1. **Load times**
     - Given < 1,000 incidents exist
       Then the dashboard loads in < 2 seconds
     - Given 1,000-10,000 incidents exist
       Then the dashboard loads in < 5 seconds
     - Given 10,000-50,000 incidents exist
       Then the dashboard loads in < 10 seconds
  2. **Loading indicator**
     - Given the dashboard is loading
       Then I see a loading spinner
  3. **Progressive rendering**
     - Given the page is loading
       Then KPI cards may appear before charts if ready

---

### Story US-PERF-02 - System uses pre-aggregated data for performance

- **As a** system
- **I want** to use pre-aggregated summary tables for analytics
- **So that** queries perform well even with large datasets

- **Phase:** P5
- **Related journey(s):** N/A (system)
- **Related checklist IDs:** C-135
- **Acceptance criteria:**
  1. **Nightly aggregation**
     - Given the aggregation job runs at 02:00 UTC
       Then daily summaries are computed for all organisations
  2. **Aggregation scope**
     - Given the job runs
       Then it creates/updates rows in analytics_daily_summary
       And aggregates by site, incident type, severity, and date
  3. **Hybrid approach**
     - Given a user requests analytics
       Then queries use aggregated data for dates > 48 hours ago
       And use live tables for the most recent 48 hours
  4. **Job completion**
     - Given the aggregation job runs
       Then it completes within 30 minutes for typical data volumes

---

## 13. Epic E11 - Future Capabilities (Phase 5+)

### Story US-RISK-REG-01 - Risk owner manages risk register

- **As a** risk owner
- **I want** to maintain a formal risk register
- **So that** I can track key organisational risks and their treatment status

- **Phase:** P5+ (Future)
- **Related journey(s):** Future
- **Related checklist IDs:** Future
- **Acceptance criteria:**
  1. **Create risk**
     - Given I am on the Risk Register page
       When I create a new risk with title, description, likelihood, impact, owner
       Then it appears in the risk list with a calculated risk score
  2. **Update risk**
     - Given a risk exists
       When I update its status or likelihood/impact scores
       Then the change is reflected in the risk matrix/dashboard

---

### Story US-INT-01 - External system creates incident via API

- **As an** external system
- **I want** to create incidents via a secure API
- **So that** my system can feed safety events into the EHS Portal

- **Phase:** P5+ (Future)
- **Related journey(s):** Future
- **Related checklist IDs:** Future
- **Acceptance criteria:**
  1. **Authenticated API**
     - Given an API key exists for an organisation
       When the external system calls the external incident endpoint with a valid key and payload
       Then an incident is created and assigned to that org
  2. **Invalid key**
     - Given an invalid or missing API key
       When the external system calls the endpoint
       Then the request is rejected with an appropriate error

---

### Story US-SSO-01 - User logs in via SSO

- **As a** user in an organisation with SSO configured
- **I want** to log in using my identity provider
- **So that** I don't manage separate credentials

- **Phase:** P5+ (Future)
- **Related journey(s):** Future
- **Related checklist IDs:** Future
- **Acceptance criteria:**
  1. **SSO success**
     - Given my organisation has SSO enabled
       When I click Login with SSO
       And I authenticate with the IdP
       Then I am redirected back to the app as a logged-in user
  2. **SSO failure**
     - Given authentication fails at the IdP
       Then I am not logged in
       And I see an appropriate error message

---

## 14. Epic E12 - Security, Trust & Self-Service (Phase 6)

### Story US-ACCESS-01 - New user requests access

- **As a** prospective user
- **I want** to submit an access request to join my organisation's EHS Portal
- **So that** I can get an account without contacting IT directly

- **Phase:** P6
- **Related journey(s):** P6-J1
- **Related checklist IDs:** C-140, C-141
- **Acceptance criteria:**
  1. **Submit request**
     - Given I am on the request access page
       When I fill in my details and valid org code
       And I accept the terms
       And I click Submit
       Then my request is created with status pending
       And I see a confirmation with reference number
       And I receive a confirmation email
  2. **Invalid org code**
     - Given I enter an invalid organisation code
       When I submit the form
       Then I see an error message
       And no request is created
  3. **Duplicate prevention**
     - Given I already have a pending request for this organisation
       When I try to submit another request
       Then I see an error message indicating a pending request exists

---

### Story US-ACCESS-02 - Admin approves access request

- **As an** admin
- **I want** to review and approve access requests
- **So that** I can control who gets access to the portal

- **Phase:** P6
- **Related journey(s):** P6-J2
- **Related checklist IDs:** C-142, C-143
- **Acceptance criteria:**
  1. **View pending requests**
     - Given I am an admin
       When I navigate to Access Requests
       Then I see a list of pending requests
       And I can see requester name, email, requested role, and date
  2. **Approve request**
     - Given I am viewing a pending request
       When I click Approve
       And I assign a role
       And I click Confirm
       Then a user account is created
       And a welcome email is sent with temporary password
       And the request status changes to approved
  3. **Reject request**
     - Given I am viewing a pending request
       When I click Reject
       And I optionally enter a reason
       Then the request status changes to rejected
       And no user account is created

---

### Story US-PWRESET-01 - User requests password reset

- **As a** registered user who forgot my password
- **I want** to request a password reset link
- **So that** I can regain access to my account

- **Phase:** P6
- **Related journey(s):** P6-J3
- **Related checklist IDs:** C-144, C-145
- **Acceptance criteria:**
  1. **Request reset**
     - Given I am on the forgot password page
       When I enter my email and click Send Reset Link
       Then I see a confirmation message
       And if the email exists, I receive a reset link email
  2. **No email enumeration**
     - Given I enter an email that doesn't exist
       When I click Send Reset Link
       Then I see the same confirmation message as for valid emails
       And no email is sent
  3. **Rate limiting**
     - Given I have requested 3 reset links in the past hour
       When I try to request another
       Then I receive an error indicating rate limit exceeded

---

### Story US-PWRESET-02 - User resets password via link

- **As a** user with a password reset link
- **I want** to set a new password
- **So that** I can log in again

- **Phase:** P6
- **Related journey(s):** P6-J3
- **Related checklist IDs:** C-146, C-147
- **Acceptance criteria:**
  1. **Reset password**
     - Given I have a valid reset link
       When I enter a new password that meets requirements
       And I confirm the password
       And I click Reset Password
       Then my password is changed
       And I am redirected to login
  2. **Expired link**
     - Given my reset link is older than 30 minutes
       When I try to use it
       Then I see an error message
       And I am offered to request a new link
  3. **Password history**
     - Given I try to set a password I used recently
       When I submit the form
       Then I see an error indicating the password was recently used

---

### Story US-2FA-01 - User enables two-factor authentication

- **As a** logged-in user
- **I want** to enable two-factor authentication
- **So that** my account has an additional layer of security

- **Phase:** P6
- **Related journey(s):** P6-J4
- **Related checklist IDs:** C-148, C-149, C-150
- **Acceptance criteria:**
  1. **Setup 2FA**
     - Given I am on the Security Centre page
       When I click Enable Two-Factor Authentication
       Then I see a QR code and manual key
       And I can scan the QR code with my authenticator app
  2. **Verify setup**
     - Given I have scanned the QR code
       When I enter the 6-digit code from my app
       And the code is correct
       Then I proceed to the backup codes step
  3. **Backup codes**
     - Given I have verified my 2FA setup
       When I view the backup codes
       Then I can download, copy, or print them
       And I must confirm I've saved them before completing setup
  4. **2FA active**
     - Given I complete 2FA setup
       Then my next login will require a 2FA code

---

### Story US-2FA-02 - User logs in with 2FA

- **As a** user with 2FA enabled
- **I want** to enter my TOTP code after my password
- **So that** I can securely access my account

- **Phase:** P6
- **Related journey(s):** P6-J5
- **Related checklist IDs:** C-151, C-152
- **Acceptance criteria:**
  1. **2FA prompt**
     - Given I have 2FA enabled
       When I enter correct email and password
       Then I see a 2FA verification prompt
       And I am not yet logged in
  2. **Valid code**
     - Given I am at the 2FA prompt
       When I enter a valid TOTP code
       Then I am logged in and redirected to dashboard
  3. **Invalid code**
     - Given I am at the 2FA prompt
       When I enter an invalid code
       Then I see an error message
       And I can try again
  4. **Rate limiting**
     - Given I enter 5 wrong codes
       Then my account is temporarily locked

---

### Story US-2FA-03 - User uses backup code

- **As a** user who lost access to my authenticator
- **I want** to use a backup code to log in
- **So that** I can still access my account

- **Phase:** P6
- **Related journey(s):** P6-J5
- **Related checklist IDs:** C-152, C-153
- **Acceptance criteria:**
  1. **Use backup code**
     - Given I am at the 2FA prompt
       When I click "Use backup code instead"
       And I enter a valid unused backup code
       Then I am logged in
       And that backup code is marked as used
  2. **Invalid backup code**
     - Given I enter an already-used or invalid backup code
       When I submit
       Then I see an error message
       And I am not logged in

---

### Story US-2FA-04 - User disables 2FA

- **As a** user with 2FA enabled
- **I want** to disable two-factor authentication
- **So that** I can simplify my login process

- **Phase:** P6
- **Related journey(s):** P6-J4 (reverse)
- **Related checklist IDs:** C-153
- **Acceptance criteria:**
  1. **Disable 2FA**
     - Given I am on the Security Centre page
       And 2FA is enabled
       When I click Disable 2FA
       And I confirm with my password
       Then 2FA is disabled
       And my backup codes are invalidated
       And my next login won't require 2FA

---

### Story US-AUDIT-01 - System logs security events

- **As a** system administrator
- **I want** all security-relevant events to be logged
- **So that** I have an audit trail for compliance and investigation

- **Phase:** P6
- **Related journey(s):** P6-J7
- **Related checklist IDs:** C-154, C-155
- **Acceptance criteria:**
  1. **Login events**
     - Given a user attempts to log in
       Then a LOGIN_SUCCESS or LOGIN_FAILURE event is logged
       With IP address and user agent
  2. **Password events**
     - Given a password is changed or reset
       Then a PASSWORD_CHANGED event is logged
  3. **2FA events**
     - Given 2FA is enabled, disabled, or verified
       Then the corresponding event is logged
  4. **Immutability**
     - Given an event is logged
       Then it cannot be modified or deleted by users

---

### Story US-AUDIT-02 - Admin views security audit log

- **As an** admin
- **I want** to view and filter the security audit log
- **So that** I can investigate security incidents

- **Phase:** P6
- **Related journey(s):** P6-J7
- **Related checklist IDs:** C-155
- **Acceptance criteria:**
  1. **View log**
     - Given I am an admin
       When I navigate to Security Audit
       Then I see a list of security events
       With timestamp, event type, user, and details
  2. **Filter log**
     - Given I am viewing the audit log
       When I filter by event type or user or date range
       Then only matching events are shown
  3. **Export log**
     - Given I am viewing filtered results
       When I click Export CSV
       Then a CSV file is downloaded with the filtered events

---

### Story US-SECURITY-01 - User views Security Centre

- **As a** logged-in user
- **I want** to view my account security status
- **So that** I can understand and improve my account security

- **Phase:** P6
- **Related journey(s):** P6-J6
- **Related checklist IDs:** C-156, C-157
- **Acceptance criteria:**
  1. **View status**
     - Given I navigate to Security Centre
       Then I see my account status (active since)
       And I see my 2FA status (enabled/disabled)
       And I see when my password was last changed
       And I see my recent login history
  2. **Take action**
     - Given I am on Security Centre
       Then I can enable/disable 2FA
       And I can change my password
       And I can regenerate backup codes

---

### Story US-SECURITY-02 - Account lockout on failed attempts

- **As a** security measure
- **I want** accounts to be locked after multiple failed attempts
- **So that** brute force attacks are prevented

- **Phase:** P6
- **Related journey(s):** P6-J9
- **Related checklist IDs:** C-158, C-159
- **Acceptance criteria:**
  1. **Lockout**
     - Given 5 failed login attempts for an account
       Then the account is locked for 15 minutes
       And the user sees an appropriate error message
       And a notification email is sent
  2. **Automatic unlock**
     - Given an account has been locked for 15 minutes
       When the user tries to log in with correct credentials
       Then they are allowed in
       And the failed attempt counter is reset

---

### Story US-THEME-01 - User switches theme

- **As a** user
- **I want** to switch between light and dark themes
- **So that** I can use the portal comfortably in different conditions

- **Phase:** P6
- **Related journey(s):** P6-J8
- **Related checklist IDs:** C-162, C-163, C-164
- **Acceptance criteria:**
  1. **Switch theme**
     - Given I am logged in
       When I click the theme toggle
       Then the UI immediately changes to the next theme
       And my preference is saved
  2. **System theme**
     - Given I select System theme
       When my operating system is in dark mode
       Then the portal displays in dark mode
       And vice versa for light mode
  3. **Persistence**
     - Given I have set a theme preference
       When I log out and log back in
       Then my theme preference is still active

---

## 15. Epic E13 - Chemical Management (Phase 7)

### Story US-CHEM-01 - Safety Officer registers a chemical

- **As a** Safety Officer
- **I want** to register chemicals in a central register
- **So that** all hazardous substances on site are documented

- **Phase:** P7
- **Related journey(s):** P7-J1
- **Related checklist IDs:** C-200, C-201
- **Acceptance criteria:**
  1. **Create chemical**
     - Given I am logged in as Manager or above
       When I navigate to Chemicals and click Add Chemical
       Then I can enter name, CAS number, supplier, physical state
       And save the chemical to the register
  2. **Internal code**
     - Given I create a chemical
       Then the system auto-generates an internal code (CHM-XXX)
  3. **List chemicals**
     - Given chemicals exist
       When I view the Chemical Register
       Then I see all chemicals for my organisation

---

### Story US-CHEM-02 - Safety Officer assigns GHS hazards

- **As a** Safety Officer
- **I want** to assign GHS hazard classifications to chemicals
- **So that** hazards are clearly communicated

- **Phase:** P7
- **Related journey(s):** P7-J1
- **Related checklist IDs:** C-202
- **Acceptance criteria:**
  1. **Assign hazards**
     - Given I am creating or editing a chemical
       When I select GHS hazard classes (Flammable, Corrosive, etc.)
       Then they are saved with the chemical
  2. **Display pictograms**
     - Given a chemical has GHS hazards
       When I view the chemical
       Then the corresponding GHS pictograms are displayed
  3. **Filter by hazard**
     - Given I am on the Chemical Register
       When I filter by hazard class
       Then only chemicals with that hazard are shown

---

### Story US-CHEM-03 - Safety Officer uploads SDS

- **As a** Safety Officer
- **I want** to upload SDS documents for chemicals
- **So that** safety information is accessible

- **Phase:** P7
- **Related journey(s):** P7-J2
- **Related checklist IDs:** C-203
- **Acceptance criteria:**
  1. **Upload SDS**
     - Given I am on a chemical detail page
       When I upload a PDF with version and expiry date
       Then the SDS is saved and linked to the chemical
  2. **Current SDS**
     - Given I upload a new SDS
       When I check "Set as current"
       Then the new SDS becomes current
       And previous SDS is marked as superseded
  3. **Download SDS**
     - Given a chemical has an SDS
       When I click Download
       Then the PDF is downloaded

---

### Story US-CHEM-04 - System tracks SDS expiry

- **As a** Safety Officer
- **I want** to be notified when SDS documents are expiring
- **So that** I can obtain updated versions

- **Phase:** P7
- **Related journey(s):** P7-J17
- **Related checklist IDs:** C-204, C-205
- **Acceptance criteria:**
  1. **Expiry tracking**
     - Given an SDS has an expiry date
       When the expiry date approaches (30 days)
       Then I receive a notification
  2. **Filter expired**
     - Given I am on the Chemical Register
       When I filter by SDS Status = Expired
       Then only chemicals with expired SDS are shown
  3. **Expiring filter**
     - Given I filter by "SDS Expiring in 30 days"
       Then chemicals with SDS expiring within 30 days are shown

---

### Story US-CHEM-05 - Admin manages storage locations

- **As an** Admin
- **I want** to track where chemicals are stored
- **So that** I know quantities at each location

- **Phase:** P7
- **Related journey(s):** P7-J3
- **Related checklist IDs:** C-206, C-207
- **Acceptance criteria:**
  1. **Add location**
     - Given I am on a chemical detail page
       When I add a storage location (site, location name, max amount)
       Then the location is saved
  2. **Record inventory**
     - Given a storage location exists
       When I record inventory quantity
       Then the quantity is saved with timestamp
  3. **Filter by site**
     - Given chemicals are stored at multiple sites
       When I filter by site
       Then only chemicals at that site are shown

---

### Story US-CHEM-06 - Link chemicals to incidents/actions

- **As a** Manager
- **I want** to link chemicals to incidents and actions
- **So that** I can track chemical-related safety events

- **Phase:** P7
- **Related journey(s):** P7-J4
- **Related checklist IDs:** C-210, C-211
- **Acceptance criteria:**
  1. **Link to incident**
     - Given I am on an incident
       When I add a chemical with involvement type
       Then the chemical is linked to the incident
  2. **View from chemical**
     - Given a chemical is linked to incidents
       When I view the chemical's Related Incidents tab
       Then I see all linked incidents
  3. **Link to action**
     - Given I am on an action
       When I link a chemical
       Then the chemical is associated with that action

---

### Story US-CHEM-07 - Chemical analytics

- **As a** Safety Manager
- **I want** to view analytics on chemical-related incidents
- **So that** I can identify high-risk chemicals

- **Phase:** P7
- **Related journey(s):** P7-J16
- **Related checklist IDs:** C-212, C-213
- **Acceptance criteria:**
  1. **Incidents by chemical**
     - Given chemical-related incidents exist
       When I view the analytics dashboard
       Then I see incidents grouped by chemical
  2. **Incidents by hazard class**
     - Given I view analytics
       Then I can see incidents grouped by GHS hazard class
  3. **SDS compliance**
     - Given I view analytics
       Then I can see the percentage of chemicals with valid SDS

---

## 16. Epic E14 - Permit-to-Work Management (Phase 7)

### Story US-PERMIT-01 - Worker creates permit request

- **As a** Worker
- **I want** to request a permit for high-risk work
- **So that** I can perform the work safely and legally

- **Phase:** P7
- **Related journey(s):** P7-J5
- **Related checklist IDs:** C-215, C-216
- **Acceptance criteria:**
  1. **Create permit**
     - Given I am logged in
       When I create a new permit with type, site, location, work description
       Then the permit is created in draft status
  2. **Permit number**
     - Given I create a permit
       Then a permit number is auto-generated (TYPE-SITE-DATE-SEQ)
  3. **Add workers**
     - Given I am creating a permit
       When I add workers (from system or manually)
       Then they are listed on the permit

---

### Story US-PERMIT-02 - Worker submits permit for approval

- **As a** Worker
- **I want** to submit my permit request for approval
- **So that** a supervisor can review it

- **Phase:** P7
- **Related journey(s):** P7-J5
- **Related checklist IDs:** C-217, C-218
- **Acceptance criteria:**
  1. **Submit**
     - Given I have a draft permit
       When I click Submit for Approval
       Then the status changes to submitted
       And the supervisor is notified
  2. **Pre-work controls**
     - Given I submit a permit
       Then pre-work controls from the template are attached

---

### Story US-PERMIT-03 - Supervisor approves permit

- **As a** Supervisor
- **I want** to approve or reject permit requests
- **So that** only safe work proceeds

- **Phase:** P7
- **Related journey(s):** P7-J6
- **Related checklist IDs:** C-220
- **Acceptance criteria:**
  1. **Approve**
     - Given a submitted permit
       When I approve it with notes
       Then the status changes to approved
       And the requester is notified
  2. **View pending**
     - Given submitted permits exist
       When I view the permit list
       Then I can filter to see pending approvals

---

### Story US-PERMIT-04 - Supervisor rejects permit

- **As a** Supervisor
- **I want** to reject a permit with reasons
- **So that** the requester can correct and resubmit

- **Phase:** P7
- **Related journey(s):** P7-J6
- **Related checklist IDs:** C-221
- **Acceptance criteria:**
  1. **Reject**
     - Given a submitted permit
       When I reject it with a reason
       Then the status changes to rejected
       And the requester is notified with the reason
  2. **Resubmit**
     - Given a rejected permit
       When the requester edits and resubmits
       Then the status changes back to submitted

---

### Story US-PERMIT-05 - Supervisor activates permit

- **As a** Supervisor
- **I want** to activate (issue) an approved permit
- **So that** work can commence

- **Phase:** P7
- **Related journey(s):** P7-J7
- **Related checklist IDs:** C-222, C-223
- **Acceptance criteria:**
  1. **Pre-work validation**
     - Given an approved permit
       When I try to activate
       Then the system checks all mandatory pre-work controls
  2. **Activate**
     - Given all pre-work controls are complete
       When I activate the permit
       Then the status changes to active
       And the actual start time is recorded
  3. **Block if incomplete**
     - Given pre-work controls are incomplete
       When I try to activate
       Then I receive an error

---

### Story US-PERMIT-06 - Worker completes controls

- **As a** Worker
- **I want** to complete control checklist items
- **So that** safety requirements are documented

- **Phase:** P7
- **Related journey(s):** P7-J8
- **Related checklist IDs:** C-224
- **Acceptance criteria:**
  1. **Complete control**
     - Given an active permit
       When I check a control as complete
       Then my name and timestamp are recorded
  2. **During-work controls**
     - Given the permit is active
       Then I can complete during-work controls
  3. **View progress**
     - Given controls are being completed
       Then the permit shows completion progress

---

### Story US-PERMIT-07 - Supervisor closes permit

- **As a** Supervisor
- **I want** to close a permit when work is complete
- **So that** the permit is properly concluded

- **Phase:** P7
- **Related journey(s):** P7-J9
- **Related checklist IDs:** C-225, C-226
- **Acceptance criteria:**
  1. **Post-work validation**
     - Given an active permit
       When I try to close
       Then the system checks all mandatory post-work controls
  2. **Close**
     - Given all post-work controls are complete
       When I close the permit with notes
       Then the status changes to closed
       And actual end time is recorded
  3. **Block if incomplete**
     - Given post-work controls are incomplete
       When I try to close
       Then I receive an error

---

### Story US-PERMIT-08 - Safety Officer monitors permit board

- **As a** Safety Officer
- **I want** to view all active permits on a board
- **So that** I have real-time oversight

- **Phase:** P7
- **Related journey(s):** P7-J10
- **Related checklist IDs:** C-227, C-228
- **Acceptance criteria:**
  1. **View board**
     - Given active permits exist
       When I navigate to Permit Board
       Then I see all active permits as cards
  2. **Countdown**
     - Given permits have valid_until times
       Then countdown timers are displayed
  3. **Warning colors**
     - Given a permit has < 2 hours remaining
       Then it shows a warning color
       And < 30 minutes shows critical color
  4. **Filter**
     - Given I filter by site or type
       Then only matching permits are shown

---

### Story US-PERMIT-09 - Supervisor suspends/resumes permit

- **As a** Supervisor
- **I want** to suspend and resume permits
- **So that** I can halt work for safety reasons

- **Phase:** P7
- **Related journey(s):** P7-J11
- **Related checklist IDs:** C-229
- **Acceptance criteria:**
  1. **Suspend**
     - Given an active permit
       When I suspend with a reason
       Then the status changes to suspended
       And workers are notified
  2. **Resume**
     - Given a suspended permit
       When I resume
       Then the status changes back to active

---

### Story US-PERMIT-10 - System auto-expires permits

- **As a** System
- **I want** to automatically expire permits past their valid_until time
- **So that** expired permits are clearly marked

- **Phase:** P7
- **Related journey(s):** P7-J12
- **Related checklist IDs:** C-230
- **Acceptance criteria:**
  1. **Auto-expire**
     - Given an active permit past valid_until
       When the scheduled job runs
       Then the permit status changes to expired
  2. **Notification**
     - Given a permit auto-expires
       Then notifications are sent to requester and supervisor

---

### Story US-PERMIT-11 - System detects conflicts

- **As a** User creating a permit
- **I want** to be warned of conflicting permits
- **So that** I can coordinate with other work

- **Phase:** P7
- **Related journey(s):** P7-J13
- **Related checklist IDs:** C-231
- **Acceptance criteria:**
  1. **Detect overlap**
     - Given an active permit at a location
       When I create a permit for the same location and time
       Then a warning is displayed
  2. **Allow proceed**
     - Given a conflict warning
       When I acknowledge it
       Then I can still create the permit
       And the conflict is recorded

---

### Story US-PERMIT-12 - Admin configures permit types

- **As an** Admin
- **I want** to create custom permit types
- **So that** our organisation's needs are met

- **Phase:** P7
- **Related journey(s):** P7-J14
- **Related checklist IDs:** C-232, C-233
- **Acceptance criteria:**
  1. **Create type**
     - Given I am an admin
       When I create a permit type with name, code, duration
       Then it is available for permit creation
  2. **Add controls**
     - Given I am creating a permit type
       When I add pre/during/post-work controls
       Then they are saved as the template
  3. **System types**
     - Given system permit types exist
       Then they are read-only

---

### Story US-PERMIT-13 - Link permits to incidents

- **As a** Manager
- **I want** to link permits to incidents
- **So that** I can investigate incidents during permitted work

- **Phase:** P7
- **Related journey(s):** P7-J15
- **Related checklist IDs:** C-234
- **Acceptance criteria:**
  1. **Link**
     - Given an incident and a permit
       When I link them
       Then the permit appears on the incident
       And the incident appears on the permit
  2. **Search**
     - Given I want to link a permit
       When I search by permit number
       Then I can find and select it

---

## 17. Epic E15 - Training & Competence Management (Phase 8)

### Story US-TRAIN-01 - Admin manages training categories

- **As an** Admin
- **I want** to manage training categories
- **So that** courses can be organised logically

- **Phase:** P8
- **Related journey(s):** P8-J1
- **Related checklist IDs:** C-200
- **Acceptance criteria:**
  1. **List categories**
     - Given I am an admin
       When I navigate to Training Settings > Categories
       Then I see all categories with name, code, and status
  2. **Create category**
     - Given I am an admin
       When I create a new category with name and code
       Then it is saved and available for courses
  3. **System categories**
     - Given system categories exist
       Then they cannot be deleted but can be deactivated

---

### Story US-TRAIN-02 - Admin manages training courses

- **As an** Admin
- **I want** to create and manage training courses
- **So that** the organisation has a comprehensive training catalogue

- **Phase:** P8
- **Related journey(s):** P8-J1
- **Related checklist IDs:** C-201, C-202, C-203, C-207
- **Acceptance criteria:**
  1. **List courses**
     - Given courses exist
       When I navigate to Training Catalogue
       Then I see courses with filters for category, status, delivery type
  2. **Create course**
     - Given I am an admin
       When I create a course with title, code, category, delivery type, duration
       Then the course is saved
       And appears in the catalogue
  3. **Prerequisites**
     - Given other courses exist
       When I configure prerequisites for a course
       Then they are enforced during enrollment
  4. **Attachments**
     - Given I am editing a course
       When I upload materials
       Then they are attached and downloadable

---

### Story US-TRAIN-03 - Admin schedules training sessions

- **As an** Admin
- **I want** to schedule instructor-led training sessions
- **So that** learners can attend at planned times

- **Phase:** P8
- **Related journey(s):** P8-J2
- **Related checklist IDs:** C-204
- **Acceptance criteria:**
  1. **Schedule session**
     - Given a course exists
       When I schedule a session with date, time, location, trainer, capacity
       Then the session is created
       And visible in the calendar
  2. **Update session**
     - Given a scheduled session
       When I update details
       Then enrolled users are notified
  3. **Cancel session**
     - Given a session with enrollments
       When I cancel the session
       Then all enrollees are notified

---

### Story US-TRAIN-04 - Manager enrolls users in sessions

- **As a** Manager
- **I want** to enroll team members in training sessions
- **So that** they receive required training

- **Phase:** P8
- **Related journey(s):** P8-J3
- **Related checklist IDs:** C-205, C-206, C-207
- **Acceptance criteria:**
  1. **Enroll users**
     - Given a session with capacity
       When I enroll users
       Then they receive enrollment notification
  2. **Waitlist**
     - Given a full session
       When I enroll a user
       Then they are added to the waitlist
  3. **Self-enrollment**
     - Given a course allows self-enrollment
       When a worker books a session
       Then they are enrolled

---

### Story US-TRAIN-05 - Trainer records session attendance

- **As a** Trainer
- **I want** to record attendance and results
- **So that** completions are logged accurately

- **Phase:** P8
- **Related journey(s):** P8-J4
- **Related checklist IDs:** C-208, C-209
- **Acceptance criteria:**
  1. **Record attendance**
     - Given a session with enrollees
       When I mark attendance status for each user
       Then attendance is recorded
  2. **Record results**
     - Given users attended
       When I record pass/fail and scores
       Then completions are created
  3. **Close assignments**
     - Given users have assignments for this course
       When completion is recorded
       Then assignments are marked complete

---

### Story US-TRAIN-06 - Supervisor assigns training

- **As a** Supervisor
- **I want** to assign training to individuals
- **So that** they know what training is required

- **Phase:** P8
- **Related journey(s):** P8-J5
- **Related checklist IDs:** C-210, C-211, C-213
- **Acceptance criteria:**
  1. **Individual assignment**
     - Given a user and course
       When I create an assignment with due date
       Then the user is notified
       And assignment appears in their My Training
  2. **Prevent duplicates**
     - Given user already has assignment for course
       When I try to assign again
       Then I receive a warning
  3. **Waive**
     - Given a valid reason
       When I waive an assignment
       Then it is marked as waived with reason

---

### Story US-TRAIN-07 - Admin bulk assigns by role/site

- **As an** Admin
- **I want** to bulk assign training by role or site
- **So that** groups receive required training efficiently

- **Phase:** P8
- **Related journey(s):** P8-J6
- **Related checklist IDs:** C-212
- **Acceptance criteria:**
  1. **Assign by role**
     - Given a role and course
       When I bulk assign
       Then all users with that role receive assignments
  2. **Assign by site**
     - Given a site and course
       When I bulk assign
       Then all users at that site receive assignments
  3. **Skip existing**
     - Given some users already have assignments
       Then they are skipped

---

### Story US-TRAIN-08 - Admin creates assignment rules

- **As an** Admin
- **I want** to create auto-assignment rules
- **So that** new employees automatically receive required training

- **Phase:** P8
- **Related journey(s):** P8-J7
- **Related checklist IDs:** C-214
- **Acceptance criteria:**
  1. **Create rule**
     - Given a course and role
       When I create an auto-assignment rule
       Then it is saved and active
  2. **Auto-assign**
     - Given a new user joins with matching role
       When the assignment job runs
       Then they receive the assignment

---

### Story US-TRAIN-09 - Supervisor records completions

- **As a** Supervisor
- **I want** to record training completions
- **So that** training records are up-to-date

- **Phase:** P8
- **Related journey(s):** P8-J8
- **Related checklist IDs:** C-209, C-215
- **Acceptance criteria:**
  1. **Record completion**
     - Given a user and course
       When I record completion with date and result
       Then the completion is saved
       And expiry date is calculated
  2. **Close assignment**
     - Given user has assignment for course
       When completion is recorded
       Then assignment is marked complete

---

### Story US-TRAIN-10 - Supervisor records external training

- **As a** Supervisor
- **I want** to record external training
- **So that** off-site training is tracked

- **Phase:** P8
- **Related journey(s):** P8-J9
- **Related checklist IDs:** C-216, C-217, C-218
- **Acceptance criteria:**
  1. **Record external**
     - Given external training was completed
       When I enter provider, date, certificate
       Then completion is recorded
       And marked for verification
  2. **Upload evidence**
     - Given recording external training
       When I upload certificate
       Then it is attached as evidence
  3. **Verify**
     - Given pending verification
       When admin verifies
       Then completion is confirmed

---

### Story US-TRAIN-11 - Worker views My Training

- **As a** Worker
- **I want** to view my training status
- **So that** I know what training I need to complete

- **Phase:** P8
- **Related journey(s):** P8-J10
- **Related checklist IDs:** C-219, C-206
- **Acceptance criteria:**
  1. **View summary**
     - Given I have assignments and completions
       When I navigate to My Training
       Then I see summary cards with counts
  2. **View assignments**
     - Given I have assignments
       Then I see list with due dates and status
  3. **Book session**
     - Given available sessions exist
       When I click Book Session
       Then I can self-enroll
  4. **View expiring**
     - Given I have expiring certifications
       Then I see them highlighted

---

### Story US-TRAIN-12 - Manager views training matrix

- **As a** Manager
- **I want** to view the training matrix
- **So that** I can see team competency status at a glance

- **Phase:** P8
- **Related journey(s):** P8-J11
- **Related checklist IDs:** C-220, C-222
- **Acceptance criteria:**
  1. **View matrix**
     - Given users and courses exist
       When I navigate to Training Matrix
       Then I see users vs courses grid with status
  2. **Filter**
     - Given matrix displayed
       When I filter by site, role, or course
       Then results are filtered
  3. **Cell status**
     - Given completion/assignment status
       Then cells show appropriate indicators
  4. **Export**
     - When I export
       Then Excel file is downloaded

---

### Story US-TRAIN-13 - Manager analyses training gaps

- **As a** Manager
- **I want** to identify training gaps
- **So that** I can prioritise training needs

- **Phase:** P8
- **Related journey(s):** P8-J12
- **Related checklist IDs:** C-221
- **Acceptance criteria:**
  1. **View gaps**
     - Given role requirements are configured
       When I view gap analysis
       Then I see users missing required training
  2. **Expired gaps**
     - Given expired completions
       Then they appear as gaps

---

### Story US-TRAIN-14 - Admin configures role requirements

- **As an** Admin
- **I want** to configure mandatory training by role
- **So that** requirements are clear

- **Phase:** P8
- **Related journey(s):** P8-J13
- **Related checklist IDs:** C-223, C-224
- **Acceptance criteria:**
  1. **Set requirements**
     - Given a role
       When I add required courses
       Then they are saved
  2. **Gap detection**
     - Given requirements set
       Then matrix/gap analysis uses them

---

### Story US-TRAIN-15 - Manager generates training reports

- **As a** Manager
- **I want** to generate training reports
- **So that** I can demonstrate compliance

- **Phase:** P8
- **Related journey(s):** P8-J14
- **Related checklist IDs:** C-225, C-226
- **Acceptance criteria:**
  1. **Compliance report**
     - When I generate compliance overview
       Then PDF includes compliance rate by site/role
  2. **User history**
     - When I generate user history
       Then PDF includes all completions
  3. **Matrix export**
     - When I export matrix
       Then Excel includes all status data

---

### Story US-TRAIN-16 - System sends training reminders

- **As a** System
- **I want** to send reminders for expiring/overdue training
- **So that** users stay compliant

- **Phase:** P8
- **Related journey(s):** P8-J15
- **Related checklist IDs:** C-215, C-227, C-228
- **Acceptance criteria:**
  1. **Expiry reminders**
     - Given training expiring in 30/14/7 days
       When job runs
       Then user is notified
  2. **Overdue alerts**
     - Given assignment past due
       When job runs
       Then user and manager are notified

---

### Story US-TRAIN-17 - System sends training notifications

- **As a** System
- **I want** to send notifications for training events
- **So that** users are informed

- **Phase:** P8
- **Related journey(s):** P8-J15
- **Related checklist IDs:** C-229
- **Acceptance criteria:**
  1. **Assignment notification**
     - Given training assigned
       Then user receives notification
  2. **Enrollment notification**
     - Given user enrolled in session
       Then user receives notification
  3. **Completion notification**
     - Given completion recorded
       Then user receives notification

---

### Story US-TRAIN-18 - Training integrates with other modules

- **As a** User
- **I want** training to integrate with actions and analytics
- **So that** there is a connected experience

- **Phase:** P8
- **Related journey(s):** P8-J16
- **Related checklist IDs:** C-228, C-229, C-230
- **Acceptance criteria:**
  1. **Action link**
     - Given an action recommends training
       When I link a course
       Then completion updates action
  2. **Analytics**
     - Given training data exists
       Then training widgets appear in analytics

---

### Story US-TRAIN-19 - Training respects RBAC

- **As a** System
- **I want** training to respect role-based access
- **So that** data is protected

- **Phase:** P8
- **Related journey(s):** All P8
- **Related checklist IDs:** C-231
- **Acceptance criteria:**
  1. **Worker access**
     - Workers can only view My Training
  2. **Supervisor access**
     - Supervisors can view/assign for their team
  3. **Manager access**
     - Managers can manage courses
  4. **Org isolation**
     - Users cannot access other org training
---

## 18. Epic E16 - Risk Register & Enterprise Risk Management (Phase 9)

### Story US-RISK-01 - Manager views risk register

- **As a** Manager
- **I want** to view the central risk register
- **So that** I can see all identified risks and their current status

- **Phase:** P9
- **Related journey(s):** P9-J1, P9-J4
- **Related checklist IDs:** C-240
- **Acceptance criteria:**
  1. **View risk list**
     - Given I am a Manager
       When I navigate to Risk Register
       Then I see a list of all risks with key columns
  2. **Filter risks**
     - Given the risk list is displayed
       When I apply filters (status, level, category, site)
       Then only matching risks are shown
  3. **Search risks**
     - Given the risk list is displayed
       When I search by title or description
       Then matching risks are shown
  4. **Site isolation**
     - Given I am a Worker
       When I view risk register
       Then I only see risks for my assigned site(s)

---

### Story US-RISK-02 - Manager creates risk

- **As a** Manager
- **I want** to create a new risk entry
- **So that** hazards are formally documented and tracked

- **Phase:** P9
- **Related journey(s):** P9-J1
- **Related checklist IDs:** C-241
- **Acceptance criteria:**
  1. **Create with required fields**
     - Given I am on Add Risk form
       When I enter title, category, inherent scores, owner, site
       Then the risk is created with unique reference
  2. **Multi-step form**
     - Given I am creating a risk
       When I progress through steps
       Then I can enter basic info, hazard details, and scoring
  3. **Score calculation**
     - Given I enter likelihood 4 and impact 5
       Then inherent score shows 20 (Extreme)
  4. **Permission check**
     - Given I am a Worker
       When I try to create a risk
       Then access is denied

---

### Story US-RISK-03 - Manager edits risk

- **As a** Manager
- **I want** to edit existing risk details
- **So that** risk information remains accurate

- **Phase:** P9
- **Related journey(s):** P9-J1
- **Related checklist IDs:** C-242
- **Acceptance criteria:**
  1. **Edit own risk**
     - Given I own a risk
       When I update the description
       Then the change is saved
  2. **Admin edit any**
     - Given I am an Admin
       When I edit any risk
       Then the change is saved
  3. **Audit trail**
     - Given a risk is edited
       Then the change is logged in audit history

---

### Story US-RISK-04 - System calculates risk scores

- **As a** System
- **I want** to calculate risk scores automatically
- **So that** levels are consistent and accurate

- **Phase:** P9
- **Related journey(s):** P9-J1
- **Related checklist IDs:** C-244, C-245
- **Acceptance criteria:**
  1. **Score calculation**
     - Given likelihood L and impact I
       Then score = L × I
  2. **Level determination**
     - Given score 1-4 then level = Low
     - Given score 5-9 then level = Medium
     - Given score 10-16 then level = High
     - Given score 17-25 then level = Extreme
  3. **Tolerance comparison**
     - Given residual level exceeds tolerance
       Then warning displayed

---

### Story US-RISK-05 - Manager manages risk controls

- **As a** Manager
- **I want** to add controls to a risk
- **So that** mitigation measures are documented

- **Phase:** P9
- **Related journey(s):** P9-J2
- **Related checklist IDs:** C-246, C-247
- **Acceptance criteria:**
  1. **Add control**
     - Given I am on risk Controls tab
       When I add a control with type and hierarchy
       Then the control appears in the list
  2. **Control hierarchy**
     - Given I add a control
       Then I can specify hierarchy (elimination, substitution, engineering, admin, PPE)
  3. **Control effectiveness**
     - Given I have a control
       When I set effectiveness
       Then it shows as effective, partial, or ineffective
  4. **Edit/delete control**
     - Given I have a control
       Then I can edit or remove it

---

### Story US-RISK-06 - Manager links controls to entities

- **As a** Manager
- **I want** to link controls to actions, training, or permits
- **So that** control implementation is traceable

- **Phase:** P9
- **Related journey(s):** P9-J2
- **Related checklist IDs:** C-248
- **Acceptance criteria:**
  1. **Link to action**
     - Given I have a control
       When I link it to an action
       Then the action appears under the control
  2. **Link to training**
     - Given I have a control
       When I link it to a training course
       Then training completion rate shown
  3. **Link to permit**
     - Given I have a control
       When I link it to a permit
       Then permit status shown

---

### Story US-RISK-07 - Manager links risks to entities

- **As a** Manager
- **I want** to link risks to related incidents, actions, and inspections
- **So that** relationships are documented

- **Phase:** P9
- **Related journey(s):** P9-J2
- **Related checklist IDs:** C-249
- **Acceptance criteria:**
  1. **Link to incident**
     - Given I have a risk
       When I link to an incident
       Then the incident appears in Links tab
  2. **Link to action**
     - Given I have a risk
       When I link to an action
       Then the action appears with status
  3. **Multiple entity types**
     - Given I have a risk
       Then I can link to incidents, actions, inspections, training, chemicals, permits
  4. **View grouped links**
     - Given I have links
       Then they display grouped by entity type

---

### Story US-RISK-08 - Manager records risk review

- **As a** Manager (Risk Owner)
- **I want** to record periodic risk reviews
- **So that** risks are regularly assessed and updated

- **Phase:** P9
- **Related journey(s):** P9-J3
- **Related checklist IDs:** C-250
- **Acceptance criteria:**
  1. **Record review**
     - Given I am the risk owner
       When I complete the review form
       Then the review is recorded with date and outcome
  2. **Verify controls**
     - Given I am recording a review
       When I verify each control
       Then verification dates update
  3. **Update scores**
     - Given I record a review
       When I change residual scores
       Then the risk is updated
  4. **Score snapshot**
     - Given I record a review
       Then previous scores are preserved in history

---

### Story US-RISK-09 - System schedules reviews

- **As a** System
- **I want** to calculate and schedule next review dates
- **So that** reviews happen on time

- **Phase:** P9
- **Related journey(s):** P9-J3
- **Related checklist IDs:** C-251
- **Acceptance criteria:**
  1. **Next review calculation**
     - Given review frequency is quarterly
       When a review is recorded
       Then next review date is 90 days later
  2. **Overdue indication**
     - Given next review date has passed
       Then risk shows as overdue in list
  3. **Upcoming reviews list**
     - Given reviews due in next 30 days
       Then they appear in upcoming reviews

---

### Story US-RISK-10 - Manager views risk heatmap

- **As a** Manager
- **I want** to view a risk heatmap
- **So that** I can visualise risk distribution

- **Phase:** P9
- **Related journey(s):** P9-J4
- **Related checklist IDs:** C-252
- **Acceptance criteria:**
  1. **View 5×5 matrix**
     - Given I navigate to Heatmap
       Then I see a 5×5 matrix with risk counts
  2. **Colour coding**
     - Given cells have risks
       Then they are coloured by level (green, yellow, orange, red)
  3. **Toggle inherent/residual**
     - Given I toggle view
       Then heatmap recalculates
  4. **Drill-down**
     - Given I click a cell
       Then I see the risks in that cell

---

### Story US-RISK-11 - Manager views risk analytics

- **As a** Manager
- **I want** to view risk analytics and trends
- **So that** I can report on risk profile

- **Phase:** P9
- **Related journey(s):** P9-J4
- **Related checklist IDs:** C-253
- **Acceptance criteria:**
  1. **Top risks widget**
     - Given risks exist
       Then I see top 5 highest residual risks
  2. **Risks by category**
     - Given risks exist
       Then I see breakdown by category
  3. **Review compliance**
     - Given reviews are due
       Then I see compliance percentage
  4. **Trend over time**
     - Given historical data exists
       Then I see trend chart

---

### Story US-RISK-12 - Admin manages risk categories

- **As an** Admin
- **I want** to manage risk categories
- **So that** risks are properly classified

- **Phase:** P9
- **Related journey(s):** P9-J5
- **Related checklist IDs:** C-257
- **Acceptance criteria:**
  1. **Create category**
     - Given I am Admin
       When I create a category with name and colour
       Then it appears in category list
  2. **Edit category**
     - Given a category exists
       When I edit the name
       Then changes are saved
  3. **Deactivate category**
     - Given a category has risks
       When I deactivate it
       Then it's not available for new risks

---

### Story US-RISK-13 - Admin configures risk settings

- **As an** Admin
- **I want** to configure scoring matrix and tolerances
- **So that** risk assessment matches our criteria

- **Phase:** P9
- **Related journey(s):** P9-J5
- **Related checklist IDs:** C-260
- **Acceptance criteria:**
  1. **Edit scoring labels**
     - Given I am Admin
       When I edit likelihood/impact labels
       Then changes apply to risk forms
  2. **Set tolerances**
     - Given I am Admin
       When I set tolerance to Medium
       Then High+ risks show tolerance warnings

---

### Story US-RISK-14 - Manager exports risk register

- **As a** Manager
- **I want** to export the risk register
- **So that** I can share with auditors

- **Phase:** P9
- **Related journey(s):** P9-J6
- **Related checklist IDs:** C-256
- **Acceptance criteria:**
  1. **Export to Excel**
     - Given I click Export
       When I select Excel format
       Then an Excel file downloads
  2. **Export to PDF**
     - Given I click Export
       When I select PDF format
       Then a PDF file downloads
  3. **Include options**
     - Given I am exporting
       When I select include controls/links
       Then they are in the export
  4. **Filter respected**
     - Given I have filters applied
       When I export
       Then only filtered risks are included

---

### Story US-RISK-15 - System sends risk notifications

- **As a** System
- **I want** to send review reminders and escalations
- **So that** reviews happen on time

- **Phase:** P9
- **Related journey(s):** P9-J3
- **Related checklist IDs:** C-254, C-255
- **Acceptance criteria:**
  1. **Review reminder**
     - Given review due in 7 days
       Then owner receives reminder
  2. **Overdue escalation**
     - Given review is overdue
       Then owner and manager notified
  3. **Extreme risk alert**
     - Given extreme risk created
       Then Admins receive immediate alert
  4. **Tolerance breach**
     - Given risk exceeds tolerance
       Then escalation notification sent

---

## 19. Epic E17 - Integrations, SSO & External Connectivity (Phase 10)

### Story US-SSO-01 - Admin creates SSO provider

- **As an** Admin
- **I want** to configure an SSO provider for my organisation
- **So that** users can log in with their corporate credentials

- **Phase:** P10
- **Related journey(s):** P10-J1
- **Related checklist IDs:** C-270
- **Acceptance criteria:**
  1. **Create OIDC provider**
     - Given I am an Admin with manage_integrations permission
       When I complete the SSO configuration wizard
       Then an SSO provider is created in draft status
  2. **Test connection**
     - Given I have configured SSO settings
       When I click Test Connection
       Then the system validates the IdP discovery document
  3. **Activate provider**
     - Given the SSO provider is in draft status
       When I activate it
       Then users can login via SSO
  4. **Secret encryption**
     - Given I enter a client secret
       Then it is encrypted before storage
       And never displayed after creation

---

### Story US-SSO-02 - Admin manages role mappings

- **As an** Admin
- **I want** to map IdP groups to EHS roles
- **So that** users get appropriate permissions on SSO login

- **Phase:** P10
- **Related journey(s):** P10-J1
- **Related checklist IDs:** C-274
- **Acceptance criteria:**
  1. **Create mapping**
     - Given I have an SSO provider
       When I create a role mapping with IdP claim value and EHS role
       Then the mapping is saved
  2. **Priority ordering**
     - Given multiple mappings match a user
       Then the highest priority mapping is applied
  3. **Default role**
     - Given no mappings match a user
       Then the default role is applied
  4. **Edit/delete mapping**
     - Given an existing mapping
       Then I can edit or delete it

---

### Story US-SSO-03 - Admin enables SSO-only mode

- **As an** Admin
- **I want** to require SSO for all users
- **So that** password login is disabled for enhanced security

- **Phase:** P10
- **Related journey(s):** P10-J1
- **Related checklist IDs:** C-275
- **Acceptance criteria:**
  1. **Enable SSO-only**
     - Given I have an active SSO provider
       When I enable SSO-only mode
       Then password login is blocked
  2. **Warning displayed**
     - Given I am enabling SSO-only mode
       Then I see a warning about implications
  3. **Login page update**
     - Given SSO-only mode is enabled
       Then the login page hides the password form

---

### Story US-SSO-04 - User logs in via SSO

- **As a** User
- **I want** to log in using my corporate credentials
- **So that** I don't need a separate EHS password

- **Phase:** P10
- **Related journey(s):** P10-J2
- **Related checklist IDs:** C-271, C-272
- **Acceptance criteria:**
  1. **SSO button appears**
     - Given my email domain has SSO configured
       When I enter my email on the login page
       Then a "Sign in with SSO" button appears
  2. **Redirect to IdP**
     - Given I click the SSO button
       Then I am redirected to the IdP login page
  3. **Return and session**
     - Given I authenticate at the IdP
       Then I am redirected back to EHS with a valid session
  4. **Fast login**
     - Given I complete SSO login
       Then the callback processes in under 2 seconds

---

### Story US-SSO-05 - System provisions user on first SSO login

- **As a** System
- **I want** to create user accounts automatically on first SSO login
- **So that** new employees can access EHS immediately

- **Phase:** P10
- **Related journey(s):** P10-J2
- **Related checklist IDs:** C-296, C-297
- **Acceptance criteria:**
  1. **JIT creation**
     - Given a user logs in via SSO for the first time
       When they don't have an EHS account
       Then one is created with IdP attributes
  2. **Attribute mapping**
     - Given user is created via JIT
       Then email, name are populated from IdP claims
  3. **External ID stored**
     - Given user is created via JIT
       Then the IdP subject (sub) is stored as external_id
  4. **Role assigned**
     - Given user is created via JIT
       Then role is assigned based on role mappings

---

### Story US-SSO-06 - System syncs user attributes on login

- **As a** System
- **I want** to update user attributes from IdP claims on each login
- **So that** user data stays in sync

- **Phase:** P10
- **Related journey(s):** P10-J2
- **Related checklist IDs:** C-297
- **Acceptance criteria:**
  1. **Name sync**
     - Given user's name changed in IdP
       When they log in via SSO
       Then EHS user name is updated
  2. **Email sync**
     - Given user's email changed in IdP
       When they log in via SSO
       Then EHS user email is updated
  3. **Role resync**
     - Given user's groups changed in IdP
       When they log in via SSO
       Then EHS user role is updated based on mappings

---

### Story US-SSO-07 - SSO logins are audited

- **As a** Compliance Officer
- **I want** all SSO login attempts logged
- **So that** I can audit access patterns

- **Phase:** P10
- **Related journey(s):** P10-J2
- **Related checklist IDs:** C-294
- **Acceptance criteria:**
  1. **Success logged**
     - Given a successful SSO login
       Then an entry is created in sso_login_attempts
  2. **Failure logged**
     - Given a failed SSO login attempt
       Then an entry is created with failure reason
  3. **Audit log entry**
     - Given a successful SSO login
       Then an entry appears in the main audit log

---

### Story US-API-01 - Admin creates API client

- **As an** Admin
- **I want** to create API clients for external integrations
- **So that** systems can access EHS data programmatically

- **Phase:** P10
- **Related journey(s):** P10-J3
- **Related checklist IDs:** C-276, C-277
- **Acceptance criteria:**
  1. **Create client**
     - Given I am an Admin with manage_integrations permission
       When I create an API client with name and scopes
       Then the client is created
  2. **Key displayed once**
     - Given I create an API client
       Then the API key is shown exactly once
       And I am warned to copy it
  3. **Key hashed**
     - Given an API client is created
       Then only the hash of the key is stored
  4. **Scopes assigned**
     - Given I specify scopes
       Then the client is limited to those scopes

---

### Story US-API-02 - External system authenticates with API key

- **As an** External System
- **I want** to authenticate to the public API with my key
- **So that** I can access permitted data

- **Phase:** P10
- **Related journey(s):** P10-J3
- **Related checklist IDs:** C-278, C-279
- **Acceptance criteria:**
  1. **Valid key**
     - Given I send a request with valid X-API-Key header
       Then the request is authenticated
  2. **Invalid key**
     - Given I send a request with invalid key
       Then 401 Unauthorized is returned
  3. **Revoked client**
     - Given my API client is revoked
       Then 401 Unauthorized is returned
  4. **Rate limit headers**
     - Given I make an authenticated request
       Then rate limit headers are included

---

### Story US-API-03 - Admin manages API client lifecycle

- **As an** Admin
- **I want** to manage API client status and credentials
- **So that** I can control access

- **Phase:** P10
- **Related journey(s):** P10-J3
- **Related checklist IDs:** C-276, C-277
- **Acceptance criteria:**
  1. **Regenerate key**
     - Given I regenerate an API key
       Then the old key stops working immediately
       And a new key is displayed once
  2. **Revoke client**
     - Given I revoke an API client
       Then all requests with that key are rejected
  3. **Suspend/activate**
     - Given I suspend an API client
       Then requests are temporarily blocked
       And I can reactivate later

---

### Story US-API-04 - System enforces rate limits

- **As a** System
- **I want** to enforce rate limits per API client
- **So that** API resources are protected

- **Phase:** P10
- **Related journey(s):** P10-J3
- **Related checklist IDs:** C-279
- **Acceptance criteria:**
  1. **Limit enforced**
     - Given a client with 1000 req/hour limit
       When 1001st request is made within an hour
       Then 429 Too Many Requests is returned
  2. **Headers returned**
     - Given any API request
       Then X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers are included
  3. **Reset works**
     - Given rate limit is exceeded
       When the window resets
       Then requests succeed again

---

### Story US-API-05 - System enforces scope authorization

- **As a** System
- **I want** to restrict API clients to their authorized scopes
- **So that** access is properly limited

- **Phase:** P10
- **Related journey(s):** P10-J3
- **Related checklist IDs:** C-277
- **Acceptance criteria:**
  1. **Within scope**
     - Given a client with incidents:read scope
       When GET /api/public/v1/incidents is called
       Then data is returned
  2. **Outside scope**
     - Given a client with incidents:read scope only
       When POST /api/public/v1/incidents is attempted
       Then 403 Forbidden is returned
  3. **Clear error**
     - Given insufficient scope
       Then error message indicates required scope

---

### Story US-API-06 - Admin configures IP allowlist

- **As an** Admin
- **I want** to restrict API access to specific IPs
- **So that** only authorized networks can connect

- **Phase:** P10
- **Related journey(s):** P10-J3
- **Related checklist IDs:** C-280
- **Acceptance criteria:**
  1. **Configure allowlist**
     - Given I create an API client
       When I specify an IP allowlist
       Then it is saved
  2. **IP check enforced**
     - Given IP allowlist is configured
       When request comes from non-allowed IP
       Then 403 Forbidden is returned
  3. **CIDR support**
     - Given I enter a CIDR range (e.g., 10.0.0.0/8)
       Then all IPs in that range are allowed

---

### Story US-API-07 - External system calls public API

- **As an** External System
- **I want** to read and write data via REST API
- **So that** I can integrate with EHS

- **Phase:** P10
- **Related journey(s):** P10-J3
- **Related checklist IDs:** C-282
- **Acceptance criteria:**
  1. **List incidents**
     - Given I have incidents:read scope
       When I call GET /api/public/v1/incidents
       Then I receive paginated incident list
  2. **Create incident**
     - Given I have incidents:write scope
       When I POST to /api/public/v1/incidents
       Then the incident is created
  3. **Org scoped**
     - Given I make any API call
       Then I only see/affect my organisation's data
  4. **Pagination**
     - Given there are many records
       Then I can paginate with limit and page parameters

---

### Story US-WEBHOOK-01 - Admin creates webhook

- **As an** Admin
- **I want** to configure webhooks for event notifications
- **So that** external systems receive EHS events

- **Phase:** P10
- **Related journey(s):** P10-J4
- **Related checklist IDs:** C-283, C-284
- **Acceptance criteria:**
  1. **Create webhook**
     - Given I am an Admin with manage_integrations permission
       When I create a webhook with URL and event types
       Then the webhook is created
  2. **Select events**
     - Given I am creating a webhook
       Then I can select specific event types to subscribe
  3. **Secret generated**
     - Given I create a webhook
       Then a signing secret is generated
  4. **Test delivery**
     - Given I have created a webhook
       When I click Test
       Then a test event is sent

---

### Story US-WEBHOOK-02 - System delivers webhooks

- **As a** System
- **I want** to deliver event payloads to configured webhooks
- **So that** external systems are notified of changes

- **Phase:** P10
- **Related journey(s):** P10-J4
- **Related checklist IDs:** C-285, C-286
- **Acceptance criteria:**
  1. **Delivery on event**
     - Given a webhook subscribed to incident.created
       When an incident is created
       Then the webhook receives the event
  2. **Payload format**
     - Given a webhook delivery
       Then payload includes id, type, timestamp, data
  3. **Signature header**
     - Given a webhook delivery
       Then X-EHS-Signature header contains HMAC signature
  4. **Timestamp header**
     - Given a webhook delivery
       Then X-EHS-Timestamp header is included

---

### Story US-WEBHOOK-03 - System retries failed webhooks

- **As a** System
- **I want** to retry failed webhook deliveries
- **So that** temporary failures don't cause data loss

- **Phase:** P10
- **Related journey(s):** P10-J4
- **Related checklist IDs:** C-287
- **Acceptance criteria:**
  1. **Retry on failure**
     - Given a webhook delivery fails
       Then it is retried automatically
  2. **Exponential backoff**
     - Given retries are needed
       Then delay increases exponentially
  3. **Max attempts**
     - Given retries are exhausted
       Then event is marked as failed
  4. **Manual retry**
     - Given a failed event
       Then Admin can trigger manual retry

---

### Story US-WEBHOOK-04 - System auto-suspends failing webhooks

- **As a** System
- **I want** to suspend webhooks with repeated failures
- **So that** resources aren't wasted on broken endpoints

- **Phase:** P10
- **Related journey(s):** P10-J4
- **Related checklist IDs:** C-288
- **Acceptance criteria:**
  1. **Failure threshold**
     - Given consecutive failures reach threshold
       Then webhook is suspended
  2. **Admin notification**
     - Given webhook is auto-suspended
       Then Admin is notified
  3. **Reactivation**
     - Given a suspended webhook
       Then Admin can reactivate after fixing the issue

---

### Story US-WEBHOOK-05 - System formats Teams webhooks

- **As a** System
- **I want** to format webhooks as Teams Adaptive Cards
- **So that** notifications display nicely in Teams

- **Phase:** P10
- **Related journey(s):** P10-J4
- **Related checklist IDs:** C-289
- **Acceptance criteria:**
  1. **Teams format**
     - Given webhook content_type is 'teams_channel'
       Then payload is formatted as Adaptive Card
  2. **Card includes details**
     - Given a Teams notification
       Then it includes title, description, and action button
  3. **Branding**
     - Given a Teams card
       Then it includes EHS branding/colors

---

### Story US-WEBHOOK-06 - Admin views webhook activity

- **As an** Admin
- **I want** to view webhook delivery history
- **So that** I can troubleshoot issues

- **Phase:** P10
- **Related journey(s):** P10-J4
- **Related checklist IDs:** C-285
- **Acceptance criteria:**
  1. **View deliveries**
     - Given I view a webhook
       Then I see recent delivery attempts
  2. **Status visible**
     - Given delivery records
       Then I see status (delivered, failed, retrying)
  3. **Response details**
     - Given a delivery record
       Then I can see response code and time
  4. **Filter activity**
     - Given many deliveries
       Then I can filter by status

---

### Story US-INT-01 - Admin views integration activity log

- **As an** Admin
- **I want** to view all integration activity
- **So that** I can monitor and audit integrations

- **Phase:** P10
- **Related journey(s):** P10-J1, P10-J2, P10-J3, P10-J4
- **Related checklist IDs:** C-293
- **Acceptance criteria:**
  1. **View all activity**
     - Given I navigate to Activity Log tab
       Then I see SSO, API, and webhook events
  2. **Filter by type**
     - Given activity log is displayed
       Then I can filter by event type
  3. **Date range filter**
     - Given activity log is displayed
       Then I can filter by date range
  4. **Export activity**
     - Given activity log is displayed
       Then I can export to CSV

---

### Story US-INT-02 - Admin exports integration configuration

- **As an** Admin
- **I want** to export integration configuration
- **So that** I can document or replicate the setup

- **Phase:** P10
- **Related journey(s):** P10-J1, P10-J3, P10-J4
- **Related checklist IDs:** C-295
- **Acceptance criteria:**
  1. **Export config**
     - Given I click Export Configuration
       Then a JSON file downloads
  2. **Secrets excluded**
     - Given the export
       Then client secrets and API keys are NOT included
  3. **Complete config**
     - Given the export
       Then SSO providers, API clients, and webhooks are included
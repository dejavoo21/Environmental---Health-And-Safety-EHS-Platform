# Business Requirements Document – EHS Portal Phase 8
## Training & Competence Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 8 – Training & Competence Management |

---

## 1. Executive Summary

Phase 8 introduces comprehensive Training & Competence Management capabilities to the EHS Portal. This module enables organisations to maintain a training catalogue, assign training to users/roles/sites, track completions with evidence, manage refresher schedules, and visualise competency status through a training matrix.

### 1.1 Business Context

With Phases 1-7 complete, the EHS Portal manages incidents, inspections, actions, chemicals, and permits. However, a critical gap exists:

- **No training visibility:** Cannot track whether workers have required safety training
- **Manual record-keeping:** Training records maintained in spreadsheets or paper files
- **Compliance risk:** No automated alerts for expired certifications or overdue refreshers
- **Incident linkage:** Cannot connect incidents to training gaps or assign training as corrective action
- **Audit burden:** Generating training reports for audits requires significant manual effort

Phase 8 addresses these gaps with a complete Training Management System integrated into the EHS ecosystem.

### 1.2 Business Goals

| Goal ID | Goal | Success Metric |
|---------|------|----------------|
| G-P8-01 | Centralise training records | 100% of safety training tracked in portal |
| G-P8-02 | Ensure training compliance | <5% overdue training at any time |
| G-P8-03 | Reduce audit preparation time | <15 minutes to generate audit-ready training report |
| G-P8-04 | Enable proactive refresher management | 100% refresher reminders sent 30 days before expiry |
| G-P8-05 | Link training to safety outcomes | Correlation visible between training and incident rates |
| G-P8-06 | Improve worker competence visibility | Training matrix available per site/role |

### 1.3 Scope

**In Scope:**
- Training course catalogue management
- Training session scheduling (instructor-led, virtual)
- Training assignments by user, role, or site
- Completion tracking with pass/fail and evidence
- Validity periods and expiry management
- Refresher course associations
- Training matrix views (user × course, role × course, site × course)
- My Training page for individual users
- Integration with actions (training as corrective action)
- Integration with incidents (link training gaps)
- PDF/Excel exports for audits
- Integration with notification system (Phase 4)
- Analytics integration (Phase 5) for training KPIs

**Out of Scope:**
- Full LMS/SCORM player integration (placeholder links only)
- E-learning content authoring
- In-portal quiz/exam delivery
- Automated attendance tracking (e.g., via QR codes)
- External training provider API integrations
- Digital signature capture for completion certificates
- Mobile offline training completion

---

## 2. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Workers | Trainees | View assigned training, see completion history |
| Supervisors | Training coordinators | Record completions, manage session attendance |
| Managers | Training administrators | Assign training, view matrix, generate reports |
| Admins | System administrators | Configure courses, types, validity rules |
| Compliance Lead | Oversight | Audit training records, ensure compliance |
| HSE Director | Executive sponsor | Training KPIs, risk mitigation |
| Trainers | Internal/external | Conduct sessions, record attendance |

---

## 3. Business Requirements

### 3.1 Training Catalogue (BR-TRAIN-CAT)

#### BR-TRAIN-CAT-01: Course Management
**Priority:** Must Have

The system shall support a training course catalogue with the following attributes:
1. **Basic Info:** Title, course code, category, description, duration (hours/days)
2. **Delivery Type:** Online, Classroom, Virtual, Toolbox Talk, On-the-Job
3. **Classification:** Initial training, Refresher training
4. **Requirement Level:** Mandatory, Optional
5. **Validity Period:** Duration in months (0 = no expiry)
6. **Owner:** Responsible person/department
7. **Status:** Active, Inactive, Archived
8. **Prerequisites:** Optional link to other courses

**Acceptance Criteria:**
- Admins can create courses with all fields
- Courses can be searched by title, code, category
- Courses can be filtered by delivery type, status, category
- Course detail shows all metadata and linked sessions
- Inactive courses not available for new assignments

**Capability ID:** C-200

---

#### BR-TRAIN-CAT-02: Course Categories
**Priority:** Must Have

The system shall support configurable course categories:
1. **System Categories:** Safety, Compliance, Technical, Emergency Response, Environmental, Management
2. **Custom Categories:** Organisation can add custom categories

**Acceptance Criteria:**
- System categories seeded on deployment
- Admins can add/edit custom categories
- Categories used in filtering and reporting

**Capability ID:** C-201

---

#### BR-TRAIN-CAT-03: Course Attachments
**Priority:** Should Have

The system shall support file attachments for courses:
1. **Types:** Syllabus (PDF), Slides (PDF/PPTX), Materials list, Reference documents
2. **SCORM Placeholder:** URL field for external e-learning link
3. **Storage:** Reuse existing attachment mechanism from Phase 2

**Acceptance Criteria:**
- Multiple attachments per course
- File type/size validation
- Attachments downloadable by users with view access

**Capability ID:** C-202

---

#### BR-TRAIN-CAT-04: Course Prerequisites
**Priority:** Could Have

The system shall support optional prerequisite courses:
1. **Simple Prerequisites:** Course A requires Course B completion
2. **Warning on Assignment:** Alert if assigning without prerequisites met

**Acceptance Criteria:**
- Prerequisites configurable per course
- Assignment warns if prerequisite not complete
- Prerequisite check is advisory (can be overridden)

**Capability ID:** C-203

---

### 3.2 Training Sessions (BR-TRAIN-SESS)

#### BR-TRAIN-SESS-01: Session Scheduling
**Priority:** Must Have

The system shall support training sessions for instructor-led training:
1. **Fields:** Course, date, start time, end time, location (site + room/area), trainer, max participants
2. **Status:** Scheduled, In Progress, Completed, Cancelled
3. **Virtual Sessions:** Meeting link field for virtual/hybrid sessions

**Acceptance Criteria:**
- Sessions linked to a course
- Sessions can be created/edited by Managers/Admins
- Session list filterable by date, site, course, status
- Session detail shows enrolled participants

**Capability ID:** C-204

---

#### BR-TRAIN-SESS-02: Session Enrollment
**Priority:** Must Have

The system shall allow enrollment of users into sessions:
1. **Manual Enrollment:** Manager/Admin adds participants
2. **Self-Enrollment:** Optional - users can enroll themselves (configurable per course)
3. **Capacity Check:** Warn when max participants reached
4. **Waitlist:** Optional waitlist functionality

**Acceptance Criteria:**
- Users can be enrolled individually or in bulk
- Capacity enforced with warning
- Enrollment status visible on session detail

**Capability ID:** C-205

---

#### BR-TRAIN-SESS-03: Session Attendance & Completion
**Priority:** Must Have

The system shall support recording session outcomes:
1. **Attendance:** Mark users as Attended, Absent, Partial
2. **Completion:** Mark as Completed/Passed, Completed/Failed, Did Not Attend
3. **Bulk Processing:** Record attendance for multiple participants at once
4. **Evidence:** Upload attendance sheets, photos

**Acceptance Criteria:**
- Trainer/Manager can record attendance post-session
- Completion status drives assignment status
- Attendance recorded with timestamp and recorder

**Capability ID:** C-206

---

### 3.3 Training Assignments (BR-TRAIN-ASSIGN)

#### BR-TRAIN-ASSIGN-01: Individual Assignments
**Priority:** Must Have

The system shall support assigning training to individual users:
1. **Fields:** User, Course, Due Date, Priority, Notes
2. **Due Date Logic:** Option to auto-calculate (e.g., 30 days from assignment)
3. **Source:** Manual, Role-based, Action-linked

**Acceptance Criteria:**
- Manager can assign course to user with due date
- User sees assignment in "My Training" page
- Assignment status tracked (pending, in_progress, completed, overdue)

**Capability ID:** C-207

---

#### BR-TRAIN-ASSIGN-02: Role-Based Assignments
**Priority:** Must Have

The system shall support assigning training to all users with a specific role:
1. **Role Selection:** Select role (e.g., "Site Supervisor")
2. **Auto-Expansion:** System creates individual assignments for all matching users
3. **Future Users:** Option to auto-assign to new users gaining that role

**Acceptance Criteria:**
- Admin can assign course to role
- All users with that role receive assignment
- New role assignments optionally inherit training requirements

**Capability ID:** C-208

---

#### BR-TRAIN-ASSIGN-03: Site-Based Assignments
**Priority:** Must Have

The system shall support assigning training to all users at a site:
1. **Site Selection:** Select one or more sites
2. **Auto-Expansion:** System creates individual assignments for all users at site
3. **Future Users:** Option to auto-assign to new users at that site

**Acceptance Criteria:**
- Admin can assign course to site
- All users at site receive assignment
- Optionally inheritable by new site workers

**Capability ID:** C-209

---

#### BR-TRAIN-ASSIGN-04: Training Requirements Profile
**Priority:** Should Have

The system shall support defining training requirements at role/site level:
1. **Training Profile:** Predefined list of required courses for a role/site
2. **Gap Analysis:** Compare user's completions against profile

**Acceptance Criteria:**
- Admins can define required courses for roles/sites
- System identifies gaps between requirements and actuals
- Gaps visible in training matrix

**Capability ID:** C-210

---

### 3.4 Training Matrix (BR-TRAIN-MATRIX)

#### BR-TRAIN-MATRIX-01: User × Course Matrix
**Priority:** Must Have

The system shall provide a matrix view showing users vs courses:
1. **Rows:** Users (filterable by site, role)
2. **Columns:** Courses (filterable by category, mandatory only)
3. **Cells:** Status indicator (not required, not assigned, assigned, completed, overdue, expired)
4. **Colors:** Green (compliant), Yellow (due soon), Red (overdue/expired), Gray (not required)

**Acceptance Criteria:**
- Matrix renders efficiently for up to 500 users × 50 courses
- Filters reduce dimensions for usability
- Cell click opens assignment/completion detail
- Export to Excel available

**Capability ID:** C-211

---

#### BR-TRAIN-MATRIX-02: Role × Course Matrix
**Priority:** Should Have

The system shall provide a matrix view showing roles vs courses:
1. **Rows:** Roles defined in system
2. **Columns:** Courses
3. **Cells:** Shows % completion across users with that role

**Acceptance Criteria:**
- Percentage calculated correctly
- Drill-down to individual users available
- Useful for identifying role-wide gaps

**Capability ID:** C-212

---

#### BR-TRAIN-MATRIX-03: Site × Course Matrix
**Priority:** Should Have

The system shall provide a matrix view showing sites vs courses:
1. **Rows:** Sites
2. **Columns:** Courses
3. **Cells:** Shows % completion across site workers

**Acceptance Criteria:**
- Percentage calculated correctly
- Drill-down to site workers available
- Useful for site-level compliance reporting

**Capability ID:** C-213

---

### 3.5 Validity & Refresher Management (BR-TRAIN-VALID)

#### BR-TRAIN-VALID-01: Validity Period Tracking
**Priority:** Must Have

The system shall track training validity and expiry:
1. **Validity Source:** Course defines validity in months
2. **Expiry Calculation:** Completion date + validity period
3. **Status Tracking:** Valid, Expiring Soon (configurable threshold), Expired
4. **Display:** Expiry date and status shown on completion records

**Acceptance Criteria:**
- Expiry date auto-calculated on completion
- Expiring Soon threshold configurable (default: 30 days)
- Expired status updates automatically (daily job or on-access)

**Capability ID:** C-214

---

#### BR-TRAIN-VALID-02: Refresher Course Association
**Priority:** Must Have

The system shall link initial courses to their refresher versions:
1. **Link:** Initial course references refresher course
2. **Auto-Assignment:** When initial expires, refresher can be auto-assigned
3. **Manual Option:** Or notify manager to assign refresher

**Acceptance Criteria:**
- Refresher course configurable on initial course
- Expiry triggers refresher workflow
- User sees refresher assignment when previous expires

**Capability ID:** C-215

---

#### BR-TRAIN-VALID-03: Expiry Notifications
**Priority:** Must Have

The system shall send notifications for training expiry:
1. **To User:** Notification X days before expiry (configurable)
2. **To Manager:** Notification for team members' expiring training
3. **Overdue Escalation:** Additional notification if training becomes overdue

**Acceptance Criteria:**
- Notifications sent via Phase 4 notification system
- Reminder intervals configurable (e.g., 30, 14, 7 days)
- Notification includes course name, expiry date, action link

**Capability ID:** C-216

---

### 3.6 Completion Evidence (BR-TRAIN-EVID)

#### BR-TRAIN-EVID-01: Completion Recording
**Priority:** Must Have

The system shall support recording training completions:
1. **Fields:** Completion date, result (Pass/Fail/Attended), score (optional), trainer/verifier, notes
2. **Source:** Manual entry, session attendance
3. **External Training:** Record completions for training done externally

**Acceptance Criteria:**
- Managers can record completions for their reports
- Users can submit completion requests (with evidence) for approval
- External training clearly flagged

**Capability ID:** C-217

---

#### BR-TRAIN-EVID-02: Evidence Attachments
**Priority:** Must Have

The system shall support evidence upload for completions:
1. **Types:** Certificates (PDF/Image), attendance records, assessment results
2. **Storage:** Reuse Phase 2 attachment mechanism
3. **Validation:** File type and size limits enforced

**Acceptance Criteria:**
- Evidence attachable to completion record
- Evidence viewable/downloadable by authorized users
- Evidence retained for audit purposes

**Capability ID:** C-218

---

### 3.7 Integration (BR-TRAIN-INT)

#### BR-TRAIN-INT-01: Action Integration
**Priority:** Must Have

The system shall integrate training with corrective actions:
1. **Training as Action:** Create action with type "Training" linking to course
2. **Auto-Assignment:** Option to auto-assign course when action created
3. **Completion Link:** Action auto-closed when training completed

**Acceptance Criteria:**
- "Training Required" action type available
- Action can reference specific course
- Training completion updates action status

**Capability ID:** C-219

---

#### BR-TRAIN-INT-02: Incident Integration
**Priority:** Should Have

The system shall integrate training with incident investigations:
1. **Training Gap Analysis:** Show training status of involved persons
2. **Recommended Training:** Suggest relevant training based on incident type
3. **Link Training to Incident:** Record training assigned as investigation outcome

**Acceptance Criteria:**
- Incident detail shows worker training status
- Training assignments can be linked to incidents
- Reports show training-related incident patterns

**Capability ID:** C-220

---

#### BR-TRAIN-INT-03: Analytics Integration
**Priority:** Must Have

The system shall provide training data to analytics:
1. **KPIs:** Training compliance rate, overdue %, completion trends
2. **Risk Correlation:** Training gaps vs incident rates
3. **Site Comparison:** Training compliance by site
4. **Dashboard Widget:** Training status on main dashboard

**Acceptance Criteria:**
- Training KPIs available in Phase 5 analytics
- Training data in daily aggregation jobs
- Dashboard shows training compliance indicator

**Capability ID:** C-221

---

### 3.8 Reporting & Exports (BR-TRAIN-RPT)

#### BR-TRAIN-RPT-01: User Training History
**Priority:** Must Have

The system shall export individual training history:
1. **Content:** All completions, dates, results, expiry status
2. **Format:** PDF (formatted) and Excel
3. **Use Case:** Individual development records, audit evidence

**Acceptance Criteria:**
- Export available from user profile or training page
- Includes all historical completions
- PDF formatted for printing/filing

**Capability ID:** C-222

---

#### BR-TRAIN-RPT-02: Course Completion Report
**Priority:** Must Have

The system shall export course completion lists:
1. **Content:** All users who completed course, dates, results
2. **Filters:** Date range, site, result (pass/fail)
3. **Format:** Excel

**Acceptance Criteria:**
- Export from course detail page
- Filterable by date range and site
- Includes expiry dates for validity tracking

**Capability ID:** C-223

---

#### BR-TRAIN-RPT-03: Training Matrix Snapshot
**Priority:** Must Have

The system shall export the training matrix:
1. **Content:** Matrix with users/courses and statuses
2. **Point-in-Time:** Snapshot as of export date
3. **Format:** Excel

**Acceptance Criteria:**
- Exportable from matrix page
- Maintains color coding in Excel (conditional formatting)
- Suitable for audit submission

**Capability ID:** C-224

---

### 3.9 User Experience (BR-TRAIN-UX)

#### BR-TRAIN-UX-01: My Training Page
**Priority:** Must Have

The system shall provide "My Training" page for all users:
1. **Assigned Training:** List with due dates, status, action buttons
2. **Training History:** Past completions with certificates
3. **Upcoming Sessions:** Sessions user is enrolled in
4. **Expiring Soon:** Highlight training expiring in next 30 days

**Acceptance Criteria:**
- Accessible to all authenticated users
- Mobile-responsive
- Quick access to enroll in sessions or view materials

**Capability ID:** C-225

---

#### BR-TRAIN-UX-02: Training Dashboard Widget
**Priority:** Should Have

The main dashboard shall include training status:
1. **My Training Status:** Count of assigned/overdue
2. **Team Training Status:** (for managers) Team compliance metrics

**Acceptance Criteria:**
- Widget shows at-a-glance training status
- Click through to My Training or Training Matrix

**Capability ID:** C-226

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Requirement | Target |
|-------------|--------|
| Training matrix load time | <3s for 500×50 matrix |
| Assignment bulk creation | <5s for 100 assignments |
| Search response | <500ms for course/user search |
| Report generation | <10s for 1000-row export |

### 4.2 Security

| Requirement | Detail |
|-------------|--------|
| Multi-tenant isolation | Training data scoped to organisation |
| Role-based access | Viewers read-only; Managers assign/record; Admins configure |
| Audit trail | All completions and status changes logged |
| Evidence security | Attachments protected by authorization |

### 4.3 Scalability

| Requirement | Target |
|-------------|--------|
| Users per organisation | Up to 10,000 |
| Courses per organisation | Up to 500 |
| Completions per year | Up to 100,000 |
| Concurrent matrix views | 50 |

### 4.4 Data Retention

| Data Type | Retention |
|-----------|-----------|
| Completion records | Indefinite (regulatory requirement) |
| Evidence attachments | Indefinite |
| Session records | Indefinite |
| Audit logs | As per Phase 6 (typically 7 years) |

---

## 5. Constraints & Assumptions

### 5.1 Constraints

1. **No SCORM Runtime:** The portal will not host SCORM content; only links to external LMS
2. **Manual Completion Recording:** Automated completion from e-learning requires future integration
3. **No Quiz Engine:** Assessments handled externally; portal records results only
4. **File Storage Limits:** Same as Phase 2 (10MB per file, shared storage pool)

### 5.2 Assumptions

1. **User Data Available:** All users exist in system with roles and site assignments
2. **Notification System Ready:** Phase 4 notifications operational
3. **Analytics Ready:** Phase 5 analytics can ingest new data sources
4. **Course Content External:** Actual training content hosted elsewhere; portal is registry/tracker

---

## 6. Dependencies

| Dependency | Phase | Requirement |
|------------|-------|-------------|
| User management | Phase 3 | Users with roles and sites |
| Attachment uploads | Phase 2 | Reuse for evidence and materials |
| Notification service | Phase 4 | Training reminders and alerts |
| Analytics service | Phase 5 | Training KPIs and dashboards |
| Action management | Phase 2 | Training as corrective action type |
| Incident management | Phase 1 | Link training to incidents |

---

## 7. Glossary

| Term | Definition |
|------|------------|
| Training Course | A defined training topic with metadata (duration, validity, etc.) |
| Training Session | A scheduled instance of instructor-led training |
| Training Assignment | A requirement for a user to complete a course |
| Training Completion | A record of a user finishing training |
| Training Matrix | Grid view showing training status across users/courses |
| Validity Period | Duration for which training completion is considered current |
| Refresher | Training taken to renew expired or expiring competence |
| Competence | Demonstrated ability based on completed and valid training |

---

## 8. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Business Owner | | | |
| Project Manager | | | |
| Solution Architect | | | |
| HSE Director | | | |

# Workflows – EHS Portal Phase 8
## Training & Competence Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 8 – Training & Competence Management |

---

## 1. Overview

This document defines the key workflows for Training & Competence Management in Phase 8. Each workflow includes actors, triggers, steps, and outcomes.

---

## 2. Training Assignment Workflow

### 2.1 Manual Individual Assignment

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    MANUAL INDIVIDUAL ASSIGNMENT                               │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐                                                     ┌─────────┐
  │ Manager │                                                     │  User   │
  └────┬────┘                                                     └────┬────┘
       │                                                               │
       │  1. Select user from list                                     │
       │  2. Select course to assign                                   │
       │  3. Set due date and priority                                 │
       │  4. Add notes (optional)                                      │
       │  5. Submit assignment                                         │
       ▼                                                               │
  ┌────────────────┐                                                   │
  │ System         │                                                   │
  │ - Validates    │                                                   │
  │ - Creates      │                                                   │
  │   assignment   │                                                   │
  │ - Sends notif  │                                                   │
  └───────┬────────┘                                                   │
          │                                                            │
          │ ───── Email/In-app notification ──────────────────────────►│
          │       "You have been assigned: [Course Name]"              │
          │       "Due by: [Date]"                                     │
          │                                                            ▼
          │                                                   ┌────────────────┐
          │                                                   │ Assignment     │
          │                                                   │ appears in     │
          │                                                   │ "My Training"  │
          │                                                   └────────────────┘
          ▼
  ┌────────────────┐
  │ Status:        │
  │ ASSIGNED       │
  └────────────────┘
```

**Actors:** Manager, Admin
**Trigger:** Manager identifies training need for a user
**Outcome:** User has assignment in "My Training" with due date

---

### 2.2 Bulk Role-Based Assignment

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    BULK ROLE-BASED ASSIGNMENT                                 │
└──────────────────────────────────────────────────────────────────────────────┘

  Admin/Manager
       │
       ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  1. Select course                                                        │
  │  2. Choose assignment method: "By Role"                                  │
  │  3. Select role: e.g., "Site Supervisor"                                 │
  │  4. Set due date calculation: e.g., "30 days from assignment"            │
  │  5. Check "Auto-assign to new users with this role" (optional)           │
  │  6. Submit                                                               │
  └──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  System Processing:                                                      │
  │                                                                          │
  │  1. Query all users with role = "Site Supervisor"                        │
  │  2. For each user:                                                       │
  │     a. Check if active assignment already exists → Skip                  │
  │     b. Check if valid completion exists → Skip                           │
  │     c. Create assignment with calculated due date                        │
  │     d. Queue notification                                                │
  │  3. If "Auto-assign new users" checked:                                  │
  │     - Create assignment rule record                                      │
  │  4. Return summary: { created: 15, skipped: 3 }                          │
  └──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Notifications sent to all newly assigned users                          │
  │  Manager sees: "15 assignments created, 3 skipped (already assigned)"    │
  └──────────────────────────────────────────────────────────────────────────┘
```

**Actors:** Admin, Manager
**Trigger:** New mandatory training identified for a role
**Outcome:** All users in role have assignments; rule created for future users

---

### 2.3 Site-Based Assignment

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SITE-BASED ASSIGNMENT                                      │
└──────────────────────────────────────────────────────────────────────────────┘

                         Admin/Manager
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Select course       │
                    │ Select site(s)      │
                    │ Set due date rules  │
                    │ [x] Auto-assign new │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │ Site A              │         │ Site B              │
    │ Workers: 25         │         │ Workers: 40         │
    │ Already assigned: 5 │         │ Already assigned: 10│
    │ → Create: 20        │         │ → Create: 30        │
    └─────────────────────┘         └─────────────────────┘
              │                                 │
              └────────────────┬────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Total: 50 created   │
                    │ Skipped: 15         │
                    │ Rules created: 2    │
                    └─────────────────────┘
```

---

### 2.4 Action-Triggered Assignment

```
┌──────────────────────────────────────────────────────────────────────────────┐
│               TRAINING AS CORRECTIVE ACTION                                   │
└──────────────────────────────────────────────────────────────────────────────┘

     Incident Investigation
            │
            ▼
  ┌────────────────────────┐
  │ Root Cause: Lack of    │
  │ confined space training│
  └───────────┬────────────┘
              │
              ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Create Corrective Action:                                              │
  │ - Type: Training                                                       │
  │ - Course: Confined Space Entry                                         │
  │ - Assigned to: [Worker involved]                                       │
  │ - Due date: [30 days]                                                  │
  │ - [x] Auto-create training assignment                                  │
  └────────────────────────────────────────────────────────────────────────┘
              │
              │
    ┌─────────┴────────────────────────────────────────┐
    │                                                   │
    ▼                                                   ▼
┌──────────────────┐                         ┌──────────────────┐
│ Action Created   │                         │Training Assignment│
│ - Links to       │◄───────────────────────►│ Created           │
│   training       │    bi-directional       │ - Source: action  │
│                  │    link                 │ - Source ID: xxx  │
└────────┬─────────┘                         └────────┬─────────┘
         │                                            │
         │                                            │
         ▼                                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│ When training completed with "Passed":                                 │
│ → Training assignment marked complete                                   │
│ → Action status updated to "Closed"                                     │
│ → Audit trail shows linked closure                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Training Completion Workflow

### 3.1 Instructor-Led Training Completion

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              INSTRUCTOR-LED TRAINING (CLASSROOM/VIRTUAL)                      │
└──────────────────────────────────────────────────────────────────────────────┘

                              BEFORE SESSION
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. Session scheduled by Manager/Admin                                      │
│ 2. Users enrolled (manual or self-enrollment)                              │
│ 3. Reminder notifications sent (1 day before)                              │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                              SESSION DAY
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Session Status: IN_PROGRESS                                                │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                              AFTER SESSION
                                    │
                                    ▼
  ┌───────────────────────────────────────────────────────────────────────┐
  │  Trainer/Supervisor records attendance:                               │
  │                                                                       │
  │  ┌──────────────┬──────────────┬─────────┬──────────┐                │
  │  │ Participant  │ Attendance   │ Result  │ Score    │                │
  │  ├──────────────┼──────────────┼─────────┼──────────┤                │
  │  │ John Smith   │ ✓ Attended   │ Passed  │ 92%      │                │
  │  │ Jane Doe     │ ✓ Attended   │ Passed  │ 88%      │                │
  │  │ Bob Wilson   │ ✗ Absent     │ -       │ -        │                │
  │  │ Mary Johnson │ ~ Partial    │ -       │ -        │                │
  │  └──────────────┴──────────────┴─────────┴──────────┘                │
  │                                                                       │
  │  [Upload Evidence: attendance_sheet.pdf]                              │
  │                                                                       │
  │  [Complete Session]                                                   │
  └────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  System Processing:                                                    │
  │                                                                        │
  │  For each participant with "Attended" + "Passed":                      │
  │  1. Create completion record                                           │
  │  2. Calculate expiry date (completion + validity months)               │
  │  3. Find and update related assignment → COMPLETED                     │
  │  4. Check for linked action → Close if training action                 │
  │                                                                        │
  │  For "Absent" participants:                                            │
  │  - Assignment status remains ASSIGNED (needs rescheduling)             │
  │                                                                        │
  │  Session status → COMPLETED                                            │
  └────────────────────────────────────────────────────────────────────────┘
```

### 3.2 External Training Recording

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              RECORDING EXTERNAL TRAINING                                      │
└──────────────────────────────────────────────────────────────────────────────┘

  User completes external training (e.g., vendor certification)
                              │
                              ▼
              ┌───────────────────────────────────┐
              │ Option A: User Self-Reports       │
              │ (if enabled for course)           │
              └───────────────┬───────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  User fills completion form:                                           │
  │  - Course: [Select from catalogue]                                     │
  │  - Completion date: [Date picker]                                      │
  │  - Provider: [External provider name]                                  │
  │  - Certificate #: [Optional]                                           │
  │  - Evidence: [Upload certificate PDF/image]                            │
  │                                                                        │
  │  [Submit for Verification]                                             │
  └────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Completion created with:                                              │
  │  - verification_status: PENDING                                        │
  │  - is_external: TRUE                                                   │
  └────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Notification to Manager
                              ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Manager Review:                                                       │
  │                                                                        │
  │  ┌─────────────────────────────────────────────────────────────────┐   │
  │  │ External Training Verification Required                         │   │
  │  │                                                                  │   │
  │  │ User: John Smith                                                 │   │
  │  │ Course: Forklift Operation Certificate                          │   │
  │  │ Provider: ACME Training Co.                                     │   │
  │  │ Date: 2026-01-20                                                │   │
  │  │ Certificate: FORK-2026-12345                                     │   │
  │  │                                                                  │   │
  │  │ Evidence: [View Certificate.pdf]                                 │   │
  │  │                                                                  │   │
  │  │ [Verify ✓]  [Reject ✗]                                          │   │
  │  └─────────────────────────────────────────────────────────────────┘   │
  └────────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
  ┌─────────────────────┐         ┌─────────────────────┐
  │ VERIFIED            │         │ REJECTED            │
  │ - Status updated    │         │ - Reason recorded   │
  │ - Expiry calculated │         │ - User notified     │
  │ - Assignment closed │         │ - Must resubmit or  │
  │ - User notified     │         │   attend actual     │
  └─────────────────────┘         └─────────────────────┘
```

### 3.3 Direct Manager Recording

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              MANAGER DIRECT RECORDING                                         │
└──────────────────────────────────────────────────────────────────────────────┘

  Manager/Supervisor (for on-the-job, toolbox talks, etc.)
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Record Completion:                                                    │
  │                                                                        │
  │  User: [Select user with assignment]                                   │
  │  Course: [Pre-filled from assignment]                                  │
  │  Completion Date: [Today or past date]                                 │
  │  Result: [Passed / Attended / Failed]                                  │
  │  Score: [Optional percentage]                                          │
  │  Trainer: [Self or select other]                                       │
  │  Notes: [Optional completion notes]                                    │
  │  Evidence: [Optional - upload photos, signed form]                     │
  │                                                                        │
  │  [Record Completion]                                                   │
  └────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Completion created with:                                              │
  │  - verification_status: VERIFIED (manager-recorded)                    │
  │  - recorded_by: [Manager ID]                                           │
  │  - expires_at: [Calculated from course validity]                       │
  │                                                                        │
  │  Assignment updated:                                                   │
  │  - status: COMPLETED                                                   │
  │  - completion_id: [New completion ID]                                  │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Expiry and Refresher Workflow

### 4.1 Training Expiry Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              TRAINING EXPIRY LIFECYCLE                                        │
└──────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────────────────┐
     │                                                                         │
     │  COMPLETION                                                             │
     │  Date: 2026-02-05                                                       │
     │  Course validity: 12 months                                             │
     │  Expiry calculated: 2027-02-05                                          │
     │                                                                         │
     └───────────────────────────────────┬─────────────────────────────────────┘
                                         │
                                         ▼
     ────────────────────────────────────────────────────────────────────────────
     │                                                                          │
     │ Status: VALID                                                            │
     │                                                                          │
     │  ● User shows as "Completed" in matrix                                   │
     │  ● Green status indicator                                                │
     │                                                                          │
     ────────────────────────────────────┬───────────────────────────────────────
                                         │
                        Time passes... (11 months)
                                         │
                                         ▼
     ────────────────────────────────────────────────────────────────────────────
     │                                                                          │
     │ 30 DAYS BEFORE EXPIRY (2027-01-06)                                       │
     │                                                                          │
     │ Status: EXPIRING_SOON                                                    │
     │                                                                          │
     │  ● Daily job detects approaching expiry                                  │
     │  ● Notification sent to user: "Training expiring in 30 days"             │
     │  ● Yellow status indicator in matrix                                     │
     │  ● Manager notified: "Team member training expiring"                     │
     │                                                                          │
     │  If course has refresher_course_id:                                      │
     │    → System creates refresher assignment                                 │
     │    → Due date: expiry date                                               │
     │                                                                          │
     ────────────────────────────────────┬───────────────────────────────────────
                                         │
                       Additional reminders at 14, 7 days
                                         │
                                         ▼
     ────────────────────────────────────────────────────────────────────────────
     │                                                                          │
     │ EXPIRY DATE REACHED (2027-02-05)                                         │
     │                                                                          │
     │ Status: EXPIRED                                                          │
     │                                                                          │
     │  ● Red status indicator in matrix                                        │
     │  ● User no longer considered "trained" for compliance                    │
     │  ● Escalation notification to manager                                    │
     │  ● If refresher not started: urgent notification                         │
     │                                                                          │
     ────────────────────────────────────┬───────────────────────────────────────
                                         │
                                         ▼
     ────────────────────────────────────────────────────────────────────────────
     │                                                                          │
     │ USER COMPLETES REFRESHER                                                 │
     │                                                                          │
     │  ● New completion record created                                         │
     │  ● New expiry date calculated (another 12 months)                        │
     │  ● Status back to VALID                                                  │
     │  ● Refresher assignment marked COMPLETED                                 │
     │                                                                          │
     ────────────────────────────────────────────────────────────────────────────
```

### 4.2 Refresher Assignment Logic

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              REFRESHER ASSIGNMENT DECISION TREE                               │
└──────────────────────────────────────────────────────────────────────────────┘

                    Completion approaching expiry
                              │
                              ▼
                ┌─────────────────────────────┐
                │ Does course have            │
                │ refresher_course_id set?    │
                └─────────────┬───────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ YES                           │ NO
              ▼                               ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │ Use refresher       │         │ Re-assign same      │
    │ course for          │         │ course as           │
    │ assignment          │         │ refresher           │
    └──────────┬──────────┘         └──────────┬──────────┘
               │                               │
               └───────────────┬───────────────┘
                               │
                               ▼
                ┌─────────────────────────────┐
                │ Does user already have      │
                │ active assignment for       │
                │ this course?                │
                └─────────────┬───────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ YES                           │ NO
              ▼                               ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │ Skip - already      │         │ Create new          │
    │ assigned            │         │ assignment          │
    │ (just send          │         │ - source: expiry    │
    │  reminder)          │         │ - priority: high    │
    └─────────────────────┘         │ - due: expiry date  │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │ Notify user of      │
                                    │ refresher           │
                                    │ requirement         │
                                    └─────────────────────┘
```

---

## 5. Training Matrix Workflow

### 5.1 Matrix View Generation

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              TRAINING MATRIX GENERATION                                       │
└──────────────────────────────────────────────────────────────────────────────┘

  Manager requests matrix view
            │
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Filter Selection:                                                     │
  │                                                                        │
  │  Matrix Type: [User × Course ▾]                                        │
  │  Site Filter: [All Sites / Specific Site]                              │
  │  Role Filter: [All Roles / Specific Role]                              │
  │  Course Filter: [All / Mandatory Only / Category]                      │
  │  Status Filter: [All / Gaps Only / Expiring Only]                      │
  │                                                                        │
  │  [Apply Filters]                                                       │
  └────────────────────────────────────────────────────────────────────────┘
            │
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  System Processing:                                                    │
  │                                                                        │
  │  1. Query users matching filters                                       │
  │  2. Query courses matching filters                                     │
  │  3. For each user × course pair:                                       │
  │     - Check latest completion                                          │
  │     - Check active assignment                                          │
  │     - Determine cell status                                            │
  │  4. Calculate summary statistics                                       │
  └────────────────────────────────────────────────────────────────────────┘
            │
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                                                                        │
  │  TRAINING MATRIX                                                       │
  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
  │                                                                        │
  │           │ Fire Safety │ Confined │ First Aid │ Chemical │            │
  │           │ (12 mo)     │ Space    │ (24 mo)   │ Handling │            │
  │  ─────────┼─────────────┼──────────┼───────────┼──────────┤            │
  │  J.Smith  │     ✓ ▪     │    ✓     │     ⚠     │    ✓     │  Site A   │
  │  M.Jones  │     ✓       │    ○     │     ✓     │    ✗     │  Site A   │
  │  R.Brown  │     ✗       │    ✓     │     ✓     │    ✓     │  Site B   │
  │  S.Davis  │     ⚠       │    ●     │     ○     │    ✓     │  Site B   │
  │                                                                        │
  │  Legend:                                                               │
  │  ✓ Completed (valid)  ⚠ Expiring soon  ✗ Overdue/Expired              │
  │  ○ Not assigned       ● In progress    ▪ Has assignment                │
  │                                                                        │
  │  Summary:                                                              │
  │  Compliant: 12 (75%)  Expiring: 2  Overdue: 2  Gaps: 2                 │
  │                                                                        │
  │  [Export to Excel]  [Generate Report PDF]                              │
  └────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Gap Analysis Workflow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              GAP ANALYSIS WORKFLOW                                            │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────────────┐
  │  GAP IDENTIFICATION                                                    │
  │                                                                        │
  │  Compare: Requirements vs Actuals                                      │
  │                                                                        │
  │  Requirements sources:                                                 │
  │  - Role requirements (training_role_requirements)                      │
  │  - Site requirements (training_site_requirements)                      │
  │  - Mandatory courses (requirement_level = 'mandatory')                 │
  │                                                                        │
  │  Actuals:                                                              │
  │  - Valid completions (not expired)                                     │
  │  - Active assignments (in progress)                                    │
  └────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  GAP REPORT                                                            │
  │                                                                        │
  │  ┌────────────────────────────────────────────────────────────────┐    │
  │  │ User: John Smith                                                │    │
  │  │ Role: Site Supervisor                                           │    │
  │  │ Site: Warehouse A                                               │    │
  │  │                                                                  │    │
  │  │ Training Gaps:                                                   │    │
  │  │ ┌──────────────────────────────────────────────────────────────┐│    │
  │  │ │ Course            │ Requirement │ Status     │ Action       ││    │
  │  │ ├───────────────────┼─────────────┼────────────┼──────────────┤│    │
  │  │ │ Confined Space    │ Role        │ Not done   │ [Assign]     ││    │
  │  │ │ LOTO Training     │ Role        │ Expired    │ [Assign]     ││    │
  │  │ │ Spill Response    │ Site        │ Not done   │ [Assign]     ││    │
  │  │ └──────────────────────────────────────────────────────────────┘│    │
  │  │                                                                  │    │
  │  │ [Assign All Gaps] [Generate Gap Report]                          │    │
  │  └────────────────────────────────────────────────────────────────┘    │
  └────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Manager clicks "Assign All Gaps"
                              ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Bulk assignment created for all gap courses                           │
  │  Due dates calculated based on priority/urgency                        │
  │  User notified of new assignments                                      │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Session Enrollment Workflow

### 6.1 Manager-Initiated Enrollment

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              MANAGER ENROLLS USERS                                            │
└──────────────────────────────────────────────────────────────────────────────┘

  Manager views upcoming session
            │
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Session: Fire Safety Training                                         │
  │  Date: 2026-02-20, 09:00-12:00                                         │
  │  Location: Training Room A                                             │
  │  Capacity: 20 (Enrolled: 12)                                           │
  │                                                                        │
  │  Current Enrollments:                                                  │
  │  [List of 12 enrolled users]                                           │
  │                                                                        │
  │  [+ Add Participants]                                                  │
  └────────────────────────────────────────────────────────────────────────┘
            │
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Add Participants:                                                     │
  │                                                                        │
  │  ☐ Show only users with assignment for this course                     │
  │  ☐ Show users with expiring training                                   │
  │                                                                        │
  │  ┌──────────────────────────────────────────────────────────────────┐  │
  │  │ ☐ Select All                                                     │  │
  │  │ ☑ Mary Johnson (Assignment due: Feb 28)                          │  │
  │  │ ☑ Tom Wilson (Assignment due: Mar 15)                            │  │
  │  │ ☐ Jane Doe (No assignment)                                       │  │
  │  │ ☑ Bob Brown (Training expiring: Mar 01)                          │  │
  │  └──────────────────────────────────────────────────────────────────┘  │
  │                                                                        │
  │  Selected: 3                                                           │
  │  Remaining capacity: 5                                                 │
  │                                                                        │
  │  [Enroll Selected]                                                     │
  └────────────────────────────────────────────────────────────────────────┘
            │
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  System:                                                               │
  │  - Creates enrollment records                                          │
  │  - Updates assignment status to IN_PROGRESS (if exists)                │
  │  - Sends enrollment confirmation to users                              │
  │  - Adds to users' calendar (if integrated)                             │
  └────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Self-Enrollment (if enabled)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              SELF-ENROLLMENT WORKFLOW                                         │
└──────────────────────────────────────────────────────────────────────────────┘

  User views "My Training" page
            │
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Assigned Training:                                                    │
  │  - Fire Safety (Due: Feb 28) [View Upcoming Sessions]                  │
  └────────────────────────────────────────────────────────────────────────┘
            │ Click "View Upcoming Sessions"
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Upcoming Sessions for: Fire Safety                                    │
  │                                                                        │
  │  ┌──────────────────────────────────────────────────────────────────┐  │
  │  │ Feb 20, 09:00-12:00 │ Training Room A │ 8/20 spots │ [Enroll]   │  │
  │  │ Feb 25, 14:00-17:00 │ Site B          │ 15/15 spots│ [Waitlist] │  │
  │  │ Mar 05, 09:00-12:00 │ Virtual         │ 5/20 spots │ [Enroll]   │  │
  │  └──────────────────────────────────────────────────────────────────┘  │
  └────────────────────────────────────────────────────────────────────────┘
            │ Click "Enroll"
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Confirm Enrollment?                                                   │
  │                                                                        │
  │  Session: Fire Safety Training                                         │
  │  Date: February 20, 2026                                               │
  │  Time: 09:00 - 12:00                                                   │
  │  Location: Training Room A                                             │
  │                                                                        │
  │  [Cancel] [Confirm Enrollment]                                         │
  └────────────────────────────────────────────────────────────────────────┘
            │
            ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  ✓ You are enrolled!                                                   │
  │                                                                        │
  │  - Added to your training calendar                                     │
  │  - Reminder will be sent 1 day before                                  │
  │                                                                        │
  │  [Add to Calendar] [View My Enrollments]                               │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Notification Workflow

### 7.1 Notification Timeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              TRAINING NOTIFICATION TIMELINE                                   │
└──────────────────────────────────────────────────────────────────────────────┘

Assignment Created (Day 0)
    │
    ├──► User: "New training assigned: [Course]. Due by [Date]"
    │
    │   ... time passes ...
    │
    ├──► Day -30 (30 days before due): "Training due in 30 days: [Course]"
    │
    ├──► Day -14: "Training due in 2 weeks: [Course]"
    │
    ├──► Day -7: "Training due in 1 week: [Course]"
    │
    ├──► Day -1: "Training due tomorrow: [Course]"
    │
Due Date (Day 0)
    │
    ├──► If not complete: Status → OVERDUE
    │    User: "Training overdue: [Course]. Please complete immediately."
    │    Manager: "Team member training overdue: [User] - [Course]"
    │
    │   ... if still not complete after 7 days ...
    │
    ├──► Day +7: Escalation to Manager
    │    "Training overdue by 7 days: [User] - [Course]"
    │
    │   ... if still not complete after 14 days ...
    │
    └──► Day +14: Escalation to Admin/Compliance
         "Severe training overdue: [User] - [Course] - 14 days overdue"


EXPIRY NOTIFICATIONS (separate timeline):

Completion with expiry
    │
    ├──► Day -30 before expiry: "Training expiring soon: [Course]"
    │    Manager: "Team member certification expiring: [User]"
    │
    ├──► Day -14: "Training expires in 2 weeks. Refresher required."
    │
    ├──► Day -7: "Training expires in 1 week. Book refresher now."
    │
Expiry Date
    │
    └──► "Training expired: [Course]. You are no longer certified."
         Manager: "Team member no longer certified: [User] - [Course]"
```

---

## 8. Integration Workflows

### 8.1 Incident → Training Workflow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              INCIDENT TO TRAINING INTEGRATION                                 │
└──────────────────────────────────────────────────────────────────────────────┘

  Incident Created
       │
       ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Incident #INC-2026-0042                                               │
  │  Type: Near Miss                                                       │
  │  Description: Worker entered confined space without proper procedure   │
  │  Involved: John Smith (ID: user-123)                                   │
  └────────────────────────────────────────────────────────────────────────┘
       │
       │ Manager opens incident for investigation
       ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Training Gap Analysis Panel (auto-populated):                         │
  │                                                                        │
  │  Involved Person: John Smith                                           │
  │  Role: Site Worker                                                     │
  │                                                                        │
  │  Training Status:                                                      │
  │  ┌──────────────────────────────────────────────────────────────────┐  │
  │  │ Course              │ Status        │ Last Completed │ Expires   │  │
  │  ├─────────────────────┼───────────────┼────────────────┼───────────│  │
  │  │ Confined Space      │ ⚠ EXPIRED     │ 2024-06-15     │ 2025-06-15│  │
  │  │ Basic Safety        │ ✓ Valid       │ 2025-11-01     │ 2026-11-01│  │
  │  │ First Aid           │ ✓ Valid       │ 2025-08-20     │ 2027-08-20│  │
  │  └──────────────────────────────────────────────────────────────────┘  │
  │                                                                        │
  │  ⚠ Training gap detected: Confined Space training expired             │
  │                                                                        │
  │  Recommended Training:                                                 │
  │  - Confined Space Entry (Refresher)                                    │
  │                                                                        │
  │  [Create Training Action]                                              │
  └────────────────────────────────────────────────────────────────────────┘
       │
       │ Manager clicks "Create Training Action"
       ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Action created:                                                       │
  │  - Type: Training                                                      │
  │  - Course: Confined Space Entry Refresher                              │
  │  - Assigned to: John Smith                                             │
  │  - Due: 14 days                                                        │
  │  - Linked to: Incident #INC-2026-0042                                  │
  │                                                                        │
  │  Training assignment created:                                          │
  │  - Source: Incident                                                    │
  │  - Source ID: INC-2026-0042                                            │
  │  - Priority: High                                                      │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 8 workflows |

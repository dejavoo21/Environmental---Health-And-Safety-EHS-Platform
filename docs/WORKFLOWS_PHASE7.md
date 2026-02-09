# Workflows – Phase 7: Chemical & Permit Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Phase | 7 – Chemical & Permit Management |

---

## 1. Overview

This document describes the operational workflows for Phase 7, covering chemical register management, SDS tracking, permit lifecycle, and integration workflows.

---

## 2. Workflow Index

| ID | Workflow Name | Trigger | Primary Actor |
|----|---------------|---------|---------------|
| WF-P7-01 | Create Chemical Record | Manual | Admin/Manager |
| WF-P7-02 | Upload SDS Document | Manual | Admin/Manager |
| WF-P7-03 | SDS Expiry Notification | Scheduled | System |
| WF-P7-04 | Manage Chemical Storage Location | Manual | Admin/Manager |
| WF-P7-05 | Link Chemical to Incident | Manual | Worker/Manager |
| WF-P7-06 | Create and Submit Permit | Manual | Worker/Manager |
| WF-P7-07 | Approve or Reject Permit | Manual | Manager/Admin |
| WF-P7-08 | Activate Permit (Issue) | Manual | Site Manager |
| WF-P7-09 | Complete Permit Controls | Manual | Worker/Manager |
| WF-P7-10 | Close Permit | Manual | Site Manager |
| WF-P7-11 | Suspend and Resume Permit | Manual | Site Manager |
| WF-P7-12 | Auto-Expire Permit | Scheduled | System |
| WF-P7-13 | Permit Conflict Detection | Automatic | System |
| WF-P7-14 | Link Permit to Incident | Manual | Manager |

---

## 3. Chemical Management Workflows

### WF-P7-01: Create Chemical Record

**Trigger:** Admin or Manager needs to add a chemical to the register

**Actors:** Admin, Manager

**Preconditions:**
- User is authenticated and has manager/admin role
- Organisation exists and is active

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WF-P7-01: Create Chemical Record                        │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ User navigates  │
    │ to Chemical     │
    │ Register        │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Clicks "Add     │
    │ Chemical"       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Fill form:      │
    │ - Name          │
    │ - CAS Number    │
    │ - Physical state│
    │ - Supplier      │
    │ - GHS Hazards   │
    │ - PPE/Handling  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Invalid     ┌─────────────────┐
    │ Validate input  │────────────────►│ Show validation │
    │                 │                 │ errors          │
    └────────┬────────┘                 └────────┬────────┘
             │ Valid                             │
             ▼                                   │
    ┌─────────────────┐                          │
    │ Check for       │     Duplicate?          │
    │ duplicate       │─────────────────────────│
    │ (CAS/Name)      │                         │
    └────────┬────────┘                         │
             │ Unique                           │
             ▼                                  │
    ┌─────────────────┐                         │
    │ Create chemical │                         │
    │ record          │                         │
    └────────┬────────┘                         │
             │                                  │
             ▼                                  │
    ┌─────────────────┐                         │
    │ Create GHS      │                         │
    │ hazard entries  │                         │
    └────────┬────────┘                         │
             │                                  │
             ▼                                  │
    ┌─────────────────┐                         │
    │ Log to audit    │                         │
    │ trail           │                         │
    └────────┬────────┘                         │
             │                                  │
             ▼                                  ▼
    ┌─────────────────┐                 ┌───────────────┐
    │ Show success    │                 │ Return to     │
    │ message         │                 │ form          │
    └────────┬────────┘                 └───────────────┘
             │
             ▼
    ┌─────────────────┐
    │ Redirect to     │
    │ chemical detail │
    │ page            │
    └─────────────────┘
```

**Postconditions:**
- Chemical appears in register with status 'active'
- GHS hazard classes stored
- Audit log entry created
- User can proceed to upload SDS

---

### WF-P7-02: Upload SDS Document

**Trigger:** User needs to upload or update Safety Data Sheet for a chemical

**Actors:** Admin, Manager

**Preconditions:**
- Chemical record exists
- User has manager/admin role

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WF-P7-02: Upload SDS Document                           │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ User opens      │
    │ chemical detail │
    │ page            │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Clicks "Upload  │
    │ SDS" or "Update │
    │ SDS"            │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Select PDF file │
    │ Enter version   │
    │ Enter expiry    │
    │ date            │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Invalid     ┌─────────────────┐
    │ Validate:       │────────────────►│ Show error:     │
    │ - File type PDF │                 │ - Wrong format  │
    │ - Size < 10MB   │                 │ - File too large│
    │ - Expiry future │                 └─────────────────┘
    └────────┬────────┘
             │ Valid
             ▼
    ┌─────────────────┐     Yes         ┌─────────────────┐
    │ Existing SDS?   │────────────────►│ Mark previous   │
    │                 │                 │ SDS as          │
    └────────┬────────┘                 │ superseded      │
             │ No                       └────────┬────────┘
             │                                   │
             │◄──────────────────────────────────┘
             ▼
    ┌─────────────────┐
    │ Upload file to  │
    │ storage         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Create          │
    │ attachment      │
    │ record          │
    │ (chemical_id,   │
    │ is_current_sds) │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Update chemical │
    │ record:         │
    │ - sds_version   │
    │ - sds_expiry    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Log to audit    │
    │ trail           │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Show success    │
    │ "SDS uploaded"  │
    └─────────────────┘
```

**Postconditions:**
- SDS document stored as attachment
- Previous SDS marked as superseded (if applicable)
- Chemical record updated with version and expiry date
- SDS expiry tracking begins

---

### WF-P7-03: SDS Expiry Notification

**Trigger:** Scheduled job runs daily at 07:00 UTC

**Actors:** System, Chemical Register Admins

**Preconditions:**
- Chemicals exist with SDS expiry dates
- Organisation has notification preferences configured

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P7-03: SDS Expiry Notification                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Scheduled job   │
    │ triggers        │
    │ (07:00 UTC)     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ For each active │
    │ organisation    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Query chemicals │
    │ with SDS        │
    │ expiry in:      │
    │ - 90 days       │
    │ - 60 days       │
    │ - 30 days       │
    │ - Expired       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Already notified     ┌─────────────────┐
    │ Check           │     at this threshold    │ Skip            │
    │ notification    │─────────────────────────►│                 │
    │ history         │                          └─────────────────┘
    └────────┬────────┘
             │ Not notified
             ▼
    ┌─────────────────┐
    │ Determine       │
    │ priority:       │
    │ - 90 days: low  │
    │ - 60 days: med  │
    │ - 30 days: high │
    │ - Expired: crit │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Get chemical    │
    │ register admins │
    │ for org         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Create in-app   │
    │ notification    │
    │ for each admin  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Pref = false     ┌─────────────────┐
    │ Check email     │─────────────────────►│ Skip email      │
    │ preference      │                      └─────────────────┘
    └────────┬────────┘
             │ Pref = true
             ▼
    ┌─────────────────┐
    │ Queue email     │
    │ notification    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Record          │
    │ notification    │
    │ sent for        │
    │ this threshold  │
    └─────────────────┘
```

**Postconditions:**
- Admins receive notifications for expiring/expired SDS
- Notification history prevents duplicate alerts
- Dashboard SDS widget reflects current status

---

### WF-P7-04: Manage Chemical Storage Location

**Trigger:** Admin/Manager needs to track where chemicals are stored

**Actors:** Admin, Manager

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               WF-P7-04: Manage Chemical Storage Location                     │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Open chemical   │
    │ detail page     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Click "Storage  │
    │ Locations" tab  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Click "Add      │
    │ Location"       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Fill form:      │
    │ - Site          │
    │ - Location name │
    │ - Max storage   │
    │ - Typical amt   │
    │ - Unit          │
    │ - Conditions    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Validate and    │
    │ create location │
    │ record          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐          Optional
    │ Location        │─────────────────────┐
    │ created         │                     │
    └────────┬────────┘                     ▼
             │                    ┌─────────────────┐
             │                    │ Record initial  │
             │                    │ inventory       │
             │                    │ quantity        │
             │                    └────────┬────────┘
             │                             │
             │◄────────────────────────────┘
             ▼
    ┌─────────────────┐
    │ Location shows  │
    │ in list with    │
    │ inventory       │
    │ indicators      │
    └─────────────────┘
```

---

### WF-P7-05: Link Chemical to Incident

**Trigger:** User creating/editing incident involving a chemical

**Actors:** Worker, Manager

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   WF-P7-05: Link Chemical to Incident                        │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ User creates or │
    │ edits incident  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ In incident     │
    │ form, expands   │
    │ "Related        │
    │ Chemicals"      │
    │ section         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Search/select   │
    │ chemicals from  │
    │ register        │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Selected        │
    │ chemical shows  │
    │ with:           │
    │ - GHS pictograms│
    │ - Quick SDS link│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Chemical banned?    ┌─────────────────┐
    │ Check chemical  │────────────────────────►│ Show warning:   │
    │ status          │                         │ "This chemical  │
    │                 │                         │ is banned"      │
    └────────┬────────┘                         └────────┬────────┘
             │ Active/Phase-out                          │
             │◄──────────────────────────────────────────┘
             ▼
    ┌─────────────────┐
    │ Optionally add  │
    │ involvement     │
    │ type:           │
    │ - Exposure      │
    │ - Spill         │
    │ - Fire/explosion│
    │ - Other         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Add notes       │
    │ (optional)      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Save incident   │
    │ with chemical   │
    │ links           │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ incident_       │
    │ chemicals       │
    │ records created │
    └─────────────────┘
```

**Postconditions:**
- Incident linked to one or more chemicals
- Chemical detail page shows related incidents
- Analytics can aggregate incidents by chemical

---

## 4. Permit Management Workflows

### WF-P7-06: Create and Submit Permit

**Trigger:** Worker/Manager needs to perform controlled work

**Actors:** Worker, Manager (Requester)

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   WF-P7-06: Create and Submit Permit                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ User navigates  │
    │ to Permits page │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Clicks "Request │
    │ New Permit"     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Select permit   │
    │ type:           │
    │ - Hot Work      │
    │ - Confined Space│
    │ - Work at Height│
    │ - etc.          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ System loads    │
    │ type-specific   │
    │ form fields and │
    │ default controls│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Fill form:      │
    │ - Site          │
    │ - Location      │
    │ - Description   │
    │ - Planned start │
    │ - Planned end   │
    │ - Workers       │
    │ - Precautions   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Conflicts?     ┌─────────────────┐
    │ Check for       │───────────────────►│ Show warning:   │
    │ conflicting     │                    │ "Overlapping    │
    │ permits         │                    │ permit exists"  │
    └────────┬────────┘                    └────────┬────────┘
             │ No conflicts or acknowledged         │
             │◄─────────────────────────────────────┘
             ▼
    ┌─────────────────┐
    │ Generate permit │
    │ number:         │
    │ HW-SITE-DATE-001│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Create permit   │
    │ with status:    │
    │ 'draft'         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Create control  │
    │ records from    │
    │ type template   │
    │ (status:pending)│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ User reviews    │
    │ permit details  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Save as Draft     ┌─────────────────┐
    │ Submit for      │◄──────────────────────│ User wants to   │
    │ approval?       │                       │ finish later    │
    └────────┬────────┘                       └─────────────────┘
             │ Submit
             ▼
    ┌─────────────────┐
    │ Validate all    │
    │ required fields │
    │ complete        │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Transition to   │
    │ status:         │
    │ 'submitted'     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Log state       │
    │ transition      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Notify          │
    │ approvers       │
    │ (site managers) │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Show success:   │
    │ "Permit         │
    │ submitted for   │
    │ approval"       │
    └─────────────────┘
```

**Postconditions:**
- Permit created with unique number
- Control checklist populated from type template
- Status is 'submitted'
- Approvers notified

---

### WF-P7-07: Approve or Reject Permit

**Trigger:** Permit is submitted for approval

**Actors:** Manager, Admin (Approver)

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   WF-P7-07: Approve or Reject Permit                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Approver        │
    │ receives        │
    │ notification    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Opens permit    │
    │ detail page     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Reviews:        │
    │ - Work details  │
    │ - Location      │
    │ - Time period   │
    │ - Workers       │
    │ - Conflicts     │
    │ - Attachments   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Decision:       │
    │ Approve/Reject/ │
    │ Request Changes │
    └────────┬────────┘
             │
       ┌─────┴─────┬─────────────────┐
       │           │                 │
       ▼           ▼                 ▼
┌────────────┐ ┌────────────┐ ┌────────────────┐
│ APPROVE    │ │ REJECT     │ │ REQUEST CHANGES│
└─────┬──────┘ └─────┬──────┘ └───────┬────────┘
      │              │                │
      ▼              ▼                ▼
┌────────────┐ ┌────────────┐ ┌────────────────┐
│ Status:    │ │ Status:    │ │ Status:        │
│ 'approved' │ │ 'draft'    │ │ 'draft'        │
│            │ │ rejection_ │ │ Add comment    │
│ Record     │ │ reason set │ │ for requester  │
│ approver   │ │            │ │                │
│ & time     │ │            │ │                │
└─────┬──────┘ └─────┬──────┘ └───────┬────────┘
      │              │                │
      ▼              ▼                ▼
┌────────────┐ ┌────────────┐ ┌────────────────┐
│ Log state  │ │ Log state  │ │ Notify         │
│ transition │ │ transition │ │ requester with │
└─────┬──────┘ └─────┬──────┘ │ comments       │
      │              │        └───────┬────────┘
      ▼              ▼                │
┌────────────┐ ┌────────────┐         │
│ Notify     │ │ Notify     │         │
│ requester: │ │ requester: │         │
│ "Approved" │ │ "Rejected" │         │
└─────┬──────┘ └─────┬──────┘         │
      │              │                │
      ▼              ▼                ▼
┌────────────┐ ┌────────────┐ ┌────────────────┐
│ Permit     │ │ Requester  │ │ Requester can  │
│ ready for  │ │ can create │ │ revise and     │
│ activation │ │ new permit │ │ resubmit       │
└────────────┘ └────────────┘ └────────────────┘
```

---

### WF-P7-08: Activate Permit (Issue)

**Trigger:** Approved permit needs to become active for work to begin

**Actors:** Site Manager (Issuer)

**Preconditions:**
- Permit status is 'approved'
- Planned start time has been reached
- Pre-work controls are complete

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WF-P7-08: Activate Permit (Issue)                       │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Site Manager    │
    │ opens permit    │
    │ detail          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Pre-work incomplete    ┌─────────────────┐
    │ Check pre-work  │───────────────────────────►│ Show list of    │
    │ controls        │                            │ incomplete      │
    │ complete?       │                            │ controls        │
    └────────┬────────┘                            └────────┬────────┘
             │ All complete                                 │
             │                                              │
             │                                              ▼
             │                                    ┌─────────────────┐
             │                                    │ Complete        │
             │                                    │ controls first  │
             │                                    └────────┬────────┘
             │                                             │
             │◄────────────────────────────────────────────┘
             ▼
    ┌─────────────────┐
    │ Click "Activate │
    │ Permit"         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Confirm         │
    │ activation      │
    │ (modal)         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Status:         │
    │ 'active'        │
    │                 │
    │ Set actual_start│
    │ = NOW()         │
    │                 │
    │ Record issuer   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Log state       │
    │ transition      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Notify          │
    │ requester:      │
    │ "Permit is now  │
    │ active"         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Permit appears  │
    │ on Permit Board │
    │ (active view)   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Optional: Print │
    │ permit PDF for  │
    │ work location   │
    └─────────────────┘
```

---

### WF-P7-09: Complete Permit Controls

**Trigger:** Worker/Manager needs to record control completion during permit lifecycle

**Actors:** Worker, Manager

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   WF-P7-09: Complete Permit Controls                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Open active     │
    │ permit detail   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ View Controls   │
    │ tab showing:    │
    │ - Pre-work      │
    │ - During-work   │
    │ - Post-work     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Select control  │
    │ to complete     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Requires reading?     ┌─────────────────┐
    │ Check control   │─────────────────────────►│ Enter reading   │
    │ requirements    │                          │ value (e.g.,    │
    │                 │                          │ O2: 20.8%)      │
    └────────┬────────┘                          └────────┬────────┘
             │ No reading                                 │
             │◄───────────────────────────────────────────┘
             ▼
    ┌─────────────────┐
    │ Mark as:        │
    │ - Completed     │
    │ - Not Applicable│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     N/A?          ┌─────────────────┐
    │ Add notes       │──────────────────►│ Justification   │
    │ (optional for   │                   │ required for    │
    │ completed)      │                   │ mandatory items │
    └────────┬────────┘                   └────────┬────────┘
             │                                     │
             │◄────────────────────────────────────┘
             ▼
    ┌─────────────────┐
    │ Update control  │
    │ record:         │
    │ - status        │
    │ - completed_by  │
    │ - completed_at  │
    │ - reading_value │
    │ - notes         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Control shows   │
    │ as complete     │
    │ with checkmark  │
    └─────────────────┘
```

---

### WF-P7-10: Close Permit

**Trigger:** Permitted work is complete and controls satisfied

**Actors:** Site Manager (Issuer)

**Preconditions:**
- Permit status is 'active'
- Post-work controls are complete

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WF-P7-10: Close Permit                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Site Manager    │
    │ opens active    │
    │ permit          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Post-work incomplete    ┌─────────────────┐
    │ Check post-work │────────────────────────────►│ Show incomplete │
    │ controls done?  │                             │ controls        │
    └────────┬────────┘                             └────────┬────────┘
             │ All complete                                  │
             │                                               │
             │                                               ▼
             │                                     ┌─────────────────┐
             │                                     │ Complete        │
             │                                     │ remaining       │
             │                                     │ controls        │
             │                                     └────────┬────────┘
             │                                              │
             │◄─────────────────────────────────────────────┘
             ▼
    ┌─────────────────┐
    │ Click "Close    │
    │ Permit"         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Add closure     │
    │ notes           │
    │ (optional)      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Confirm         │
    │ closure         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Status:         │
    │ 'closed'        │
    │                 │
    │ Set actual_end  │
    │ = NOW()         │
    │                 │
    │ Record closed_by│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Log state       │
    │ transition      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Notify          │
    │ requester:      │
    │ "Permit closed" │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Permit removed  │
    │ from active     │
    │ Permit Board    │
    └─────────────────┘
```

---

### WF-P7-11: Suspend and Resume Permit

**Trigger:** Work needs to be temporarily halted (safety concern, incident, weather)

**Actors:** Site Manager

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   WF-P7-11: Suspend and Resume Permit                        │
└─────────────────────────────────────────────────────────────────────────────┘

SUSPEND:
    ┌─────────────────┐
    │ Open active     │
    │ permit          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Click "Suspend  │
    │ Permit"         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Enter suspension│
    │ reason          │
    │ (required)      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Status:         │
    │ 'suspended'     │
    │                 │
    │ Store reason    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Log state       │
    │ change          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Notify all      │
    │ workers on      │
    │ permit          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Permit shows as │
    │ 'SUSPENDED' on  │
    │ board (orange)  │
    └─────────────────┘

RESUME:
    ┌─────────────────┐
    │ Open suspended  │
    │ permit          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Click "Resume   │
    │ Permit"         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Confirm issue   │
    │ is resolved     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Status:         │
    │ 'active'        │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Log state       │
    │ change          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Notify workers: │
    │ "Work may       │
    │ resume"         │
    └─────────────────┘
```

---

### WF-P7-12: Auto-Expire Permit

**Trigger:** Scheduled job runs every 15 minutes

**Actors:** System

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WF-P7-12: Auto-Expire Permit                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Scheduled job   │
    │ runs (every     │
    │ 15 minutes)     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Query permits:  │
    │ status = active │
    │ valid_until <   │
    │ NOW()           │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     None found     ┌─────────────────┐
    │ For each        │───────────────────►│ Exit job        │
    │ expired permit  │                    └─────────────────┘
    └────────┬────────┘
             │ Found
             ▼
    ┌─────────────────┐
    │ Transition to   │
    │ status:         │
    │ 'expired'       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Log state       │
    │ change          │
    │ (by: SYSTEM)    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Create high     │
    │ priority        │
    │ notification:   │
    │ "Permit EXPIRED"│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Notify:         │
    │ - Requester     │
    │ - Issuer        │
    │ - Site managers │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Permit shows as │
    │ 'EXPIRED' on    │
    │ board (red)     │
    └─────────────────┘

ALSO: Expiring Soon Warning
    ┌─────────────────┐
    │ Query permits:  │
    │ status = active │
    │ valid_until <   │
    │ NOW() + 2 hours │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     Already warned     ┌─────────────────┐
    │ Check if        │───────────────────────►│ Skip            │
    │ already         │                        └─────────────────┘
    │ notified        │
    └────────┬────────┘
             │ Not warned
             ▼
    ┌─────────────────┐
    │ Send warning:   │
    │ "Permit expires │
    │ in < 2 hours"   │
    └─────────────────┘
```

---

### WF-P7-13: Permit Conflict Detection

**Trigger:** User creates or submits a permit

**Actors:** System (automatic)

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   WF-P7-13: Permit Conflict Detection                        │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ User creates or │
    │ edits permit    │
    │ with site,      │
    │ location, time  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ ConflictService │
    │ .detectConflicts│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Query existing  │
    │ permits:        │
    │ - Same site     │
    │ - Same location │
    │   (fuzzy match) │
    │ - Overlapping   │
    │   time          │
    │ - Status in     │
    │   (submitted,   │
    │   approved,     │
    │   active)       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Check permit    │
    │ type conflicts: │
    │ - Hot work +    │
    │   confined space│
    │ - Multiple hot  │
    │   work same area│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     No conflicts     ┌─────────────────┐
    │ Conflicts       │─────────────────────►│ Continue        │
    │ found?          │                      │ without warning │
    └────────┬────────┘                      └─────────────────┘
             │ Yes
             ▼
    ┌─────────────────┐
    │ Build conflict  │
    │ list with:      │
    │ - Permit #      │
    │ - Type          │
    │ - Time overlap  │
    │ - Conflict type │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Show warning    │
    │ to user:        │
    │ "Potential      │
    │ conflicts       │
    │ detected"       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ User can:       │
    │ - Acknowledge   │
    │   and continue  │
    │ - Modify times  │
    │ - Cancel        │
    └────────┬────────┘
             │ Acknowledge
             ▼
    ┌─────────────────┐
    │ Log conflict    │
    │ acknowledgement │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Proceed with    │
    │ permit creation │
    └─────────────────┘
```

---

### WF-P7-14: Link Permit to Incident

**Trigger:** User creating/editing incident that occurred during permitted work

**Actors:** Manager

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P7-14: Link Permit to Incident                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ User creates or │
    │ edits incident  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Expands         │
    │ "Related        │
    │ Permits"        │
    │ section         │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ System queries  │
    │ permits that    │
    │ were active at  │
    │ occurred_at     │
    │ for this site   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐     None found     ┌─────────────────┐
    │ Matching        │───────────────────►│ Allow manual    │
    │ permits found?  │                    │ search by       │
    │                 │                    │ permit number   │
    └────────┬────────┘                    └────────┬────────┘
             │ Found                                │
             │◄─────────────────────────────────────┘
             ▼
    ┌─────────────────┐
    │ Display         │
    │ suggested       │
    │ permits:        │
    │ - Permit #      │
    │ - Type          │
    │ - Description   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ User selects    │
    │ relevant        │
    │ permit(s)       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Add notes       │
    │ about           │
    │ relationship    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Save incident   │
    │ with permit     │
    │ links           │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ incident_permits│
    │ records created │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Permit detail   │
    │ page shows      │
    │ linked incident │
    └─────────────────┘
```

**Postconditions:**
- Incident linked to one or more permits
- Permit detail page shows related incidents
- Analytics can track incidents per permit type
- Investigation can reference permit controls

---

## 5. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

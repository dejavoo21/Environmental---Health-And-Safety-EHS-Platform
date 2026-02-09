# Workflows – Phase 4: Notifications & Escalations

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-01-31 |
| Phase | 4 – Notifications & Escalations |

---

## 1. Overview

This document describes the operational workflows for Phase 4, covering notification creation, delivery, user preferences management, digest generation, and escalation processing.

---

## 2. Workflow Index

| ID | Workflow Name | Trigger | Primary Actor |
|----|---------------|---------|---------------|
| WF-P4-01 | Action Assignment Notification | Action created/assigned | System |
| WF-P4-02 | View and Read Notifications | User action | Worker/Manager/Admin |
| WF-P4-03 | Configure Notification Preferences | User action | Worker/Manager/Admin |
| WF-P4-04 | Daily Digest Generation | Scheduled (07:00 UTC) | System |
| WF-P4-05 | Weekly Digest Generation | Scheduled (Mon 07:00 UTC) | System |
| WF-P4-06 | Overdue Action Escalation | Scheduled (08:00 UTC) | System |
| WF-P4-07 | High-Severity Incident Notification | Incident created | System |
| WF-P4-08 | Email Retry Processing | Scheduled (*/15 min) | System |
| WF-P4-09 | Notification Cleanup | Scheduled (02:00 UTC) | System |

---

## 3. Workflow Definitions

### WF-P4-01: Action Assignment Notification

**Trigger:** Action created with `assigned_to` field populated, or existing action reassigned

**Actors:** System, Assignee (Worker/Manager)

**Preconditions:**
- Action exists with valid `assigned_to` user
- Assignee has a valid email address
- Organisation is active

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P4-01: Action Assignment Notification                  │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │ Action      │
    │ Created/    │
    │ Assigned    │
    └──────┬──────┘
           │
           ▼
    ┌──────────────┐
    │ Validate     │
    │ assigned_to  │
    │ user exists  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐     No      ┌─────────────────┐
    │ User in same │────────────►│ Log warning,    │
    │ organisation?│             │ skip notification│
    └──────┬───────┘             └─────────────────┘
           │ Yes
           ▼
    ┌────────────────────┐
    │ Create in-app      │
    │ notification       │
    │ type: action_assigned │
    │ priority: normal   │
    └──────┬─────────────┘
           │
           ▼
    ┌──────────────┐
    │ Get user     │
    │ preferences  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────┐     No      ┌─────────────────┐
    │ email_action_    │────────────►│ End (in-app     │
    │ assigned = true? │             │ only)           │
    └──────┬───────────┘             └─────────────────┘
           │ Yes
           ▼
    ┌────────────────────┐
    │ Create email_log   │
    │ status: pending    │
    └──────┬─────────────┘
           │
           ▼
    ┌────────────────────┐
    │ Send email via     │
    │ SMTP               │
    └──────┬─────────────┘
           │
           ▼
    ┌──────────────┐     Failed    ┌─────────────────┐
    │ Email sent   │──────────────►│ Update email_log│
    │ successfully?│               │ status: failed  │
    └──────┬───────┘               │ Schedule retry  │
           │ Yes                   └─────────────────┘
           ▼
    ┌────────────────────┐
    │ Update email_log   │
    │ status: sent       │
    │ sent_at: NOW()     │
    └──────┬─────────────┘
           │
           ▼
    ┌────────────────────┐
    │ Log audit event    │
    │ notification_sent  │
    └────────────────────┘
```

**Postconditions:**
- In-app notification created in `notifications` table
- Email sent (or queued for retry) if preference enabled
- Email log entry created
- Audit log entry created

**Exception Handling:**
- Invalid user: Skip notification, log warning
- Email failure: Queue for retry (max 3 attempts)
- Database error: Rollback, log error, alert ops

---

### WF-P4-02: View and Read Notifications

**Trigger:** User clicks notification bell or opens notifications page

**Actors:** Worker, Manager, Admin

**Preconditions:**
- User is authenticated
- User has at least one notification

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P4-02: View and Read Notifications                     │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │ User clicks │
    │ bell icon   │
    └──────┬──────┘
           │
           ▼
    ┌────────────────────┐
    │ Fetch latest 10    │
    │ notifications      │
    │ (dropdown view)    │
    └──────┬─────────────┘
           │
           ▼
    ┌────────────────────┐
    │ Display dropdown   │
    │ with notifications │
    │ + unread badge     │
    └──────┬─────────────┘
           │
           ├──────────────────────┐
           │                      │
           ▼                      ▼
    ┌──────────────┐      ┌─────────────────┐
    │ User clicks  │      │ User clicks     │
    │ notification │      │ "View All"      │
    └──────┬───────┘      └───────┬─────────┘
           │                      │
           ▼                      ▼
    ┌────────────────────┐ ┌─────────────────────┐
    │ Mark notification  │ │ Navigate to         │
    │ as read            │ │ /notifications page │
    └──────┬─────────────┘ └───────┬─────────────┘
           │                       │
           ▼                       ▼
    ┌────────────────────┐ ┌─────────────────────┐
    │ Navigate to        │ │ Fetch paginated     │
    │ related item       │ │ notifications with  │
    │ (action/incident)  │ │ filters             │
    └────────────────────┘ └───────┬─────────────┘
                                   │
                                   ▼
                           ┌─────────────────────┐
                           │ User can:           │
                           │ • Filter by type    │
                           │ • Filter read/unread│
                           │ • Mark all as read  │
                           │ • Click to navigate │
                           └─────────────────────┘
```

**Postconditions:**
- Notification `is_read` updated to `true`
- `read_at` timestamp set
- Unread count decremented

---

### WF-P4-03: Configure Notification Preferences

**Trigger:** User navigates to notification settings

**Actors:** Worker, Manager, Admin

**Preconditions:**
- User is authenticated
- User has access to settings

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P4-03: Configure Notification Preferences              │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ User navigates  │
    │ to Settings >   │
    │ Notifications   │
    └───────┬─────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Fetch current       │
    │ preferences         │
    │ (or create defaults)│
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Display preferences │
    │ form:               │
    │ • Email toggles     │
    │ • Digest frequency  │
    │ • Digest time       │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ User modifies       │
    │ preferences         │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ User clicks Save    │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Validate inputs     │
    │ (e.g., valid time)  │
    └───────┬─────────────┘
            │
            ▼
    ┌───────────────┐     Invalid    ┌─────────────────┐
    │ Validation    │───────────────►│ Show validation │
    │ passed?       │                │ errors          │
    └───────┬───────┘                └─────────────────┘
            │ Yes
            ▼
    ┌─────────────────────┐
    │ Update preferences  │
    │ in database         │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Show success toast  │
    │ "Preferences saved" │
    └─────────────────────┘
```

**Postconditions:**
- `user_notification_preferences` record updated
- Changes apply to future notifications

---

### WF-P4-04: Daily Digest Generation

**Trigger:** Cron job at 07:00 UTC

**Actors:** System

**Preconditions:**
- At least one user has `digest_frequency = 'daily'`
- Email service is configured

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P4-04: Daily Digest Generation                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Cron triggers   │
    │ at 07:00 UTC    │
    └───────┬─────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Create job run      │
    │ record              │
    │ job_name: daily_    │
    │ digest              │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Query users with    │
    │ digest_frequency =  │
    │ 'daily'             │
    └───────┬─────────────┘
            │
            ▼
    ┌───────────────────┐     Empty    ┌─────────────────┐
    │ Users found?      │─────────────►│ Mark job        │
    │                   │              │ completed       │
    └───────┬───────────┘              │ (0 processed)   │
            │ Yes                      └─────────────────┘
            ▼
    ┌─────────────────────┐
    │ For each user:      │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Query org data:     │
    │ • New incidents     │
    │   (last 24h)        │
    │ • Actions due soon  │
    │   (next 7 days)     │
    │ • Overdue actions   │
    └───────┬─────────────┘
            │
            ▼
    ┌───────────────────┐     Empty    ┌─────────────────┐
    │ Has digest        │─────────────►│ Skip user       │
    │ content?          │              │ (nothing to     │
    └───────┬───────────┘              │ report)         │
            │ Yes                      └─────────────────┘
            ▼
    ┌─────────────────────┐
    │ Generate digest     │
    │ email HTML          │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Create email_log    │
    │ type: digest        │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Send email via SMTP │
    └───────┬─────────────┘
            │
            ▼
    ┌───────────────────┐     Failed    ┌─────────────────┐
    │ Sent              │──────────────►│ Log failure,    │
    │ successfully?     │               │ queue retry     │
    └───────┬───────────┘               └─────────────────┘
            │ Yes
            ▼
    ┌─────────────────────┐
    │ Update email_log    │
    │ status: sent        │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Increment job       │
    │ items_succeeded     │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ (Next user)         │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Mark job completed  │
    │ with counts         │
    └─────────────────────┘
```

**Postconditions:**
- Digest emails sent to all qualifying users
- Job run record shows success/failure counts
- Email logs created for all attempts

---

### WF-P4-05: Weekly Digest Generation

**Trigger:** Cron job on Monday at 07:00 UTC

**Actors:** System

**Flow:** Same as WF-P4-04 but:
- Filters users with `digest_frequency = 'weekly'`
- Queries data for last 7 days instead of 24 hours
- Includes week-over-week comparison statistics

---

### WF-P4-06: Overdue Action Escalation

**Trigger:** Cron job at 08:00 UTC

**Actors:** System

**Preconditions:**
- Organisation has `escalation.enabled = true`
- At least one action is overdue by configured threshold

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P4-06: Overdue Action Escalation                       │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Cron triggers   │
    │ at 08:00 UTC    │
    └───────┬─────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Create job run      │
    │ job_name: escalation│
    │ _check              │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Query organisations │
    │ with escalation     │
    │ enabled             │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ For each org:       │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Get escalation      │
    │ threshold (days)    │
    │ from org settings   │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Query actions:      │
    │ • status: open/     │
    │   in_progress       │
    │ • due_date < NOW()  │
    │   - threshold days  │
    │ • NOT already       │
    │   escalated         │
    └───────┬─────────────┘
            │
            ▼
    ┌───────────────────┐     None     ┌─────────────────┐
    │ Actions found?    │─────────────►│ Next org        │
    └───────┬───────────┘              └─────────────────┘
            │ Yes
            ▼
    ┌─────────────────────┐
    │ For each action:    │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────────────────────────────────┐
    │ Create notifications:                           │
    │ 1. For assignee (type: action_escalated)        │
    │ 2. For each org manager (type: action_escalated)│
    └───────┬─────────────────────────────────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Send escalation     │
    │ emails to:          │
    │ • Assignee          │
    │ • Org managers      │
    │ • Custom email (if  │
    │   configured)       │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Mark action as      │
    │ escalated (metadata │
    │ flag or timestamp)  │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Log escalation in   │
    │ audit_logs          │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ (Next action)       │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Mark job completed  │
    └─────────────────────┘
```

**Postconditions:**
- Escalation notifications created
- Escalation emails sent
- Actions marked as escalated (prevents duplicate escalations)
- Audit trail created

---

### WF-P4-07: High-Severity Incident Notification

**Trigger:** Incident created with `severity = 'high'` or `'critical'`

**Actors:** System, Managers, Admins

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P4-07: High-Severity Incident Notification             │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Incident created│
    │ severity: high/ │
    │ critical        │
    └───────┬─────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Query org managers  │
    │ and admins          │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ For each manager/   │
    │ admin:              │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Create notification │
    │ type: incident_     │
    │ high_severity       │
    │ priority: HIGH      │
    └───────┬─────────────┘
            │
            ▼
    ┌───────────────────┐     Disabled   ┌─────────────────┐
    │ User preference:  │───────────────►│ In-app only     │
    │ email_high_       │                │                 │
    │ severity = true?  │                └─────────────────┘
    └───────┬───────────┘
            │ Yes
            ▼
    ┌─────────────────────┐
    │ Send high-priority  │
    │ email immediately   │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Log audit event     │
    └─────────────────────┘
```

**Note:** High-severity incident notifications are **mandatory** for managers/admins – they cannot be completely disabled, only the email delivery can be turned off.

---

### WF-P4-08: Email Retry Processing

**Trigger:** Cron job every 15 minutes

**Actors:** System

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P4-08: Email Retry Processing                          │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Cron triggers   │
    │ every 15 min    │
    └───────┬─────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Query email_logs:   │
    │ • status = 'failed' │
    │ • attempts < 3      │
    │ • last_attempt >    │
    │   15 min ago        │
    └───────┬─────────────┘
            │
            ▼
    ┌───────────────────┐     None     ┌─────────────────┐
    │ Emails found?     │─────────────►│ End             │
    └───────┬───────────┘              └─────────────────┘
            │ Yes
            ▼
    ┌─────────────────────┐
    │ For each email:     │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Retry send via SMTP │
    └───────┬─────────────┘
            │
            ├──────────────────────┐
            │ Success              │ Failure
            ▼                      ▼
    ┌─────────────────┐    ┌─────────────────┐
    │ Update status:  │    │ Increment       │
    │ 'sent'          │    │ attempts        │
    │ sent_at: NOW()  │    │ Update error    │
    └─────────────────┘    │ message         │
                           └───────┬─────────┘
                                   │
                                   ▼
                           ┌───────────────────┐
                           │ attempts >= 3?    │
                           └───────┬───────────┘
                                   │ Yes
                                   ▼
                           ┌─────────────────┐
                           │ Mark as         │
                           │ permanently     │
                           │ failed          │
                           │ Log warning     │
                           └─────────────────┘
```

---

### WF-P4-09: Notification Cleanup

**Trigger:** Cron job at 02:00 UTC

**Actors:** System

**Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WF-P4-09: Notification Cleanup                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Cron triggers   │
    │ at 02:00 UTC    │
    └───────┬─────────┘
            │
            ▼
    ┌─────────────────────┐
    │ For each org:       │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Get retention days  │
    │ from org settings   │
    │ (default: 90)       │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ DELETE notifications│
    │ WHERE expires_at <  │
    │ NOW() OR created_at │
    │ < NOW() - retention │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ DELETE email_logs   │
    │ WHERE created_at <  │
    │ NOW() - 365 days    │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ DELETE scheduled_   │
    │ job_runs WHERE      │
    │ started_at < NOW()  │
    │ - 30 days           │
    └───────┬─────────────┘
            │
            ▼
    ┌─────────────────────┐
    │ Log cleanup stats   │
    └─────────────────────┘
```

---

## 4. Workflow State Diagram – Notification Lifecycle

```
                              ┌─────────────┐
                              │   CREATED   │
                              │  (is_read   │
                              │  = false)   │
                              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌───────────┐    ┌───────────┐    ┌───────────┐
            │   READ    │    │ CLICKED   │    │  EXPIRED  │
            │ (is_read  │    │ (navigated│    │ (cleanup  │
            │  = true)  │    │ to item)  │    │  deleted) │
            └───────────┘    └─────┬─────┘    └───────────┘
                                   │
                                   ▼
                             ┌───────────┐
                             │   READ    │
                             └───────────┘
```

---

## 5. Error Handling

| Workflow | Error Type | Handling |
|----------|------------|----------|
| WF-P4-01 | Email send failure | Queue for retry, continue with in-app |
| WF-P4-04 | Single user digest failure | Log error, continue with next user |
| WF-P4-06 | Escalation email failure | Log error, notification still created |
| All jobs | Database connection error | Retry job, alert ops if repeated |
| All jobs | SMTP server down | Queue all emails, retry later |

---

## 6. Workflow Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Workflow Dependency Graph                             │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────┐
    │ User creates   │
    │ Action         │
    └───────┬────────┘
            │
            ▼
    ┌────────────────┐     ┌────────────────┐
    │ WF-P4-01       │────►│ WF-P4-02       │
    │ Action Assign  │     │ View/Read      │
    │ Notification   │     │ Notifications  │
    └───────┬────────┘     └────────────────┘
            │
            │ If overdue
            ▼
    ┌────────────────┐
    │ WF-P4-06       │
    │ Escalation     │
    └────────────────┘


    ┌────────────────┐
    │ WF-P4-03       │     (Independent - user-initiated)
    │ Configure      │
    │ Preferences    │
    └────────────────┘


    ┌────────────────┐     ┌────────────────┐
    │ WF-P4-04/05    │────►│ WF-P4-08       │
    │ Digest Jobs    │     │ Email Retry    │
    └────────────────┘     └────────────────┘
            │
            ▼
    ┌────────────────┐
    │ WF-P4-09       │
    │ Cleanup        │
    └────────────────┘
```

# Business Requirements Document – EHS Portal Phase 4
## Notifications & Escalations

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-01-31 |
| Status | Draft |
| Phase | 4 – Notifications & Escalations |

---

## 1. Executive Summary

Phase 4 transforms the EHS Portal from a passive record-keeping system into a proactive communication platform. By implementing real-time notifications, scheduled digest emails, and automated escalations, we ensure that critical safety information reaches the right people at the right time, improving response times and accountability.

### 1.1 Business Context

With Phases 1–3 complete, the EHS Portal successfully manages incidents, inspections, actions, and generates reports. However, users must actively check the system to discover new assignments or overdue items. This passive model creates risks:

- Workers may miss action assignments for hours or days
- Managers lack visibility into accumulating overdue actions
- High-severity incidents may not receive immediate attention
- No systematic escalation when deadlines are missed

Phase 4 addresses these gaps with a comprehensive notification and escalation framework.

### 1.2 Business Goals

| Goal ID | Goal | Success Metric |
|---------|------|----------------|
| G-P4-01 | Reduce time to acknowledge action assignments | < 4 hours average acknowledgment time |
| G-P4-02 | Improve visibility of high-severity incidents | 100% of high/critical incidents trigger immediate notifications |
| G-P4-03 | Reduce overdue action backlog | 30% reduction in actions overdue > 7 days |
| G-P4-04 | Increase manager awareness | 80%+ of managers receive and read daily/weekly digests |
| G-P4-05 | Enable user control over notifications | All users can configure preferences |

### 1.3 Scope

**In Scope:**
- Real-time in-app notifications
- Email notifications for key events
- Daily/weekly digest emails for managers/admins
- Notification centre UI (bell icon, dropdown, full page)
- User notification preferences
- Simple escalation rules for overdue actions
- Audit logging of notification delivery

**Out of Scope:**
- Push notifications (mobile/PWA) – future phase
- SMS/WhatsApp notifications – future phase
- Complex escalation workflows with multiple tiers
- AI-powered notification prioritisation
- Notification templates management UI

---

## 2. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Workers | Primary users | Receive action assignments, stay informed |
| Managers | Supervisors | Monitor team actions, receive digests, handle escalations |
| Admins | System administrators | Configure org settings, monitor notification delivery |
| IT Operations | Support | Ensure email delivery, monitor job execution |

---

## 3. Business Requirements

### 3.1 Notification Events (BR-NOTIF)

#### BR-NOTIF-01: Action Assignment Notification
**Priority:** Must Have

When an action is assigned to a user, the system shall:
1. Create an in-app notification for the assignee
2. Send an email notification if the user has enabled email preferences
3. Include action title, source (incident/inspection), due date, and link to view

**Acceptance Criteria:**
- Notification appears within 30 seconds of assignment
- Email sent within 2 minutes of assignment
- Notification links directly to action detail page

**Capability ID:** C-096

---

#### BR-NOTIF-02: Action Status Change Notification
**Priority:** Must Have

When an action's status changes, the system shall notify relevant parties:
- Status → "overdue": Notify assignee and action creator
- Status → "completed": Notify action creator (if different from assignee)
- Status → "in_progress": Notify action creator

**Acceptance Criteria:**
- Status changes trigger notifications within 30 seconds
- Users can disable non-critical status notifications

**Capability ID:** C-097

---

#### BR-NOTIF-03: High-Severity Incident Notification
**Priority:** Must Have

When an incident with severity "high" or "critical" is created, the system shall:
1. Notify all managers and admins in the organisation
2. Include incident title, type, site, severity, and reporter
3. Mark notification as high-priority (visual distinction)

**Acceptance Criteria:**
- Notifications sent within 1 minute of incident creation
- High-priority notifications have visual indicator (red badge, bold text)
- Cannot be disabled by individual preference (org-wide mandatory)

**Capability ID:** C-098

---

#### BR-NOTIF-04: Inspection Failed Items Notification (Optional)
**Priority:** Should Have

When an inspection is completed with failed items (result = 'not_ok'), the system may notify:
- The inspector's manager
- Site managers (if configured)

**Acceptance Criteria:**
- Configurable at organisation level (on/off)
- Includes count of failed items and link to inspection

**Capability ID:** C-099

---

### 3.2 Digest Emails (BR-DIGEST)

#### BR-DIGEST-01: Daily Digest Email
**Priority:** Must Have

The system shall send a daily digest email to users who have opted in, containing:
1. **New Incidents** (since last digest): Title, severity, site, time
2. **Actions Due Soon** (next N days, default 7): Title, assignee, due date
3. **Overdue Actions**: Title, assignee, days overdue

**Acceptance Criteria:**
- Sent at configurable time (default: 07:00 local timezone)
- Only includes data for the user's organisation
- Respects user role (workers see only their actions, managers see team)
- Empty sections are omitted (no "0 new incidents" messages)

**Capability ID:** C-100

---

#### BR-DIGEST-02: Weekly Digest Email
**Priority:** Must Have

The system shall send a weekly digest email (same content as daily but covering 7 days) to users who prefer weekly frequency.

**Acceptance Criteria:**
- Sent on configurable day (default: Monday 07:00)
- Includes summary statistics (total incidents this week vs last week)

**Capability ID:** C-101

---

#### BR-DIGEST-03: Digest Frequency Preference
**Priority:** Must Have

Each user shall be able to select their digest preference:
- Daily
- Weekly
- None (no digest emails)

Default for new users: Weekly for managers/admins, None for workers.

**Capability ID:** C-102

---

### 3.3 Notification Centre (BR-CENTRE)

#### BR-CENTRE-01: Notification Bell Icon
**Priority:** Must Have

The application header shall display a bell icon showing:
- Unread notification count (badge)
- Maximum display: "99+" for counts over 99

**Acceptance Criteria:**
- Badge updates in real-time (polling every 30 seconds or WebSocket)
- Badge is clearly visible on all screen sizes

**Capability ID:** C-103

---

#### BR-CENTRE-02: Notification Dropdown
**Priority:** Must Have

Clicking the bell icon shall display a dropdown with:
- Last 10 notifications (newest first)
- Each showing: icon, title, time ago, read/unread indicator
- "Mark all as read" button
- "View all" link to full notifications page

**Acceptance Criteria:**
- Dropdown loads within 500ms
- Clicking a notification navigates to related item and marks as read

**Capability ID:** C-104

---

#### BR-CENTRE-03: Notifications Page
**Priority:** Must Have

A dedicated page (/notifications) shall display:
- All notifications with pagination (20 per page)
- Filters: Type (action/incident/system), Read/Unread, Date range
- Bulk actions: Mark selected as read, Delete old notifications

**Acceptance Criteria:**
- Supports filtering and sorting
- Notifications older than 90 days auto-deleted (configurable)

**Capability ID:** C-105

---

### 3.4 Escalation Rules (BR-ESC)

#### BR-ESC-01: Overdue Action Escalation
**Priority:** Must Have

When an action remains open X days after its due date, the system shall:
1. Send an escalation email to the assignee (reminder)
2. Send an escalation email to organisation managers
3. Create an in-app notification marked as "escalation"

**Acceptance Criteria:**
- X is configurable per organisation (default: 3 days)
- Escalation only triggers once per action (not repeated daily)
- Escalation is logged in audit trail

**Capability ID:** C-106

---

#### BR-ESC-02: Escalation Configuration
**Priority:** Must Have

Organisation admins shall be able to configure:
- Escalation threshold (days overdue before escalation)
- Escalation recipients (default: all org managers, or specific email)
- Enable/disable escalations

**Acceptance Criteria:**
- Settings accessible in Admin > Organisation page
- Changes take effect immediately

**Capability ID:** C-107

---

### 3.5 Notification Preferences (BR-PREF)

#### BR-PREF-01: User Notification Settings
**Priority:** Must Have

Each user shall be able to configure:
- **Email Notifications:**
  - [ ] Action assigned to me (default: on)
  - [ ] My actions overdue (default: on)
  - [ ] High-severity incidents in my org (default: on for managers, off for workers)
  - [ ] Inspection failed items (default: off)
- **Digest Frequency:** Daily / Weekly / None

**Acceptance Criteria:**
- Settings saved immediately on change
- Settings apply to future notifications only

**Capability ID:** C-108

---

#### BR-PREF-02: Preferences Page Location
**Priority:** Must Have

Notification preferences shall be accessible from:
- User profile dropdown > "Notification Settings"
- Direct URL: /settings/notifications

**Capability ID:** C-109

---

### 3.6 System Requirements (BR-SYS)

#### BR-SYS-01: Notification Delivery Reliability
**Priority:** Must Have

The system shall ensure reliable notification delivery:
- In-app notifications stored persistently
- Email failures logged and retried (up to 3 attempts)
- No notification lost due to transient failures

**Capability ID:** C-110

---

#### BR-SYS-02: Scheduled Job Execution
**Priority:** Must Have

The system shall execute scheduled jobs for:
- Daily digest emails (once per day)
- Weekly digest emails (once per week)
- Escalation checks (once per day)

Jobs shall:
- Run reliably even after server restart
- Not duplicate execution
- Log execution details

**Capability ID:** C-111

---

#### BR-SYS-03: Audit Trail
**Priority:** Must Have

All notification events shall be logged:
- Notification created (type, recipient, timestamp)
- Email sent (recipient, subject, status)
- Escalation triggered (action ID, recipients)

**Capability ID:** C-112

---

## 4. Capability-to-Requirement Mapping

| Capability ID | Capability Name | Business Requirement |
|---------------|-----------------|---------------------|
| C-096 | Action Assignment Notification | BR-NOTIF-01 |
| C-097 | Action Status Change Notification | BR-NOTIF-02 |
| C-098 | High-Severity Incident Notification | BR-NOTIF-03 |
| C-099 | Inspection Failed Items Notification | BR-NOTIF-04 |
| C-100 | Daily Digest Email | BR-DIGEST-01 |
| C-101 | Weekly Digest Email | BR-DIGEST-02 |
| C-102 | Digest Frequency Preference | BR-DIGEST-03 |
| C-103 | Notification Bell Icon | BR-CENTRE-01 |
| C-104 | Notification Dropdown | BR-CENTRE-02 |
| C-105 | Notifications Page | BR-CENTRE-03 |
| C-106 | Overdue Action Escalation | BR-ESC-01 |
| C-107 | Escalation Configuration | BR-ESC-02 |
| C-108 | User Notification Settings | BR-PREF-01 |
| C-109 | Preferences Page Location | BR-PREF-02 |
| C-110 | Notification Delivery Reliability | BR-SYS-01 |
| C-111 | Scheduled Job Execution | BR-SYS-02 |
| C-112 | Audit Trail | BR-SYS-03 |

---

## 5. Assumptions and Dependencies

### 5.1 Assumptions

| ID | Assumption |
|----|------------|
| A-P4-01 | SMTP email service is configured and operational (completed in Phase 3) |
| A-P4-02 | Users have valid email addresses stored in the system |
| A-P4-03 | Server can run scheduled tasks (cron jobs or equivalent) |
| A-P4-04 | Frontend can poll for notification updates (no WebSocket required initially) |

### 5.2 Dependencies

| ID | Dependency | Impact |
|----|------------|--------|
| D-P4-01 | Phase 3 email infrastructure | Required for all email notifications |
| D-P4-02 | Actions module (Phase 2) | Required for action-related notifications |
| D-P4-03 | Audit logging (Phase 2) | Required for notification audit trail |
| D-P4-04 | User preferences storage | New tables required |

---

## 6. Constraints

| ID | Constraint | Rationale |
|----|------------|-----------|
| CON-P4-01 | Email rate limiting (max 100/hour/org) | Prevent SMTP abuse |
| CON-P4-02 | Notification retention: 90 days | Database storage management |
| CON-P4-03 | Digest jobs run during off-peak hours | Minimize performance impact |
| CON-P4-04 | No WebSocket in v1 (polling only) | Simplify initial implementation |

---

## 7. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R-P4-01 | Email delivery failures | Medium | High | Implement retry mechanism, monitor delivery rates |
| R-P4-02 | Notification spam | Medium | Medium | Implement rate limiting, consolidation of similar notifications |
| R-P4-03 | Scheduled job failures | Low | High | Implement job monitoring, alerting, manual trigger capability |
| R-P4-04 | User notification fatigue | Medium | Medium | Sensible defaults, easy preference management |

---

## 8. Success Criteria

Phase 4 will be considered successful when:

1. ✅ 100% of action assignments generate notifications within 30 seconds
2. ✅ 100% of high-severity incidents trigger manager notifications
3. ✅ Daily/weekly digest jobs execute reliably for 30 consecutive days
4. ✅ 80%+ of users have viewed the notification centre
5. ✅ Escalation emails sent for 100% of qualifying overdue actions
6. ✅ All notification events logged in audit trail

---

## 9. Glossary

| Term | Definition |
|------|------------|
| In-app notification | A notification displayed within the web application UI |
| Digest | A summary email containing multiple items sent on a schedule |
| Escalation | An automated notification triggered when a threshold is exceeded |
| Notification Centre | The UI component (bell icon + dropdown + page) for viewing notifications |
| Preference | A user-configurable setting that controls notification behaviour |

---

## 10. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Technical Lead | | | |
| QA Lead | | | |

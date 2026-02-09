# Phase 4 Implementation Checklist
## Notifications & Escalations

**Status:** Complete (Backend + Frontend)
**Last Updated:** 2026-02-01

---

## Database & Migration

- [x] **Migration file created** (`004_phase4_notifications.sql`)
  - [x] notification_type enum
  - [x] notification_priority enum
  - [x] digest_frequency enum
  - [x] email_status enum
  - [x] job_status enum
  - [x] notifications table with indexes
  - [x] user_notification_preferences table with indexes
  - [x] email_logs table with indexes
  - [x] scheduled_job_runs table with indexes
  - [x] Default preferences for existing users
  - [x] escalated_at column added to actions table

- [ ] **Migration executed** on development database

---

## Backend Services

### NotificationService (src/services/notificationService.js)

- [x] createNotification(options)
- [x] createNotificationsForUsers(params, userIds)
- [x] getNotifications(userId, orgId, filters)
- [x] getUnreadCount(userId, orgId)
- [x] markAsRead(notificationId, userId)
- [x] markAllAsRead(userId, orgId)
- [x] deleteNotification(notificationId, userId)
- [x] deleteExpired(orgId)
- [x] getNotificationById(notificationId, userId)
- [x] Unit tests (85%+ coverage)

### PreferencesService (src/services/preferencesService.js)

- [x] getPreferences(userId, orgId, role)
- [x] updatePreferences(userId, orgId, prefs)
- [x] getDefaultPreferences(role)
- [x] getUsersByDigestFrequency(frequency, orgId)
- [x] isEmailPreferenceEnabled(userId, orgId, key)
- [x] Unit tests (85%+ coverage)

### EmailService (src/services/emailService.js)

- [x] sendNotificationEmail(notification, user, orgId)
- [x] sendDigestEmail(user, digestData, digestType)
- [x] sendEscalationEmail(action, recipients, orgId)
- [x] logEmailAttempt(params)
- [x] updateEmailLogStatus(emailLogId, status, error)
- [x] retryFailedEmails(maxAttempts)
- [x] getEmailLogs(orgId, options)
- [x] HTML email templates (inline)
- [x] Unit tests (85%+ coverage)

### NotificationTriggers (src/services/notificationTriggers.js)

- [x] onActionAssigned(action, assignee, creator)
- [x] onActionStatusChanged(action, oldStatus, newStatus, creator, updatedBy)
- [x] onHighSeverityIncident(incident, orgId, reporter)
- [x] onInspectionFailed(inspection, orgId)

---

## Backend API Routes

### Notifications Router (src/routes/notifications.js)

- [x] GET /notifications (paginated, filtered)
- [x] GET /notifications/unread-count
- [x] PUT /notifications/:id/read
- [x] PUT /notifications/mark-all-read
- [x] DELETE /notifications/:id
- [x] Integration tests

### Preferences Router (src/routes/preferences.js)

- [x] GET /preferences/notifications
- [x] PUT /preferences/notifications
- [x] Integration tests

### Admin Routes (src/routes/admin.js)

- [x] GET /admin/jobs/runs
- [x] POST /admin/jobs/digest/trigger
- [x] PUT /admin/organisation/escalation
- [x] GET /admin/organisation/escalation
- [x] GET /admin/email-logs
- [x] Integration tests

---

## Notification Triggers

### Action Assignment (src/routes/actions.js)

- [x] Hook after action creation
- [x] Create notification for assignee
- [x] Check user preferences
- [x] Send email if enabled
- [x] Integration test

### Action Status Change (src/routes/actions.js)

- [x] Hook after status update to 'done'
- [x] Notify creator on completion
- [x] Notify on reassignment
- [x] Integration test

### High-Severity Incident (src/routes/incidents.js)

- [x] Hook after incident creation
- [x] Check severity (high/critical)
- [x] Notify all managers/admins
- [x] Send emails
- [x] Integration test

---

## Scheduled Jobs

### Scheduler Setup (src/jobs/scheduler.js)

- [x] node-cron installed (package.json updated)
- [x] Job scheduling configured (env-based cron expressions)
- [x] Startup initialization in index.js
- [x] Graceful shutdown on SIGTERM/SIGINT
- [x] JOBS_ENABLED feature flag

### Daily Digest Job (src/jobs/digestJob.js)

- [x] runDailyDigest()
- [x] Query users with digestFrequency='daily'
- [x] Query incidents (last 24h)
- [x] Query actions due soon
- [x] Query overdue actions
- [x] Generate email content
- [x] Send emails
- [x] Log job run
- [x] Unit tests

### Weekly Digest Job (src/jobs/digestJob.js)

- [x] runWeeklyDigest()
- [x] Query users with digestFrequency='weekly'
- [x] 7-day data window
- [x] Send emails
- [x] Log job run
- [x] Unit tests

### Escalation Job (src/jobs/escalationJob.js)

- [x] runEscalation()
- [x] Check org escalation settings
- [x] Query overdue actions (threshold days)
- [x] Skip already-escalated actions (escalated_at NOT NULL)
- [x] Create notifications
- [x] Send escalation emails
- [x] Mark action as escalated
- [x] Log to audit
- [x] Unit tests

### Email Retry Job (src/jobs/emailRetryJob.js)

- [x] runEmailRetry()
- [x] Query failed emails (attempts < max)
- [x] Retry send
- [x] Update status
- [x] Unit tests

### Cleanup Job (src/jobs/cleanupJob.js)

- [x] runCleanup()
- [x] Delete expired notifications
- [x] Delete old email logs (365 days)
- [x] Delete old job runs (30 days)
- [x] Unit tests

---

## Email Templates

- [ ] src/templates/emails/notification.html
- [ ] src/templates/emails/dailyDigest.html
- [ ] src/templates/emails/weeklyDigest.html
- [ ] src/templates/emails/escalation.html
- [ ] src/templates/partials/header.html
- [ ] src/templates/partials/footer.html

---

## Frontend Components

### Context (src/context/NotificationContext.jsx)

- [x] State: unreadCount, notifications, loading
- [x] Actions: markAsRead, markAllAsRead, refreshCount
- [x] Provider wrapper
- [x] 30-second polling interval

### Components (src/components/notifications/)

- [x] NotificationBell.jsx
  - [x] Bell icon (SVG)
  - [x] Badge with count (99+ cap)
  - [x] Click handler to open dropdown
  - [x] Aria accessibility attributes

- [x] NotificationDropdown.jsx
  - [x] Latest 10 notifications
  - [x] Mark all as read button
  - [x] View all link → /notifications
  - [x] Click outside to close
  - [x] Empty/loading/error states

- [x] NotificationItem.jsx
  - [x] Icon by type (emoji mapping)
  - [x] Title, message, time (relative)
  - [x] Unread indicator (blue dot)
  - [x] Click handler to navigate + mark read
  - [x] Compact mode for dropdown

### Pages

- [x] NotificationsPage.jsx
  - [x] Filter controls (type, status, date range)
  - [x] Notification list (cards)
  - [x] Pagination
  - [x] Empty state
  - [x] Mark all as read button
  - [x] Delete individual notifications

- [x] NotificationPreferencesPage.jsx
  - [x] Email toggles (4 options)
  - [x] Digest frequency dropdown
  - [x] Digest time dropdown
  - [x] Digest day dropdown (weekly only)
  - [x] In-app toggle
  - [x] Save/Cancel buttons
  - [x] Success toast

### Header Integration

- [x] Add NotificationBell to Layout.jsx topbar
- [x] CSS styles in app.css

### Routing

- [x] /notifications route (App.jsx)
- [x] /settings/notifications route (App.jsx)

### Frontend Tests

- [x] NotificationBell.test.jsx (6 tests)
- [x] NotificationsPage.test.jsx (10 tests)
- [x] NotificationPreferencesPage.test.jsx (12 tests)

---

## Admin UI

### Escalation Settings (Admin > Organisation)

- [x] Enable/disable toggle
- [x] Days overdue input (1-30 validation)
- [x] Notify managers checkbox
- [x] Custom email input (with validation)
- [x] Save button (with loading state)
- [x] Validation (days range, email format)
- [x] Loads current settings from API
- [x] Tests added (3 tests)

---

## Documentation Updates

- [ ] Update ARCHITECTURE.md with Phase 4 components
- [ ] Update DATA_MODEL.md with Phase 4 tables
- [ ] Update TEST_STRATEGY_ALL_PHASES.md
- [ ] Update test_cases_all_phases.csv

---

## Testing Completion

- [x] All backend tests pass (136 tests)
- [x] All frontend tests pass (95 tests)
- [ ] Coverage meets thresholds (85%+ overall)
- [ ] Manual E2E verification
- [ ] Mobile responsive testing

---

## Deployment

- [ ] Environment variables configured
  - [ ] NOTIFICATION_RETENTION_DAYS
  - [ ] DIGEST_DEFAULT_TIME
  - [ ] ESCALATION_DEFAULT_DAYS

- [ ] Migration run on staging
- [ ] Staging testing complete
- [ ] Migration run on production
- [ ] Production verification

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

# Implementation Plan – Phase 4: Notifications & Escalations

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-01-31 |
| Phase | 4 – Notifications & Escalations |

---

## 1. Overview

Phase 4 implementation is divided into 6 work packages, organized by dependency order. Total estimated effort considers a single developer working full-time.

### 1.1 Implementation Principles

1. **Incremental delivery**: Each work package delivers testable functionality
2. **Backend first**: APIs before frontend
3. **Core before optional**: Notifications before digests before escalations
4. **Test as you go**: Unit and integration tests with each component

---

## 2. Work Package Summary

| WP | Name | Dependencies | Key Deliverables |
|----|------|--------------|------------------|
| WP-1 | Database & Core Services | None | Migration, NotificationService, PreferencesService |
| WP-2 | Notification API | WP-1 | REST endpoints for notifications and preferences |
| WP-3 | Notification Triggers | WP-1, WP-2 | Action/Incident hooks, email sending |
| WP-4 | Frontend Notification Centre | WP-2 | Bell icon, dropdown, full page |
| WP-5 | Digest Jobs | WP-1, WP-3 | Daily/weekly digest scheduled jobs |
| WP-6 | Escalation System | WP-1, WP-3 | Escalation job, admin settings UI |

---

## 3. Work Package Details

### WP-1: Database & Core Services

**Goal:** Establish data model and core service layer

**Tasks:**

| ID | Task | Description |
|----|------|-------------|
| WP1-01 | Create migration file | `004_phase4_notifications.sql` with all tables and enums |
| WP1-02 | Run migration | Execute on dev database |
| WP1-03 | Create NotificationService | CRUD operations for notifications |
| WP1-04 | Create PreferencesService | Get/update user preferences |
| WP1-05 | Create EmailService extension | Notification and digest email templates |
| WP1-06 | Unit tests | Test services in isolation |

**Deliverables:**
- `migrations/004_phase4_notifications.sql`
- `src/services/notificationService.js`
- `src/services/preferencesService.js`
- `src/services/emailService.js` (extended)
- `src/templates/emails/*.html`

**Definition of Done:**
- [ ] Migration runs without errors
- [ ] Services have 80%+ test coverage
- [ ] Email templates render correctly

---

### WP-2: Notification API

**Goal:** Expose notification endpoints

**Tasks:**

| ID | Task | Description |
|----|------|-------------|
| WP2-01 | Create notifications router | `/api/notifications` routes |
| WP2-02 | Implement GET /notifications | Paginated list with filters |
| WP2-03 | Implement GET /notifications/unread-count | Badge count endpoint |
| WP2-04 | Implement PUT endpoints | Mark read, mark all read |
| WP2-05 | Implement DELETE endpoint | Delete notification |
| WP2-06 | Create preferences router | `/api/preferences/notifications` routes |
| WP2-07 | Implement GET/PUT preferences | Preferences CRUD |
| WP2-08 | Integration tests | API endpoint tests |

**Deliverables:**
- `src/routes/notifications.js`
- `src/routes/preferences.js`
- `tests/notifications.test.js`
- `tests/preferences.test.js`

**Definition of Done:**
- [ ] All endpoints return correct data
- [ ] Org-scoping enforced
- [ ] Rate limiting in place
- [ ] 90%+ test coverage

---

### WP-3: Notification Triggers

**Goal:** Automatically create notifications on events

**Tasks:**

| ID | Task | Description |
|----|------|-------------|
| WP3-01 | Action assignment trigger | Create notification when action assigned |
| WP3-02 | Action status change trigger | Notify on completion/overdue |
| WP3-03 | High-severity incident trigger | Notify managers on high/critical |
| WP3-04 | Email dispatch logic | Check preferences, send emails |
| WP3-05 | Email logging | Log all email attempts |
| WP3-06 | Email retry job | Retry failed emails |
| WP3-07 | Integration tests | Test triggers end-to-end |

**Deliverables:**
- Updates to `src/routes/actions.js`
- Updates to `src/routes/incidents.js`
- `src/jobs/emailRetryJob.js`
- Updated tests

**Definition of Done:**
- [ ] Action assignment creates notification
- [ ] High-severity incidents trigger alerts
- [ ] Emails sent according to preferences
- [ ] Failed emails queued for retry

---

### WP-4: Frontend Notification Centre

**Goal:** Build notification UI components

**Tasks:**

| ID | Task | Description |
|----|------|-------------|
| WP4-01 | NotificationContext | Global state for notifications |
| WP4-02 | useNotificationCount hook | Polling for badge count |
| WP4-03 | NotificationBell component | Bell icon with badge |
| WP4-04 | NotificationDropdown component | Dropdown with recent notifications |
| WP4-05 | NotificationItem component | Individual notification row |
| WP4-06 | Header integration | Add bell to header |
| WP4-07 | NotificationsPage | Full page with filters |
| WP4-08 | NotificationPreferencesPage | Preferences form |
| WP4-09 | Routing updates | Add new routes |
| WP4-10 | Frontend tests | Component and integration tests |

**Deliverables:**
- `src/components/notifications/*.jsx`
- `src/pages/NotificationsPage.jsx`
- `src/pages/settings/NotificationPreferencesPage.jsx`
- `src/hooks/useNotification*.js`
- `src/context/NotificationContext.jsx`
- Updated tests

**Definition of Done:**
- [ ] Bell icon shows correct count
- [ ] Dropdown displays notifications
- [ ] Clicking notification navigates to item
- [ ] Preferences save correctly
- [ ] Mobile responsive

---

### WP-5: Digest Jobs

**Goal:** Implement scheduled digest emails

**Tasks:**

| ID | Task | Description |
|----|------|-------------|
| WP5-01 | Scheduler setup | Install and configure node-cron |
| WP5-02 | Daily digest job | Query data, generate email, send |
| WP5-03 | Weekly digest job | Similar to daily, 7-day window |
| WP5-04 | Digest email template | HTML template with sections |
| WP5-05 | Job run logging | Record job execution |
| WP5-06 | Admin job history endpoint | View job runs |
| WP5-07 | Manual trigger endpoint | Test digest sending |
| WP5-08 | Tests | Job execution tests |

**Deliverables:**
- `src/jobs/scheduler.js`
- `src/jobs/dailyDigestJob.js`
- `src/jobs/weeklyDigestJob.js`
- `src/templates/emails/dailyDigest.html`
- `src/templates/emails/weeklyDigest.html`
- Admin endpoints
- Tests

**Definition of Done:**
- [ ] Jobs run at scheduled times
- [ ] Digests contain correct data
- [ ] Empty digests not sent
- [ ] Job runs logged
- [ ] Admin can trigger manually

---

### WP-6: Escalation System

**Goal:** Implement action escalation

**Tasks:**

| ID | Task | Description |
|----|------|-------------|
| WP6-01 | Escalation job | Check overdue actions, send escalations |
| WP6-02 | Escalation email template | HTML template |
| WP6-03 | Mark action as escalated | Prevent re-escalation |
| WP6-04 | Escalation settings API | GET/PUT org escalation config |
| WP6-05 | Escalation settings UI | Admin page section |
| WP6-06 | Audit logging | Log escalation events |
| WP6-07 | Tests | Escalation logic tests |

**Deliverables:**
- `src/jobs/escalationJob.js`
- `src/templates/emails/escalation.html`
- Updated org settings API
- Admin UI section
- Tests

**Definition of Done:**
- [ ] Overdue actions trigger escalation
- [ ] Escalation respects org settings
- [ ] Each action escalated only once
- [ ] Audit trail created

---

## 4. Implementation Sequence

```
Week 1-2:  WP-1 (Database & Core Services)
              │
              ▼
Week 2-3:  WP-2 (Notification API)
              │
              ├────────────────┐
              ▼                ▼
Week 3-4:  WP-3 (Triggers)   WP-4 (Frontend - can start in parallel)
              │                │
              ▼                ▼
Week 4-5:  WP-5 (Digests)    WP-4 continued
              │                │
              ▼                ▼
Week 5-6:  WP-6 (Escalation) Final Integration
              │
              ▼
Week 6:    Testing & Polish
```

---

## 5. Technical Dependencies

### 5.1 New Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| node-cron | Job scheduling | ^3.0.0 |
| (pdfkit) | Already installed from Phase 3 | - |
| (nodemailer) | Already installed from Phase 3 | - |

### 5.2 Existing Dependencies

- Express.js (routing)
- PostgreSQL (database)
- JWT (authentication)
- Existing email infrastructure

---

## 6. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Email delivery failures | Retry mechanism, email logging |
| Job execution issues | Job run logging, manual trigger |
| Performance (large orgs) | Batch processing, efficient queries |
| Notification spam | Rate limiting, consolidation logic |

---

## 7. Testing Strategy

| Level | Coverage |
|-------|----------|
| Unit tests | Services, utilities |
| Integration tests | API endpoints |
| E2E tests | Critical flows (notification creation, digest) |
| Manual testing | UI components, mobile |

**Test Scenarios:**
- Notification created on action assignment
- Notification marked as read
- Preferences update affects email delivery
- Digest sent to correct users
- Escalation triggered after threshold

---

## 8. Deployment Checklist

**Pre-deployment:**
- [ ] Migration tested on staging
- [ ] SMTP configuration verified
- [ ] Cron jobs scheduled correctly
- [ ] Environment variables set

**Deployment:**
- [ ] Run database migration
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify jobs scheduled

**Post-deployment:**
- [ ] Verify notification creation
- [ ] Test digest trigger
- [ ] Monitor email logs
- [ ] Check error rates

---

## 9. Rollback Plan

**Database:**
- Migration includes rollback SQL
- No destructive changes to existing tables

**Code:**
- Feature flag for notification triggers (optional)
- Jobs can be disabled via config

**If issues:**
1. Disable scheduled jobs
2. Revert frontend to previous version
3. Keep notification tables (data preserved)
4. Fix issues, redeploy

---

## 10. Definition of Done (Phase 4)

Phase 4 is complete when:

- [ ] All database tables created and indexed
- [ ] Notification CRUD API working
- [ ] Preferences API working
- [ ] Action assignment creates notification
- [ ] High-severity incidents create notifications
- [ ] Bell icon shows correct count
- [ ] Dropdown displays notifications
- [ ] Full notifications page works
- [ ] Preferences page works
- [ ] Daily digest job runs
- [ ] Weekly digest job runs
- [ ] Escalation job runs
- [ ] Admin can view job history
- [ ] All tests pass (target: 90%+ coverage)
- [ ] Documentation updated

# Architecture Document – Phase 4: Notifications & Escalations

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-01-31 |
| Phase | 4 – Notifications & Escalations |

---

## 1. Overview

Phase 4 introduces a notification subsystem that operates both synchronously (real-time notifications) and asynchronously (scheduled jobs). This document describes the architectural components, their interactions, and integration with the existing EHS Portal backend.

### 1.1 Architecture Goals

| Goal | Description |
|------|-------------|
| Reliability | Notifications are never lost; emails are retried on failure |
| Scalability | System handles growing notification volumes without degradation |
| Maintainability | Clear separation of concerns between services |
| Extensibility | Easy to add new notification types and channels |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EHS Portal Frontend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Notification │  │ Notification │  │  Preferences │  │   Other Pages    │ │
│  │  Bell Icon   │  │    Page      │  │    Page      │  │                  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
└─────────┼─────────────────┼─────────────────┼───────────────────┼───────────┘
          │                 │                 │                   │
          │    REST API     │                 │                   │
          ▼                 ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Express.js Backend                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         API Routes Layer                              │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │   │
│  │  │ /notifications │  │  /preferences  │  │ /incidents, /actions   │  │   │
│  │  └────────┬───────┘  └────────┬───────┘  └───────────┬────────────┘  │   │
│  └───────────┼───────────────────┼──────────────────────┼───────────────┘   │
│              │                   │                      │                   │
│  ┌───────────▼───────────────────▼──────────────────────▼───────────────┐   │
│  │                       Service Layer                                   │   │
│  │                                                                       │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                    │   │
│  │  │ NotificationService │  │  PreferencesService │                    │   │
│  │  │                     │  │                     │                    │   │
│  │  │ • createNotification│  │ • getPreferences    │                    │   │
│  │  │ • getNotifications  │  │ • updatePreferences │                    │   │
│  │  │ • markAsRead        │  │ • getDefaults       │                    │   │
│  │  │ • getUnreadCount    │  └─────────────────────┘                    │   │
│  │  └──────────┬──────────┘                                             │   │
│  │             │                                                         │   │
│  │  ┌──────────▼──────────┐  ┌─────────────────────┐                    │   │
│  │  │    EmailService     │  │  Existing Services  │                    │   │
│  │  │                     │  │  (incidentService,  │                    │   │
│  │  │ • sendNotification  │  │   actionService)    │                    │   │
│  │  │ • sendDigest        │◄─┤                     │                    │   │
│  │  │ • sendEscalation    │  │ Emit notification   │                    │   │
│  │  │ • retryFailed       │  │ events              │                    │   │
│  │  └──────────┬──────────┘  └─────────────────────┘                    │   │
│  └─────────────┼────────────────────────────────────────────────────────┘   │
│                │                                                             │
│  ┌─────────────▼────────────────────────────────────────────────────────┐   │
│  │                      Scheduled Jobs (node-cron)                       │   │
│  │                                                                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │   │
│  │  │  Daily Digest   │  │  Weekly Digest  │  │  Escalation Check   │   │   │
│  │  │  Job (07:00)    │  │  Job (Mon 07:00)│  │  Job (08:00)        │   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │   │
│  │                                                                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                            │   │
│  │  │  Email Retry    │  │  Notification   │                            │   │
│  │  │  Job (*/15 min) │  │  Cleanup (02:00)│                            │   │
│  │  └─────────────────┘  └─────────────────┘                            │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────┬───────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PostgreSQL Database                             │
│  ┌───────────────┐  ┌────────────────────────────┐  ┌───────────────────┐   │
│  │ notifications │  │ user_notification_preferences │  │   email_logs    │   │
│  └───────────────┘  └────────────────────────────┘  └───────────────────┘   │
│  ┌───────────────┐  ┌────────────────────────────┐                          │
│  │scheduled_job_ │  │  (Existing tables:         │                          │
│  │    runs       │  │   users, actions, etc.)    │                          │
│  └───────────────┘  └────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              External Services                               │
│                                                                              │
│  ┌─────────────────────┐                                                    │
│  │    SMTP Server      │                                                    │
│  │ (mail.laflogroup.com)│                                                    │
│  └─────────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Details

### 3.1 NotificationService

**Location:** `backend/src/services/notificationService.js`

**Responsibilities:**
- Create in-app notifications
- Query notifications for a user
- Mark notifications as read
- Calculate unread counts
- Trigger email notifications based on user preferences

**Key Methods:**

```javascript
class NotificationService {
  // Create a notification and optionally send email
  async createNotification({
    userId,
    organisationId,
    type,
    priority,
    title,
    message,
    relatedType,
    relatedId,
    metadata
  });

  // Get notifications for a user with pagination/filters
  async getNotifications(userId, orgId, { page, limit, type, isRead });

  // Get unread count for badge
  async getUnreadCount(userId, orgId);

  // Mark single notification as read
  async markAsRead(notificationId, userId);

  // Mark all notifications as read
  async markAllAsRead(userId, orgId);

  // Delete old notifications (called by cleanup job)
  async deleteExpired(orgId, retentionDays);
}
```

### 3.2 EmailService (Extended)

**Location:** `backend/src/services/emailService.js`

**Extends existing** `emailSender.js` **with:**
- Notification email templates
- Digest email generation
- Escalation email formatting
- Email logging and retry logic

**Key Methods:**

```javascript
class EmailService {
  // Send notification email
  async sendNotificationEmail(notification, user);

  // Generate and send daily digest
  async sendDailyDigest(user, organisation);

  // Generate and send weekly digest
  async sendWeeklyDigest(user, organisation);

  // Send escalation email
  async sendEscalationEmail(action, recipients);

  // Retry failed emails
  async retryFailedEmails(maxAttempts);

  // Log email send attempt
  async logEmailAttempt(emailLog);
}
```

### 3.3 PreferencesService

**Location:** `backend/src/services/preferencesService.js`

**Responsibilities:**
- Get user notification preferences
- Update user preferences
- Provide default preferences based on role

**Key Methods:**

```javascript
class PreferencesService {
  // Get preferences for a user (create defaults if not exists)
  async getPreferences(userId, orgId);

  // Update preferences
  async updatePreferences(userId, orgId, preferences);

  // Get default preferences for a role
  getDefaultPreferences(role);
}
```

### 3.4 Scheduled Jobs

**Location:** `backend/src/jobs/`

| Job | Schedule | Description |
|-----|----------|-------------|
| `dailyDigestJob.js` | 07:00 UTC | Send daily digests to opted-in users |
| `weeklyDigestJob.js` | Monday 07:00 UTC | Send weekly digests to opted-in users |
| `escalationJob.js` | 08:00 UTC | Check for overdue actions and send escalations |
| `emailRetryJob.js` | Every 15 minutes | Retry failed email sends |
| `cleanupJob.js` | 02:00 UTC | Delete expired notifications, old email logs |

**Job Runner:**

```javascript
// backend/src/jobs/scheduler.js
const cron = require('node-cron');

const initializeScheduler = () => {
  // Daily digest: 07:00 UTC
  cron.schedule('0 7 * * *', dailyDigestJob.run);

  // Weekly digest: Monday 07:00 UTC
  cron.schedule('0 7 * * 1', weeklyDigestJob.run);

  // Escalation check: 08:00 UTC
  cron.schedule('0 8 * * *', escalationJob.run);

  // Email retry: every 15 minutes
  cron.schedule('*/15 * * * *', emailRetryJob.run);

  // Cleanup: 02:00 UTC
  cron.schedule('0 2 * * *', cleanupJob.run);
};
```

---

## 4. Sequence Diagrams

### 4.1 Action Assigned → Notification + Email

```
┌─────────┐     ┌─────────┐     ┌────────────────────┐     ┌─────────────┐     ┌──────────┐
│ Manager │     │  API    │     │NotificationService │     │EmailService │     │ Database │
└────┬────┘     └────┬────┘     └─────────┬──────────┘     └──────┬──────┘     └────┬─────┘
     │               │                    │                       │                  │
     │ POST /actions │                    │                       │                  │
     │ (assigned_to) │                    │                       │                  │
     │──────────────►│                    │                       │                  │
     │               │                    │                       │                  │
     │               │ Create action      │                       │                  │
     │               │────────────────────────────────────────────────────────────►│
     │               │                    │                       │                  │
     │               │ createNotification │                       │                  │
     │               │ (action_assigned)  │                       │                  │
     │               │───────────────────►│                       │                  │
     │               │                    │                       │                  │
     │               │                    │ INSERT notification   │                  │
     │               │                    │─────────────────────────────────────────►│
     │               │                    │                       │                  │
     │               │                    │ Get user preferences  │                  │
     │               │                    │─────────────────────────────────────────►│
     │               │                    │                       │                  │
     │               │                    │◄────────────────────────────────────────│
     │               │                    │ (email_action_assigned = true)          │
     │               │                    │                       │                  │
     │               │                    │ sendNotificationEmail │                  │
     │               │                    │──────────────────────►│                  │
     │               │                    │                       │                  │
     │               │                    │                       │ INSERT email_log │
     │               │                    │                       │─────────────────►│
     │               │                    │                       │                  │
     │               │                    │                       │ Send via SMTP    │
     │               │                    │                       │─────────────────►│
     │               │                    │                       │                  │
     │               │                    │                       │ UPDATE email_log │
     │               │                    │                       │ (status='sent')  │
     │               │                    │                       │─────────────────►│
     │               │                    │                       │                  │
     │               │◄──────────────────────────────────────────────────────────────│
     │  201 Created  │                    │                       │                  │
     │◄──────────────│                    │                       │                  │
```

### 4.2 Nightly Job → Digest Emails

```
┌─────────────┐     ┌────────────────┐     ┌─────────────┐     ┌──────────┐     ┌──────┐
│ Cron (07:00)│     │ DailyDigestJob │     │EmailService │     │ Database │     │ SMTP │
└──────┬──────┘     └───────┬────────┘     └──────┬──────┘     └────┬─────┘     └──┬───┘
       │                    │                     │                  │              │
       │ Trigger            │                     │                  │              │
       │───────────────────►│                     │                  │              │
       │                    │                     │                  │              │
       │                    │ Log job start       │                  │              │
       │                    │─────────────────────────────────────►│              │
       │                    │                     │                  │              │
       │                    │ Get users with      │                  │              │
       │                    │ digest='daily'      │                  │              │
       │                    │─────────────────────────────────────►│              │
       │                    │                     │                  │              │
       │                    │◄────────────────────────────────────│              │
       │                    │ [user1, user2, ...] │                  │              │
       │                    │                     │                  │              │
       │                    │ For each user:      │                  │              │
       │                    │                     │                  │              │
       │                    │ Get digest data     │                  │              │
       │                    │ (incidents, actions)│                  │              │
       │                    │─────────────────────────────────────►│              │
       │                    │                     │                  │              │
       │                    │ sendDailyDigest     │                  │              │
       │                    │────────────────────►│                  │              │
       │                    │                     │                  │              │
       │                    │                     │ Generate HTML    │              │
       │                    │                     │ email content    │              │
       │                    │                     │                  │              │
       │                    │                     │ Log email        │              │
       │                    │                     │─────────────────►│              │
       │                    │                     │                  │              │
       │                    │                     │ Send via SMTP    │              │
       │                    │                     │─────────────────────────────────►│
       │                    │                     │                  │              │
       │                    │                     │ Update log       │              │
       │                    │                     │─────────────────►│              │
       │                    │                     │                  │              │
       │                    │ Update job status   │                  │              │
       │                    │ (completed)         │                  │              │
       │                    │─────────────────────────────────────►│              │
       │                    │                     │                  │              │
```

### 4.3 Overdue Action → Escalation Email

```
┌─────────────┐     ┌───────────────┐     ┌────────────────────┐     ┌─────────────┐
│ Cron (08:00)│     │ EscalationJob │     │NotificationService │     │EmailService │
└──────┬──────┘     └───────┬───────┘     └─────────┬──────────┘     └──────┬──────┘
       │                    │                       │                       │
       │ Trigger            │                       │                       │
       │───────────────────►│                       │                       │
       │                    │                       │                       │
       │                    │ Get overdue actions   │                       │
       │                    │ (due + X days ago,    │                       │
       │                    │  not yet escalated)   │                       │
       │                    │─────────────────────────────────────────────►│
       │                    │                       │                       │ Database
       │                    │◄────────────────────────────────────────────│
       │                    │ [action1, action2]    │                       │
       │                    │                       │                       │
       │                    │ For each action:      │                       │
       │                    │                       │                       │
       │                    │ createNotification    │                       │
       │                    │ (action_escalated)    │                       │
       │                    │──────────────────────►│                       │
       │                    │                       │                       │
       │                    │                       │ Notify assignee       │
       │                    │                       │ and managers          │
       │                    │                       │──────────────────────►│
       │                    │                       │                       │
       │                    │                       │ sendEscalationEmail   │
       │                    │                       │──────────────────────►│
       │                    │                       │                       │
       │                    │                       │                       │ Send emails
       │                    │                       │                       │─────────►
       │                    │                       │                       │
       │                    │ Mark action as        │                       │
       │                    │ escalated             │                       │
       │                    │─────────────────────────────────────────────►│
       │                    │                       │                       │ Database
       │                    │                       │                       │
       │                    │ Log escalation in     │                       │
       │                    │ audit_logs            │                       │
       │                    │─────────────────────────────────────────────►│
       │                    │                       │                       │
```

---

## 5. API Routes Structure

```
/api
├── /notifications
│   ├── GET    /              # List notifications (paginated, filtered)
│   ├── GET    /unread-count  # Get unread badge count
│   ├── PUT    /:id/read      # Mark single as read
│   ├── PUT    /mark-all-read # Mark all as read
│   └── DELETE /:id           # Delete a notification
│
├── /preferences
│   ├── GET    /notifications        # Get user's notification preferences
│   └── PUT    /notifications        # Update notification preferences
│
└── /admin
    └── /jobs
        ├── POST /digest/trigger     # Manually trigger digest (admin only)
        └── GET  /runs               # View scheduled job history
```

---

## 6. Frontend Components

### 6.1 Component Hierarchy

```
src/
├── components/
│   ├── notifications/
│   │   ├── NotificationBell.jsx      # Bell icon with badge
│   │   ├── NotificationDropdown.jsx  # Dropdown panel
│   │   ├── NotificationItem.jsx      # Single notification row
│   │   └── NotificationFilters.jsx   # Filters for full page
│   │
│   └── settings/
│       └── NotificationPreferences.jsx  # Preferences form
│
├── pages/
│   ├── NotificationsPage.jsx         # Full notifications page
│   └── SettingsPage.jsx              # Settings with preferences tab
│
├── hooks/
│   ├── useNotifications.js           # Fetch and manage notifications
│   ├── useNotificationCount.js       # Poll for unread count
│   └── useNotificationPreferences.js # Preferences CRUD
│
└── context/
    └── NotificationContext.jsx       # Global notification state
```

### 6.2 Notification Polling

```javascript
// useNotificationCount.js
const useNotificationCount = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const res = await api.get('/notifications/unread-count');
      setCount(res.data.count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, []);

  return count;
};
```

---

## 7. Email Templates

### 7.1 Template Structure

```
backend/src/templates/
├── emails/
│   ├── notification.html     # Individual notification email
│   ├── dailyDigest.html      # Daily digest template
│   ├── weeklyDigest.html     # Weekly digest template
│   └── escalation.html       # Escalation alert template
└── partials/
    ├── header.html           # Email header with logo
    ├── footer.html           # Email footer
    └── actionCard.html       # Action summary card
```

### 7.2 Template Variables

**Notification Email:**
```javascript
{
  recipientName: 'John Smith',
  notificationType: 'Action Assigned',
  title: 'New action assigned to you',
  message: 'Review fire extinguisher compliance...',
  actionUrl: 'https://app.example.com/actions/abc123',
  organisationName: 'Acme Corp'
}
```

**Digest Email:**
```javascript
{
  recipientName: 'Jane Manager',
  organisationName: 'Acme Corp',
  periodLabel: 'Daily Summary - 31 Jan 2026',
  newIncidents: [{ title, severity, site, time }],
  actionsDueSoon: [{ title, assignee, dueDate }],
  overdueActions: [{ title, assignee, daysOverdue }],
  dashboardUrl: 'https://app.example.com/dashboard'
}
```

---

## 8. Configuration

### 8.1 Environment Variables

```bash
# Notification settings
NOTIFICATION_RETENTION_DAYS=90
NOTIFICATION_POLL_INTERVAL_MS=30000

# Digest settings
DIGEST_DEFAULT_TIME=07:00
DIGEST_DEFAULT_DAY_OF_WEEK=1

# Escalation settings
ESCALATION_DEFAULT_DAYS=3
ESCALATION_CHECK_TIME=08:00

# Email retry settings
EMAIL_MAX_RETRY_ATTEMPTS=3
EMAIL_RETRY_INTERVAL_MS=900000
```

### 8.2 Organisation Settings (JSONB)

```json
{
  "escalation": {
    "enabled": true,
    "daysOverdue": 3,
    "notifyManagers": true,
    "customEmail": "safety-team@example.com"
  },
  "notifications": {
    "retentionDays": 90,
    "inspectionFailedEnabled": true
  }
}
```

---

## 9. Security Considerations

### 9.1 Access Control

| Resource | Worker | Manager | Admin |
|----------|--------|---------|-------|
| Own notifications | ✓ Read, Mark Read | ✓ | ✓ |
| Team notifications | ✗ | ✓ View only | ✓ |
| Preferences | ✓ Own only | ✓ Own only | ✓ Own only |
| Job history | ✗ | ✗ | ✓ |
| Trigger digest | ✗ | ✗ | ✓ |

### 9.2 Data Protection

- Notifications scoped to user's organisation
- Email logs exclude sensitive content (only metadata)
- Preferences cannot be viewed by other users
- Job runs don't expose user data in logs

---

## 10. Monitoring and Observability

### 10.1 Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `notifications.created` | Notifications created per minute | N/A |
| `emails.sent` | Emails sent successfully | N/A |
| `emails.failed` | Failed email attempts | > 10/hour |
| `jobs.duration` | Digest job execution time | > 5 minutes |
| `jobs.failures` | Job execution failures | Any failure |

### 10.2 Logging

```javascript
// Structured logging for notifications
logger.info('notification.created', {
  notificationId: notification.id,
  userId: notification.user_id,
  type: notification.type,
  relatedType: notification.related_type,
  relatedId: notification.related_id
});

// Email send logging
logger.info('email.sent', {
  emailLogId: log.id,
  recipient: log.recipient_email,
  type: log.email_type,
  attempts: log.attempts
});
```

---

## 11. Future Considerations

### 11.1 WebSocket Support (Future)

Replace polling with real-time updates:

```javascript
// Future: WebSocket integration
io.to(`user:${userId}`).emit('notification', notification);
```

### 11.2 Push Notifications (Future)

Add mobile/PWA push notification support:

```javascript
// Future: Web Push API
await webpush.sendNotification(subscription, payload);
```

### 11.3 Notification Consolidation (Future)

Batch similar notifications to reduce noise:

```javascript
// Future: Consolidation
// "You have 5 new action assignments" instead of 5 separate notifications
```

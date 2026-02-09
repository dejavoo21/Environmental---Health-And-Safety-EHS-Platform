# Data Model – Phase 4: Notifications & Escalations

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-01-31 |
| Phase | 4 – Notifications & Escalations |

---

## 1. Overview

Phase 4 introduces four new database tables and several enums to support the notifications and escalations system:

| Table | Purpose |
|-------|---------|
| `notifications` | Stores in-app notifications for users |
| `user_notification_preferences` | Stores per-user notification settings |
| `email_logs` | Tracks all outbound emails for audit and debugging |
| `scheduled_job_runs` | Logs execution of scheduled jobs (digests, escalations) |

---

## 2. New Enums

### 2.1 notification_type

```sql
CREATE TYPE notification_type AS ENUM (
  'action_assigned',
  'action_status_changed',
  'action_overdue',
  'action_escalated',
  'incident_created',
  'incident_high_severity',
  'inspection_failed',
  'digest_sent',
  'system'
);
```

### 2.2 notification_priority

```sql
CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high'
);
```

### 2.3 digest_frequency

```sql
CREATE TYPE digest_frequency AS ENUM (
  'daily',
  'weekly',
  'none'
);
```

### 2.4 email_status

```sql
CREATE TYPE email_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'bounced'
);
```

### 2.5 job_status

```sql
CREATE TYPE job_status AS ENUM (
  'running',
  'completed',
  'failed'
);
```

---

## 3. New Tables

### 3.1 notifications

Stores in-app notifications displayed in the notification centre.

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  -- Notification content
  type notification_type NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Related entity (polymorphic)
  related_type VARCHAR(50),  -- 'incident', 'action', 'inspection', etc.
  related_id UUID,

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ  -- For auto-deletion
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_org_id ON notifications(organisation_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_notifications_type ON notifications(type);
```

**Column Details:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL | Recipient user |
| organisation_id | UUID | FK, NOT NULL | Organisation for multi-tenant filtering |
| type | notification_type | NOT NULL | Type of notification |
| priority | notification_priority | DEFAULT 'normal' | Visual priority indicator |
| title | VARCHAR(255) | NOT NULL | Notification headline |
| message | TEXT | | Detailed message body |
| related_type | VARCHAR(50) | | Type of related entity |
| related_id | UUID | | ID of related entity |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| read_at | TIMESTAMPTZ | | When marked as read |
| metadata | JSONB | DEFAULT '{}' | Additional data (e.g., action details) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| expires_at | TIMESTAMPTZ | | Auto-deletion date (90 days default) |

---

### 3.2 user_notification_preferences

Stores per-user notification settings.

```sql
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  -- Email notification toggles
  email_action_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  email_action_overdue BOOLEAN NOT NULL DEFAULT TRUE,
  email_high_severity_incident BOOLEAN NOT NULL DEFAULT TRUE,
  email_inspection_failed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Digest settings
  digest_frequency digest_frequency NOT NULL DEFAULT 'none',
  digest_time TIME NOT NULL DEFAULT '07:00:00',  -- Local time
  digest_day_of_week INTEGER DEFAULT 1,  -- 0=Sunday, 1=Monday, etc. (for weekly)

  -- In-app notification settings
  inapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one preference record per user per org
  UNIQUE (user_id, organisation_id)
);

-- Indexes
CREATE INDEX idx_user_notification_prefs_user ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_prefs_org ON user_notification_preferences(organisation_id);
CREATE INDEX idx_user_notification_prefs_digest ON user_notification_preferences(digest_frequency)
  WHERE digest_frequency != 'none';
```

**Column Details:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK, NOT NULL, UNIQUE(user,org) | User |
| organisation_id | UUID | FK, NOT NULL | Organisation |
| email_action_assigned | BOOLEAN | DEFAULT TRUE | Email when action assigned |
| email_action_overdue | BOOLEAN | DEFAULT TRUE | Email when action overdue |
| email_high_severity_incident | BOOLEAN | DEFAULT TRUE | Email for high-severity incidents |
| email_inspection_failed | BOOLEAN | DEFAULT FALSE | Email for failed inspections |
| digest_frequency | digest_frequency | DEFAULT 'none' | Digest email frequency |
| digest_time | TIME | DEFAULT '07:00:00' | Preferred digest delivery time |
| digest_day_of_week | INTEGER | DEFAULT 1 | Day for weekly digest (0-6) |
| inapp_enabled | BOOLEAN | DEFAULT TRUE | Enable in-app notifications |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

---

### 3.3 email_logs

Tracks all outbound emails for audit, debugging, and retry logic.

```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organisation context
  organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,

  -- Recipient info
  recipient_email VARCHAR(255) NOT NULL,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Email content
  subject VARCHAR(500) NOT NULL,
  email_type VARCHAR(100) NOT NULL,  -- 'notification', 'digest', 'escalation', 'report'

  -- Delivery status
  status email_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- Related notification (if applicable)
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_logs_org ON email_logs(organisation_id);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_pending ON email_logs(status, attempts) WHERE status = 'pending';
```

**Column Details:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| organisation_id | UUID | FK | Organisation (nullable for system emails) |
| recipient_email | VARCHAR(255) | NOT NULL | Email address |
| recipient_user_id | UUID | FK | User if applicable |
| subject | VARCHAR(500) | NOT NULL | Email subject line |
| email_type | VARCHAR(100) | NOT NULL | Type category |
| status | email_status | DEFAULT 'pending' | Delivery status |
| attempts | INTEGER | DEFAULT 0 | Send attempt count |
| last_attempt_at | TIMESTAMPTZ | | Last attempt timestamp |
| sent_at | TIMESTAMPTZ | | Successful send timestamp |
| error_message | TEXT | | Last error message |
| notification_id | UUID | FK | Related notification |
| metadata | JSONB | DEFAULT '{}' | Additional data |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

---

### 3.4 scheduled_job_runs

Logs execution of scheduled jobs for monitoring and debugging.

```sql
CREATE TABLE IF NOT EXISTS scheduled_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job identification
  job_name VARCHAR(100) NOT NULL,  -- 'daily_digest', 'weekly_digest', 'escalation_check'
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,  -- NULL for global jobs

  -- Execution details
  status job_status NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Results
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  -- Error handling
  error_message TEXT,

  -- Metadata (e.g., which users received digests)
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_scheduled_job_runs_name ON scheduled_job_runs(job_name);
CREATE INDEX idx_scheduled_job_runs_org ON scheduled_job_runs(organisation_id);
CREATE INDEX idx_scheduled_job_runs_status ON scheduled_job_runs(status);
CREATE INDEX idx_scheduled_job_runs_started ON scheduled_job_runs(started_at DESC);
```

**Column Details:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| job_name | VARCHAR(100) | NOT NULL | Job identifier |
| organisation_id | UUID | FK | Organisation scope (null = global) |
| status | job_status | DEFAULT 'running' | Execution status |
| started_at | TIMESTAMPTZ | DEFAULT NOW() | Start timestamp |
| completed_at | TIMESTAMPTZ | | Completion timestamp |
| items_processed | INTEGER | DEFAULT 0 | Total items processed |
| items_succeeded | INTEGER | DEFAULT 0 | Successful items |
| items_failed | INTEGER | DEFAULT 0 | Failed items |
| error_message | TEXT | | Error details |
| metadata | JSONB | DEFAULT '{}' | Additional execution data |

---

## 4. Organisation Settings Extension

Add notification-related settings to the organisation settings JSONB:

```json
{
  "timezone": "Europe/London",
  "escalation": {
    "enabled": true,
    "daysOverdue": 3,
    "notifyManagers": true,
    "customEmail": null
  },
  "notifications": {
    "retentionDays": 90,
    "inspectionFailedEnabled": false
  },
  "digest": {
    "defaultTime": "07:00",
    "defaultDayOfWeek": 1
  }
}
```

---

## 5. Entity Relationship Diagram (Phase 4)

```
┌─────────────────────┐
│    organisations    │
└─────────┬───────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────────┐      ┌──────────────────────────┐
│         users               │      │       notifications      │
│                             │      │                          │
│  id                         │◄─────│  user_id                 │
│  organisation_id            │      │  organisation_id         │
│  email                      │      │  type                    │
│  role                       │      │  priority                │
└─────────┬───────────────────┘      │  title                   │
          │                          │  message                 │
          │ 1:1                      │  related_type            │
          ▼                          │  related_id              │
┌─────────────────────────────┐      │  is_read                 │
│ user_notification_preferences│      │  metadata                │
│                             │      └──────────────────────────┘
│  user_id                    │
│  organisation_id            │      ┌──────────────────────────┐
│  email_action_assigned      │      │       email_logs         │
│  email_action_overdue       │      │                          │
│  email_high_severity        │      │  organisation_id         │
│  digest_frequency           │      │  recipient_email         │
│  digest_time                │      │  recipient_user_id       │
└─────────────────────────────┘      │  subject                 │
                                     │  email_type              │
                                     │  status                  │
┌─────────────────────────────┐      │  notification_id ────────┼──► notifications
│    scheduled_job_runs       │      └──────────────────────────┘
│                             │
│  job_name                   │
│  organisation_id            │
│  status                     │
│  started_at                 │
│  items_processed            │
└─────────────────────────────┘
```

---

## 6. Migration Script

**File:** `migrations/004_phase4_notifications.sql`

```sql
-- Phase 4: Notifications & Escalations
-- Migration: 004_phase4_notifications.sql

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'action_assigned',
    'action_status_changed',
    'action_overdue',
    'action_escalated',
    'incident_created',
    'incident_high_severity',
    'inspection_failed',
    'digest_sent',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE digest_frequency AS ENUM ('daily', 'weekly', 'none');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed', 'bounced');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  related_type VARCHAR(50),
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(organisation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- User notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email_action_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  email_action_overdue BOOLEAN NOT NULL DEFAULT TRUE,
  email_high_severity_incident BOOLEAN NOT NULL DEFAULT TRUE,
  email_inspection_failed BOOLEAN NOT NULL DEFAULT FALSE,
  digest_frequency digest_frequency NOT NULL DEFAULT 'none',
  digest_time TIME NOT NULL DEFAULT '07:00:00',
  digest_day_of_week INTEGER DEFAULT 1,
  inapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, organisation_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_org ON user_notification_preferences(organisation_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_digest ON user_notification_preferences(digest_frequency)
  WHERE digest_frequency != 'none';

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(500) NOT NULL,
  email_type VARCHAR(100) NOT NULL,
  status email_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_org ON email_logs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_pending ON email_logs(status, attempts) WHERE status = 'pending';

-- Scheduled job runs table
CREATE TABLE IF NOT EXISTS scheduled_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  status job_status NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_name ON scheduled_job_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_org ON scheduled_job_runs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_status ON scheduled_job_runs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_started ON scheduled_job_runs(started_at DESC);

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Create default notification preferences for existing users
INSERT INTO user_notification_preferences (user_id, organisation_id, digest_frequency)
SELECT u.id, u.organisation_id,
  CASE WHEN u.role IN ('admin', 'manager') THEN 'weekly'::digest_frequency ELSE 'none'::digest_frequency END
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_notification_preferences unp
  WHERE unp.user_id = u.id AND unp.organisation_id = u.organisation_id
);
```

---

## 7. Data Retention Policies

| Table | Retention Policy | Implementation |
|-------|------------------|----------------|
| notifications | 90 days (configurable per org) | Scheduled job deletes expired notifications |
| email_logs | 365 days | Scheduled job deletes old logs |
| scheduled_job_runs | 30 days | Scheduled job cleans up old run records |

---

## 8. Performance Considerations

### 8.1 Indexing Strategy

- **notifications**: Index on `(user_id, is_read)` with partial index for unread only – optimises badge count query
- **email_logs**: Index on `(status, attempts)` for retry queue processing
- **scheduled_job_runs**: Index on `(job_name, started_at)` for duplicate detection

### 8.2 Expected Volumes

| Table | Daily Growth (per 100 users) | Storage Estimate |
|-------|------------------------------|------------------|
| notifications | ~500-1000 rows | ~1MB/day |
| email_logs | ~100-200 rows | ~0.5MB/day |
| scheduled_job_runs | ~3-5 rows | Negligible |

### 8.3 Query Optimisations

1. **Unread count query**: Use partial index and count estimate for large organisations
2. **Digest generation**: Batch process by organisation to reduce query overhead
3. **Notification cleanup**: Run during off-peak hours with batch deletes

---

## 9. Backward Compatibility

Phase 4 introduces new tables only – no changes to existing tables. The migration script:

1. Creates new enums (safe – no existing data)
2. Creates new tables (safe – no dependencies)
3. Inserts default preferences for existing users (additive only)

**Rollback Strategy:**
```sql
DROP TABLE IF EXISTS scheduled_job_runs;
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS user_notification_preferences;
DROP TABLE IF EXISTS notifications;
DROP TYPE IF EXISTS job_status;
DROP TYPE IF EXISTS email_status;
DROP TYPE IF EXISTS digest_frequency;
DROP TYPE IF EXISTS notification_priority;
DROP TYPE IF EXISTS notification_type;
```

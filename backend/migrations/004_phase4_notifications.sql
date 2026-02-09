-- Phase 4: Notifications & Escalations
-- Migration: 004_phase4_notifications.sql
-- Created: 2026-02-01

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
-- ADD escalated_at COLUMN TO ACTIONS TABLE
-- ============================================================================

ALTER TABLE actions ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Create default notification preferences for existing users
INSERT INTO user_notification_preferences (user_id, organisation_id, digest_frequency)
SELECT u.id, u.organisation_id,
  CASE WHEN u.role IN ('admin', 'manager') THEN 'weekly'::digest_frequency ELSE 'none'::digest_frequency END
FROM users u
WHERE u.organisation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_notification_preferences unp
    WHERE unp.user_id = u.id AND unp.organisation_id = u.organisation_id
  );

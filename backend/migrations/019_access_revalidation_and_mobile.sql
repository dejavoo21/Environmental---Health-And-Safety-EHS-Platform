-- Migration: 019_access_revalidation_and_mobile.sql
-- Adds mobile phone fields and 7-day access revalidation OTP support.

BEGIN;

ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(32);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(32),
ADD COLUMN IF NOT EXISTS last_access_revalidated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_access_revalidation_otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(10) NOT NULL CHECK (channel IN ('email', 'phone')),
    destination VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(128) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revalidation_otp_user_created
    ON user_access_revalidation_otp(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revalidation_otp_user_unused
    ON user_access_revalidation_otp(user_id, used_at)
    WHERE used_at IS NULL;

UPDATE users
SET last_access_revalidated_at = COALESCE(last_access_revalidated_at, NOW());

COMMIT;

-- Migration: 020_trusted_devices.sql
-- Adds trusted device storage for optional revalidation bypass.

BEGIN;

CREATE TABLE IF NOT EXISTS user_trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    label VARCHAR(120),
    user_agent TEXT,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_user_active
    ON user_trusted_devices(user_id, expires_at)
    WHERE revoked_at IS NULL;

COMMIT;

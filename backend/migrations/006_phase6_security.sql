-- Phase 6: Security, Trust & Self-Service
-- Migration: 006_phase6_security.sql

BEGIN;

-- 1. Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    organisation_id UUID REFERENCES organisations(id),
    organisation_code VARCHAR(50),
    requested_role VARCHAR(20) NOT NULL CHECK (requested_role IN ('worker', 'manager')),
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
    decision_by UUID REFERENCES users(id),
    decision_at TIMESTAMPTZ,
    decision_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_access_requests_org_status ON access_requests(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status_created ON access_requests(status, created_at);

-- 2. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    ip_address INET,
    attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- 3. Create user_2fa table
CREATE TABLE IF NOT EXISTS user_2fa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret_encrypted TEXT NOT NULL,
    secret_iv VARCHAR(32) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    enabled_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    backup_codes_generated_at TIMESTAMPTZ,
    backup_codes_remaining INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create user_backup_codes table
CREATE TABLE IF NOT EXISTS user_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(128) NOT NULL,
    code_index INTEGER NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, code_index)
);

CREATE INDEX IF NOT EXISTS idx_user_backup_codes_user_unused ON user_backup_codes(user_id, used_at);

-- 5. Create security_audit_log table
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    organisation_id UUID REFERENCES organisations(id),
    user_id UUID REFERENCES users(id),
    target_user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_org_time ON security_audit_log(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_time ON security_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_type_time ON security_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON security_audit_log(created_at);

-- 6. Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(20),
    browser VARCHAR(50),
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(50),
    mfa_used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_time ON login_history(user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(login_at);

-- 7. Create user_password_history table
CREATE TABLE IF NOT EXISTS user_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_time ON user_password_history(user_id, created_at DESC);

-- 8. Modify users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) NOT NULL DEFAULT 'system',
ADD COLUMN IF NOT EXISTS has_2fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_ip INET;

-- 9. Modify organisations table
ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS default_theme VARCHAR(20) NOT NULL DEFAULT 'light',
ADD COLUMN IF NOT EXISTS access_request_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS access_request_auto_expire_days INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS mfa_policy VARCHAR(20) NOT NULL DEFAULT 'optional';

-- 10. Create sequence for access request reference numbers
CREATE SEQUENCE IF NOT EXISTS access_request_ref_seq START WITH 1;

-- 11. Create function to generate reference number
CREATE OR REPLACE FUNCTION generate_access_request_ref()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reference_number := 'AR-' || EXTRACT(YEAR FROM NOW()) || '-' || 
                            LPAD(nextval('access_request_ref_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger for reference number
DROP TRIGGER IF EXISTS access_request_ref_trigger ON access_requests;
CREATE TRIGGER access_request_ref_trigger
    BEFORE INSERT ON access_requests
    FOR EACH ROW
    EXECUTE FUNCTION generate_access_request_ref();

-- 13. Create updated_at trigger for access_requests
DROP TRIGGER IF EXISTS access_requests_updated_at ON access_requests;
CREATE TRIGGER access_requests_updated_at
    BEFORE UPDATE ON access_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 14. Create updated_at trigger for user_2fa
DROP TRIGGER IF EXISTS user_2fa_updated_at ON user_2fa;
CREATE TRIGGER user_2fa_updated_at
    BEFORE UPDATE ON user_2fa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

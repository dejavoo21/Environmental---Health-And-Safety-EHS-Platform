-- Migration: 010_phase10_integrations.sql
-- Phase 10: Integrations, SSO & External Connectivity
-- Date: 2026-02-06

BEGIN;

-- ============================================
-- 1. Create Enum Types
-- ============================================

DO $$ BEGIN
    CREATE TYPE sso_type AS ENUM (
        'oidc_azure_ad',
        'oidc_generic',
        'saml'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE api_client_status AS ENUM (
        'active',
        'revoked',
        'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE api_scope AS ENUM (
        'read:incidents',
        'write:incidents',
        'read:actions',
        'write:actions',
        'read:inspections',
        'read:training',
        'read:risks',
        'read:chemicals',
        'read:users'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rate_limit_tier AS ENUM (
        'standard',
        'premium',
        'unlimited'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE webhook_event_status AS ENUM (
        'pending',
        'retrying',
        'delivered',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE integration_event_type AS ENUM (
        'incident.created',
        'incident.updated',
        'incident.severity_changed',
        'incident.closed',
        'action.created',
        'action.assigned',
        'action.overdue',
        'action.completed',
        'risk.created',
        'risk.level_changed',
        'risk.review_due',
        'training.assigned',
        'training.overdue',
        'training.completed',
        'user.created',
        'user.updated',
        'user.deactivated'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. Extend Users Table for SSO
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sso_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_attributes JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id) 
    WHERE external_id IS NOT NULL;

-- ============================================
-- 3. SSO Providers Table
-- ============================================

CREATE TABLE IF NOT EXISTS sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    provider_name VARCHAR(100) NOT NULL,
    provider_type sso_type NOT NULL,
    issuer_url VARCHAR(500) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret_encrypted TEXT NOT NULL,
    redirect_uri VARCHAR(500) NOT NULL,
    scopes VARCHAR(255) NOT NULL DEFAULT 'openid profile email',
    group_claim_name VARCHAR(100) DEFAULT 'groups',
    default_role user_role NOT NULL DEFAULT 'worker',
    jit_enabled BOOLEAN NOT NULL DEFAULT true,
    sso_only_mode BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT false,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT sso_providers_https_check CHECK (issuer_url ~ '^https://')
);

-- One active provider per organisation
CREATE UNIQUE INDEX IF NOT EXISTS idx_sso_providers_org_unique 
    ON sso_providers(organisation_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sso_providers_org ON sso_providers(organisation_id) 
    WHERE deleted_at IS NULL;

-- Add FK to users table after sso_providers exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider_id UUID 
    REFERENCES sso_providers(id);

CREATE INDEX IF NOT EXISTS idx_users_sso_provider ON users(sso_provider_id) 
    WHERE sso_provider_id IS NOT NULL;

-- ============================================
-- 4. SSO Mappings Table
-- ============================================

CREATE TABLE IF NOT EXISTS sso_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sso_provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    idp_claim_name VARCHAR(100) NOT NULL DEFAULT 'groups',
    idp_claim_value VARCHAR(255) NOT NULL,
    ehs_role user_role NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint manually to avoid index duplication errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sso_mappings_provider_claim_unique'
    ) THEN
        ALTER TABLE sso_mappings ADD CONSTRAINT sso_mappings_provider_claim_unique
            UNIQUE (sso_provider_id, idp_claim_name, idp_claim_value);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sso_mappings_provider ON sso_mappings(sso_provider_id);

-- ============================================
-- 5. SSO Login Attempts Table
-- ============================================

CREATE TABLE IF NOT EXISTS sso_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    sso_provider_id UUID NOT NULL REFERENCES sso_providers(id),
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255) NOT NULL,
    external_id VARCHAR(255),
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    jit_provisioned BOOLEAN NOT NULL DEFAULT false,
    role_assigned user_role,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sso_login_attempts_org ON sso_login_attempts(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sso_login_attempts_user ON sso_login_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sso_login_attempts_failed ON sso_login_attempts(organisation_id, created_at DESC) 
    WHERE success = false;

-- ============================================
-- 6. SSO State Store Table (for PKCE/nonce)
-- ============================================

CREATE TABLE IF NOT EXISTS sso_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(100) NOT NULL UNIQUE,
    nonce VARCHAR(100) NOT NULL,
    code_verifier VARCHAR(128),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    sso_provider_id UUID NOT NULL REFERENCES sso_providers(id),
    redirect_to VARCHAR(500),
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_sso_states_state ON sso_states(state);
CREATE INDEX IF NOT EXISTS idx_sso_states_expires ON sso_states(expires_at);

-- ============================================
-- 7. API Clients Table
-- ============================================

CREATE TABLE IF NOT EXISTS api_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    client_name VARCHAR(100) NOT NULL,
    description TEXT,
    client_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(12) NOT NULL,
    scopes api_scope[] NOT NULL,
    ip_allowlist CIDR[],
    rate_limit_tier rate_limit_tier NOT NULL DEFAULT 'standard',
    status api_client_status NOT NULL DEFAULT 'active',
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    request_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT api_clients_has_scopes CHECK (array_length(scopes, 1) > 0)
);

CREATE INDEX IF NOT EXISTS idx_api_clients_org ON api_clients(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_clients_client_id ON api_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_api_clients_prefix ON api_clients(api_key_prefix) WHERE status = 'active';

-- ============================================
-- 8. Integration Events Table
-- ============================================

CREATE TABLE IF NOT EXISTS integration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    event_type integration_event_type NOT NULL,
    event_source VARCHAR(50) NOT NULL DEFAULT 'system',
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL,
    correlation_id UUID,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_integration_events_org ON integration_events(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_events_type ON integration_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_events_entity ON integration_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_unprocessed ON integration_events(created_at) 
    WHERE processed_at IS NULL;

-- ============================================
-- 9. Webhooks Table
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    target_url VARCHAR(500) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    event_types integration_event_type[] NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'application/json',
    custom_headers JSONB DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    disabled_reason VARCHAR(255),
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT webhooks_https_check CHECK (target_url ~ '^https://'),
    CONSTRAINT webhooks_has_events CHECK (array_length(event_types, 1) > 0)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(organisation_id, enabled) WHERE deleted_at IS NULL;

-- ============================================
-- 10. Webhook Events Table
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    integration_event_id UUID NOT NULL REFERENCES integration_events(id),
    event_type integration_event_type NOT NULL,
    payload JSONB NOT NULL,
    status webhook_event_status NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    response_status_code INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook ON webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_pending ON webhook_events(status, next_retry_at) 
    WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);

-- ============================================
-- 11. Update Triggers
-- ============================================

-- updated_at trigger function (if not exists from previous migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sso_providers_updated_at ON sso_providers;
CREATE TRIGGER update_sso_providers_updated_at
    BEFORE UPDATE ON sso_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sso_mappings_updated_at ON sso_mappings;
CREATE TRIGGER update_sso_mappings_updated_at
    BEFORE UPDATE ON sso_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_clients_updated_at ON api_clients;
CREATE TRIGGER update_api_clients_updated_at
    BEFORE UPDATE ON api_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. Comments
-- ============================================

COMMENT ON TABLE sso_providers IS 'SSO/OIDC provider configuration per organisation';
COMMENT ON TABLE sso_mappings IS 'IdP group to EHS role mappings';
COMMENT ON TABLE sso_login_attempts IS 'SSO login attempt audit log';
COMMENT ON TABLE sso_states IS 'Temporary state storage for SSO PKCE flow';
COMMENT ON TABLE api_clients IS 'API client credentials for external access';
COMMENT ON TABLE webhooks IS 'Webhook endpoint configurations';
COMMENT ON TABLE integration_events IS 'All integration events for processing';
COMMENT ON TABLE webhook_events IS 'Webhook delivery attempts and status';

COMMIT;

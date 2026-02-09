# Data Model – EHS Portal Phase 10
## Integrations, SSO & External Connectivity

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 10 – Integrations, SSO & External Connectivity |

---

## 1. Overview

Phase 10 introduces data structures to support enterprise SSO integration, external API access, and outbound webhooks. This document defines new tables, enums, and their relationships to existing entities.

### 1.1 Design Principles

- **Organisation Scoping:** All integration configurations are scoped to a single organisation
- **Secret Security:** All secrets (client secrets, API keys, webhook secrets) are encrypted/hashed and never returned in API responses
- **Audit Trail:** All configuration changes and significant events are logged
- **Soft Delete:** Integration configurations use `deleted_at` for soft delete to preserve audit history
- **Extensibility:** Schema supports future protocols (SAML, SCIM) via type enums

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 10 - INTEGRATIONS ERD                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  organisations  │       │     users       │       │     sites       │
│  (existing)     │       │   (existing)    │       │   (existing)    │
└────────┬────────┘       └────────┬────────┘       └─────────────────┘
         │                         │
         │ 1:1                     │
         ▼                         │
┌─────────────────┐                │
│  sso_providers  │                │
│                 │                │
│ id              │                │
│ organisation_id │◀───────────────┤
│ provider_name   │                │
│ provider_type   │                │
│ issuer_url      │                │
│ client_id       │                │
│ client_secret*  │                │
│ scopes          │                │
│ jit_enabled     │                │
│ sso_only_mode   │                │
│ enabled         │                │
└────────┬────────┘                │
         │                         │
         │ 1:N                     │
         ▼                         │
┌─────────────────┐                │
│  sso_mappings   │                │
│                 │                │
│ id              │                │
│ sso_provider_id │                │
│ idp_claim_name  │                │
│ idp_claim_value │                │
│ ehs_role        │                │
│ priority        │                │
└─────────────────┘                │
                                   │
┌─────────────────┐                │
│   api_clients   │                │
│                 │                │
│ id              │◀───────────────┤
│ organisation_id │                │
│ client_name     │                │
│ client_id (UUID)│                │
│ api_key_hash*   │                │
│ api_key_prefix  │                │
│ scopes[]        │                │
│ ip_allowlist[]  │                │
│ rate_limit_tier │                │
│ status          │                │
│ created_by      │◀───────────────┘
│ last_used_at    │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    webhooks     │       │ webhook_events  │       │integration_events│
│                 │       │                 │       │                   │
│ id              │       │ id              │       │ id                │
│ organisation_id │──────▶│ webhook_id      │       │ organisation_id   │
│ name            │       │ event_type      │       │ event_type        │
│ target_url      │       │ payload         │       │ entity_type       │
│ secret*         │       │ status          │       │ entity_id         │
│ event_types[]   │       │ attempts        │       │ payload           │
│ headers{}       │       │ last_attempt_at │       │ created_at        │
│ enabled         │       │ response_code   │       │ processed_at      │
│ created_by      │       │ created_at      │       └─────────────────────┘
└─────────────────┘       └─────────────────┘

* = encrypted/hashed, never returned in API responses
```

---

## 3. Table Definitions

### 3.1 sso_providers

Stores SSO/OIDC provider configuration for each organisation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `organisation_id` | UUID | NOT NULL | - | FK to organisations |
| `provider_name` | VARCHAR(100) | NOT NULL | - | Display name (e.g., "Corporate Azure AD") |
| `provider_type` | sso_type | NOT NULL | - | Type of SSO provider |
| `issuer_url` | VARCHAR(500) | NOT NULL | - | OIDC issuer URL (discovery endpoint base) |
| `client_id` | VARCHAR(255) | NOT NULL | - | OAuth client ID from IdP |
| `client_secret_encrypted` | TEXT | NOT NULL | - | Encrypted client secret |
| `redirect_uri` | VARCHAR(500) | NOT NULL | - | OAuth callback URL |
| `scopes` | VARCHAR(255) | NOT NULL | 'openid profile email' | Space-separated OIDC scopes |
| `group_claim_name` | VARCHAR(100) | NULL | 'groups' | Claim containing user groups |
| `default_role` | user_role | NOT NULL | 'worker' | Role for users with no matching group |
| `jit_enabled` | BOOLEAN | NOT NULL | true | Enable JIT provisioning |
| `sso_only_mode` | BOOLEAN | NOT NULL | false | Disable password login |
| `enabled` | BOOLEAN | NOT NULL | false | Provider is active |
| `last_sync_at` | TIMESTAMPTZ | NULL | - | Last successful user sync |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |
| `created_by` | UUID | NOT NULL | - | FK to users |
| `updated_by` | UUID | NULL | - | FK to users |
| `deleted_at` | TIMESTAMPTZ | NULL | - | Soft delete timestamp |

**Constraints:**
```sql
PRIMARY KEY (id)
UNIQUE (organisation_id) WHERE deleted_at IS NULL  -- One active provider per org
FOREIGN KEY (organisation_id) REFERENCES organisations(id)
FOREIGN KEY (created_by) REFERENCES users(id)
CHECK (issuer_url ~ '^https://')
```

**Indexes:**
```sql
CREATE INDEX idx_sso_providers_org ON sso_providers(organisation_id) WHERE deleted_at IS NULL;
```

---

### 3.2 sso_mappings

Maps IdP groups/claims to EHS roles.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `sso_provider_id` | UUID | NOT NULL | - | FK to sso_providers |
| `idp_claim_name` | VARCHAR(100) | NOT NULL | 'groups' | Claim to match |
| `idp_claim_value` | VARCHAR(255) | NOT NULL | - | Value to match in claim |
| `ehs_role` | user_role | NOT NULL | - | Role to assign |
| `priority` | INTEGER | NOT NULL | 0 | Higher priority wins conflicts |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Constraints:**
```sql
PRIMARY KEY (id)
UNIQUE (sso_provider_id, idp_claim_name, idp_claim_value)
FOREIGN KEY (sso_provider_id) REFERENCES sso_providers(id) ON DELETE CASCADE
```

**Indexes:**
```sql
CREATE INDEX idx_sso_mappings_provider ON sso_mappings(sso_provider_id);
```

---

### 3.3 api_clients

Stores API client credentials for external access.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `organisation_id` | UUID | NOT NULL | - | FK to organisations |
| `client_name` | VARCHAR(100) | NOT NULL | - | Descriptive name |
| `description` | TEXT | NULL | - | Purpose/notes |
| `client_id` | UUID | NOT NULL | gen_random_uuid() | Public client identifier |
| `api_key_hash` | VARCHAR(255) | NOT NULL | - | bcrypt hash of API key |
| `api_key_prefix` | VARCHAR(10) | NOT NULL | - | First 8 chars for identification |
| `scopes` | api_scope[] | NOT NULL | - | Array of allowed scopes |
| `ip_allowlist` | CIDR[] | NULL | NULL | Allowed IP ranges (null = all) |
| `rate_limit_tier` | rate_limit_tier | NOT NULL | 'standard' | Rate limiting tier |
| `status` | api_client_status | NOT NULL | 'active' | Client status |
| `last_used_at` | TIMESTAMPTZ | NULL | - | Last successful API call |
| `last_used_ip` | INET | NULL | - | IP of last API call |
| `request_count` | BIGINT | NOT NULL | 0 | Total request count |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |
| `created_by` | UUID | NOT NULL | - | FK to users |
| `revoked_at` | TIMESTAMPTZ | NULL | - | Revocation timestamp |
| `revoked_by` | UUID | NULL | - | FK to users who revoked |
| `deleted_at` | TIMESTAMPTZ | NULL | - | Soft delete timestamp |

**Constraints:**
```sql
PRIMARY KEY (id)
UNIQUE (client_id)
UNIQUE (api_key_prefix, organisation_id) -- Prefix unique within org for identification
FOREIGN KEY (organisation_id) REFERENCES organisations(id)
FOREIGN KEY (created_by) REFERENCES users(id)
CHECK (array_length(scopes, 1) > 0)
```

**Indexes:**
```sql
CREATE INDEX idx_api_clients_org ON api_clients(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_api_clients_client_id ON api_clients(client_id);
CREATE INDEX idx_api_clients_prefix ON api_clients(api_key_prefix) WHERE status = 'active';
```

---

### 3.4 webhooks

Stores webhook endpoint configurations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `organisation_id` | UUID | NOT NULL | - | FK to organisations |
| `name` | VARCHAR(100) | NOT NULL | - | Descriptive name |
| `description` | TEXT | NULL | - | Purpose/notes |
| `target_url` | VARCHAR(500) | NOT NULL | - | HTTPS endpoint URL |
| `secret` | VARCHAR(255) | NOT NULL | - | HMAC signing secret |
| `event_types` | integration_event_type[] | NOT NULL | - | Subscribed event types |
| `custom_headers` | JSONB | NULL | '{}' | Additional HTTP headers |
| `enabled` | BOOLEAN | NOT NULL | true | Webhook is active |
| `consecutive_failures` | INTEGER | NOT NULL | 0 | Sequential failure count |
| `disabled_reason` | VARCHAR(255) | NULL | - | Reason if auto-disabled |
| `last_triggered_at` | TIMESTAMPTZ | NULL | - | Last event trigger time |
| `last_success_at` | TIMESTAMPTZ | NULL | - | Last successful delivery |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |
| `created_by` | UUID | NOT NULL | - | FK to users |
| `deleted_at` | TIMESTAMPTZ | NULL | - | Soft delete timestamp |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (organisation_id) REFERENCES organisations(id)
FOREIGN KEY (created_by) REFERENCES users(id)
CHECK (target_url ~ '^https://')
CHECK (array_length(event_types, 1) > 0)
```

**Indexes:**
```sql
CREATE INDEX idx_webhooks_org ON webhooks(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_webhooks_enabled ON webhooks(organisation_id, enabled) WHERE deleted_at IS NULL;
```

---

### 3.5 webhook_events

Stores webhook delivery attempts and status.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `webhook_id` | UUID | NOT NULL | - | FK to webhooks |
| `integration_event_id` | UUID | NOT NULL | - | FK to integration_events |
| `event_type` | integration_event_type | NOT NULL | - | Type of event |
| `payload` | JSONB | NOT NULL | - | Full webhook payload sent |
| `status` | webhook_event_status | NOT NULL | 'pending' | Delivery status |
| `attempt_count` | INTEGER | NOT NULL | 0 | Number of delivery attempts |
| `max_attempts` | INTEGER | NOT NULL | 5 | Maximum retry attempts |
| `next_retry_at` | TIMESTAMPTZ | NULL | - | Scheduled retry time |
| `last_attempt_at` | TIMESTAMPTZ | NULL | - | Last attempt timestamp |
| `response_status_code` | INTEGER | NULL | - | HTTP response code |
| `response_body` | TEXT | NULL | - | Response body (truncated) |
| `response_time_ms` | INTEGER | NULL | - | Response time in milliseconds |
| `error_message` | TEXT | NULL | - | Error details if failed |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `completed_at` | TIMESTAMPTZ | NULL | - | Successful delivery time |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
FOREIGN KEY (integration_event_id) REFERENCES integration_events(id)
```

**Indexes:**
```sql
CREATE INDEX idx_webhook_events_webhook ON webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_pending ON webhook_events(status, next_retry_at) 
    WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at DESC);
```

---

### 3.6 integration_events

Stores all integration events for processing and audit.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `organisation_id` | UUID | NOT NULL | - | FK to organisations |
| `event_type` | integration_event_type | NOT NULL | - | Type of event |
| `event_source` | VARCHAR(50) | NOT NULL | 'system' | Source of event |
| `entity_type` | VARCHAR(50) | NOT NULL | - | Entity type (incident, action, etc.) |
| `entity_id` | UUID | NOT NULL | - | ID of related entity |
| `payload` | JSONB | NOT NULL | - | Event data |
| `correlation_id` | UUID | NULL | - | For linking related events |
| `user_id` | UUID | NULL | - | User who triggered event |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Event creation time |
| `processed_at` | TIMESTAMPTZ | NULL | - | When all webhooks processed |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (organisation_id) REFERENCES organisations(id)
```

**Indexes:**
```sql
CREATE INDEX idx_integration_events_org ON integration_events(organisation_id, created_at DESC);
CREATE INDEX idx_integration_events_type ON integration_events(event_type, created_at DESC);
CREATE INDEX idx_integration_events_entity ON integration_events(entity_type, entity_id);
CREATE INDEX idx_integration_events_unprocessed ON integration_events(created_at) 
    WHERE processed_at IS NULL;
```

---

### 3.7 sso_login_attempts

Tracks SSO login attempts for security audit.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `organisation_id` | UUID | NOT NULL | - | FK to organisations |
| `sso_provider_id` | UUID | NOT NULL | - | FK to sso_providers |
| `user_id` | UUID | NULL | - | FK to users (if matched) |
| `user_email` | VARCHAR(255) | NOT NULL | - | Email from IdP claims |
| `external_id` | VARCHAR(255) | NULL | - | sub/oid claim value |
| `success` | BOOLEAN | NOT NULL | - | Login succeeded |
| `failure_reason` | VARCHAR(255) | NULL | - | Reason for failure |
| `jit_provisioned` | BOOLEAN | NOT NULL | false | User was JIT created |
| `role_assigned` | user_role | NULL | - | Role assigned from mapping |
| `ip_address` | INET | NULL | - | Client IP |
| `user_agent` | TEXT | NULL | - | Browser user agent |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Attempt timestamp |

**Constraints:**
```sql
PRIMARY KEY (id)
FOREIGN KEY (organisation_id) REFERENCES organisations(id)
FOREIGN KEY (sso_provider_id) REFERENCES sso_providers(id)
FOREIGN KEY (user_id) REFERENCES users(id)
```

**Indexes:**
```sql
CREATE INDEX idx_sso_login_attempts_org ON sso_login_attempts(organisation_id, created_at DESC);
CREATE INDEX idx_sso_login_attempts_user ON sso_login_attempts(user_id, created_at DESC);
CREATE INDEX idx_sso_login_attempts_failed ON sso_login_attempts(organisation_id, created_at DESC) 
    WHERE success = false;
```

---

## 4. Enum Types

### 4.1 sso_type

```sql
CREATE TYPE sso_type AS ENUM (
    'oidc_azure_ad',    -- Microsoft Entra ID (Azure AD)
    'oidc_generic',     -- Generic OIDC provider
    'saml'              -- SAML 2.0 (placeholder for future)
);
```

### 4.2 api_client_status

```sql
CREATE TYPE api_client_status AS ENUM (
    'active',       -- Client can make API calls
    'revoked',      -- Client explicitly revoked
    'suspended'     -- Temporarily suspended
);
```

### 4.3 api_scope

```sql
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
```

### 4.4 rate_limit_tier

```sql
CREATE TYPE rate_limit_tier AS ENUM (
    'standard',     -- 1000 req/min
    'premium',      -- 5000 req/min
    'unlimited'     -- No limit (internal use only)
);
```

### 4.5 webhook_event_status

```sql
CREATE TYPE webhook_event_status AS ENUM (
    'pending',      -- Not yet attempted
    'retrying',     -- Failed, will retry
    'delivered',    -- Successfully delivered
    'failed'        -- All retries exhausted
);
```

### 4.6 integration_event_type

```sql
CREATE TYPE integration_event_type AS ENUM (
    -- Incident events
    'incident.created',
    'incident.updated',
    'incident.severity_changed',
    'incident.closed',
    
    -- Action events
    'action.created',
    'action.assigned',
    'action.overdue',
    'action.completed',
    
    -- Risk events
    'risk.created',
    'risk.level_changed',
    'risk.review_due',
    
    -- Training events
    'training.assigned',
    'training.overdue',
    'training.completed',
    
    -- User events (for future SCIM)
    'user.created',
    'user.updated',
    'user.deactivated'
);
```

---

## 5. User Table Extension

Extend existing `users` table to support SSO:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `external_id` | VARCHAR(255) | NULL | - | IdP subject identifier |
| `auth_provider` | VARCHAR(50) | NOT NULL | 'local' | 'local' or 'sso' |
| `sso_provider_id` | UUID | NULL | - | FK to sso_providers |
| `last_sso_login_at` | TIMESTAMPTZ | NULL | - | Last SSO authentication |
| `sso_attributes` | JSONB | NULL | '{}' | Raw IdP claims (subset) |

```sql
ALTER TABLE users ADD COLUMN external_id VARCHAR(255);
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN sso_provider_id UUID REFERENCES sso_providers(id);
ALTER TABLE users ADD COLUMN last_sso_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN sso_attributes JSONB DEFAULT '{}';

CREATE INDEX idx_users_external_id ON users(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_users_sso_provider ON users(sso_provider_id) WHERE sso_provider_id IS NOT NULL;
```

---

## 6. Migration: 010_phase10_integrations.sql

```sql
-- Migration: 010_phase10_integrations.sql
-- Phase 10: Integrations, SSO & External Connectivity
-- Date: 2026-02-05

BEGIN;

-- ============================================
-- 1. Create Enum Types
-- ============================================

CREATE TYPE sso_type AS ENUM (
    'oidc_azure_ad',
    'oidc_generic',
    'saml'
);

CREATE TYPE api_client_status AS ENUM (
    'active',
    'revoked',
    'suspended'
);

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

CREATE TYPE rate_limit_tier AS ENUM (
    'standard',
    'premium',
    'unlimited'
);

CREATE TYPE webhook_event_status AS ENUM (
    'pending',
    'retrying',
    'delivered',
    'failed'
);

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

-- ============================================
-- 2. Extend Users Table
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

CREATE TABLE sso_providers (
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
CREATE UNIQUE INDEX idx_sso_providers_org_unique 
    ON sso_providers(organisation_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_sso_providers_org ON sso_providers(organisation_id) 
    WHERE deleted_at IS NULL;

-- Add FK to users table after sso_providers exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider_id UUID 
    REFERENCES sso_providers(id);

CREATE INDEX IF NOT EXISTS idx_users_sso_provider ON users(sso_provider_id) 
    WHERE sso_provider_id IS NOT NULL;

-- ============================================
-- 4. SSO Mappings Table
-- ============================================

CREATE TABLE sso_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sso_provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    idp_claim_name VARCHAR(100) NOT NULL DEFAULT 'groups',
    idp_claim_value VARCHAR(255) NOT NULL,
    ehs_role user_role NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (sso_provider_id, idp_claim_name, idp_claim_value)
);

CREATE INDEX idx_sso_mappings_provider ON sso_mappings(sso_provider_id);

-- ============================================
-- 5. SSO Login Attempts Table
-- ============================================

CREATE TABLE sso_login_attempts (
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

CREATE INDEX idx_sso_login_attempts_org ON sso_login_attempts(organisation_id, created_at DESC);
CREATE INDEX idx_sso_login_attempts_user ON sso_login_attempts(user_id, created_at DESC);
CREATE INDEX idx_sso_login_attempts_failed ON sso_login_attempts(organisation_id, created_at DESC) 
    WHERE success = false;

-- ============================================
-- 6. API Clients Table
-- ============================================

CREATE TABLE api_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    client_name VARCHAR(100) NOT NULL,
    description TEXT,
    client_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(10) NOT NULL,
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

CREATE INDEX idx_api_clients_org ON api_clients(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_api_clients_client_id ON api_clients(client_id);
CREATE INDEX idx_api_clients_prefix ON api_clients(api_key_prefix) WHERE status = 'active';

-- ============================================
-- 7. Webhooks Table
-- ============================================

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    target_url VARCHAR(500) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    event_types integration_event_type[] NOT NULL,
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

CREATE INDEX idx_webhooks_org ON webhooks(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_webhooks_enabled ON webhooks(organisation_id, enabled) WHERE deleted_at IS NULL;

-- ============================================
-- 8. Integration Events Table
-- ============================================

CREATE TABLE integration_events (
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

CREATE INDEX idx_integration_events_org ON integration_events(organisation_id, created_at DESC);
CREATE INDEX idx_integration_events_type ON integration_events(event_type, created_at DESC);
CREATE INDEX idx_integration_events_entity ON integration_events(entity_type, entity_id);
CREATE INDEX idx_integration_events_unprocessed ON integration_events(created_at) 
    WHERE processed_at IS NULL;

-- ============================================
-- 9. Webhook Events Table
-- ============================================

CREATE TABLE webhook_events (
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

CREATE INDEX idx_webhook_events_webhook ON webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_pending ON webhook_events(status, next_retry_at) 
    WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at DESC);

-- ============================================
-- 10. Update Triggers
-- ============================================

-- updated_at trigger function (if not exists from previous migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sso_providers_updated_at
    BEFORE UPDATE ON sso_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sso_mappings_updated_at
    BEFORE UPDATE ON sso_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_clients_updated_at
    BEFORE UPDATE ON api_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. Comments
-- ============================================

COMMENT ON TABLE sso_providers IS 'SSO/OIDC provider configuration per organisation';
COMMENT ON TABLE sso_mappings IS 'IdP group to EHS role mappings';
COMMENT ON TABLE sso_login_attempts IS 'SSO login attempt audit log';
COMMENT ON TABLE api_clients IS 'API client credentials for external access';
COMMENT ON TABLE webhooks IS 'Webhook endpoint configurations';
COMMENT ON TABLE integration_events IS 'All integration events for processing';
COMMENT ON TABLE webhook_events IS 'Webhook delivery attempts and status';

COMMIT;
```

---

## 7. Data Validation Rules

### 7.1 SSO Providers
- `issuer_url` must be valid HTTPS URL
- `client_secret_encrypted` must be encrypted using application key
- Maximum one enabled provider per organisation

### 7.2 API Clients
- `scopes` array must have at least one scope
- `api_key_hash` must be bcrypt hash (60 chars)
- `ip_allowlist` entries must be valid CIDR notation

### 7.3 Webhooks
- `target_url` must be valid HTTPS URL
- `event_types` array must have at least one event type
- `secret` minimum 32 characters

---

## 8. Retention Policies

| Entity | Retention | Notes |
|--------|-----------|-------|
| sso_login_attempts | 90 days | Configurable per org |
| integration_events | 30 days | Configurable per org |
| webhook_events | 14 days | After completed_at |
| api_clients (soft deleted) | 1 year | For audit trail |

---

## 9. Sample Data

```sql
-- Sample SSO Provider
INSERT INTO sso_providers (
    organisation_id, provider_name, provider_type, issuer_url,
    client_id, client_secret_encrypted, redirect_uri, enabled, created_by
) VALUES (
    'org-uuid-here',
    'Corporate Azure AD',
    'oidc_azure_ad',
    'https://login.microsoftonline.com/tenant-id/v2.0',
    'azure-client-id',
    'encrypted-secret-here',
    'https://ehs.example.com/auth/sso/callback',
    true,
    'admin-user-uuid'
);

-- Sample Role Mappings
INSERT INTO sso_mappings (sso_provider_id, idp_claim_value, ehs_role, priority) VALUES
    ('sso-provider-uuid', 'EHS-Admins', 'admin', 100),
    ('sso-provider-uuid', 'EHS-Managers', 'manager', 90),
    ('sso-provider-uuid', 'EHS-Supervisors', 'supervisor', 80),
    ('sso-provider-uuid', 'All-Staff', 'worker', 0);

-- Sample API Client
INSERT INTO api_clients (
    organisation_id, client_name, description, api_key_hash, api_key_prefix,
    scopes, rate_limit_tier, created_by
) VALUES (
    'org-uuid-here',
    'Power BI Integration',
    'Read-only access for BI dashboards',
    '$2b$10$hashedkeyhere',
    'ehs_live_',
    ARRAY['read:incidents', 'read:actions', 'read:risks']::api_scope[],
    'premium',
    'admin-user-uuid'
);

-- Sample Webhook
INSERT INTO webhooks (
    organisation_id, name, target_url, secret, event_types, created_by
) VALUES (
    'org-uuid-here',
    'Teams Notifications',
    'https://outlook.office.com/webhook/guid-here',
    'randomly-generated-32-char-secret',
    ARRAY['incident.created', 'incident.severity_changed']::integration_event_type[],
    'admin-user-uuid'
);
```

---

*End of Document*

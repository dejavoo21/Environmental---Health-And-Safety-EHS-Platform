# Data Model – EHS Portal Phase 6
## Security, Trust & Self-Service

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Status | Draft |
| Phase | 6 – Security, Trust & Self-Service |

---

## 1. Overview

Phase 6 introduces new tables to support self-service access requests, password reset, two-factor authentication, enhanced security audit logging, and theme preferences.

**New Tables:**
- `access_requests` – Self-service access request workflow
- `password_reset_tokens` – Secure password reset tokens
- `user_2fa` – Two-factor authentication configuration
- `user_backup_codes` – 2FA recovery codes
- `security_audit_log` – Security event audit trail
- `login_history` – User login history for Security Centre

**Modified Tables:**
- `users` – Add theme preference, password history, 2FA status flag
- `organisations` – Add default theme, 2FA policy

---

## 2. Design Decisions

### 2.1 Separate Security Audit Log

**Decision:** Create dedicated `security_audit_log` table separate from existing `audit_log`.

**Rationale:**
- Security events have different retention requirements (2+ years)
- Different access controls (security officer vs general admin)
- Different query patterns (security investigations)
- Immutable design (no soft deletes)

**Trade-offs:**
| Approach | Pros | Cons |
|----------|------|------|
| Extend audit_log | Single source | Mixed retention, access |
| Separate table (chosen) | Clear separation | Two audit systems |

### 2.2 Token Storage

**Decision:** Store all tokens hashed (SHA-256), not plaintext.

**Rationale:**
- Tokens are secrets equivalent to temporary passwords
- Hashing prevents database breach from exposing tokens
- Only the original token URL works

### 2.3 2FA Secret Storage

**Decision:** Encrypt 2FA secrets at rest using application-level encryption.

**Rationale:**
- TOTP secrets must be retrievable (unlike passwords)
- Database compromise should not expose secrets
- Use AES-256-GCM with key from environment variable

### 2.4 Backup Code Storage

**Decision:** Store backup codes hashed (bcrypt), similar to passwords.

**Rationale:**
- Single-use, can verify by hash comparison
- No need to retrieve plaintext
- Same security model as passwords

---

## 3. New Entity Definitions

### 3.1 access_requests

Stores self-service access requests from prospective users.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| reference_number | VARCHAR(20) | NOT NULL, UNIQUE | Human-readable reference (e.g., "AR-2026-0001") |
| email | VARCHAR(255) | NOT NULL | Requester's email |
| full_name | VARCHAR(255) | NOT NULL | Requester's full name |
| organisation_id | UUID | FK → organisations, NULL | Target organisation (NULL if org lookup pending) |
| organisation_code | VARCHAR(50) | NULL | Organisation code entered by user |
| requested_role | VARCHAR(20) | NOT NULL | Role requested (worker, manager) |
| reason | TEXT | NULL | Justification text (max 500 chars) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | Request status |
| decision_by | UUID | FK → users, NULL | Admin who approved/rejected |
| decision_at | TIMESTAMPTZ | NULL | When decision was made |
| decision_reason | TEXT | NULL | Internal notes (not shared with requester) |
| ip_address | INET | NULL | IP address of request submission |
| user_agent | TEXT | NULL | Browser user agent |
| terms_accepted | BOOLEAN | NOT NULL, DEFAULT FALSE | Terms acknowledgement |
| email_verified | BOOLEAN | NOT NULL, DEFAULT FALSE | Email verification flag |
| email_verification_token | VARCHAR(128) | NULL | Token for email verification |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Request submission time |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time |
| expires_at | TIMESTAMPTZ | NOT NULL | Request expiry (30 days from creation) |

**Status Enum Values:**
- `pending` – Awaiting admin review
- `approved` – Approved, user created
- `rejected` – Rejected by admin
- `expired` – Auto-expired after 30 days
- `cancelled` – Cancelled by requester (if email verified)

**Indexes:**
- Primary key on `id`
- Unique index on `reference_number`
- Index on `(organisation_id, status)` – Admin queue queries
- Index on `email` – Duplicate detection
- Index on `status, created_at` – Status filtering

**Constraints:**
- CHECK constraint: `requested_role IN ('worker', 'manager')`
- CHECK constraint: `status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')`

---

### 3.2 password_reset_tokens

Stores secure, time-limited password reset tokens.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users, NOT NULL | User requesting reset |
| token_hash | VARCHAR(128) | NOT NULL | SHA-256 hash of token |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Token creation time |
| expires_at | TIMESTAMPTZ | NOT NULL | Token expiry (30 mins default) |
| used_at | TIMESTAMPTZ | NULL | When token was used |
| ip_address | INET | NULL | IP address of request |
| attempts | INTEGER | NOT NULL, DEFAULT 0 | Failed attempt count |

**Indexes:**
- Primary key on `id`
- Index on `token_hash` – Token lookup
- Index on `user_id` – User's active tokens
- Index on `expires_at` – Cleanup job

**Notes:**
- Only one active token per user at a time
- New request invalidates existing tokens (sets used_at to NOW())
- Max 5 attempts before token invalidation

---

### 3.3 user_2fa

Stores two-factor authentication configuration per user.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users, UNIQUE, NOT NULL | User (one-to-one) |
| secret_encrypted | TEXT | NOT NULL | AES-256-GCM encrypted TOTP secret |
| secret_iv | VARCHAR(32) | NOT NULL | Initialisation vector for decryption |
| is_enabled | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether 2FA is active |
| enabled_at | TIMESTAMPTZ | NULL | When 2FA was enabled |
| disabled_at | TIMESTAMPTZ | NULL | When 2FA was last disabled |
| last_used_at | TIMESTAMPTZ | NULL | Last successful 2FA verification |
| backup_codes_generated_at | TIMESTAMPTZ | NULL | When backup codes were generated |
| backup_codes_remaining | INTEGER | NOT NULL, DEFAULT 0 | Count of unused backup codes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update |

**Indexes:**
- Primary key on `id`
- Unique index on `user_id`

**Notes:**
- Encryption key from environment variable `TOTP_ENCRYPTION_KEY`
- Uses AES-256-GCM mode for authenticated encryption
- secret_iv unique per user, generated on secret creation

---

### 3.4 user_backup_codes

Stores hashed backup/recovery codes for 2FA.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users, NOT NULL | Owner user |
| code_hash | VARCHAR(128) | NOT NULL | Bcrypt hash of backup code |
| code_index | INTEGER | NOT NULL | Position 1-10 for tracking |
| used_at | TIMESTAMPTZ | NULL | When code was used (NULL = unused) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When code was generated |

**Indexes:**
- Primary key on `id`
- Index on `(user_id, used_at)` – Available codes lookup
- Unique index on `(user_id, code_index)` – Prevent duplicates

**Notes:**
- 10 codes generated per user
- Codes are 8 characters (alphanumeric, excluding ambiguous chars)
- Regenerating codes deletes all existing and creates new set

---

### 3.5 security_audit_log

Immutable security event audit trail.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| event_type | VARCHAR(50) | NOT NULL | Event type (see enum) |
| organisation_id | UUID | FK → organisations, NULL | Organisation context (NULL for global) |
| user_id | UUID | FK → users, NULL | User involved (NULL for anonymous events) |
| target_user_id | UUID | FK → users, NULL | Target user (for admin actions) |
| ip_address | INET | NULL | Client IP address |
| user_agent | TEXT | NULL | Client user agent |
| metadata | JSONB | NULL | Additional event-specific data |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Event timestamp |

**Event Type Enum Values:**
- `LOGIN_SUCCESS`
- `LOGIN_FAILURE`
- `LOGOUT`
- `PASSWORD_RESET_REQUEST`
- `PASSWORD_RESET_COMPLETE`
- `PASSWORD_CHANGED`
- `2FA_ENABLED`
- `2FA_DISABLED`
- `2FA_BACKUP_USED`
- `2FA_BACKUP_REGENERATED`
- `2FA_VERIFICATION_FAILED`
- `ACCESS_REQUEST_CREATED`
- `ACCESS_REQUEST_APPROVED`
- `ACCESS_REQUEST_REJECTED`
- `USER_CREATED`
- `USER_ROLE_CHANGED`
- `USER_DISABLED`
- `USER_ENABLED`
- `ACCOUNT_LOCKED`
- `ACCOUNT_UNLOCKED`

**Indexes:**
- Primary key on `id`
- Index on `(organisation_id, created_at DESC)` – Org timeline
- Index on `(user_id, created_at DESC)` – User activity
- Index on `(event_type, created_at DESC)` – Event type filtering
- Index on `created_at` – Time-based queries

**Immutability:**
- No UPDATE or DELETE operations allowed (enforce via triggers or app logic)
- Retention managed via separate archival process

**Metadata Examples:**
```json
// LOGIN_FAILURE
{ "attempted_email": "user@example.com", "reason": "invalid_password" }

// USER_ROLE_CHANGED
{ "old_role": "worker", "new_role": "manager" }

// 2FA_BACKUP_USED
{ "code_index": 3, "codes_remaining": 7 }
```

---

### 3.6 login_history

Stores recent login activity for user Security Centre.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users, NOT NULL | User who logged in |
| organisation_id | UUID | FK → organisations, NOT NULL | Organisation context |
| login_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Login timestamp |
| ip_address | INET | NULL | Client IP |
| user_agent | TEXT | NULL | Browser/device info |
| device_type | VARCHAR(20) | NULL | Parsed: desktop, mobile, tablet |
| browser | VARCHAR(50) | NULL | Parsed browser name |
| location_country | VARCHAR(100) | NULL | Geo-lookup country |
| location_city | VARCHAR(100) | NULL | Geo-lookup city |
| success | BOOLEAN | NOT NULL | Login success/failure |
| failure_reason | VARCHAR(50) | NULL | Reason if failed |
| mfa_used | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether 2FA was used |

**Indexes:**
- Primary key on `id`
- Index on `(user_id, login_at DESC)` – User's recent logins
- Index on `login_at` – Cleanup of old records

**Notes:**
- Retain 90 days by default (configurable)
- Cleanup job removes older entries
- Summary kept in security_audit_log permanently

---

## 4. Modified Entity Definitions

### 4.1 users (Modifications)

Add columns to existing users table:

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| theme_preference | VARCHAR(20) | NOT NULL, DEFAULT 'system' | User's theme preference |
| has_2fa_enabled | BOOLEAN | NOT NULL, DEFAULT FALSE | Quick 2FA check flag |
| password_changed_at | TIMESTAMPTZ | NULL | Last password change |
| failed_login_attempts | INTEGER | NOT NULL, DEFAULT 0 | Lockout counter |
| locked_until | TIMESTAMPTZ | NULL | Account lockout expiry |
| force_password_change | BOOLEAN | NOT NULL, DEFAULT FALSE | Require password change on next login |
| last_login_at | TIMESTAMPTZ | NULL | Last successful login |
| last_login_ip | INET | NULL | Last login IP |

**Theme Preference Enum:**
- `light` – Light mode
- `dark` – Dark mode
- `system` – Follow OS preference

---

### 4.2 user_password_history

New table to track password history (prevent reuse).

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users, NOT NULL | User |
| password_hash | VARCHAR(128) | NOT NULL | Bcrypt hash of old password |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When password was set |

**Indexes:**
- Primary key on `id`
- Index on `(user_id, created_at DESC)` – Recent passwords lookup

**Notes:**
- Keep last 5 passwords per user
- Clean up older entries on new password set

---

### 4.3 organisations (Modifications)

Add columns to existing organisations table:

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| default_theme | VARCHAR(20) | NOT NULL, DEFAULT 'light' | Organisation default theme |
| access_request_enabled | BOOLEAN | NOT NULL, DEFAULT TRUE | Allow self-service access requests |
| access_request_auto_expire_days | INTEGER | NOT NULL, DEFAULT 30 | Days before request expires |
| mfa_policy | VARCHAR(20) | NOT NULL, DEFAULT 'optional' | 2FA policy |

**MFA Policy Enum:**
- `optional` – User choice
- `encouraged` – Prompt reminders
- `required` – Mandatory (future)

---

## 5. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 6 DATA MODEL                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   organisations │       │      users      │       │    user_2fa     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──┐   │ id (PK)         │◄──────│ user_id (FK,UQ) │
│ default_theme   │   │   │ organisation_id │       │ secret_encrypted│
│ access_req_enab │   │   │ theme_preference│       │ is_enabled      │
│ mfa_policy      │   │   │ has_2fa_enabled │       │ backup_codes_rem│
└─────────────────┘   │   │ failed_login_att│       └─────────────────┘
                      │   │ locked_until    │              │
                      │   │ force_pwd_change│              │
                      │   │ last_login_at   │              ▼
                      │   └─────────────────┘       ┌─────────────────┐
                      │          │ ▲               │user_backup_codes│
                      │          │ │               ├─────────────────┤
                      │          ▼ │               │ user_id (FK)    │
                      │   ┌─────────────────┐       │ code_hash       │
                      │   │password_reset_  │       │ code_index      │
                      │   │    tokens       │       │ used_at         │
                      │   ├─────────────────┤       └─────────────────┘
                      │   │ user_id (FK)    │
                      │   │ token_hash      │
                      │   │ expires_at      │
                      │   │ used_at         │
                      │   └─────────────────┘
                      │
                      │   ┌─────────────────┐       ┌─────────────────┐
                      └───│ access_requests │       │security_audit_  │
                          ├─────────────────┤       │      log        │
                          │ organisation_id │       ├─────────────────┤
                          │ email           │       │ organisation_id │
                          │ requested_role  │       │ user_id         │
                          │ status          │       │ target_user_id  │
                          │ decision_by(FK) │       │ event_type      │
                          └─────────────────┘       │ ip_address      │
                                                    │ metadata (JSONB)│
                                                    └─────────────────┘

                          ┌─────────────────┐       ┌─────────────────┐
                          │  login_history  │       │ user_password_  │
                          ├─────────────────┤       │    history      │
                          │ user_id (FK)    │       ├─────────────────┤
                          │ organisation_id │       │ user_id (FK)    │
                          │ ip_address      │       │ password_hash   │
                          │ success         │       │ created_at      │
                          │ mfa_used        │       └─────────────────┘
                          └─────────────────┘
```

---

## 6. Migration Scripts

### 6.1 Migration File: `006_phase6_security.sql`

```sql
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

CREATE INDEX idx_access_requests_org_status ON access_requests(organisation_id, status);
CREATE INDEX idx_access_requests_email ON access_requests(email);
CREATE INDEX idx_access_requests_status_created ON access_requests(status, created_at);

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

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

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

CREATE INDEX idx_user_backup_codes_user_unused ON user_backup_codes(user_id, used_at);

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

CREATE INDEX idx_security_audit_org_time ON security_audit_log(organisation_id, created_at DESC);
CREATE INDEX idx_security_audit_user_time ON security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_security_audit_type_time ON security_audit_log(event_type, created_at DESC);
CREATE INDEX idx_security_audit_created ON security_audit_log(created_at);

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

CREATE INDEX idx_login_history_user_time ON login_history(user_id, login_at DESC);
CREATE INDEX idx_login_history_time ON login_history(login_at);

-- 7. Create user_password_history table
CREATE TABLE IF NOT EXISTS user_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_history_user_time ON user_password_history(user_id, created_at DESC);

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
CREATE TRIGGER access_requests_updated_at
    BEFORE UPDATE ON access_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 14. Create updated_at trigger for user_2fa
CREATE TRIGGER user_2fa_updated_at
    BEFORE UPDATE ON user_2fa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

COMMIT;
```

---

## 7. Data Validation Rules

### 7.1 Access Requests

| Field | Validation |
|-------|------------|
| email | Valid email format, max 255 chars |
| full_name | 2-255 characters |
| organisation_code | Lookup against organisations.code |
| reason | Max 500 characters |
| requested_role | Must be 'worker' or 'manager' |

### 7.2 Password Reset Tokens

| Field | Validation |
|-------|------------|
| token | 64 random bytes, hex encoded |
| expiry | Default 30 minutes from creation |
| attempts | Max 5 before invalidation |

### 7.3 2FA Configuration

| Field | Validation |
|-------|------------|
| TOTP secret | 160-bit (20 bytes) minimum |
| Backup codes | 8 alphanumeric chars each, 10 codes |
| Verification code | 6 digits, validates ±1 time window |

---

## 8. Retention and Cleanup

| Table | Retention | Cleanup Method |
|-------|-----------|----------------|
| access_requests | 2 years | Archive then delete |
| password_reset_tokens | 24 hours after expiry | Scheduled job |
| security_audit_log | 2+ years (configurable) | Archive to cold storage |
| login_history | 90 days | Scheduled job |
| user_password_history | Last 5 per user | On new password |

---

## 9. Performance Considerations

### 9.1 Indexing Strategy

- Security audit log: Partitioning by month recommended for high-volume deployments
- Login history: Partition by month, cleanup via partition drop
- Token tables: Small, indexed by hash for O(1) lookup

### 9.2 Query Patterns

| Query | Expected Frequency | Optimization |
|-------|-------------------|--------------|
| Token lookup | High (every reset) | Hash index |
| Audit log filter | Medium (admin views) | Composite indexes |
| Login history (user) | Low (Security Centre) | User + time index |
| Pending access requests | Low (admin queue) | Status + org index |

---

## 10. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

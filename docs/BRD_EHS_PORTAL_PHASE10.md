# Business Requirements Document – EHS Portal Phase 10
## Integrations, SSO & External Connectivity

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 10 – Integrations, SSO & External Connectivity |

---

## 1. Executive Summary

Phase 10 elevates the EHS Portal to enterprise-grade connectivity by introducing Single Sign-On (SSO), external API access, and outbound integrations. These capabilities enable seamless identity federation, third-party system integration, and real-time event notifications to external platforms.

### 1.1 Business Context

With Phases 1-9 complete, the EHS Portal provides comprehensive EHS management capabilities. However, enterprise customers require:

- **Single Sign-On:** Users expect to authenticate via corporate identity providers (Azure AD, Okta) rather than managing separate credentials
- **HR/IdP User Sync:** Manual user provisioning creates delays and inconsistencies; organisations want automated user lifecycle management
- **External Integrations:** EHS data needs to flow to other enterprise systems (SIEM, ServiceNow, Power BI, Teams)
- **API Access:** Integration partners and customer developers need programmatic access to EHS data
- **Real-time Notifications:** Critical EHS events should immediately notify relevant systems and stakeholders

Phase 10 addresses these gaps with a comprehensive integration framework.

### 1.2 Business Goals

| Goal ID | Goal | Success Metric |
|---------|------|----------------|
| G-P10-01 | Enable enterprise SSO adoption | 80% of users in SSO-enabled orgs log in via SSO within 3 months |
| G-P10-02 | Eliminate manual user provisioning | 90% of users created via JIT or SCIM provisioning |
| G-P10-03 | Enable external system integration | ≥5 active API integrations per enterprise customer |
| G-P10-04 | Provide real-time event notifications | Critical events reach Teams/webhook within 60 seconds |
| G-P10-05 | Secure external access | 100% of API calls authenticated with valid credentials |
| G-P10-06 | Support compliance auditing | All integration activity logged and auditable |

### 1.3 Scope

**In Scope:**
- OpenID Connect (OIDC) SSO integration
- Support for Microsoft Entra ID (Azure AD) and generic OIDC providers
- IdP group-to-role mapping
- Just-In-Time (JIT) user provisioning at SSO login
- Optional local password disable for SSO-only orgs
- API client/key management for external access
- Scoped public REST API for Incidents, Actions, Training, and Risks
- Rate limiting and IP allowlist for API security
- Outbound webhooks for key EHS events
- Microsoft Teams webhook integration
- Event filtering and subscription management
- Admin UI for integration configuration
- Comprehensive audit logging for integration events

**Out of Scope:**
- SAML 2.0 support (planned for future phase)
- Full SCIM 2.0 server implementation (JIT provisioning only in P10)
- Bi-directional sync with HR systems
- OAuth 2.0 client credentials flow (API keys only in P10)
- Custom branding per IdP
- Mobile app SSO deep linking
- Complex webhook transformation/mapping
- Message queue integration (Kafka, RabbitMQ)
- GraphQL API

---

## 2. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| End Users | SSO consumers | Seamless login via corporate credentials |
| Org Admins | Configuration owners | Configure SSO, manage API keys, set up webhooks |
| IT/Identity Team | IdP administrators | Configure IdP trust, manage group mappings |
| Integration Developers | API consumers | Build integrations using public API |
| Security Team | Governance | Audit API access, review security events |
| External Systems | Integration endpoints | Receive EHS events, query EHS data |
| Compliance Lead | Audit | Verify integration security controls |

---

## 3. Business Requirements

### 3.1 Single Sign-On – OIDC (BR-SSO)

#### BR-SSO-01: OIDC Provider Configuration
**Priority:** Must Have
**Capability ID:** C-270

The system shall allow organisation admins to configure OpenID Connect (OIDC) SSO providers.

**Configuration Fields:**
- Provider name (display name)
- Provider type: `Microsoft Entra ID` | `Generic OIDC`
- Issuer URL (OIDC discovery URL)
- Client ID
- Client Secret (encrypted at rest)
- Redirect URI (system-generated)
- Scopes (default: `openid profile email`)
- Enabled flag

**Acceptance Criteria:**
- Admin can configure one SSO provider per organisation
- Client secret is stored encrypted, never returned in API responses
- Configuration can be enabled/disabled without deletion
- Redirect URI is generated based on system base URL
- Discovery document is fetched and validated on save

---

#### BR-SSO-02: SSO Login Flow
**Priority:** Must Have
**Capability ID:** C-271

Users shall be able to authenticate via SSO instead of local username/password.

**Flow:**
1. User clicks "Sign in with SSO" or accesses SSO-specific login URL
2. User is redirected to IdP authorisation endpoint
3. User authenticates at IdP
4. IdP redirects back with authorisation code
5. Backend exchanges code for tokens
6. Backend validates ID token and extracts claims
7. User is matched/created and issued EHS JWT
8. User is redirected to dashboard

**Acceptance Criteria:**
- SSO login button visible when SSO is configured for org
- Users can sign in without entering EHS password
- Session tokens issued are identical format to password login
- Failed SSO attempts are logged with reason

---

#### BR-SSO-03: User Matching and JIT Provisioning
**Priority:** Must Have
**Capability ID:** C-272

The system shall match SSO users to existing accounts or create new accounts (JIT provisioning).

**Matching Logic:**
1. Primary match: `email` claim from IdP matches existing user email
2. Secondary match: `oid` or `sub` claim stored as `external_id` on user

**JIT Provisioning Rules:**
- If no match found and JIT is enabled: create new user
- New user attributes from claims: email, name (given_name + family_name)
- Default role from: IdP group mapping OR org default role setting
- User is associated with the SSO-configured organisation

**Acceptance Criteria:**
- Existing users can log in via SSO without re-registration
- New users are auto-provisioned when JIT is enabled
- User `external_id` is stored for future matching
- JIT can be disabled (SSO login fails for unknown users)

---

#### BR-SSO-04: IdP Group-to-Role Mapping
**Priority:** Must Have
**Capability ID:** C-273

Admins shall configure mappings from IdP groups/claims to EHS roles.

**Mapping Configuration:**
- IdP claim source: `groups` claim or custom claim name
- Mapping entries: IdP group value → EHS role (admin, manager, supervisor, worker)
- Fallback role if no mapping matches
- Priority order for multiple matches

**Acceptance Criteria:**
- At least 4 role mappings can be configured
- User role is set based on IdP groups at each login
- Fallback role is applied when no groups match
- Role changes take effect on next login

---

#### BR-SSO-05: SSO-Only Mode
**Priority:** Should Have
**Capability ID:** C-274

Admins shall be able to enforce SSO-only login, disabling local password authentication.

**Configuration:**
- SSO enforcement flag per organisation
- When enabled: password login disabled for all users
- Exception: system/break-glass account (optional)

**Acceptance Criteria:**
- Password login is rejected with clear message for SSO-only orgs
- Existing password hashes are preserved but not usable
- Admin can revert to allow password login

---

#### BR-SSO-06: SSO Error Handling
**Priority:** Must Have
**Capability ID:** C-275

The system shall handle SSO failures gracefully with clear user feedback.

**Error Scenarios:**
- IdP unreachable: "Unable to connect to identity provider"
- Token validation failed: "Authentication failed. Please try again."
- User not authorised (JIT disabled, no match): "You are not authorised for this application"
- Role mapping failed: "Unable to determine your access level"

**Acceptance Criteria:**
- All SSO errors logged with correlation ID
- User sees friendly error messages, not technical details
- Admin can view SSO error logs

---

### 3.2 API Clients & Public API (BR-API)

#### BR-API-01: API Client Registration
**Priority:** Must Have
**Capability ID:** C-276

Admins shall be able to create API clients for external integration.

**API Client Attributes:**
- Client name (descriptive)
- Description (optional)
- Client ID (auto-generated UUID)
- API Key/Secret (auto-generated, shown once)
- Scopes (permission set)
- IP allowlist (optional)
- Rate limit tier (optional)
- Status: active/revoked
- Created by, created at, last used at

**Acceptance Criteria:**
- API key is displayed only once on creation
- Client ID is not secret (can be logged)
- Admins can create multiple clients per org

---

#### BR-API-02: API Scopes
**Priority:** Must Have
**Capability ID:** C-277

API access shall be controlled via scopes that limit what data/actions are accessible.

**Available Scopes:**
| Scope | Description |
|-------|-------------|
| `read:incidents` | Read incident data |
| `write:incidents` | Create/update incidents |
| `read:actions` | Read actions data |
| `write:actions` | Create/update actions |
| `read:inspections` | Read inspections data |
| `read:training` | Read training/competence data |
| `read:risks` | Read risk register data |
| `read:chemicals` | Read chemical register data |
| `read:users` | Read user list (limited fields) |

**Acceptance Criteria:**
- Each API client is assigned one or more scopes
- API requests are rejected if scope is insufficient
- Scope validation logged in audit

---

#### BR-API-03: API Key Authentication
**Priority:** Must Have
**Capability ID:** C-278

Public API endpoints shall authenticate using API keys.

**Authentication Method:**
- Header: `X-API-Key: <api_key>`
- Alternative: `Authorization: Bearer <api_key>` for compatibility

**Validation:**
- Key is hashed and compared (never stored in plain text after creation)
- Client status must be `active`
- `last_used_at` updated on successful auth

**Acceptance Criteria:**
- Invalid API keys return 401 Unauthorized
- Revoked clients return 401 Unauthorized
- Valid key + correct scope returns data

---

#### BR-API-04: API Rate Limiting
**Priority:** Should Have
**Capability ID:** C-279

API requests shall be rate-limited to prevent abuse.

**Default Limits:**
- 1000 requests per minute per client (standard tier)
- 5000 requests per minute per client (premium tier)
- Burst allowance: 1.5× for 10 seconds

**Rate Limit Response:**
- HTTP 429 Too Many Requests
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Acceptance Criteria:**
- Clients exceeding limits receive 429 response
- Rate limit headers included in all API responses
- Admin can adjust limits per client

---

#### BR-API-05: IP Allowlisting
**Priority:** Should Have
**Capability ID:** C-280

Admins shall be able to restrict API access by source IP address.

**Configuration:**
- List of allowed IPs or CIDR ranges per client
- Empty list = no IP restriction (all allowed)

**Acceptance Criteria:**
- Requests from non-allowed IPs return 403 Forbidden
- IP checked after authentication
- IPv4 and IPv6 supported

---

#### BR-API-06: Public API Endpoints
**Priority:** Must Have
**Capability ID:** C-281

The system shall expose a stable, versioned public API for core entities.

**MVP Endpoints (Phase 10):**

| Method | Endpoint | Scope Required | Description |
|--------|----------|----------------|-------------|
| GET | `/api/public/v1/incidents` | read:incidents | List incidents (paginated, filtered) |
| GET | `/api/public/v1/incidents/:id` | read:incidents | Get incident by ID |
| POST | `/api/public/v1/incidents` | write:incidents | Create incident |
| PUT | `/api/public/v1/incidents/:id` | write:incidents | Update incident |
| GET | `/api/public/v1/actions` | read:actions | List actions |
| GET | `/api/public/v1/actions/:id` | read:actions | Get action by ID |
| POST | `/api/public/v1/actions` | write:actions | Create action |
| PUT | `/api/public/v1/actions/:id` | write:actions | Update action |
| GET | `/api/public/v1/risks` | read:risks | List risk register |
| GET | `/api/public/v1/risks/:id` | read:risks | Get risk by ID |
| GET | `/api/public/v1/training/status` | read:training | Training completion summary |
| GET | `/api/public/v1/users` | read:users | List users (limited fields) |

**Response Format:**
- Standard JSON envelope: `{ success, data, pagination, meta }`
- ISO 8601 dates
- Consistent error format

**Acceptance Criteria:**
- All endpoints return organisation-scoped data
- Versioned URL prefix (`/api/public/v1/`)
- OpenAPI/Swagger documentation generated

---

#### BR-API-07: API Key Management
**Priority:** Must Have
**Capability ID:** C-282

Admins shall be able to manage API client lifecycle.

**Management Actions:**
- View list of API clients with usage stats
- Revoke client (immediate, cannot be undone)
- Regenerate API key (invalidates old key)
- Edit client details (name, description, scopes, IP list)
- Delete client (soft delete with audit trail)

**Acceptance Criteria:**
- Revoked clients cannot authenticate
- Key regeneration provides new key shown once
- Audit log records all management actions

---

### 3.3 Outbound Integrations & Webhooks (BR-WEBHOOK)

#### BR-WEBHOOK-01: Webhook Registration
**Priority:** Must Have
**Capability ID:** C-283

Admins shall be able to configure webhook endpoints for event delivery.

**Webhook Configuration:**
- Name (descriptive)
- Target URL (HTTPS required)
- Secret (for signature verification)
- Event types subscribed
- Enabled flag
- Headers (optional custom headers)

**Acceptance Criteria:**
- Multiple webhooks can be configured per org
- HTTPS URL validation on save
- Secret generated or user-provided

---

#### BR-WEBHOOK-02: Webhook Event Types
**Priority:** Must Have
**Capability ID:** C-284

Webhooks shall support subscription to specific event types.

**Available Event Types:**

| Event Type | Trigger |
|------------|---------|
| `incident.created` | New incident reported |
| `incident.updated` | Incident modified |
| `incident.severity_changed` | Severity level changed |
| `incident.closed` | Incident closed |
| `action.created` | New action created |
| `action.assigned` | Action assigned to user |
| `action.overdue` | Action passed due date |
| `action.completed` | Action marked complete |
| `risk.created` | New risk added |
| `risk.level_changed` | Risk level escalated/reduced |
| `risk.review_due` | Risk review coming due |
| `training.assigned` | Training assigned to user |
| `training.overdue` | Training past due date |
| `training.completed` | Training completed |

**Acceptance Criteria:**
- Admins can select multiple event types per webhook
- Events not subscribed are not sent to webhook
- Event type list can be extended in future phases

---

#### BR-WEBHOOK-03: Webhook Payload Format
**Priority:** Must Have
**Capability ID:** C-285

Webhooks shall deliver events in a consistent, documented payload format.

**Payload Structure:**
```json
{
  "id": "evt_abc123",
  "type": "incident.created",
  "timestamp": "2026-02-05T10:30:00Z",
  "organisation_id": "org_xyz",
  "data": {
    "id": "inc_123",
    "title": "Slip and fall in warehouse",
    "severity": "high",
    "status": "open",
    "site_id": "site_456",
    "reported_by": "user_789"
  },
  "metadata": {
    "source": "ehs-portal",
    "version": "1.0"
  }
}
```

**Acceptance Criteria:**
- All payloads include event ID, type, timestamp
- Data contains relevant entity fields
- Timestamps in ISO 8601 format

---

#### BR-WEBHOOK-04: Webhook Signature Verification
**Priority:** Must Have
**Capability ID:** C-286

Webhook requests shall include HMAC signature for recipient verification.

**Signature Implementation:**
- Header: `X-EHS-Signature: sha256=<hmac_hash>`
- HMAC-SHA256 of payload using webhook secret
- Timestamp header to prevent replay: `X-EHS-Timestamp`

**Acceptance Criteria:**
- All webhook requests include signature header
- Recipient can verify authenticity using shared secret
- Documentation includes signature verification examples

---

#### BR-WEBHOOK-05: Webhook Delivery & Retry
**Priority:** Must Have
**Capability ID:** C-287

The system shall reliably deliver webhooks with retry on failure.

**Delivery Behaviour:**
- Timeout: 30 seconds per attempt
- Success: HTTP 2xx response
- Retry schedule: immediate, +1min, +5min, +30min, +2hr (5 attempts)
- After all retries: mark as failed, log error

**Acceptance Criteria:**
- Transient failures are automatically retried
- Persistent failures are logged with error details
- Admins can view delivery status in UI

---

#### BR-WEBHOOK-06: Webhook Activity Log
**Priority:** Should Have
**Capability ID:** C-288

Admins shall be able to view webhook delivery history.

**Log Entries:**
- Timestamp
- Event type
- Target URL
- HTTP status code
- Response time
- Success/failure
- Error message (if failed)

**Acceptance Criteria:**
- Last 100 deliveries shown per webhook
- Filter by success/failure
- Ability to retry failed deliveries manually

---

#### BR-WEBHOOK-07: Microsoft Teams Integration
**Priority:** Should Have
**Capability ID:** C-289

The system shall support posting notifications to Microsoft Teams channels.

**Teams Integration:**
- Incoming webhook URL (Teams connector)
- Adaptive card format for rich notifications
- Event type filtering

**Card Content (example for incident):**
- Title: "🚨 New Incident Reported"
- Summary line with severity and site
- Link to incident in EHS Portal
- Key details (type, reported by, date)

**Acceptance Criteria:**
- Teams notifications appear within 60 seconds
- Cards are mobile-friendly
- Link to EHS Portal works with SSO

---

### 3.4 Admin Configuration UI (BR-ADMIN)

#### BR-ADMIN-01: Integrations Settings Page
**Priority:** Must Have
**Capability ID:** C-290

The admin UI shall include an Integrations page with all configuration options.

**Page Sections:**
1. **SSO Configuration:** Provider settings, mappings, test connection
2. **API Clients:** List, create, revoke, regenerate keys
3. **Webhooks:** List, create, edit, view activity
4. **Event Settings:** Toggle which events trigger integrations

**Acceptance Criteria:**
- Page accessible only to org admins
- All settings scoped to current organisation
- Changes take effect immediately (no restart required)

---

#### BR-ADMIN-02: SSO Test Connection
**Priority:** Should Have
**Capability ID:** C-291

Admins shall be able to test SSO configuration before enabling.

**Test Function:**
- Fetches OIDC discovery document
- Validates client ID/secret against token endpoint
- Reports success or specific error

**Acceptance Criteria:**
- Test does not create/modify user data
- Clear success/failure message displayed
- Helps troubleshoot misconfiguration

---

#### BR-ADMIN-03: API Key Display Security
**Priority:** Must Have
**Capability ID:** C-292

API keys shall be displayed securely with single-view policy.

**Security Measures:**
- Full key shown only once at creation
- Subsequent views show masked key (last 4 chars)
- Regenerate key requires confirmation
- Copy-to-clipboard functionality

**Acceptance Criteria:**
- No way to retrieve full key after initial display
- Masked display clearly indicates partial key
- Regenerate warns about breaking existing integrations

---

### 3.5 Governance & Compliance (BR-GOV)

#### BR-GOV-01: Integration Audit Logging
**Priority:** Must Have
**Capability ID:** C-293

All integration-related events shall be logged for audit purposes.

**Logged Events:**
- SSO configuration created/updated/deleted
- SSO login attempts (success/failure)
- API client created/revoked/regenerated
- API requests (summary level: client, endpoint, status)
- Webhook created/updated/deleted
- Webhook delivery attempts

**Acceptance Criteria:**
- Logs retained per organisation retention policy
- Logs exportable for compliance
- Logs do not contain secrets or full API keys

---

#### BR-GOV-02: SSO Login Audit
**Priority:** Must Have
**Capability ID:** C-294

SSO login attempts shall be tracked separately from password logins.

**Tracked Data:**
- Timestamp
- User email
- IdP provider name
- Success/failure
- Failure reason (if applicable)
- IP address
- User agent

**Acceptance Criteria:**
- SSO logins visible in security audit log
- Failed SSO attempts highlighted
- Filter by authentication method

---

#### BR-GOV-03: Integration Configuration Export
**Priority:** Should Have
**Capability ID:** C-295

Admins shall be able to export integration configuration for audit.

**Export Contents:**
- SSO provider settings (without secrets)
- Role mappings
- API clients (without keys)
- Webhook endpoints (without secrets)
- Event type subscriptions

**Format:** JSON or YAML

**Acceptance Criteria:**
- Export excludes all secrets and keys
- Export includes configuration timestamps
- Suitable for compliance documentation

---

### 3.6 User Provisioning (BR-PROV)

#### BR-PROV-01: JIT User Creation
**Priority:** Must Have
**Capability ID:** C-296

Users shall be automatically created on first SSO login.

**Provisioning Fields:**
- Email from claim
- Name from given_name + family_name claims
- Role from group mapping or default
- Organisation from SSO configuration
- External ID from sub/oid claim

**Acceptance Criteria:**
- New user can access system immediately after creation
- User record includes `auth_provider: 'sso'` flag
- Notification sent to admin (optional)

---

#### BR-PROV-02: User Attribute Sync
**Priority:** Should Have
**Capability ID:** C-297

User attributes shall be updated from IdP claims on each login.

**Synced Attributes:**
- First name, last name
- Role (if group mappings changed)
- Email (if allowed and changed)

**Non-Synced:**
- Local preferences (theme, notifications)
- EHS-specific settings

**Acceptance Criteria:**
- Attribute changes visible immediately after login
- Role changes logged in audit trail
- Email change prevented if would cause duplicate

---

#### BR-PROV-03: User Deactivation Rules
**Priority:** Should Have
**Capability ID:** C-298

Admins shall be able to configure rules for user deactivation.

**Options:**
- Manual only (default)
- Deactivate after X days of no SSO login
- Deactivate if not in any mapped IdP group

**Acceptance Criteria:**
- Deactivated users cannot log in
- Deactivation is logged
- Admin can reactivate manually

---

### 3.7 Future SCIM Support (BR-SCIM)

#### BR-SCIM-01: SCIM Endpoint Preparation
**Priority:** Could Have (Placeholder)
**Capability ID:** C-299

The data model shall support future SCIM 2.0 implementation.

**Preparation:**
- `external_id` field on users for IdP matching
- User status field supports `active/suspended/deprovisioned`
- API structure compatible with SCIM resource types

**Acceptance Criteria:**
- No SCIM endpoints in Phase 10
- Data model ready for SCIM in future phase
- Design documented in architecture

---

## 4. Non-Functional Requirements

### 4.1 Security

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| NFR-SEC-01 | All SSO communications over HTTPS | HTTP redirects rejected |
| NFR-SEC-02 | Client secrets encrypted at rest | AES-256 encryption minimum |
| NFR-SEC-03 | API keys hashed (bcrypt/argon2) | Plain text never stored after creation |
| NFR-SEC-04 | Webhook secrets minimum 32 chars | Enforced at creation |
| NFR-SEC-05 | Rate limiting active by default | Cannot be disabled globally |
| NFR-SEC-06 | Token expiry enforced | OIDC tokens validated for expiry |

### 4.2 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | SSO login callback processing | < 2 seconds |
| NFR-PERF-02 | API response time (95th percentile) | < 500ms |
| NFR-PERF-03 | Webhook delivery latency | < 30 seconds from event |
| NFR-PERF-04 | API client validation | < 50ms overhead |

### 4.3 Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AVAIL-01 | SSO availability | Dependent on IdP; graceful fallback |
| NFR-AVAIL-02 | Public API availability | 99.5% uptime SLA |
| NFR-AVAIL-03 | Webhook delivery | At-least-once with retry |

### 4.4 Compliance

| ID | Requirement | Standard |
|----|-------------|----------|
| NFR-COMP-01 | OIDC implementation | OpenID Connect Core 1.0 |
| NFR-COMP-02 | API security | OWASP API Security Top 10 |
| NFR-COMP-03 | Audit trail retention | Configurable per org policy |

---

## 5. Success Criteria

### 5.1 SSO Success Criteria
- SSO configuration completed within 30 minutes by IT admin
- 95% of SSO login attempts succeed on first try
- Zero password-related support tickets for SSO-only orgs

### 5.2 API Success Criteria
- External system integration achieved within 1 day
- API documentation rated ≥4/5 by integration developers
- Zero security incidents from API access

### 5.3 Webhook Success Criteria
- 99% of webhooks delivered successfully within 5 minutes
- Teams notifications visible within 60 seconds
- Zero missed critical event notifications

---

## 6. Capability ID Summary

| C-ID | Capability | Priority |
|------|------------|----------|
| C-270 | OIDC Provider Configuration | Must Have |
| C-271 | SSO Login Flow | Must Have |
| C-272 | User Matching and JIT Provisioning | Must Have |
| C-273 | IdP Group-to-Role Mapping | Must Have |
| C-274 | SSO-Only Mode | Should Have |
| C-275 | SSO Error Handling | Must Have |
| C-276 | API Client Registration | Must Have |
| C-277 | API Scopes | Must Have |
| C-278 | API Key Authentication | Must Have |
| C-279 | API Rate Limiting | Should Have |
| C-280 | IP Allowlisting | Should Have |
| C-281 | Public API Endpoints | Must Have |
| C-282 | API Key Management | Must Have |
| C-283 | Webhook Registration | Must Have |
| C-284 | Webhook Event Types | Must Have |
| C-285 | Webhook Payload Format | Must Have |
| C-286 | Webhook Signature Verification | Must Have |
| C-287 | Webhook Delivery & Retry | Must Have |
| C-288 | Webhook Activity Log | Should Have |
| C-289 | Microsoft Teams Integration | Should Have |
| C-290 | Integrations Settings Page | Must Have |
| C-291 | SSO Test Connection | Should Have |
| C-292 | API Key Display Security | Must Have |
| C-293 | Integration Audit Logging | Must Have |
| C-294 | SSO Login Audit | Must Have |
| C-295 | Integration Configuration Export | Should Have |
| C-296 | JIT User Creation | Must Have |
| C-297 | User Attribute Sync | Should Have |
| C-298 | User Deactivation Rules | Should Have |
| C-299 | SCIM Endpoint Preparation | Could Have |

---

## 7. Dependencies

### 7.1 Phase Dependencies
- Phase 1: Authentication framework (JWT)
- Phase 2: Actions (for API exposure)
- Phase 3: Multi-organisation (org scoping)
- Phase 4: Notifications (event infrastructure)
- Phase 6: Security audit log (extension)
- Phase 9: Risk register (for API exposure)

### 7.2 External Dependencies
- Microsoft Entra ID tenant (for testing)
- SMTP server (for email notifications)
- Internet connectivity (for IdP and webhook targets)

---

## 8. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| IdP configuration complexity | High | Medium | Provide step-by-step guides, test connection feature |
| Webhook endpoint unavailability | Medium | Medium | Robust retry mechanism, failure notifications |
| API abuse/security breach | High | Low | Rate limiting, IP allowlist, comprehensive logging |
| Token theft/replay | High | Low | Short token expiry, nonce validation |
| Breaking changes to public API | High | Low | Versioned endpoints, deprecation policy |

---

## 9. Glossary

| Term | Definition |
|------|------------|
| OIDC | OpenID Connect - authentication protocol built on OAuth 2.0 |
| IdP | Identity Provider - system that manages user identities (e.g., Azure AD) |
| JIT Provisioning | Just-In-Time provisioning - creating user accounts at first login |
| SCIM | System for Cross-domain Identity Management - provisioning protocol |
| Webhook | HTTP callback for event notification |
| API Key | Secret credential for API authentication |
| Scope | Permission boundary for API access |
| HMAC | Hash-based Message Authentication Code |

---

*End of Document*

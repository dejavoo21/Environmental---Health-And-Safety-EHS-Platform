# Implementation Plan – EHS Portal Phase 10
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

This document outlines the implementation plan for Phase 10 across six stages. Each stage builds incrementally with testable deliverables.

### 1.1 Timeline Summary

| Stage | Focus | Duration | Dependencies |
|-------|-------|----------|--------------|
| P10.1 | Database & Foundation | 3 days | Phase 1-9 complete |
| P10.2 | SSO/OIDC Implementation | 4 days | P10.1 |
| P10.3 | API Client & Public API | 4 days | P10.1 |
| P10.4 | Webhooks & Events | 3 days | P10.1, P10.3 |
| P10.5 | Admin UI & Integration | 4 days | P10.2, P10.3, P10.4 |
| P10.6 | Testing & Documentation | 3 days | P10.5 |

**Total Estimated Duration:** 21 days (3 weeks)

---

## 2. Stage P10.1 – Database & Foundation

### 2.1 Objectives

- Create Phase 10 database schema
- Implement encryption utilities for secrets
- Set up foundational services

### 2.2 Tasks

| # | Task | Details | Est. |
|---|------|---------|------|
| 1.1 | Create migration file | `010_phase10_integrations.sql` with all tables and enums | 4h |
| 1.2 | Run migration | Apply migration to development database | 1h |
| 1.3 | Create encryption utility | `src/utils/encryption.js` - AES-256-GCM for secrets | 3h |
| 1.4 | Update user model | Add SSO fields (external_id, auth_provider, sso_provider_id) | 2h |
| 1.5 | Create base models | SSO provider, API client, webhook models | 4h |
| 1.6 | Add environment variables | INTEGRATION_ENCRYPTION_KEY, SSO_CALLBACK_BASE_URL | 1h |
| 1.7 | Write migration tests | Verify schema creation, rollback capability | 2h |

### 2.3 Deliverables

- Migration file applied
- Encryption utility with tests
- Base Sequelize/Knex models
- Updated environment configuration

### 2.4 Acceptance Criteria

- [ ] All tables created with correct constraints
- [ ] Encryption utility encrypts and decrypts correctly
- [ ] User model includes new SSO fields
- [ ] Migration can be rolled back cleanly

---

## 3. Stage P10.2 – SSO/OIDC Implementation

### 3.1 Objectives

- Implement OIDC authentication flow
- Build JIT user provisioning
- Create role mapping logic

### 3.2 Tasks

| # | Task | Details | Est. |
|---|------|---------|------|
| 2.1 | Install OIDC dependencies | openid-client, jose packages | 1h |
| 2.2 | Create OIDC client wrapper | `src/utils/oidcClient.js` - discovery, token exchange | 4h |
| 2.3 | Implement SSO service | `src/services/ssoService.js` - provider CRUD, login logic | 6h |
| 2.4 | Create SSO routes | `src/routes/ssoRoutes.js` - /auth/sso/init, /auth/sso/callback | 4h |
| 2.5 | Implement JIT provisioning | Create user from claims, set external_id | 3h |
| 2.6 | Implement role mapping | Match groups to roles, priority evaluation | 3h |
| 2.7 | Create SSO admin routes | `src/routes/integrationRoutes.js` - SSO config endpoints | 3h |
| 2.8 | Add SSO login audit | Log attempts to sso_login_attempts table | 2h |
| 2.9 | Implement test connection | Validate IdP connectivity | 2h |
| 2.10 | Write SSO unit tests | OIDC flow, claim extraction, role mapping | 4h |

### 3.3 Deliverables

- Working OIDC authentication flow
- JIT user provisioning
- Role mapping with priority
- SSO configuration API endpoints
- Audit logging for SSO attempts

### 3.4 Acceptance Criteria

- [ ] User can initiate SSO login and be redirected to IdP
- [ ] Callback correctly exchanges code for tokens
- [ ] ID token is validated with JWKS
- [ ] New users are created via JIT when enabled
- [ ] Role is correctly assigned from group mappings
- [ ] SSO login attempt is logged (success and failure)
- [ ] Admin can test IdP connection

---

## 4. Stage P10.3 – API Client & Public API

### 4.1 Objectives

- Implement API client management
- Create public API with authentication
- Add rate limiting and scope checking

### 4.2 Tasks

| # | Task | Details | Est. |
|---|------|---------|------|
| 3.1 | Create API client service | `src/services/apiClientService.js` - CRUD, key generation | 4h |
| 3.2 | Implement API key auth middleware | `src/middleware/apiKeyAuth.js` - validate, load client | 3h |
| 3.3 | Implement rate limiter | `src/middleware/apiRateLimiter.js` - sliding window | 4h |
| 3.4 | Implement scope checker | `src/middleware/apiScopeCheck.js` - validate scopes | 2h |
| 3.5 | Implement IP allowlist | `src/middleware/apiIpAllowlist.js` - CIDR matching | 2h |
| 3.6 | Create API client admin routes | Create, list, revoke, regenerate endpoints | 3h |
| 3.7 | Create public incidents API | GET/POST /api/public/v1/incidents | 4h |
| 3.8 | Create public actions API | GET/POST /api/public/v1/actions | 3h |
| 3.9 | Create public risks API | GET /api/public/v1/risks | 2h |
| 3.10 | Create public training API | GET /api/public/v1/training/status | 2h |
| 3.11 | Create public users API | GET /api/public/v1/users (limited fields) | 2h |
| 3.12 | Write API client tests | Authentication, rate limiting, scope checks | 4h |

### 4.3 Deliverables

- API client management with key generation
- Public API endpoints with proper authentication
- Rate limiting with tier support
- Scope-based authorization
- IP allowlist filtering

### 4.4 Acceptance Criteria

- [ ] Admin can create API client and receive key (shown once)
- [ ] API key authenticates requests correctly
- [ ] Invalid/revoked keys are rejected with 401
- [ ] Rate limiting enforces limits with proper headers
- [ ] Scope check rejects insufficient permissions
- [ ] IP allowlist blocks non-allowed IPs
- [ ] Public API returns organisation-scoped data

---

## 5. Stage P10.4 – Webhooks & Events

### 5.1 Objectives

- Implement webhook configuration and delivery
- Build event routing system
- Add retry logic and signature verification

### 5.2 Tasks

| # | Task | Details | Est. |
|---|------|---------|------|
| 4.1 | Create webhook service | `src/services/webhookService.js` - CRUD operations | 3h |
| 4.2 | Create integration event service | `src/services/integrationEventService.js` - emit, route | 4h |
| 4.3 | Implement signature generation | `src/utils/signatureUtils.js` - HMAC-SHA256 | 2h |
| 4.4 | Create webhook dispatcher | `src/services/webhookDispatcher.js` - delivery job | 4h |
| 4.5 | Implement retry logic | Exponential backoff, max attempts | 2h |
| 4.6 | Add Teams card formatting | Detect Teams URL, format adaptive card | 3h |
| 4.7 | Create webhook admin routes | Create, list, edit, delete, test, retry | 3h |
| 4.8 | Integrate events in services | Emit events from incident, action, risk services | 3h |
| 4.9 | Write webhook tests | Delivery, retry, signature verification | 3h |

### 5.3 Deliverables

- Webhook CRUD operations
- Event emission and routing
- Reliable delivery with retry
- HMAC signature for verification
- Teams adaptive card support
- Activity log for deliveries

### 5.4 Acceptance Criteria

- [ ] Admin can create webhook with event subscriptions
- [ ] Events are emitted when entities are created/updated
- [ ] Webhooks receive correctly signed payloads
- [ ] Failed deliveries are retried with backoff
- [ ] Webhook is auto-disabled after consecutive failures
- [ ] Teams webhooks receive adaptive cards
- [ ] Admin can view delivery activity and retry manually

---

## 6. Stage P10.5 – Admin UI & Integration

### 6.1 Objectives

- Build frontend Integrations page
- Integrate all backend features
- End-to-end testing

### 6.2 Tasks

| # | Task | Details | Est. |
|---|------|---------|------|
| 5.1 | Add Integrations navigation | Sidebar menu item, route | 2h |
| 5.2 | Create Integrations page layout | Tab structure, shared styles | 2h |
| 5.3 | Build SSO tab | Config wizard, status display, mappings | 6h |
| 5.4 | Build API Clients tab | List, create, details, regenerate | 6h |
| 5.5 | Build Webhooks tab | List, create, activity, retry | 5h |
| 5.6 | Build Activity Log tab | Timeline feed, filters | 3h |
| 5.7 | Update Login page | SSO button, SSO-only mode | 3h |
| 5.8 | Create shared components | SecretField, ScopeSelector, StatusBadge | 3h |
| 5.9 | Implement API service | Frontend API calls for integrations | 3h |
| 5.10 | End-to-end integration testing | Full flow testing across all features | 4h |

### 6.3 Deliverables

- Complete Integrations admin page
- SSO configuration wizard
- API client management UI
- Webhook management UI
- Activity log display
- Updated login page with SSO

### 6.4 Acceptance Criteria

- [ ] Admin can access Integrations page from sidebar
- [ ] SSO configuration wizard guides through setup
- [ ] API key is displayed once and can be copied
- [ ] Webhook activity shows delivery status
- [ ] SSO button appears on login when configured
- [ ] SSO-only mode hides password form
- [ ] All error states display clear messages

---

## 7. Stage P10.6 – Testing & Documentation

### 7.1 Objectives

- Complete test coverage
- Write user documentation
- Performance testing
- Security review

### 7.2 Tasks

| # | Task | Details | Est. |
|---|------|---------|------|
| 6.1 | Complete unit test coverage | All new services and utilities | 4h |
| 6.2 | Integration tests | API flows, SSO simulation | 4h |
| 6.3 | Security testing | Secret handling, token validation | 3h |
| 6.4 | Performance testing | Rate limiting, webhook throughput | 2h |
| 6.5 | Write API documentation | OpenAPI spec for public API | 3h |
| 6.6 | Write admin guide | SSO setup, API client usage | 2h |
| 6.7 | Write integration guide | Webhook payload formats, signature verification | 2h |
| 6.8 | Final review and fixes | Address any issues found | 4h |

### 7.3 Deliverables

- Test coverage report (≥80%)
- Security review checklist
- OpenAPI specification
- Admin documentation
- Integration guide

### 7.4 Acceptance Criteria

- [ ] Unit test coverage ≥80% for new code
- [ ] All integration tests passing
- [ ] No high/critical security issues
- [ ] Rate limiting handles expected load
- [ ] OpenAPI spec validates
- [ ] Documentation reviewed and accurate

---

## 8. Technical Dependencies

### 8.1 npm Packages

| Package | Version | Purpose |
|---------|---------|---------|
| openid-client | ^5.x | OIDC client operations |
| jose | ^4.x | JWT validation, JWKS |
| bcrypt | ^5.x | API key hashing |
| node-cron | ^3.x | Webhook dispatcher job |
| ioredis | ^5.x | Rate limiting storage (optional) |

### 8.2 Environment Variables

```bash
# Phase 10 Configuration
INTEGRATION_ENCRYPTION_KEY=<32-byte-hex-key>
SSO_CALLBACK_BASE_URL=https://ehs.example.com
REDIS_URL=redis://localhost:6379
RATE_LIMIT_ENABLED=true
WEBHOOK_DISPATCHER_ENABLED=true
WEBHOOK_DISPATCHER_INTERVAL=5000
WEBHOOK_TIMEOUT=30000
PUBLIC_API_ENABLED=true
```

### 8.3 External Dependencies

- Azure AD tenant for testing (Microsoft Entra ID)
- Redis for rate limiting (optional, can use in-memory)
- External webhook endpoint for testing

---

## 9. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| OIDC integration complexity | High | Use well-tested library, extensive testing |
| Secret exposure | Critical | Never log secrets, encrypt at rest |
| Webhook delivery failures | Medium | Robust retry, admin notifications |
| Rate limiting bypass | Medium | Thorough testing, IP-based backup |
| SSO provider downtime | Medium | Graceful fallback, clear error messages |

---

## 10. Rollback Plan

### 10.1 Database Rollback

```sql
-- Rollback migration
DROP TABLE IF EXISTS webhook_events;
DROP TABLE IF EXISTS integration_events;
DROP TABLE IF EXISTS webhooks;
DROP TABLE IF EXISTS api_clients;
DROP TABLE IF EXISTS sso_login_attempts;
DROP TABLE IF EXISTS sso_mappings;
DROP TABLE IF EXISTS sso_providers;

DROP TYPE IF EXISTS integration_event_type;
DROP TYPE IF EXISTS webhook_event_status;
DROP TYPE IF EXISTS rate_limit_tier;
DROP TYPE IF EXISTS api_scope;
DROP TYPE IF EXISTS api_client_status;
DROP TYPE IF EXISTS sso_type;

ALTER TABLE users DROP COLUMN IF EXISTS external_id;
ALTER TABLE users DROP COLUMN IF EXISTS auth_provider;
ALTER TABLE users DROP COLUMN IF EXISTS sso_provider_id;
ALTER TABLE users DROP COLUMN IF EXISTS last_sso_login_at;
ALTER TABLE users DROP COLUMN IF EXISTS sso_attributes;
```

### 10.2 Feature Flags

```javascript
// Environment-based feature flags
const features = {
    ssoEnabled: process.env.SSO_ENABLED === 'true',
    publicApiEnabled: process.env.PUBLIC_API_ENABLED === 'true',
    webhooksEnabled: process.env.WEBHOOKS_ENABLED === 'true'
};
```

---

## 11. Definition of Done

Phase 10 is complete when:

- [ ] All migrations applied successfully
- [ ] SSO login works with Azure AD (or mock IdP)
- [ ] API clients can authenticate and access public API
- [ ] Webhooks deliver events with retry capability
- [ ] Admin UI allows full configuration
- [ ] All tests pass with ≥80% coverage
- [ ] Documentation complete
- [ ] Security review completed
- [ ] Performance metrics meet targets
- [ ] UAT sign-off received

---

## 12. Post-Implementation

### 12.1 Monitoring Setup

- Add metrics for SSO login success/failure
- Add metrics for API request count by client
- Add metrics for webhook delivery success/failure
- Alert on high SSO failure rates
- Alert on webhook backlog growth

### 12.2 Future Enhancements

- SAML 2.0 support
- Full SCIM 2.0 implementation
- OAuth 2.0 client credentials flow
- GraphQL API
- Message queue integration

---

*End of Document*

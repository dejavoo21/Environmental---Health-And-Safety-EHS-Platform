# Architecture – EHS Portal Phase 10
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

Phase 10 extends the EHS Portal architecture with enterprise integration capabilities. This document describes the technical architecture for SSO/OIDC integration, public API exposure, and outbound webhook delivery.

### 1.1 Architecture Principles

| Principle | Application in Phase 10 |
|-----------|------------------------|
| Security First | All external communications encrypted; secrets encrypted at rest |
| Loose Coupling | Event-driven webhook delivery; async processing |
| Graceful Degradation | IdP unavailability doesn't block local auth; webhook failures don't affect core operations |
| Observability | All integration events logged; delivery tracking for webhooks |
| Multi-tenancy | All integration configs scoped to organisation |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SYSTEMS                                       │
├───────────────────┬───────────────────┬───────────────────┬─────────────────────┤
│   Identity        │   Integration     │   Notification    │   Analytics         │
│   Providers       │   Partners        │   Channels        │   Systems           │
│                   │                   │                   │                     │
│ ┌─────────────┐   │ ┌─────────────┐   │ ┌─────────────┐   │ ┌─────────────┐     │
│ │ Azure AD    │   │ │ ServiceNow  │   │ │ MS Teams    │   │ │ Power BI    │     │
│ │ (Entra ID)  │   │ │ Jira        │   │ │ Slack       │   │ │ SIEM        │     │
│ │ Okta        │   │ │ Custom Apps │   │ │ Email       │   │ │ Data Lake   │     │
│ └─────────────┘   │ └─────────────┘   │ └─────────────┘   │ └─────────────┘     │
│        │          │        ▲          │        ▲          │        ▲            │
└────────┼──────────┴────────┼──────────┴────────┼──────────┴────────┼────────────┘
         │ OIDC              │ Public API        │ Webhooks          │ Public API
         │                   │                   │                   │
┌────────┼───────────────────┼───────────────────┼───────────────────┼────────────┐
│        ▼                   │                   │                   │            │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                           INTEGRATION LAYER                                  │ │
│ ├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤ │
│ │  SSO Gateway    │  API Gateway    │  Event Router   │  Webhook Dispatcher  │ │
│ │                 │                 │                 │                       │ │
│ │ • OIDC Client   │ • API Key Auth  │ • Event Queue   │ • Retry Logic        │ │
│ │ • Token Valid.  │ • Rate Limiting │ • Subscription  │ • Signature Gen.     │ │
│ │ • Claim Mapping │ • Scope Check   │ • Filtering     │ • Delivery Tracking  │ │
│ │ • JIT Provision │ • IP Allowlist  │ • Fanout        │ • Failure Handling   │ │
│ └─────────────────┴─────────────────┴─────────────────┴───────────────────────┘ │
│                                      │                                          │
│ ┌────────────────────────────────────▼──────────────────────────────────────┐   │
│ │                        EXISTING EHS APPLICATION                            │   │
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│ │  │ Incidents│  │ Actions  │  │  Risks   │  │ Training │  │  Users   │    │   │
│ │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│ └───────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│ ┌────────────────────────────────────▼──────────────────────────────────────┐   │
│ │                            PostgreSQL Database                             │   │
│ │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │   │
│ │  │sso_providers│ │ api_clients │ │  webhooks   │ │ integration_events  │  │   │
│ │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘  │   │
│ └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│                            EHS PORTAL BACKEND                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

### 3.1 SSO Gateway

The SSO Gateway handles OpenID Connect authentication flows.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SSO GATEWAY                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐              │
│  │  OIDC Client   │────▶│ Token Validator│────▶│ Claims Mapper  │              │
│  │                │     │                │     │                │              │
│  │ • Auth URL Gen │     │ • JWT Verify   │     │ • Email Extract│              │
│  │ • Code Exchange│     │ • Expiry Check │     │ • Name Extract │              │
│  │ • Token Fetch  │     │ • Issuer Valid │     │ • Group Extract│              │
│  └────────────────┘     └────────────────┘     └───────┬────────┘              │
│                                                         │                        │
│  ┌────────────────┐     ┌────────────────┐             │                        │
│  │  User Matcher  │◀────┤ Role Resolver  │◀────────────┘                        │
│  │                │     │                │                                       │
│  │ • Email Match  │     │ • Group Lookup │                                       │
│  │ • ExtID Match  │     │ • Priority Eval│                                       │
│  │ • JIT Create   │     │ • Default Role │                                       │
│  └───────┬────────┘     └────────────────┘                                       │
│          │                                                                        │
│          ▼                                                                        │
│  ┌────────────────┐                                                              │
│  │Session Creator │ ────▶ EHS JWT Token + Redirect to Dashboard                  │
│  └────────────────┘                                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Key Components:**

| Component | Responsibility |
|-----------|---------------|
| OIDC Client | Implements Authorization Code flow, token exchange |
| Token Validator | Validates ID tokens using IdP JWKS |
| Claims Mapper | Extracts user attributes from ID token claims |
| Role Resolver | Maps IdP groups to EHS roles via sso_mappings |
| User Matcher | Finds or creates user based on claims |
| Session Creator | Issues EHS JWT and redirects |

**Technology:**
- `openid-client` npm package for OIDC operations
- `jose` for JWT validation
- Encryption: AES-256-GCM for client secrets

---

### 3.2 API Gateway

The API Gateway manages external API access with authentication, authorization, and rate limiting.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                          Request Pipeline                                  │   │
│  │                                                                            │   │
│  │  Request ──▶ [IP Filter] ──▶ [Auth] ──▶ [Rate Limit] ──▶ [Scope] ──▶ Route│   │
│  │                  │              │            │             │               │   │
│  │                  ▼              ▼            ▼             ▼               │   │
│  │              403 Deny      401 Unauth   429 Limited    403 Forbidden       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────────┐              │
│  │ IP Allowlist   │     │  API Key Auth  │     │  Rate Limiter  │              │
│  │   Middleware   │     │   Middleware   │     │   Middleware   │              │
│  │                │     │                │     │                │              │
│  │ • CIDR Match   │     │ • Header Parse │     │ • Token Bucket │              │
│  │ • IPv4/IPv6    │     │ • Hash Compare │     │ • Sliding Win. │              │
│  │ • Bypass List  │     │ • Client Lookup│     │ • Tier Limits  │              │
│  └────────────────┘     └────────────────┘     └────────────────┘              │
│                                                                                  │
│  ┌────────────────┐     ┌────────────────┐                                      │
│  │ Scope Checker  │     │ Usage Tracker  │                                      │
│  │   Middleware   │     │                │                                      │
│  │                │     │ • Request Count│                                      │
│  │ • Scope Parse  │     │ • Last Used    │                                      │
│  │ • Endpoint Map │     │ • Async Update │                                      │
│  │ • Write Check  │     │                │                                      │
│  └────────────────┘     └────────────────┘                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Middleware Stack:**

| Order | Middleware | Action |
|-------|------------|--------|
| 1 | IP Allowlist | Check source IP against client's allowlist |
| 2 | API Key Auth | Validate X-API-Key header, load client |
| 3 | Rate Limiter | Check and update rate limit counters |
| 4 | Scope Check | Verify client has required scope for endpoint |
| 5 | Org Context | Set organisation context from client |

**Rate Limiting Strategy:**
- Algorithm: Token bucket with sliding window
- Storage: Redis (or in-memory for development)
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

### 3.3 Event Router

The Event Router captures application events and routes them to appropriate handlers.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EVENT ROUTER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        Event Sources (Existing Services)                   │   │
│  │                                                                            │   │
│  │  IncidentService  ActionService  RiskService  TrainingService  UserService │   │
│  │        │               │             │             │              │         │   │
│  │        └───────────────┴─────────────┴─────────────┴──────────────┘         │   │
│  │                                      │                                       │   │
│  │                                      ▼                                       │   │
│  │                            EventEmitter.emit()                               │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                        │
│                                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        Integration Event Handler                           │   │
│  │                                                                            │   │
│  │  1. Create integration_events record                                       │   │
│  │  2. Find matching webhooks (by org + event type + enabled)                 │   │
│  │  3. For each webhook: Create webhook_events record                         │   │
│  │  4. Queue for delivery                                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                        │
│                                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                           Webhook Dispatcher                               │   │
│  │                                                                            │   │
│  │                      (Processes pending deliveries)                        │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Event Emission Pattern:**

```javascript
// In existing service (e.g., incidentService.js)
const { integrationEvents } = require('./integrationEventService');

async function createIncident(data, userId) {
    const incident = await Incident.create(data);
    
    // Emit integration event
    await integrationEvents.emit({
        type: 'incident.created',
        organisationId: data.organisation_id,
        entityType: 'incident',
        entityId: incident.id,
        payload: incident,
        userId
    });
    
    return incident;
}
```

---

### 3.4 Webhook Dispatcher

The Webhook Dispatcher handles reliable delivery of webhooks with retry logic.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WEBHOOK DISPATCHER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         Dispatch Queue                                     │   │
│  │                                                                            │   │
│  │  Poll interval: 5 seconds                                                  │   │
│  │  Query: webhook_events WHERE status IN ('pending','retrying')              │   │
│  │         AND (next_retry_at IS NULL OR next_retry_at <= NOW())              │   │
│  └────────────────────────────────────────────────────────────┬─────────────┘   │
│                                                                │                 │
│                                                                ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        Delivery Pipeline                                   │   │
│  │                                                                            │   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │   │
│  │   │ Payload     │───▶│  Signature  │───▶│   HTTP      │                   │   │
│  │   │ Builder     │    │  Generator  │    │   Client    │                   │   │
│  │   └─────────────┘    └─────────────┘    └──────┬──────┘                   │   │
│  │                                                 │                          │   │
│  │                           ┌─────────────────────┴──────────────────┐       │   │
│  │                           ▼                                        ▼       │   │
│  │                    ┌─────────────┐                          ┌─────────────┐│   │
│  │                    │  Success    │                          │   Failure   ││   │
│  │                    │  Handler    │                          │   Handler   ││   │
│  │                    │             │                          │             ││   │
│  │                    │ status =    │                          │ attempt++   ││   │
│  │                    │ 'delivered' │                          │ schedule    ││   │
│  │                    │             │                          │ retry       ││   │
│  │                    └─────────────┘                          └─────────────┘│   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Retry Schedule:**

| Attempt | Delay | Cumulative |
|---------|-------|------------|
| 1 | Immediate | 0 |
| 2 | 1 minute | 1 min |
| 3 | 5 minutes | 6 min |
| 4 | 30 minutes | 36 min |
| 5 | 2 hours | 2h 36min |
| FINAL | Mark failed | - |

**Signature Generation:**

```javascript
const crypto = require('crypto');

function generateSignature(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${body}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signaturePayload)
        .digest('hex');
    
    return {
        'X-EHS-Timestamp': timestamp.toString(),
        'X-EHS-Signature': `sha256=${signature}`
    };
}
```

---

## 4. Authentication Flow

### 4.1 SSO Login Sequence

```
┌────────┐     ┌────────┐     ┌────────┐     ┌─────────┐     ┌────────┐
│ Browser│     │Frontend│     │Backend │     │   IdP   │     │Database│
└───┬────┘     └───┬────┘     └───┬────┘     └────┬────┘     └───┬────┘
    │              │              │               │              │
    │ Click SSO    │              │               │              │
    │─────────────▶│              │               │              │
    │              │              │               │              │
    │              │ GET /auth/sso/init?org=X     │              │
    │              │─────────────▶│               │              │
    │              │              │               │              │
    │              │              │ Lookup SSO config            │
    │              │              │──────────────────────────────▶│
    │              │              │◀──────────────────────────────│
    │              │              │               │              │
    │              │◀─ Redirect to IdP auth URL   │              │
    │◀─────────────│              │               │              │
    │              │              │               │              │
    │ Follow redirect to IdP      │               │              │
    │────────────────────────────────────────────▶│              │
    │              │              │               │              │
    │◀──────────── Login page ────────────────────│              │
    │              │              │               │              │
    │ Enter credentials           │               │              │
    │────────────────────────────────────────────▶│              │
    │              │              │               │              │
    │◀─── Redirect to callback with code ─────────│              │
    │              │              │               │              │
    │ GET /auth/sso/callback?code=XYZ             │              │
    │─────────────────────────────▶               │              │
    │              │              │               │              │
    │              │              │ POST token endpoint           │
    │              │              │──────────────▶│              │
    │              │              │◀── tokens ────│              │
    │              │              │               │              │
    │              │              │ Validate ID token             │
    │              │              │──────────────▶│ (JWKS)       │
    │              │              │◀──────────────│              │
    │              │              │               │              │
    │              │              │ Extract claims, map role      │
    │              │              │──────────────────────────────▶│
    │              │              │               │              │
    │              │              │ Find/Create user              │
    │              │              │──────────────────────────────▶│
    │              │              │◀──────────────────────────────│
    │              │              │               │              │
    │              │              │ Create EHS JWT│              │
    │              │              │               │              │
    │◀─── Redirect to / with JWT cookie ──────────│              │
    │              │              │               │              │
    │ Load Dashboard              │               │              │
    │─────────────▶│              │               │              │
    │              │              │               │              │
```

### 4.2 API Key Authentication Sequence

```
┌────────┐          ┌────────┐          ┌────────┐
│External│          │Backend │          │Database│
│ System │          │   API  │          │        │
└───┬────┘          └───┬────┘          └───┬────┘
    │                   │                   │
    │ GET /api/public/v1/incidents          │
    │ X-API-Key: ehs_live_xxxx              │
    │──────────────────▶│                   │
    │                   │                   │
    │                   │ Extract prefix from key
    │                   │ (first 8 chars)   │
    │                   │                   │
    │                   │ SELECT * FROM api_clients
    │                   │ WHERE api_key_prefix = prefix
    │                   │──────────────────▶│
    │                   │◀──────────────────│
    │                   │                   │
    │                   │ bcrypt.compare(key, hash)
    │                   │                   │
    │                   │ Check: status = 'active'
    │                   │ Check: IP in allowlist
    │                   │ Check: scope includes 'read:incidents'
    │                   │ Check: rate limit   │
    │                   │                   │
    │                   │ UPDATE last_used_at, request_count
    │                   │──────────────────▶│
    │                   │                   │
    │                   │ Execute query with org filter
    │                   │──────────────────▶│
    │                   │◀──────────────────│
    │                   │                   │
    │◀── 200 OK + JSON ─│                   │
    │                   │                   │
```

---

## 5. Service Architecture

### 5.1 New Service Components

```
src/
├── services/
│   ├── ssoService.js              # SSO/OIDC operations
│   ├── apiClientService.js        # API client management
│   ├── webhookService.js          # Webhook CRUD operations
│   ├── integrationEventService.js # Event emission & routing
│   └── webhookDispatcher.js       # Background delivery job
├── middleware/
│   ├── apiKeyAuth.js              # API key authentication
│   ├── apiRateLimiter.js          # Rate limiting
│   ├── apiScopeCheck.js           # Scope authorization
│   └── apiIpAllowlist.js          # IP filtering
├── routes/
│   ├── ssoRoutes.js               # /auth/sso/* routes
│   ├── integrationRoutes.js       # /api/integrations/* routes
│   └── publicApiRoutes.js         # /api/public/v1/* routes
└── utils/
    ├── encryption.js              # Secret encryption utilities
    ├── signatureUtils.js          # Webhook signature generation
    └── oidcClient.js              # OIDC client wrapper
```

### 5.2 Service Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                           Integration Services                               ││
│  │                                                                              ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             ││
│  │  │   SSOService    │  │ApiClientService │  │ WebhookService  │             ││
│  │  │                 │  │                 │  │                 │             ││
│  │  │ • getProvider() │  │ • create()      │  │ • create()      │             ││
│  │  │ • saveProvider()│  │ • regenerate()  │  │ • update()      │             ││
│  │  │ • testConnect() │  │ • revoke()      │  │ • delete()      │             ││
│  │  │ • login()       │  │ • validate()    │  │ • getActivity() │             ││
│  │  │ • mapRole()     │  │ • getUsage()    │  │ • manualRetry() │             ││
│  │  │ • jitProvision()│  │                 │  │                 │             ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘             ││
│  │                                                                              ││
│  │  ┌─────────────────────────────────────┐  ┌─────────────────────────────────┐│
│  │  │   IntegrationEventService          │  │    WebhookDispatcher           │││
│  │  │                                     │  │                                │││
│  │  │ • emit(event)                       │  │ • start() / stop()             │││
│  │  │ • getEventsForWebhook()             │  │ • processQueue()               │││
│  │  │ • markProcessed()                   │  │ • deliverWebhook()             │││
│  │  │                                     │  │ • scheduleRetry()              │││
│  │  └─────────────────────────────────────┘  └─────────────────────────────────┘│
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                         Existing Services (Modified)                         ││
│  │                                                                              ││
│  │  IncidentService ──────┐                                                     ││
│  │  ActionService ────────┤  ──▶  emit integration events after mutations       ││
│  │  RiskService ──────────┤                                                     ││
│  │  TrainingService ──────┘                                                     ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Architecture

### 6.1 Secret Management

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SECRET MANAGEMENT                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                         Secret Types                                         ││
│  ├─────────────────┬──────────────────────┬────────────────────────────────────┤│
│  │ Secret          │ Storage Method       │ Retrieval                          ││
│  ├─────────────────┼──────────────────────┼────────────────────────────────────┤│
│  │ SSO Client      │ AES-256-GCM          │ Decrypt with app key at runtime    ││
│  │ Secret          │ encrypted in DB      │                                    ││
│  ├─────────────────┼──────────────────────┼────────────────────────────────────┤│
│  │ API Key         │ bcrypt hash          │ Compare hash on each request       ││
│  │                 │ (60 chars)           │                                    ││
│  ├─────────────────┼──────────────────────┼────────────────────────────────────┤│
│  │ Webhook Secret  │ Plain text           │ Used for HMAC signature            ││
│  │                 │ (min 32 chars)       │                                    ││
│  ├─────────────────┼──────────────────────┼────────────────────────────────────┤│
│  │ App Encryption  │ Environment variable │ INTEGRATION_ENCRYPTION_KEY         ││
│  │ Key             │ (never in DB)        │                                    ││
│  └─────────────────┴──────────────────────┴────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Token Flow Security

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          TOKEN SECURITY CONTROLS                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  OIDC Tokens:                                                                    │
│  ├─ ID Token: Validated signature (RSA/ES256 via JWKS)                          │
│  ├─ Nonce: Generated per auth, validated on return                              │
│  ├─ State: CSRF protection for auth flow                                        │
│  └─ Expiry: Checked before processing claims                                    │
│                                                                                  │
│  EHS JWT (issued after SSO):                                                     │
│  ├─ Same format as password-auth JWT                                            │
│  ├─ Includes: userId, role, organisationId, authMethod:'sso'                    │
│  ├─ Expiry: 8 hours (configurable)                                              │
│  └─ Refresh: Via existing refresh mechanism                                     │
│                                                                                  │
│  API Keys:                                                                       │
│  ├─ Format: ehs_live_[32 random chars] (42 chars total)                        │
│  ├─ Prefix: Used for lookup (avoids full-table bcrypt compare)                  │
│  ├─ Hash: bcrypt with cost 10                                                   │
│  └─ Rotation: Regenerate creates new key, invalidates old                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Rate Limiting Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          RATE LIMITING                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Algorithm: Sliding Window Counter                                               │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │  Window: 60 seconds                                                      │   │
│  │                                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │   │
│  │  │  Current Window         │    Previous Window                        │ │   │
│  │  │  (40 seconds elapsed)   │    (60 seconds)                           │ │   │
│  │  │                         │                                           │ │   │
│  │  │  Requests: 300          │    Requests: 600                          │ │   │
│  │  └─────────────────────────┴───────────────────────────────────────────┘ │   │
│  │                                                                          │   │
│  │  Weighted count = 300 + (600 × (60-40)/60) = 300 + 200 = 500            │   │
│  │  Limit (standard): 1000                                                  │   │
│  │  Remaining: 500                                                          │   │
│  │                                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Tiers:                                                                          │
│  ├─ Standard: 1,000 requests/minute                                             │
│  ├─ Premium:  5,000 requests/minute                                             │
│  └─ Unlimited: No limit (internal/testing only)                                 │
│                                                                                  │
│  Storage: Redis HSET with TTL                                                    │
│  Key format: rate_limit:{client_id}:{minute_bucket}                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Integration Patterns

### 7.1 Teams Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          TEAMS INTEGRATION                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Webhook URL format:                                                             │
│  https://outlook.office.com/webhook/{guid}/IncomingWebhook/{guid}/{guid}        │
│                                                                                  │
│  Payload format: Adaptive Card JSON                                              │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  {                                                                       │   │
│  │    "type": "message",                                                    │   │
│  │    "attachments": [{                                                     │   │
│  │      "contentType": "application/vnd.microsoft.card.adaptive",           │   │
│  │      "content": {                                                        │   │
│  │        "type": "AdaptiveCard",                                           │   │
│  │        "version": "1.4",                                                 │   │
│  │        "body": [                                                         │   │
│  │          {                                                               │   │
│  │            "type": "TextBlock",                                          │   │
│  │            "text": "🚨 New Incident Reported",                           │   │
│  │            "weight": "bolder",                                           │   │
│  │            "size": "large"                                               │   │
│  │          },                                                              │   │
│  │          {                                                               │   │
│  │            "type": "FactSet",                                            │   │
│  │            "facts": [                                                    │   │
│  │              { "title": "Severity:", "value": "High" },                  │   │
│  │              { "title": "Site:", "value": "Main Warehouse" },            │   │
│  │              { "title": "Type:", "value": "Slip, Trip, Fall" }           │   │
│  │            ]                                                             │   │
│  │          }                                                               │   │
│  │        ],                                                                │   │
│  │        "actions": [{                                                     │   │
│  │          "type": "Action.OpenUrl",                                       │   │
│  │          "title": "View in EHS Portal",                                  │   │
│  │          "url": "https://ehs.example.com/incidents/123"                  │   │
│  │        }]                                                                │   │
│  │      }                                                                   │   │
│  │    }]                                                                    │   │
│  │  }                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Detection: Webhook URL contains 'outlook.office.com/webhook'                    │
│  Behaviour: Use Adaptive Card format instead of standard webhook payload         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Standard Webhook Payload

```json
{
  "id": "evt_550e8400-e29b-41d4-a716-446655440000",
  "type": "incident.created",
  "timestamp": "2026-02-05T10:30:00.000Z",
  "organisation_id": "org_12345",
  "data": {
    "id": "inc_67890",
    "title": "Slip and fall in warehouse",
    "description": "Employee slipped on wet floor near loading dock",
    "severity": "high",
    "status": "open",
    "incident_type": "slip_trip_fall",
    "site_id": "site_456",
    "site_name": "Main Warehouse",
    "reported_by_id": "user_789",
    "reported_by_name": "John Smith",
    "incident_date": "2026-02-05T09:45:00.000Z",
    "created_at": "2026-02-05T10:30:00.000Z"
  },
  "metadata": {
    "source": "ehs-portal",
    "version": "1.0",
    "environment": "production"
  }
}
```

---

## 8. Deployment Architecture

### 8.1 Environment Variables

```
# SSO Configuration
INTEGRATION_ENCRYPTION_KEY=<32-byte-hex-key>      # For encrypting SSO secrets
SSO_CALLBACK_BASE_URL=https://ehs.example.com     # Base URL for SSO callbacks

# Rate Limiting
REDIS_URL=redis://localhost:6379                   # Redis for rate limiting
RATE_LIMIT_ENABLED=true                           # Enable/disable rate limiting

# Webhook Delivery
WEBHOOK_DISPATCHER_ENABLED=true                    # Enable webhook processing
WEBHOOK_DISPATCHER_INTERVAL=5000                   # Poll interval (ms)
WEBHOOK_TIMEOUT=30000                              # HTTP timeout (ms)

# Public API
PUBLIC_API_ENABLED=true                           # Enable public API
PUBLIC_API_VERSION=v1                             # Current API version
```

### 8.2 Background Jobs

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BACKGROUND JOBS                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ Job: Webhook Dispatcher                                                     ││
│  │ Schedule: Every 5 seconds                                                    ││
│  │ Action: Process pending webhook deliveries                                   ││
│  │ Concurrency: 10 parallel deliveries                                         ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ Job: Webhook Cleanup                                                        ││
│  │ Schedule: Daily at 02:00                                                    ││
│  │ Action: Delete webhook_events older than retention period                   ││
│  │ Retention: 14 days (configurable)                                           ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ Job: SSO Token Cleanup                                                      ││
│  │ Schedule: Hourly                                                            ││
│  │ Action: Clear expired SSO state/nonce values from cache                     ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ Job: API Usage Aggregation                                                  ││
│  │ Schedule: Hourly                                                            ││
│  │ Action: Aggregate API request counts for reporting                          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Error Handling

### 9.1 SSO Error Handling

| Error | User Message | Log Level | Recovery |
|-------|-------------|-----------|----------|
| IdP unreachable | "Unable to connect to identity provider. Please try again later." | ERROR | Retry with backoff |
| Invalid client credentials | "SSO configuration error. Contact administrator." | ERROR | Admin fixes config |
| Token validation failed | "Authentication failed. Please try again." | WARN | User retries |
| User not found (JIT off) | "You are not authorized for this application." | INFO | Admin enables JIT or creates user |
| No role mapping | "Unable to determine access level. Contact administrator." | WARN | Admin adds mapping |

### 9.2 API Error Handling

| Error | HTTP Status | Response |
|-------|-------------|----------|
| Missing API key | 401 | `{"error": "API key required", "code": "auth_required"}` |
| Invalid API key | 401 | `{"error": "Invalid API key", "code": "auth_invalid"}` |
| Revoked client | 401 | `{"error": "API key revoked", "code": "auth_revoked"}` |
| IP not allowed | 403 | `{"error": "IP address not allowed", "code": "ip_blocked"}` |
| Insufficient scope | 403 | `{"error": "Insufficient permissions", "code": "scope_insufficient"}` |
| Rate limited | 429 | `{"error": "Rate limit exceeded", "code": "rate_limited", "retryAfter": 60}` |

---

## 10. Monitoring & Observability

### 10.1 Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `sso_login_attempts_total` | Counter | Total SSO login attempts by org, success/fail |
| `sso_login_duration_seconds` | Histogram | SSO login flow duration |
| `api_requests_total` | Counter | API requests by client, endpoint, status |
| `api_request_duration_seconds` | Histogram | API request latency |
| `webhook_deliveries_total` | Counter | Webhook deliveries by webhook, status |
| `webhook_delivery_duration_seconds` | Histogram | Webhook delivery latency |
| `webhook_queue_size` | Gauge | Pending webhook deliveries |

### 10.2 Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| SSO Provider Down | >10 consecutive SSO failures for provider | High |
| High API Error Rate | >5% 5xx responses in 5 minutes | High |
| Webhook Backlog | >1000 pending deliveries | Medium |
| Webhook Failures | >50% failure rate for webhook | Medium |
| Rate Limit Abuse | Client hitting limit >100 times/hour | Low |

---

## 11. Future Considerations

### 11.1 SCIM 2.0 (Future Phase)

```
SCIM Endpoints (Placeholder):
POST   /scim/v2/Users        - Create user
GET    /scim/v2/Users/:id    - Get user
PUT    /scim/v2/Users/:id    - Replace user
PATCH  /scim/v2/Users/:id    - Update user
DELETE /scim/v2/Users/:id    - Deactivate user
GET    /scim/v2/Users        - List/search users
POST   /scim/v2/Groups       - Create group
...
```

### 11.2 OAuth 2.0 Client Credentials (Future Phase)

Replace API keys with OAuth 2.0 client credentials flow for enhanced security:
- Token endpoint for client authentication
- Short-lived access tokens
- Token refresh capability
- Revocation endpoint

### 11.3 Message Queue Integration (Future Phase)

Add support for publishing events to message queues:
- Apache Kafka
- RabbitMQ
- Azure Service Bus
- AWS SQS

---

*End of Document*

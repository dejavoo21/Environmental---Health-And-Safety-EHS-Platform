# Workflows – EHS Portal Phase 10
## Integrations, SSO & External Connectivity

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 10 – Integrations, SSO & External Connectivity |

---

## 1. SSO Login Flow

### 1.1 OIDC Authorization Code Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User Browser
    participant F as EHS Frontend
    participant B as EHS Backend
    participant I as Identity Provider
    participant D as Database

    U->>F: Click "Sign in with SSO"
    F->>B: GET /auth/sso/init?org_slug=acme
    B->>D: Lookup SSO provider for org
    D-->>B: SSO config (issuer, client_id, etc.)
    B->>B: Generate state & nonce
    B->>B: Store state/nonce in cache (5 min TTL)
    B-->>F: 302 Redirect to IdP authorize URL
    F-->>U: Redirect to IdP
    U->>I: Follow redirect to IdP login page
    I-->>U: Display login form
    U->>I: Enter credentials & submit
    I->>I: Authenticate user
    I-->>U: 302 Redirect to callback with code
    U->>B: GET /auth/sso/callback?code=xyz&state=abc
    B->>B: Validate state matches cached value
    B->>I: POST /token (exchange code for tokens)
    I-->>B: {id_token, access_token, refresh_token}
    B->>I: GET /.well-known/jwks.json
    I-->>B: Public keys for signature verification
    B->>B: Validate ID token signature & claims
    B->>B: Extract email, name, groups from claims
    B->>D: Find user by email or external_id
    alt User exists
        D-->>B: Existing user record
        B->>B: Update user attributes from claims
    else User not found & JIT enabled
        B->>D: Create new user with claim data
        D-->>B: New user record
    else User not found & JIT disabled
        B-->>U: 403 "Not authorized for this application"
    end
    B->>D: Lookup role mappings for provider
    D-->>B: Role mappings
    B->>B: Determine role from IdP groups
    B->>D: Update user role if changed
    B->>D: Record SSO login attempt (success)
    B->>B: Generate EHS JWT token
    B-->>U: 302 Redirect to / with Set-Cookie: token
    U->>F: Load dashboard
    F-->>U: Display authenticated content
```

### 1.2 SSO Login State Diagram

```mermaid
stateDiagram-v2
    [*] --> LoginPage: User visits login
    LoginPage --> SSOInit: Click "Sign in with SSO"
    SSOInit --> IdPRedirect: Valid SSO config
    SSOInit --> LoginError: No SSO configured
    IdPRedirect --> IdPLogin: User at IdP
    IdPLogin --> Callback: Auth successful
    IdPLogin --> LoginError: Auth failed at IdP
    Callback --> ValidateState: Check state param
    ValidateState --> TokenExchange: State valid
    ValidateState --> LoginError: State mismatch
    TokenExchange --> ValidateToken: Tokens received
    TokenExchange --> LoginError: Token request failed
    ValidateToken --> UserLookup: Token valid
    ValidateToken --> LoginError: Invalid token
    UserLookup --> UpdateUser: User found
    UserLookup --> JITCreate: User not found, JIT enabled
    UserLookup --> LoginError: User not found, JIT disabled
    JITCreate --> AssignRole: User created
    UpdateUser --> AssignRole: Attributes synced
    AssignRole --> IssueToken: Role determined
    IssueToken --> Dashboard: JWT issued
    LoginError --> LoginPage: Display error
    Dashboard --> [*]
```

---

## 2. API Client Lifecycle

### 2.1 API Client Creation Flow

```mermaid
sequenceDiagram
    autonumber
    participant A as Admin
    participant F as Frontend
    participant B as Backend
    participant D as Database

    A->>F: Navigate to Integrations > API Clients
    F->>B: GET /api/integrations/api-clients
    B->>D: SELECT * FROM api_clients WHERE org_id = ?
    D-->>B: List of API clients
    B-->>F: API client list
    F-->>A: Display clients table

    A->>F: Click "Create API Client"
    F-->>A: Display create form
    A->>F: Fill form (name, description, scopes, IP list)
    F->>B: POST /api/integrations/api-clients
    B->>B: Generate client_id (UUID)
    B->>B: Generate API key (ehs_live_ + 32 random chars)
    B->>B: Hash API key with bcrypt
    B->>B: Extract prefix (first 8 chars)
    B->>D: INSERT INTO api_clients (...)
    D-->>B: Created record
    B->>D: INSERT audit log entry
    B-->>F: {client_id, api_key, ...} (key shown once)
    F-->>A: Display success with API key

    Note over A,F: API key is only shown once!
    A->>A: Copy and securely store API key
```

### 2.2 API Key Validation Flow

```mermaid
flowchart TD
    A[API Request Received] --> B{X-API-Key header present?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D[Extract key prefix first 8 chars]
    D --> E{Find client by prefix + org?}
    E -->|Not found| C
    E -->|Found| F{bcrypt compare key with hash}
    F -->|No match| C
    F -->|Match| G{Client status = active?}
    G -->|No| H[401 Revoked/Suspended]
    G -->|Yes| I{IP in allowlist?}
    I -->|No| J[403 IP Blocked]
    I -->|Yes or no allowlist| K{Rate limit OK?}
    K -->|Exceeded| L[429 Rate Limited]
    K -->|OK| M{Scope sufficient?}
    M -->|No| N[403 Insufficient Scope]
    M -->|Yes| O[Process Request]
    O --> P[Update last_used_at, request_count]
    P --> Q[Return Response]
```

### 2.3 API Key Regeneration Flow

```mermaid
sequenceDiagram
    autonumber
    participant A as Admin
    participant F as Frontend
    participant B as Backend
    participant D as Database

    A->>F: Click "Regenerate" on API client
    F-->>A: Confirmation dialog "This will invalidate the current key"
    A->>F: Confirm regeneration
    F->>B: POST /api/integrations/api-clients/:id/regenerate
    B->>B: Generate new API key
    B->>B: Hash new API key
    B->>B: Extract new prefix
    B->>D: UPDATE api_clients SET api_key_hash, api_key_prefix, updated_at
    D-->>B: Updated record
    B->>D: INSERT audit log (key regenerated)
    B-->>F: {new_api_key} (shown once)
    F-->>A: Display new API key

    Note over A,F: Old API key immediately stops working
```

---

## 3. Webhook Delivery Flow

### 3.1 Event to Webhook Delivery

```mermaid
sequenceDiagram
    autonumber
    participant S as EHS Service
    participant E as Event Service
    participant D as Database
    participant W as Webhook Dispatcher
    participant T as Target Endpoint

    S->>S: Create/update entity (e.g., incident)
    S->>E: emit({type: 'incident.created', ...})
    E->>D: INSERT INTO integration_events
    D-->>E: Event ID
    E->>D: SELECT webhooks WHERE org_id = ? AND event_types @> ?
    D-->>E: Matching webhooks (may be multiple)
    loop For each matching webhook
        E->>E: Build webhook payload
        E->>D: INSERT INTO webhook_events (status: pending)
    end
    E-->>S: Event emitted

    Note over W: Dispatcher runs every 5 seconds

    W->>D: SELECT * FROM webhook_events WHERE status IN (pending, retrying) AND next_retry_at <= NOW()
    D-->>W: Pending webhook events
    loop For each webhook event
        W->>D: SELECT webhook config (URL, secret)
        D-->>W: Webhook configuration
        W->>W: Generate HMAC signature
        W->>T: POST target_url with payload + headers
        alt Success (2xx response)
            T-->>W: 200 OK
            W->>D: UPDATE webhook_events SET status = delivered
        else Failure
            T-->>W: Error or timeout
            W->>D: UPDATE webhook_events SET attempt_count++, schedule next retry
        end
    end
```

### 3.2 Webhook Retry Logic

```mermaid
flowchart TD
    A[Webhook Delivery Attempt] --> B{HTTP Success 2xx?}
    B -->|Yes| C[Mark as delivered]
    C --> D[Update last_success_at on webhook]
    D --> E[Reset consecutive_failures to 0]
    E --> F[Done]

    B -->|No| G{Attempt count < max_attempts?}
    G -->|Yes| H[Calculate next retry delay]
    H --> I[Set status = retrying]
    I --> J[Set next_retry_at]
    J --> K[Increment attempt_count]
    K --> L[Log error details]
    L --> M[Increment consecutive_failures]
    M --> N{consecutive_failures > 10?}
    N -->|Yes| O[Auto-disable webhook]
    O --> P[Set disabled_reason]
    N -->|No| Q[Wait for next poll]

    G -->|No| R[Mark as failed]
    R --> S[Log final failure]
    S --> T[Done - Manual retry available]

    subgraph "Retry Delays"
        H1[Attempt 1: Immediate]
        H2[Attempt 2: +1 minute]
        H3[Attempt 3: +5 minutes]
        H4[Attempt 4: +30 minutes]
        H5[Attempt 5: +2 hours]
    end
```

### 3.3 Teams Notification Flow

```mermaid
sequenceDiagram
    autonumber
    participant E as Event Service
    participant W as Webhook Dispatcher
    participant T as Teams Webhook

    Note over E: Incident created event
    E->>W: Queue webhook delivery
    W->>W: Detect Teams URL pattern
    W->>W: Transform to Adaptive Card format
    
    Note over W: Build Adaptive Card
    W->>W: {type: "message", attachments: [{contentType: "adaptive", content: {...}}]}
    
    W->>T: POST teams webhook URL
    T-->>W: 200 OK (or 429 rate limited)
    
    alt Success
        Note over T: Card appears in Teams channel
    else Rate Limited
        W->>W: Schedule retry with backoff
    end
```

---

## 4. JIT User Provisioning

### 4.1 Just-In-Time User Creation

```mermaid
flowchart TD
    A[SSO Callback Received] --> B[Extract claims from ID token]
    B --> C[Get email, name, groups, sub]
    C --> D{Find user by email?}
    D -->|Found| E[Return existing user]
    D -->|Not found| F{Find by external_id sub?}
    F -->|Found| G[Return existing user, update email]
    F -->|Not found| H{JIT provisioning enabled?}
    H -->|No| I[Return error: User not authorized]
    H -->|Yes| J[Create new user record]
    
    J --> K[Set email from claim]
    K --> L[Set name from given_name + family_name]
    L --> M[Set external_id from sub claim]
    M --> N[Set auth_provider = 'sso']
    N --> O[Set sso_provider_id]
    O --> P[Lookup role mappings]
    
    P --> Q{Groups claim present?}
    Q -->|Yes| R[Match groups to mappings by priority]
    Q -->|No| S[Use default_role from provider]
    R --> T{Any mapping matched?}
    T -->|Yes| U[Assign matched role]
    T -->|No| S
    S --> V[Assign default role]
    
    U --> W[Save user to database]
    V --> W
    W --> X[Log JIT provisioning event]
    X --> Y[Return new user]

    E --> Z[Update attributes from claims if changed]
    G --> Z
    Z --> AA[Check for role update from groups]
    AA --> AB[Return user]
```

### 4.2 User Attribute Sync on Login

```mermaid
sequenceDiagram
    autonumber
    participant B as Backend
    participant D as Database

    B->>B: Extract claims from ID token
    B->>D: SELECT user WHERE email = claim.email
    D-->>B: Existing user

    B->>B: Compare attributes
    
    alt Name changed
        B->>B: Update first_name, last_name
    end
    
    alt Groups changed
        B->>D: SELECT role mappings for provider
        D-->>B: Mappings
        B->>B: Determine new role
        alt Role different from current
            B->>B: Update user role
            B->>D: INSERT audit log (role_changed)
        end
    end

    B->>D: UPDATE user SET updated_at, last_sso_login_at
    B->>D: UPDATE sso_attributes = claim subset
```

---

## 5. SSO Configuration Flow

### 5.1 Admin Configures SSO

```mermaid
sequenceDiagram
    autonumber
    participant A as Admin
    participant F as Frontend
    participant B as Backend
    participant I as Identity Provider
    participant D as Database

    A->>F: Navigate to Settings > Integrations > SSO
    F->>B: GET /api/integrations/sso
    B->>D: SELECT sso_provider WHERE org_id = ?
    D-->>B: SSO config or null
    B-->>F: SSO configuration
    F-->>A: Display SSO form

    A->>F: Enter IdP details
    Note over A,F: Provider name, type, issuer URL, client ID, client secret

    A->>F: Click "Test Connection"
    F->>B: POST /api/integrations/sso/test
    B->>I: GET {issuer_url}/.well-known/openid-configuration
    alt Discovery successful
        I-->>B: OIDC configuration
        B->>I: Validate client credentials if possible
        B-->>F: {success: true, message: "Connection successful"}
        F-->>A: ✓ Connection test passed
    else Discovery failed
        I-->>B: Error / timeout
        B-->>F: {success: false, message: "Cannot reach IdP"}
        F-->>A: ✗ Connection test failed
    end

    A->>F: Click "Save Configuration"
    F->>B: POST /api/integrations/sso
    B->>B: Encrypt client_secret
    B->>D: INSERT/UPDATE sso_providers
    D-->>B: Saved config
    B->>D: INSERT audit log
    B-->>F: Success
    F-->>A: Configuration saved

    A->>F: Configure role mappings
    A->>F: Add mapping: EHS-Admins → admin
    F->>B: POST /api/integrations/sso/mappings
    B->>D: INSERT sso_mappings
    D-->>B: Mapping saved
    B-->>F: Success
```

### 5.2 SSO Provider Validation

```mermaid
flowchart TD
    A[Save SSO Configuration] --> B[Validate required fields]
    B --> C{All required present?}
    C -->|No| D[Return validation error]
    C -->|Yes| E[Validate issuer URL format]
    E --> F{HTTPS URL?}
    F -->|No| D
    F -->|Yes| G[Fetch OIDC discovery document]
    G --> H{Discovery successful?}
    H -->|No| I[Return error: Cannot reach IdP]
    H -->|Yes| J[Validate required endpoints present]
    J --> K{Authorization & token endpoints?}
    K -->|No| L[Return error: Invalid OIDC config]
    K -->|Yes| M[Encrypt client secret]
    M --> N[Generate redirect URI]
    N --> O[Save to database]
    O --> P[Return success with redirect URI]
    
    Note over P: Admin must configure redirect URI in IdP
```

---

## 6. Integration Audit Flow

### 6.1 Audit Event Capture

```mermaid
flowchart TD
    subgraph "SSO Events"
        A1[SSO Login Attempt] --> A2[Log: user, success/fail, IP, reason]
        A3[SSO Config Change] --> A4[Log: field changed, old/new value]
    end

    subgraph "API Events"
        B1[API Client Created] --> B2[Log: client name, scopes, created_by]
        B3[API Key Regenerated] --> B4[Log: client ID, regenerated_by]
        B5[API Client Revoked] --> B6[Log: client ID, revoked_by, reason]
        B7[API Request] --> B8[Log summary: client, endpoint, status]
    end

    subgraph "Webhook Events"
        C1[Webhook Created] --> C2[Log: name, URL, event types]
        C3[Webhook Delivery] --> C4[Log: success/fail, status code]
        C5[Webhook Disabled] --> C6[Log: reason, consecutive failures]
    end

    A2 --> D[Audit Trail Table]
    A4 --> D
    B2 --> D
    B4 --> D
    B6 --> D
    B8 --> E[API Request Log separate]
    C2 --> D
    C4 --> F[Webhook Events Table]
    C6 --> D
```

---

## 7. Public API Request Flow

### 7.1 Complete API Request Processing

```mermaid
sequenceDiagram
    autonumber
    participant C as External Client
    participant G as API Gateway
    participant M as Middleware Stack
    participant S as Service Layer
    participant D as Database

    C->>G: GET /api/public/v1/incidents?status=open
    G->>G: Parse request headers
    
    G->>M: IP Allowlist Check
    alt IP blocked
        M-->>C: 403 Forbidden
    end
    
    G->>M: API Key Authentication
    M->>M: Extract X-API-Key header
    M->>D: Find client by key prefix
    D-->>M: API client record
    M->>M: bcrypt compare key
    alt Invalid key
        M-->>C: 401 Unauthorized
    end
    
    G->>M: Rate Limit Check
    M->>M: Calculate sliding window count
    alt Rate exceeded
        M-->>C: 429 Too Many Requests + Retry-After
    end
    
    G->>M: Scope Authorization
    M->>M: Check: read:incidents in client.scopes?
    alt Insufficient scope
        M-->>C: 403 Forbidden
    end
    
    G->>M: Set Organisation Context
    M->>M: req.organisationId = client.organisation_id
    
    G->>S: GET incidents for org
    S->>D: SELECT * FROM incidents WHERE org_id = ? AND status = ?
    D-->>S: Incident records
    S->>S: Format response
    S-->>G: Paginated results
    
    G->>G: Add rate limit headers
    G->>D: UPDATE api_clients SET last_used_at, request_count++
    G-->>C: 200 OK + JSON response
```

---

## 8. Error Recovery Flows

### 8.1 IdP Unavailability

```mermaid
flowchart TD
    A[User attempts SSO login] --> B{IdP reachable?}
    B -->|Yes| C[Normal SSO flow]
    B -->|No| D[Log IdP error]
    D --> E{Password login enabled?}
    E -->|Yes| F[Redirect to password login]
    F --> G[Show message: SSO unavailable, use password]
    E -->|No| H[Show error page]
    H --> I[Contact administrator for access]
    
    J[Background: Health Check] --> K{IdP back online?}
    K -->|Yes| L[Clear IdP down flag]
    K -->|No| M[Send alert to admins]
```

### 8.2 Webhook Target Unavailable

```mermaid
flowchart TD
    A[Webhook delivery attempt] --> B{Target responds?}
    B -->|2xx| C[Mark delivered]
    B -->|4xx client error| D[Log error, likely config issue]
    D --> E{Retryable 4xx?}
    E -->|Yes 429| F[Schedule retry with backoff]
    E -->|No 401,403,404| G[Mark failed, notify admin]
    B -->|5xx server error| H[Log error, target issue]
    H --> F
    B -->|Timeout| I[Log timeout]
    I --> F
    B -->|Connection refused| J[Log connection error]
    J --> F
    
    F --> K{Max retries reached?}
    K -->|No| L[Wait for next retry window]
    K -->|Yes| M[Mark failed permanently]
    M --> N[Increment consecutive_failures]
    N --> O{failures > threshold?}
    O -->|Yes| P[Auto-disable webhook]
    P --> Q[Notify admin]
```

---

## 9. Integration Dashboard Flows

### 9.1 Admin Views Integration Status

```mermaid
flowchart TD
    A[Admin opens Integrations page] --> B[Load SSO status]
    B --> C{SSO configured?}
    C -->|Yes| D[Show provider name, status]
    D --> E[Show recent login count]
    C -->|No| F[Show "Configure SSO" prompt]

    A --> G[Load API clients]
    G --> H[List clients with usage stats]
    H --> I[Show: name, status, last_used, request_count]

    A --> J[Load webhooks]
    J --> K[List webhooks with delivery status]
    K --> L[Show: name, events, success rate, last delivery]
    L --> M{Any failures?}
    M -->|Yes| N[Highlight failed webhooks]
    M -->|No| O[All healthy indicator]

    A --> P[Load recent activity]
    P --> Q[Show integration events timeline]
```

---

*End of Document*

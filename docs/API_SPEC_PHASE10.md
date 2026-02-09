# API Specification – EHS Portal Phase 10
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

Phase 10 introduces three categories of API endpoints:

1. **SSO Routes** (`/auth/sso/*`) - SSO initiation and callback
2. **Integration Admin Routes** (`/api/integrations/*`) - Admin configuration
3. **Public API Routes** (`/api/public/v1/*`) - External system access

---

## 2. Authentication

### 2.1 Internal Endpoints

Admin routes (`/api/integrations/*`) require:
- JWT token in `Authorization: Bearer <token>` header
- User role: `admin` only
- Organisation context from token

### 2.2 Public API Endpoints

Public routes (`/api/public/v1/*`) require:
- API key in `X-API-Key` header
- Valid, active API client
- Appropriate scope for endpoint

### 2.3 SSO Endpoints

SSO routes (`/auth/sso/*`) are public but use state/nonce for security.

---

## 3. SSO Endpoints

### 3.1 Initiate SSO Login

**Endpoint:** `GET /auth/sso/init`

Redirects user to IdP authorization endpoint.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org_slug` | string | Yes | Organisation identifier |
| `redirect_to` | string | No | Post-login redirect path |

**Response:** `302 Redirect` to IdP authorize URL

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Missing org_slug |
| 404 | Organisation not found |
| 404 | SSO not configured for organisation |

---

### 3.2 SSO Callback

**Endpoint:** `GET /auth/sso/callback`

Handles IdP redirect after authentication.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from IdP |
| `state` | string | Yes | State parameter for CSRF validation |
| `error` | string | No | Error code from IdP |
| `error_description` | string | No | Error description from IdP |

**Success Response:** `302 Redirect` to dashboard with JWT cookie

**Error Response:** `302 Redirect` to `/login?error=<code>`

| Error Code | Condition |
|------------|-----------|
| `state_mismatch` | Invalid or expired state |
| `token_error` | Failed to exchange code for tokens |
| `invalid_token` | ID token validation failed |
| `user_not_found` | No matching user and JIT disabled |
| `mapping_error` | Could not determine user role |
| `provider_error` | IdP returned error |

---

## 4. SSO Configuration Endpoints

### 4.1 Get SSO Configuration

**Endpoint:** `GET /api/integrations/sso`

Returns SSO configuration for current organisation.

**Authentication:** JWT (admin only)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "configured": true,
    "provider": {
      "id": "uuid",
      "provider_name": "Corporate Azure AD",
      "provider_type": "oidc_azure_ad",
      "issuer_url": "https://login.microsoftonline.com/tenant-id/v2.0",
      "client_id": "azure-client-id",
      "redirect_uri": "https://ehs.example.com/auth/sso/callback",
      "scopes": "openid profile email",
      "group_claim_name": "groups",
      "default_role": "worker",
      "jit_enabled": true,
      "sso_only_mode": false,
      "enabled": true,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-20T14:30:00Z"
    },
    "mappings": [
      {
        "id": "uuid",
        "idp_claim_name": "groups",
        "idp_claim_value": "EHS-Admins",
        "ehs_role": "admin",
        "priority": 100
      }
    ],
    "stats": {
      "total_logins_30d": 245,
      "unique_users_30d": 42,
      "jit_users_created": 12
    }
  }
}
```

---

### 4.2 Create/Update SSO Configuration

**Endpoint:** `POST /api/integrations/sso`

Creates or updates SSO provider configuration.

**Authentication:** JWT (admin only)

**Request Body:**

```json
{
  "provider_name": "Corporate Azure AD",
  "provider_type": "oidc_azure_ad",
  "issuer_url": "https://login.microsoftonline.com/tenant-id/v2.0",
  "client_id": "azure-client-id",
  "client_secret": "client-secret-value",
  "scopes": "openid profile email",
  "group_claim_name": "groups",
  "default_role": "worker",
  "jit_enabled": true,
  "sso_only_mode": false,
  "enabled": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider_name` | string | Yes | Display name |
| `provider_type` | enum | Yes | `oidc_azure_ad` or `oidc_generic` |
| `issuer_url` | string | Yes | OIDC issuer URL (must be HTTPS) |
| `client_id` | string | Yes | OAuth client ID |
| `client_secret` | string | Yes* | Client secret (*required on create) |
| `scopes` | string | No | Space-separated scopes (default: `openid profile email`) |
| `group_claim_name` | string | No | Claim containing groups (default: `groups`) |
| `default_role` | enum | No | Default role if no mapping matches |
| `jit_enabled` | boolean | No | Enable JIT provisioning (default: true) |
| `sso_only_mode` | boolean | No | Disable password login (default: false) |
| `enabled` | boolean | No | Enable the provider (default: false) |

**Response:** `201 Created` or `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "redirect_uri": "https://ehs.example.com/auth/sso/callback",
    "message": "SSO configuration saved. Configure redirect URI in your IdP."
  }
}
```

---

### 4.3 Test SSO Connection

**Endpoint:** `POST /api/integrations/sso/test`

Tests connectivity to IdP without affecting configuration.

**Authentication:** JWT (admin only)

**Request Body:**

```json
{
  "issuer_url": "https://login.microsoftonline.com/tenant-id/v2.0",
  "client_id": "azure-client-id",
  "client_secret": "client-secret-value"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "reachable": true,
    "issuer_validated": true,
    "endpoints": {
      "authorization": "https://login.microsoftonline.com/.../authorize",
      "token": "https://login.microsoftonline.com/.../token",
      "jwks": "https://login.microsoftonline.com/.../keys"
    }
  }
}
```

**Error Response:** `200 OK` (but success: false)

```json
{
  "success": false,
  "error": {
    "message": "Cannot reach identity provider",
    "details": "Connection timed out"
  }
}
```

---

### 4.4 Manage SSO Role Mappings

**Endpoint:** `POST /api/integrations/sso/mappings`

Creates a new role mapping.

**Request Body:**

```json
{
  "idp_claim_name": "groups",
  "idp_claim_value": "EHS-Managers",
  "ehs_role": "manager",
  "priority": 90
}
```

**Response:** `201 Created`

---

**Endpoint:** `PUT /api/integrations/sso/mappings/:id`

Updates an existing mapping.

---

**Endpoint:** `DELETE /api/integrations/sso/mappings/:id`

Deletes a mapping.

**Response:** `204 No Content`

---

### 4.5 Delete SSO Configuration

**Endpoint:** `DELETE /api/integrations/sso`

Removes SSO configuration (soft delete).

**Authentication:** JWT (admin only)

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "SSO configuration removed. Users will need to use password login."
}
```

---

## 5. API Client Endpoints

### 5.1 List API Clients

**Endpoint:** `GET /api/integrations/api-clients`

Returns all API clients for organisation.

**Authentication:** JWT (admin only)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum | Filter by status: `active`, `revoked`, `suspended` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "client_name": "Power BI Integration",
      "description": "Read-only access for BI dashboards",
      "client_id": "uuid",
      "api_key_prefix": "ehs_live_",
      "scopes": ["read:incidents", "read:actions", "read:risks"],
      "ip_allowlist": ["10.0.0.0/8"],
      "rate_limit_tier": "premium",
      "status": "active",
      "last_used_at": "2026-02-04T16:45:00Z",
      "request_count": 12450,
      "created_at": "2026-01-01T09:00:00Z",
      "created_by": {
        "id": "uuid",
        "name": "John Admin"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

### 5.2 Create API Client

**Endpoint:** `POST /api/integrations/api-clients`

Creates a new API client and generates API key.

**Authentication:** JWT (admin only)

**Request Body:**

```json
{
  "client_name": "ServiceNow Integration",
  "description": "Create incidents from ServiceNow tickets",
  "scopes": ["read:incidents", "write:incidents"],
  "ip_allowlist": ["192.168.1.0/24", "10.0.0.100"],
  "rate_limit_tier": "standard"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_name` | string | Yes | Descriptive name (max 100 chars) |
| `description` | string | No | Purpose/notes |
| `scopes` | array | Yes | At least one scope required |
| `ip_allowlist` | array | No | CIDR ranges (null = all IPs allowed) |
| `rate_limit_tier` | enum | No | `standard` or `premium` (default: standard) |

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "client_id": "uuid",
    "client_name": "ServiceNow Integration",
    "api_key": "ehs_live_Ab3kL9mNpQrStUvWxYz12345678901234",
    "api_key_prefix": "ehs_live_",
    "scopes": ["read:incidents", "write:incidents"],
    "created_at": "2026-02-05T10:00:00Z"
  },
  "message": "API client created. Save the API key - it will not be shown again."
}
```

⚠️ **Note:** `api_key` is only returned on creation. Store it securely.

---

### 5.3 Get API Client

**Endpoint:** `GET /api/integrations/api-clients/:id`

Returns details of a specific API client.

**Authentication:** JWT (admin only)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "client_name": "Power BI Integration",
    "description": "Read-only access",
    "client_id": "uuid",
    "api_key_prefix": "ehs_live_",
    "api_key_masked": "ehs_live_****************************1234",
    "scopes": ["read:incidents", "read:actions"],
    "ip_allowlist": null,
    "rate_limit_tier": "standard",
    "status": "active",
    "last_used_at": "2026-02-04T16:45:00Z",
    "last_used_ip": "10.0.0.50",
    "request_count": 12450,
    "created_at": "2026-01-01T09:00:00Z",
    "usage_7d": {
      "total_requests": 2100,
      "success_rate": 0.98,
      "top_endpoints": [
        {"endpoint": "/api/public/v1/incidents", "count": 1500},
        {"endpoint": "/api/public/v1/actions", "count": 600}
      ]
    }
  }
}
```

---

### 5.4 Update API Client

**Endpoint:** `PUT /api/integrations/api-clients/:id`

Updates API client details (not the key).

**Authentication:** JWT (admin only)

**Request Body:**

```json
{
  "client_name": "Updated Name",
  "description": "Updated description",
  "scopes": ["read:incidents", "read:actions", "read:risks"],
  "ip_allowlist": ["10.0.0.0/8"],
  "rate_limit_tier": "premium"
}
```

**Response:** `200 OK`

---

### 5.5 Regenerate API Key

**Endpoint:** `POST /api/integrations/api-clients/:id/regenerate`

Generates a new API key, invalidating the old one.

**Authentication:** JWT (admin only)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "api_key": "ehs_live_Xy9aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT",
    "api_key_prefix": "ehs_live_"
  },
  "message": "New API key generated. The old key is now invalid."
}
```

---

### 5.6 Revoke API Client

**Endpoint:** `POST /api/integrations/api-clients/:id/revoke`

Revokes an API client immediately.

**Authentication:** JWT (admin only)

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "API client revoked. All requests using this client will be rejected."
}
```

---

### 5.7 Delete API Client

**Endpoint:** `DELETE /api/integrations/api-clients/:id`

Soft deletes an API client.

**Authentication:** JWT (admin only)

**Response:** `204 No Content`

---

## 6. Webhook Endpoints

### 6.1 List Webhooks

**Endpoint:** `GET /api/integrations/webhooks`

Returns all webhooks for organisation.

**Authentication:** JWT (admin only)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Teams Incident Alerts",
      "description": "Post high-severity incidents to Teams",
      "target_url": "https://outlook.office.com/webhook/...",
      "event_types": ["incident.created", "incident.severity_changed"],
      "enabled": true,
      "consecutive_failures": 0,
      "last_triggered_at": "2026-02-04T14:00:00Z",
      "last_success_at": "2026-02-04T14:00:00Z",
      "delivery_stats": {
        "total_7d": 45,
        "success_7d": 44,
        "failed_7d": 1
      }
    }
  ]
}
```

---

### 6.2 Create Webhook

**Endpoint:** `POST /api/integrations/webhooks`

Creates a new webhook subscription.

**Authentication:** JWT (admin only)

**Request Body:**

```json
{
  "name": "SIEM Integration",
  "description": "Send all events to security monitoring",
  "target_url": "https://siem.company.com/api/events",
  "event_types": [
    "incident.created",
    "incident.updated",
    "action.overdue"
  ],
  "custom_headers": {
    "X-Source": "ehs-portal"
  },
  "secret": "optional-custom-secret"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Descriptive name |
| `description` | string | No | Purpose/notes |
| `target_url` | string | Yes | HTTPS URL (required) |
| `event_types` | array | Yes | At least one event type |
| `custom_headers` | object | No | Additional HTTP headers |
| `secret` | string | No | Custom secret (auto-generated if not provided) |

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "SIEM Integration",
    "target_url": "https://siem.company.com/api/events",
    "secret": "whsec_Ab3kL9mNpQrStUvWxYz12345678901234",
    "event_types": ["incident.created", "incident.updated", "action.overdue"],
    "enabled": true
  },
  "message": "Webhook created. Use the secret to verify signatures."
}
```

---

### 6.3 Update Webhook

**Endpoint:** `PUT /api/integrations/webhooks/:id`

Updates webhook configuration.

**Authentication:** JWT (admin only)

**Request Body:**

```json
{
  "name": "Updated Name",
  "event_types": ["incident.created"],
  "enabled": true
}
```

**Response:** `200 OK`

---

### 6.4 Delete Webhook

**Endpoint:** `DELETE /api/integrations/webhooks/:id`

Deletes a webhook (soft delete).

**Authentication:** JWT (admin only)

**Response:** `204 No Content`

---

### 6.5 Get Webhook Activity

**Endpoint:** `GET /api/integrations/webhooks/:id/activity`

Returns recent delivery activity for a webhook.

**Authentication:** JWT (admin only)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum | Filter: `delivered`, `failed`, `pending`, `retrying` |
| `limit` | number | Items to return (default: 50, max: 100) |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "webhook_id": "uuid",
    "events": [
      {
        "id": "uuid",
        "event_type": "incident.created",
        "status": "delivered",
        "attempt_count": 1,
        "response_status_code": 200,
        "response_time_ms": 245,
        "created_at": "2026-02-04T14:00:00Z",
        "completed_at": "2026-02-04T14:00:01Z"
      },
      {
        "id": "uuid",
        "event_type": "action.overdue",
        "status": "failed",
        "attempt_count": 5,
        "response_status_code": 502,
        "error_message": "Bad Gateway",
        "created_at": "2026-02-04T12:00:00Z",
        "last_attempt_at": "2026-02-04T14:36:00Z"
      }
    ]
  }
}
```

---

### 6.6 Retry Webhook Delivery

**Endpoint:** `POST /api/integrations/webhooks/:id/events/:eventId/retry`

Manually retries a failed webhook delivery.

**Authentication:** JWT (admin only)

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Webhook delivery queued for retry"
}
```

---

### 6.7 Test Webhook

**Endpoint:** `POST /api/integrations/webhooks/:id/test`

Sends a test event to the webhook.

**Authentication:** JWT (admin only)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "delivered": true,
    "response_status_code": 200,
    "response_time_ms": 156
  }
}
```

---

## 7. Public API Endpoints

### 7.1 Common Features

**Base URL:** `/api/public/v1`

**Authentication:** `X-API-Key` header

**Common Response Headers:**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1707134460
X-Request-Id: req_abc123
```

**Pagination:**

All list endpoints support:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sort` | string | `-created_at` | Sort field (prefix `-` for desc) |

**Filtering:**

List endpoints support filtering via query parameters matching field names.

**Standard Response Format:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-02-05T10:30:00Z"
  }
}
```

**Error Response Format:**

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Invalid request parameters",
    "details": [
      {"field": "status", "message": "Invalid status value"}
    ]
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

---

### 7.2 Incidents API

#### List Incidents

**Endpoint:** `GET /api/public/v1/incidents`

**Scope Required:** `read:incidents`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `open`, `investigating`, `closed` |
| `severity` | string | Filter by severity: `low`, `medium`, `high`, `critical` |
| `site_id` | uuid | Filter by site |
| `from_date` | date | Incidents from this date |
| `to_date` | date | Incidents to this date |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Slip and fall in warehouse",
      "description": "Employee slipped on wet floor",
      "incident_type": "slip_trip_fall",
      "severity": "high",
      "status": "open",
      "incident_date": "2026-02-05T09:45:00Z",
      "site_id": "uuid",
      "site_name": "Main Warehouse",
      "reported_by_id": "uuid",
      "reported_by_name": "John Smith",
      "created_at": "2026-02-05T10:00:00Z",
      "updated_at": "2026-02-05T10:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

#### Get Incident

**Endpoint:** `GET /api/public/v1/incidents/:id`

**Scope Required:** `read:incidents`

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Slip and fall in warehouse",
    "description": "Employee slipped on wet floor near loading dock",
    "incident_type": "slip_trip_fall",
    "severity": "high",
    "status": "open",
    "incident_date": "2026-02-05T09:45:00Z",
    "site": {
      "id": "uuid",
      "name": "Main Warehouse"
    },
    "reported_by": {
      "id": "uuid",
      "name": "John Smith",
      "email": "john.smith@example.com"
    },
    "assigned_to": null,
    "root_cause": null,
    "corrective_actions": [],
    "created_at": "2026-02-05T10:00:00Z",
    "updated_at": "2026-02-05T10:30:00Z",
    "closed_at": null
  }
}
```

---

#### Create Incident

**Endpoint:** `POST /api/public/v1/incidents`

**Scope Required:** `write:incidents`

**Request Body:**

```json
{
  "title": "Chemical spill in lab",
  "description": "Minor chemical spill during routine handling",
  "incident_type": "hazardous_material",
  "severity": "medium",
  "incident_date": "2026-02-05T11:00:00Z",
  "site_id": "uuid",
  "reported_by_id": "uuid"
}
```

**Response:** `201 Created`

---

#### Update Incident

**Endpoint:** `PUT /api/public/v1/incidents/:id`

**Scope Required:** `write:incidents`

**Request Body:**

```json
{
  "severity": "high",
  "status": "investigating",
  "assigned_to_id": "uuid"
}
```

**Response:** `200 OK`

---

### 7.3 Actions API

#### List Actions

**Endpoint:** `GET /api/public/v1/actions`

**Scope Required:** `read:actions`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `open`, `in_progress`, `completed`, `overdue` |
| `assigned_to_id` | uuid | Filter by assignee |
| `due_before` | date | Actions due before this date |
| `due_after` | date | Actions due after this date |
| `source_type` | string | `incident`, `inspection`, `audit`, `risk` |
| `source_id` | uuid | Related entity ID |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Install anti-slip mats",
      "description": "Install anti-slip mats near loading dock entrance",
      "priority": "high",
      "status": "open",
      "due_date": "2026-02-12T17:00:00Z",
      "assigned_to": {
        "id": "uuid",
        "name": "Jane Manager"
      },
      "source_type": "incident",
      "source_id": "uuid",
      "created_at": "2026-02-05T11:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

#### Get Action

**Endpoint:** `GET /api/public/v1/actions/:id`

**Scope Required:** `read:actions`

---

#### Create Action

**Endpoint:** `POST /api/public/v1/actions`

**Scope Required:** `write:actions`

**Request Body:**

```json
{
  "title": "Update safety signage",
  "description": "Replace worn safety signs in loading area",
  "priority": "medium",
  "due_date": "2026-02-20T17:00:00Z",
  "assigned_to_id": "uuid",
  "source_type": "inspection",
  "source_id": "uuid"
}
```

---

#### Update Action

**Endpoint:** `PUT /api/public/v1/actions/:id`

**Scope Required:** `write:actions`

---

### 7.4 Risks API

#### List Risks

**Endpoint:** `GET /api/public/v1/risks`

**Scope Required:** `read:risks`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `identified`, `assessed`, `mitigated`, `closed` |
| `risk_level` | string | `low`, `medium`, `high`, `critical` |
| `category` | string | Risk category |
| `site_id` | uuid | Filter by site |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Forklift collision risk",
      "description": "High pedestrian traffic in forklift zone",
      "category": "operational",
      "likelihood": 3,
      "consequence": 4,
      "risk_score": 12,
      "risk_level": "high",
      "status": "assessed",
      "site": {
        "id": "uuid",
        "name": "Main Warehouse"
      },
      "owner": {
        "id": "uuid",
        "name": "Safety Manager"
      },
      "review_date": "2026-03-01",
      "created_at": "2026-01-15T09:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

#### Get Risk

**Endpoint:** `GET /api/public/v1/risks/:id`

**Scope Required:** `read:risks`

---

### 7.5 Training API

#### Get Training Status

**Endpoint:** `GET /api/public/v1/training/status`

**Scope Required:** `read:training`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | uuid | Filter by user |
| `course_id` | uuid | Filter by course |
| `status` | string | `assigned`, `in_progress`, `completed`, `overdue` |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_assignments": 450,
      "completed": 380,
      "in_progress": 45,
      "overdue": 25,
      "compliance_rate": 0.844
    },
    "by_course": [
      {
        "course_id": "uuid",
        "course_name": "Fire Safety",
        "assigned": 120,
        "completed": 115,
        "overdue": 5
      }
    ]
  }
}
```

---

### 7.6 Users API

#### List Users

**Endpoint:** `GET /api/public/v1/users`

**Scope Required:** `read:users`

**Response:** `200 OK` (limited fields)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "john.smith@example.com",
      "first_name": "John",
      "last_name": "Smith",
      "role": "supervisor",
      "site_id": "uuid",
      "site_name": "Main Warehouse",
      "status": "active",
      "created_at": "2025-06-01T09:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Note:** Password hashes, 2FA secrets, and other sensitive fields are never exposed.

---

## 8. Integration Events API

### 8.1 List Integration Events

**Endpoint:** `GET /api/integrations/events`

Returns recent integration events for audit/debugging.

**Authentication:** JWT (admin only)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_type` | string | Filter by event type |
| `entity_type` | string | Filter by entity: `incident`, `action`, etc. |
| `limit` | number | Items to return (max 100) |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "event_type": "incident.created",
      "entity_type": "incident",
      "entity_id": "uuid",
      "created_at": "2026-02-05T10:30:00Z",
      "processed_at": "2026-02-05T10:30:05Z",
      "webhook_count": 2,
      "delivered_count": 2,
      "failed_count": 0
    }
  ]
}
```

---

## 9. Configuration Export

### 9.1 Export Integration Configuration

**Endpoint:** `GET /api/integrations/export`

Exports integration configuration for compliance/backup.

**Authentication:** JWT (admin only)

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "exported_at": "2026-02-05T10:30:00Z",
    "organisation_id": "uuid",
    "sso": {
      "configured": true,
      "provider_name": "Corporate Azure AD",
      "provider_type": "oidc_azure_ad",
      "jit_enabled": true,
      "sso_only_mode": false,
      "mapping_count": 4
    },
    "api_clients": [
      {
        "client_name": "Power BI Integration",
        "scopes": ["read:incidents", "read:actions"],
        "status": "active",
        "created_at": "2026-01-01T09:00:00Z"
      }
    ],
    "webhooks": [
      {
        "name": "Teams Alerts",
        "event_types": ["incident.created"],
        "enabled": true,
        "created_at": "2026-01-15T10:00:00Z"
      }
    ]
  }
}
```

**Note:** Secrets, keys, and URLs are NOT included for security.

---

## 10. Error Codes Reference

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `validation_error` | Invalid request body or parameters |
| 400 | `invalid_url` | URL is not valid HTTPS |
| 400 | `invalid_scope` | Unknown scope requested |
| 401 | `auth_required` | Missing authentication |
| 401 | `auth_invalid` | Invalid credentials |
| 401 | `auth_revoked` | API client has been revoked |
| 403 | `forbidden` | Insufficient permissions |
| 403 | `scope_insufficient` | API key lacks required scope |
| 403 | `ip_blocked` | Request from non-allowed IP |
| 404 | `not_found` | Resource not found |
| 409 | `conflict` | Resource already exists |
| 429 | `rate_limited` | Rate limit exceeded |
| 500 | `internal_error` | Server error |

---

## 11. OpenAPI Specification

The full OpenAPI 3.0 specification is available at:

- **Development:** `http://localhost:3001/api/public/v1/docs`
- **Production:** `https://ehs.example.com/api/public/v1/docs`

Download as JSON: `GET /api/public/v1/openapi.json`

---

*End of Document*

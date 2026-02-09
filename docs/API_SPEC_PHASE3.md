# API Specification - EHS Portal Phase 3: Multi-Organisation & Enterprise Reporting

## 1. Overview

This document specifies the REST API endpoints for Phase 3 of the EHS Portal. Phase 3 introduces multi-organisation support, user management, and data export capabilities.

**Base URL:** `/api`

**Authentication:** All endpoints require JWT Bearer token authentication.

**Organisation Scoping:** All endpoints are implicitly scoped by `organisation_id` extracted from the authenticated user's JWT token. Users can only access data from their own organisation.

**Design Decisions:**
- No token blacklist; disabled users can use existing JWTs until expiry
- Email must be unique per organisation (even for disabled users)
- Exports are CSV only with 10K row limit
- Export rate limiting: 1 export per 30 seconds per user

---

## 2. Common Response Formats

### 2.1 Success Response

```json
{
  "data": { ... }
}
```

### 2.2 Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### 2.3 Standard HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Successful GET, PUT |
| 201 | Successful POST (created) |
| 204 | Successful DELETE |
| 400 | Validation error, bad request |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions (wrong role or org) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 429 | Rate limited (exports) |
| 500 | Server error |

---

## 3. Organisation Settings Endpoints

### 3.1 GET /api/organisation

Get the current user's organisation profile and settings.

**Authentication:** Required (any role)
**Roles:** Worker, Manager, Admin
**C-IDs:** C91, C93
**US-ID:** US-P3-01

#### Request

```
GET /api/organisation
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "data": {
    "id": "uuid",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "logoUrl": "/uploads/logos/uuid/logo.png",
    "timezone": "America/New_York",
    "settings": {
      "dashboard": {
        "openIncidentsWarning": 5,
        "openIncidentsCritical": 10,
        "overdueActionsWarning": 3,
        "overdueActionsCritical": 5,
        "failedInspectionsWarning": 2,
        "failedInspectionsCritical": 5
      }
    },
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | Authentication required |
| 404 | ORG_NOT_FOUND | Organisation not found |

---

### 3.2 PUT /api/organisation

Update organisation profile (name and timezone).

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C91, C93, C95
**US-ID:** US-P3-02, WF-P3-02

#### Request

```
PUT /api/organisation
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Corporation Updated",
  "timezone": "Europe/London"
}
```

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | No | 1-200 characters |
| timezone | string | No | Valid IANA timezone |

#### Response (200 OK)

```json
{
  "data": {
    "id": "uuid",
    "name": "Acme Corporation Updated",
    "slug": "acme-corp",
    "logoUrl": "/uploads/logos/uuid/logo.png",
    "timezone": "Europe/London",
    "settings": { ... },
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-25T12:00:00Z"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | INVALID_TIMEZONE | Invalid timezone format |
| 400 | NAME_TOO_LONG | Name must be 200 characters or less |
| 403 | FORBIDDEN | Admin role required |

---

### 3.3 POST /api/organisation/logo

Upload or replace organisation logo.

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C92, C95
**US-ID:** US-P3-03, WF-P3-03

#### Request

```
POST /api/organisation/logo
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary image data>
```

#### File Validation

| Rule | Value |
|------|-------|
| Max file size | 2 MB (2,097,152 bytes) |
| Allowed types | image/png, image/jpeg, image/svg+xml |
| Allowed extensions | .png, .jpg, .jpeg, .svg |

#### Response (200 OK)

```json
{
  "data": {
    "logoUrl": "/uploads/logos/uuid/logo.png",
    "message": "Logo uploaded successfully"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | FILE_TOO_LARGE | Logo must be under 2 MB |
| 400 | INVALID_FILE_TYPE | Only PNG, JPEG, and SVG files are allowed |
| 400 | NO_FILE_PROVIDED | No file provided |
| 403 | FORBIDDEN | Admin role required |

---

### 3.4 DELETE /api/organisation/logo

Remove organisation logo.

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C92, C95
**US-ID:** US-P3-03

#### Request

```
DELETE /api/organisation/logo
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "data": {
    "message": "Logo removed successfully"
  }
}
```

---

### 3.5 PUT /api/organisation/dashboard-settings

Update dashboard KPI threshold settings.

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C94, C95
**US-ID:** US-P3-04, WF-P3-04

#### Request

```
PUT /api/organisation/dashboard-settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "openIncidentsWarning": 10,
  "openIncidentsCritical": 20,
  "overdueActionsWarning": 5,
  "overdueActionsCritical": 10,
  "failedInspectionsWarning": 3,
  "failedInspectionsCritical": 8
}
```

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| openIncidentsWarning | integer | No | >= 0 |
| openIncidentsCritical | integer | No | >= openIncidentsWarning |
| overdueActionsWarning | integer | No | >= 0 |
| overdueActionsCritical | integer | No | >= overdueActionsWarning |
| failedInspectionsWarning | integer | No | >= 0 |
| failedInspectionsCritical | integer | No | >= failedInspectionsWarning |

#### Response (200 OK)

```json
{
  "data": {
    "settings": {
      "dashboard": {
        "openIncidentsWarning": 10,
        "openIncidentsCritical": 20,
        "overdueActionsWarning": 5,
        "overdueActionsCritical": 10,
        "failedInspectionsWarning": 3,
        "failedInspectionsCritical": 8
      }
    },
    "message": "Dashboard settings updated successfully"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | INVALID_THRESHOLD | Critical threshold must be >= warning threshold |
| 400 | NEGATIVE_VALUE | Threshold values must be non-negative |
| 403 | FORBIDDEN | Admin role required |

---

## 4. User Management Endpoints

All user management endpoints are **Admin only** and operate within the authenticated user's organisation.

### 4.1 GET /api/org-users

List all users in the current organisation.

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C77
**US-ID:** US-P3-05, WF-P3-05

#### Request

```
GET /api/org-users
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| role | string | Filter by role (worker, manager, admin) |
| isActive | boolean | Filter by active status |

#### Response (200 OK)

```json
{
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "john.doe@acme.com",
        "name": "John Doe",
        "role": "manager",
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-15T00:00:00Z"
      },
      {
        "id": "uuid",
        "email": "jane.smith@acme.com",
        "name": "Jane Smith",
        "role": "worker",
        "isActive": true,
        "createdAt": "2025-01-05T00:00:00Z",
        "updatedAt": "2025-01-05T00:00:00Z"
      }
    ],
    "total": 2
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Admin role required |

---

### 4.2 POST /api/org-users

Create a new user in the current organisation.

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C78, C81, C82
**US-ID:** US-P3-06, WF-P3-06

#### Request

```
POST /api/org-users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "new.user@acme.com",
  "name": "New User",
  "password": "SecurePass123!",
  "role": "worker"
}
```

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email, unique within org |
| name | string | Yes | 1-200 characters |
| password | string | Yes | Min 8 characters |
| role | string | Yes | worker, manager, or admin |

#### Response (201 Created)

```json
{
  "data": {
    "id": "uuid",
    "email": "new.user@acme.com",
    "name": "New User",
    "role": "worker",
    "isActive": true,
    "createdAt": "2025-01-25T12:00:00Z",
    "updatedAt": "2025-01-25T12:00:00Z"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | INVALID_EMAIL | Invalid email format |
| 400 | INVALID_ROLE | Role must be worker, manager, or admin |
| 400 | PASSWORD_TOO_SHORT | Password must be at least 8 characters |
| 400 | NAME_REQUIRED | Name is required |
| 403 | FORBIDDEN | Admin role required |
| 409 | EMAIL_EXISTS | A user with this email already exists in your organisation |

---

### 4.3 GET /api/org-users/:id

Get a specific user by ID.

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C77
**US-ID:** US-P3-05

#### Request

```
GET /api/org-users/uuid
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "data": {
    "id": "uuid",
    "email": "john.doe@acme.com",
    "name": "John Doe",
    "role": "manager",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T00:00:00Z"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Admin role required |
| 404 | USER_NOT_FOUND | User not found |

---

### 4.4 PUT /api/org-users/:id

Update user details (name, email, role).

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C79, C81
**US-ID:** US-P3-07, WF-P3-07

#### Request

```
PUT /api/org-users/uuid
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "john.updated@acme.com",
  "name": "John Doe Updated",
  "role": "admin"
}
```

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | No | Valid email, unique within org |
| name | string | No | 1-200 characters |
| role | string | No | worker, manager, or admin |

#### Business Rules

- Admin cannot change their own role
- Email must remain unique within organisation

#### Response (200 OK)

```json
{
  "data": {
    "id": "uuid",
    "email": "john.updated@acme.com",
    "name": "John Doe Updated",
    "role": "admin",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-25T12:00:00Z"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | CANNOT_CHANGE_OWN_ROLE | You cannot change your own role |
| 400 | INVALID_ROLE | Role must be worker, manager, or admin |
| 403 | FORBIDDEN | Admin role required |
| 404 | USER_NOT_FOUND | User not found |
| 409 | EMAIL_EXISTS | A user with this email already exists in your organisation |

---

### 4.5 POST /api/org-users/:id/disable

Disable a user account (block login).

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C80
**US-ID:** US-P3-08, WF-P3-08

#### Request

```
POST /api/org-users/uuid/disable
Authorization: Bearer <token>
```

#### Business Rules

- Cannot disable the last active admin in the organisation
- Cannot disable yourself

#### Response (200 OK)

```json
{
  "data": {
    "id": "uuid",
    "email": "john.doe@acme.com",
    "name": "John Doe",
    "role": "manager",
    "isActive": false,
    "message": "User disabled successfully"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | CANNOT_DISABLE_SELF | You cannot disable your own account |
| 400 | LAST_ADMIN | Cannot disable the only active admin in the organisation |
| 403 | FORBIDDEN | Admin role required |
| 404 | USER_NOT_FOUND | User not found |

---

### 4.6 POST /api/org-users/:id/enable

Enable a disabled user account.

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C80
**US-ID:** US-P3-08, WF-P3-08

#### Request

```
POST /api/org-users/uuid/enable
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "data": {
    "id": "uuid",
    "email": "john.doe@acme.com",
    "name": "John Doe",
    "role": "manager",
    "isActive": true,
    "message": "User enabled successfully"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Admin role required |
| 404 | USER_NOT_FOUND | User not found |

---

### 4.7 POST /api/org-users/:id/reset-password

Reset a user's password.

**Authentication:** Required
**Roles:** Admin only
**C-IDs:** C83
**US-ID:** US-P3-09, WF-P3-09

#### Request

```
POST /api/org-users/uuid/reset-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "newPassword": "NewSecurePass456!"
}
```

#### Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| newPassword | string | Yes | Min 8 characters |

#### Response (200 OK)

```json
{
  "data": {
    "message": "Password reset successfully"
  }
}
```

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | PASSWORD_TOO_SHORT | Password must be at least 8 characters |
| 403 | FORBIDDEN | Admin role required |
| 404 | USER_NOT_FOUND | User not found |

---

## 5. Export Endpoints

Export endpoints allow Managers and Admins to download data as CSV files. All exports are scoped to the user's organisation.

### 5.1 Rate Limiting

Exports are rate-limited to **1 export per 30 seconds per user**.

**Rate Limit Headers (on all export responses):**
```
X-RateLimit-Limit: 1
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706187630
```

**Rate Limited Response (429 Too Many Requests):**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Export rate limit exceeded. Please wait 25 seconds before trying again.",
    "retryAfter": 25
  }
}
```

**Headers on 429:**
```
Retry-After: 25
X-RateLimit-Limit: 1
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706187630
```

### 5.2 Row Limit

All exports are limited to **10,000 rows**. If the query returns more rows, the API returns an error asking the user to refine filters.

### 5.3 GET /api/exports/incidents

Export incidents to CSV.

**Authentication:** Required
**Roles:** Manager, Admin
**C-IDs:** C84, C87, C88, C89, C90
**US-ID:** US-P3-10, WF-P3-10

#### Request

```
GET /api/exports/incidents?startDate=2025-01-01&endDate=2025-01-31&siteId=uuid&status=open&severity=high
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | ISO 8601 date | No | Filter by occurred_at >= |
| endDate | ISO 8601 date | No | Filter by occurred_at <= |
| siteId | UUID | No | Filter by site |
| status | string | No | Filter by status (open, under_investigation, closed) |
| severity | string | No | Filter by severity (low, medium, high, critical) |

#### Response (200 OK)

**Headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="incidents_acme-corp_2025-01-25.csv"
X-RateLimit-Limit: 1
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706187630
```

**Body (CSV):**
```csv
ID,Title,Description,Type,Site,Site Code,Severity,Status,Occurred At,Reported By,Reporter Email,Created At,Updated At
uuid,"Slip and fall","Employee slipped on wet floor",Injury,Warehouse 1,WH1,medium,open,2025-01-15T10:30:00Z,John Doe,john@acme.com,2025-01-15T11:00:00Z,2025-01-15T11:00:00Z
```

#### CSV Columns

| Column | Source |
|--------|--------|
| ID | incidents.id |
| Title | incidents.title |
| Description | incidents.description |
| Type | incident_types.name |
| Site | sites.name |
| Site Code | sites.code |
| Severity | incidents.severity |
| Status | incidents.status |
| Occurred At | incidents.occurred_at (ISO 8601) |
| Reported By | users.name |
| Reporter Email | users.email |
| Created At | incidents.created_at |
| Updated At | incidents.updated_at |

#### Errors

| Status | Code | Message |
|--------|------|---------|
| 400 | TOO_MANY_ROWS | Export exceeds 10,000 row limit. Please refine your filters. |
| 400 | INVALID_DATE | Invalid date format. Use ISO 8601 (YYYY-MM-DD). |
| 403 | FORBIDDEN | Manager or Admin role required |
| 429 | RATE_LIMITED | Export rate limit exceeded. Please wait X seconds. |

---

### 5.4 GET /api/exports/inspections

Export inspections to CSV.

**Authentication:** Required
**Roles:** Manager, Admin
**C-IDs:** C85, C87, C88, C89, C90
**US-ID:** US-P3-11, WF-P3-11

#### Request

```
GET /api/exports/inspections?startDate=2025-01-01&endDate=2025-01-31&siteId=uuid&result=fail
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | ISO 8601 date | No | Filter by performed_at >= |
| endDate | ISO 8601 date | No | Filter by performed_at <= |
| siteId | UUID | No | Filter by site |
| result | string | No | Filter by overall_result (pass, fail) |

#### Response (200 OK)

**Headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="inspections_acme-corp_2025-01-25.csv"
```

**Body (CSV):**
```csv
ID,Template Name,Site,Site Code,Performed At,Performed By,Performer Email,Overall Result,Notes,Created At
uuid,Fire Safety Checklist,Warehouse 1,WH1,2025-01-15T14:00:00Z,Jane Smith,jane@acme.com,pass,"All items OK",2025-01-15T14:30:00Z
```

#### CSV Columns

| Column | Source |
|--------|--------|
| ID | inspections.id |
| Template Name | inspection_templates.name |
| Site | sites.name |
| Site Code | sites.code |
| Performed At | inspections.performed_at |
| Performed By | users.name |
| Performer Email | users.email |
| Overall Result | inspections.overall_result |
| Notes | inspections.notes |
| Created At | inspections.created_at |

#### Errors

Same as incidents export (400, 403, 429).

---

### 5.5 GET /api/exports/actions

Export actions to CSV.

**Authentication:** Required
**Roles:** Manager, Admin
**C-IDs:** C86, C87, C88, C89, C90
**US-ID:** US-P3-12, WF-P3-12

#### Request

```
GET /api/exports/actions?startDate=2025-01-01&endDate=2025-01-31&status=overdue&dueBefore=2025-01-20
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | ISO 8601 date | No | Filter by created_at >= |
| endDate | ISO 8601 date | No | Filter by created_at <= |
| status | string | No | Filter by status (open, in_progress, done, overdue) |
| dueBefore | ISO 8601 date | No | Filter by due_date <= |

#### Response (200 OK)

**Headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="actions_acme-corp_2025-01-25.csv"
```

**Body (CSV):**
```csv
ID,Title,Description,Source Type,Source ID,Source Name,Assigned To,Assignee Email,Created By,Creator Email,Due Date,Status,Completed At,Created At,Updated At
uuid,Install safety rails,Add rails to platform edge,incident,uuid,Slip and fall,John Doe,john@acme.com,Jane Smith,jane@acme.com,2025-02-01,open,,2025-01-15T12:00:00Z,2025-01-15T12:00:00Z
```

#### CSV Columns

| Column | Source |
|--------|--------|
| ID | actions.id |
| Title | actions.title |
| Description | actions.description |
| Source Type | actions.source_type |
| Source ID | actions.source_id |
| Source Name | Derived from incident title or inspection template name |
| Assigned To | users.name (assigned_to) |
| Assignee Email | users.email (assigned_to) |
| Created By | users.name (created_by) |
| Creator Email | users.email (created_by) |
| Due Date | actions.due_date |
| Status | actions.status |
| Completed At | actions.completed_at |
| Created At | actions.created_at |
| Updated At | actions.updated_at |

#### Errors

Same as incidents export (400, 403, 429).

---

## 6. Updated Auth Endpoints

### 6.1 POST /api/auth/login (Updated)

Login now validates user is_active status.

**Changes from Phase 2:**
- Returns 401 if user.is_active = false
- JWT token now includes organisationId

#### Request

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@acme.com",
  "password": "password123"
}
```

#### Response (200 OK)

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@acme.com",
      "name": "John Doe",
      "role": "manager",
      "organisationId": "uuid",
      "organisationName": "Acme Corporation",
      "organisationSlug": "acme-corp"
    }
  }
}
```

#### JWT Token Payload

```json
{
  "userId": "uuid",
  "email": "user@acme.com",
  "role": "manager",
  "organisationId": "uuid",
  "organisationSlug": "acme-corp",
  "iat": 1706187630,
  "exp": 1706216430
}
```

#### New Error

| Status | Code | Message |
|--------|------|---------|
| 401 | ACCOUNT_DISABLED | Your account has been disabled. Contact your administrator. |

---

## 7. Organisation Scoping Behavior

### 7.1 Implicit Scoping

All existing Phase 1 and Phase 2 endpoints are now implicitly scoped by `organisation_id`:

| Endpoint | Scoping Behavior |
|----------|------------------|
| GET /api/incidents | Returns only incidents from user's org |
| POST /api/incidents | Creates incident with user's org_id |
| GET /api/inspections | Returns only inspections from user's org |
| GET /api/actions | Returns only actions from user's org |
| GET /api/sites | Returns only sites from user's org |
| GET /api/incident-types | Returns system types + user's org types |
| GET /api/dashboard/summary | Aggregates only user's org data |

### 7.2 Cross-Org Access Prevention

Any attempt to access data from another organisation returns:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied"
  }
}
```

---

## 8. Endpoint Summary

### 8.1 Organisation Settings

| Method | Path | Roles | C-IDs |
|--------|------|-------|-------|
| GET | /api/organisation | All | C91, C93 |
| PUT | /api/organisation | Admin | C91, C93, C95 |
| POST | /api/organisation/logo | Admin | C92, C95 |
| DELETE | /api/organisation/logo | Admin | C92, C95 |
| PUT | /api/organisation/dashboard-settings | Admin | C94, C95 |

### 8.2 User Management

| Method | Path | Roles | C-IDs |
|--------|------|-------|-------|
| GET | /api/org-users | Admin | C77 |
| POST | /api/org-users | Admin | C78, C81, C82 |
| GET | /api/org-users/:id | Admin | C77 |
| PUT | /api/org-users/:id | Admin | C79, C81 |
| POST | /api/org-users/:id/disable | Admin | C80 |
| POST | /api/org-users/:id/enable | Admin | C80 |
| POST | /api/org-users/:id/reset-password | Admin | C83 |

### 8.3 Exports

| Method | Path | Roles | C-IDs |
|--------|------|-------|-------|
| GET | /api/exports/incidents | Manager, Admin | C84, C87-C90 |
| GET | /api/exports/inspections | Manager, Admin | C85, C87-C90 |
| GET | /api/exports/actions | Manager, Admin | C86, C87-C90 |

---

## 9. Checklist ID to Endpoint Mapping

| C-ID | Feature | Endpoint(s) |
|------|---------|-------------|
| C71 | Multi-org support | All endpoints (implicit scoping) |
| C72 | User belongs to one org | POST /api/org-users |
| C73 | All entities org-scoped | All endpoints (implicit scoping) |
| C74 | Data isolation | All endpoints (middleware) |
| C75 | Org admin scoped rights | /api/org-users/*, /api/organisation |
| C76 | System incident types | GET /api/incident-types (updated) |
| C77 | View org users | GET /api/org-users |
| C78 | Create org user | POST /api/org-users |
| C79 | Update org user | PUT /api/org-users/:id |
| C80 | Disable/enable user | POST /api/org-users/:id/disable, enable |
| C81 | Assign roles | POST/PUT /api/org-users |
| C82 | No self-registration | Admin-only POST /api/org-users |
| C83 | Reset password | POST /api/org-users/:id/reset-password |
| C84 | Export incidents | GET /api/exports/incidents |
| C85 | Export inspections | GET /api/exports/inspections |
| C86 | Export actions | GET /api/exports/actions |
| C87 | Export filters | Query params on export endpoints |
| C88 | Export org-scoped | Implicit org_id filter |
| C89 | Export filename | Content-Disposition header |
| C90 | Export row limit | 10K limit, TOO_MANY_ROWS error |
| C91 | Org name | GET/PUT /api/organisation |
| C92 | Org logo | POST/DELETE /api/organisation/logo |
| C93 | Org timezone | GET/PUT /api/organisation |
| C94 | Dashboard thresholds | PUT /api/organisation/dashboard-settings |
| C95 | Admin-only settings | Role checks on all org endpoints |

---

## 10. Related Documents

- [BRD_EHS_PORTAL_PHASE3.md](./BRD_EHS_PORTAL_PHASE3.md) - Phase 3 requirements
- [DATA_MODEL_PHASE3.md](./DATA_MODEL_PHASE3.md) - Phase 3 data model
- [ARCHITECTURE_PHASE3.md](./ARCHITECTURE_PHASE3.md) - Phase 3 architecture
- [WORKFLOWS_PHASE3.md](./WORKFLOWS_PHASE3.md) - Phase 3 workflows

---

*End of Document*

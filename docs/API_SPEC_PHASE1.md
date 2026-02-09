# API Specification - EHS Portal (Phase 1)

## 1. Overview

This document defines all REST API endpoints for Phase 1 of the EHS Portal.

### Base Configuration

| Setting | Value |
|---------|-------|
| Base URL | `http://localhost:3001/api` |
| Content-Type | `application/json` |
| Auth Header | `Authorization: Bearer <jwt_token>` |

### Standard Error Response

All errors return JSON in this format:

```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Successful GET, PUT |
| 201 | Successful POST (created) |
| 400 | Validation errors, bad request |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 500 | Server error |

---

## 2. Authentication Endpoints

> **Note:** In Phase 1, there is no self-registration endpoint. User accounts are created by admins directly in the database or via a future admin user management feature. This ensures controlled access and proper role assignment.

### POST /api/auth/login

Authenticate and receive JWT token.

**Auth Required:** No

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": -550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "worker"
  }
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 401 | INVALID_CREDENTIALS | Invalid email or password |

**Related Test Cases:** TC-AUTH-01, TC-AUTH-02

---

### GET /api/auth/me

Get current authenticated user profile.

**Auth Required:** Yes (any role)

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "worker"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 401 | UNAUTHORIZED | Invalid or expired token |

**Related Test Cases:** TC-AUTH-03, TC-AUTH-04

---

## 3. Sites Endpoints

### GET /api/sites

List all sites.

**Auth Required:** Yes (any role)

**Success Response (200):**
```json
{
  "sites": [
    {
      "id": -550e8400-e29b-41d4-a716-446655440001",
      "name": "Head Office",
      "code": "HO",
      "createdAt": -2025-01-01T00:00:00Z",
      "updatedAt": -2025-01-01T00:00:00Z"
    },
    {
      "id": -550e8400-e29b-41d4-a716-446655440002",
      "name": "Warehouse 1",
      "code": "WH1",
      "createdAt": -2025-01-01T00:00:00Z",
      "updatedAt": -2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /api/sites

Create a new site.

**Auth Required:** Yes (admin only)

**Request Body:**
```json
{
  "name": "Distribution Center",
  "code": "DC1"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Max 200 chars |
| code | string | No | Max 50 chars, unique |

**Success Response (201):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440003",
  "name": "Distribution Center",
  "code": "DC1",
  "createdAt": -2025-01-10T10:00:00Z",
  "updatedAt": -2025-01-10T10:00:00Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | DUPLICATE_CODE | Site code already exists |
| 400 | VALIDATION_ERROR | Name is required |
| 403 | FORBIDDEN | Admin access required |

**Related Test Cases:** TC-SITE-01, TC-SITE-03, TC-AUTH-06

---

### PUT /api/sites/:id

Update an existing site.

**Auth Required:** Yes (admin only)

**URL Parameters:**
- `id` (UUID) - Site ID

**Request Body:**
```json
{
  "name": "Distribution Center - Main",
  "code": "DC1"
}
```

**Success Response (200):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440003",
  "name": "Distribution Center - Main",
  "code": "DC1",
  "createdAt": -2025-01-10T10:00:00Z",
  "updatedAt": -2025-01-10T12:00:00Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | DUPLICATE_CODE | Site code already exists |
| 403 | FORBIDDEN | Admin access required |
| 404 | NOT_FOUND | Site not found |

**Related Test Cases:** TC-SITE-02

---

## 4. Incident Types Endpoints

### GET /api/incident-types

List all incident types.

**Auth Required:** Yes (any role)

**Success Response (200):**
```json
{
  "incidentTypes": [
    {
      "id": -550e8400-e29b-41d4-a716-446655440010",
      "name": "Injury",
      "description": "Physical injury to person"
    },
    {
      "id": -550e8400-e29b-41d4-a716-446655440011",
      "name": "Near Miss",
      "description": "Close call without injury"
    },
    {
      "id": -550e8400-e29b-41d4-a716-446655440012",
      "name": "Property Damage",
      "description": "Damage to equipment or property"
    },
    {
      "id": -550e8400-e29b-41d4-a716-446655440013",
      "name": "Environmental",
      "description": "Spill, emission, or environmental impact"
    },
    {
      "id": -550e8400-e29b-41d4-a716-446655440014",
      "name": "Other",
      "description": "Other safety event"
    }
  ]
}
```

**Related Test Cases:** TC-REF-01, TC-REF-02

---

### POST /api/incident-types

Create a new incident type.

**Auth Required:** Yes (admin only)

**Request Body:**
```json
{
  "name": "Fire Hazard",
  "description": "Fire-related hazard or event"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Max 100 chars, unique |
| description | string | No | Text |

**Success Response (201):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440015",
  "name": "Fire Hazard",
  "description": "Fire-related hazard or event",
  "isActive": true
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | DUPLICATE_NAME | Incident type name already exists |
| 400 | VALIDATION_ERROR | Name is required |
| 403 | FORBIDDEN | Admin access required |

**Related Test Cases:** TC-REF-03, TC-REF-04

---

### PUT /api/incident-types/:id

Update an existing incident type.

**Auth Required:** Yes (admin only)

**URL Parameters:**
- `id` (UUID) - Incident type ID

**Request Body:**
```json
{
  "name": "Fire Hazard",
  "description": "Updated description"
}
```

**Success Response (200):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440015",
  "name": "Fire Hazard",
  "description": "Updated description",
  "isActive": true
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | DUPLICATE_NAME | Incident type name already exists |
| 403 | FORBIDDEN | Admin access required |
| 404 | NOT_FOUND | Incident type not found |

**Related Test Cases:** TC-REF-04

---

### PATCH /api/incident-types/:id

Deactivate or reactivate an incident type.

**Auth Required:** Yes (admin only)

**URL Parameters:**
- `id` (UUID) - Incident type ID

**Request Body:**
```json
{
  "isActive": false
}
```

**Success Response (200):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440015",
  "name": "Fire Hazard",
  "description": "Fire-related hazard or event",
  "isActive": false
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Admin access required |
| 404 | NOT_FOUND | Incident type not found |

**Related Test Cases:** TC-REF-04

---

## 5. Incidents Endpoints

### GET /api/incidents

List incidents with optional filters.

**Auth Required:** Yes (role-based filtering applied)

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status: open, under_investigation, closed |
| siteId | UUID | Filter by site |

**Role-Based Filtering:**
- **Worker:** Returns only incidents reported by the current user
- **Manager/Admin:** Returns all incidents

**Success Response (200):**
```json
{
  "incidents": [
    {
      "id": -550e8400-e29b-41d4-a716-446655440020",
      "title": "Slip in warehouse",
      "incidentType": {
        "id": -550e8400-e29b-41d4-a716-446655440010",
        "name": "Injury"
      },
      "site": {
        "id": -550e8400-e29b-41d4-a716-446655440002",
        "name": "Warehouse 1"
      },
      "severity": "medium",
      "status": "open",
      "occurredAt": -2025-01-10T14:30:00Z",
      "reportedBy": {
        "id": -550e8400-e29b-41d4-a716-446655440000",
        "firstName": "John",
        "lastName": "Doe"
      },
      "createdAt": -2025-01-10T15:00:00Z"
    }
  ]
}
```

**Related Test Cases:** TC-INC-04, TC-INC-05, TC-INC-06

---

### GET /api/incidents/:id

Get incident details.

**Auth Required:** Yes

**URL Parameters:**
- `id` (UUID) - Incident ID

**Success Response (200):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440020",
  "title": "Slip in warehouse",
  "description": "Employee slipped on wet floor near loading bay. Minor injury to knee.",
  "incidentType": {
    "id": -550e8400-e29b-41d4-a716-446655440010",
    "name": "Injury"
  },
  "site": {
    "id": -550e8400-e29b-41d4-a716-446655440002",
    "name": "Warehouse 1"
  },
  "severity": "medium",
  "status": "open",
  "occurredAt": -2025-01-10T14:30:00Z",
  "reportedBy": {
    "id": -550e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Doe"
  },
  "createdAt": -2025-01-10T15:00:00Z",
  "updatedAt": -2025-01-10T15:00:00Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 404 | NOT_FOUND | Incident not found |

---

### POST /api/incidents

Create a new incident.

**Auth Required:** Yes (any role)

**Request Body:**
```json
{
  "title": "Slip in warehouse",
  "description": "Employee slipped on wet floor near loading bay",
  "incidentTypeId": -550e8400-e29b-41d4-a716-446655440010",
  "siteId": -550e8400-e29b-41d4-a716-446655440002",
  "severity": "medium",
  "occurredAt": -2025-01-10T14:30:00Z"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| title | string | Yes | Max 200 chars |
| description | string | No | Text |
| incidentTypeId | UUID | Yes | Must exist |
| siteId | UUID | Yes | Must exist |
| severity | string | Yes | One of: low, medium, high, critical |
| occurredAt | ISO datetime | Yes | Valid datetime |

**Success Response (201):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440020",
  "title": "Slip in warehouse",
  "description": "Employee slipped on wet floor near loading bay",
  "incidentType": {
    "id": -550e8400-e29b-41d4-a716-446655440010",
    "name": "Injury"
  },
  "site": {
    "id": -550e8400-e29b-41d4-a716-446655440002",
    "name": "Warehouse 1"
  },
  "severity": "medium",
  "status": "open",
  "occurredAt": -2025-01-10T14:30:00Z",
  "reportedBy": {
    "id": -550e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Doe"
  },
  "createdAt": -2025-01-10T15:00:00Z",
  "updatedAt": -2025-01-10T15:00:00Z"
}
```

**Notes:**
- `status` is automatically set to `open`
- `reported_by` is set to the current authenticated user

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Title is required |
| 400 | VALIDATION_ERROR | Invalid incident type |
| 400 | VALIDATION_ERROR | Invalid site |

**Related Test Cases:** TC-INC-01, TC-INC-02, TC-INC-03

---

### PUT /api/incidents/:id

Update an incident.

**Auth Required:** Yes (manager/admin for status changes)

**URL Parameters:**
- `id` (UUID) - Incident ID

**Request Body:**
```json
{
  "status": "under_investigation"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | string | No | Only reporter can update |
| description | string | No | Only reporter can update |
| status | string | No | Only manager/admin can update |

**Success Response (200):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440020",
  "title": "Slip in warehouse",
  "status": "under_investigation",
  "updatedAt": -2025-01-10T16:00:00Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Only managers can update incident status |
| 404 | NOT_FOUND | Incident not found |

**Related Test Cases:** TC-INC-07, TC-INC-08

---

## 6. Inspection Templates Endpoints

### GET /api/inspection-templates

List all inspection templates.

**Auth Required:** Yes (any role)

**Success Response (200):**
```json
{
  "templates": [
    {
      "id": -550e8400-e29b-41d4-a716-446655440030",
      "name": "Fire Safety Inspection",
      "description": "Monthly fire safety checklist",
      "itemCount": 10,
      "createdAt": -2025-01-01T00:00:00Z",
      "updatedAt": -2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /api/inspection-templates/:id

Get template with items.

**Auth Required:** Yes (any role)

**URL Parameters:**
- `id` (UUID) - Template ID

**Success Response (200):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440030",
  "name": "Fire Safety Inspection",
  "description": "Monthly fire safety checklist",
  "items": [
    {
      "id": -550e8400-e29b-41d4-a716-446655440031",
      "label": "Fire extinguishers accessible",
      "category": "Equipment",
      "sortOrder": 1
    },
    {
      "id": -550e8400-e29b-41d4-a716-446655440032",
      "label": "Emergency exits clear",
      "category": "Egress",
      "sortOrder": 2
    }
  ],
  "createdAt": -2025-01-01T00:00:00Z",
  "updatedAt": -2025-01-01T00:00:00Z"
}
```

**Related Test Cases:** TC-INSP-03

---

### POST /api/inspection-templates

Create a new template with items.

**Auth Required:** Yes (admin only)

**Request Body:**
```json
{
  "name": "Fire Safety Inspection",
  "description": "Monthly fire safety checklist",
  "items": [
    {
      "label": "Fire extinguishers accessible",
      "category": "Equipment",
      "sortOrder": 1
    },
    {
      "label": "Emergency exits clear",
      "category": "Egress",
      "sortOrder": 2
    }
  ]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Max 200 chars |
| description | string | No | Text |
| items | array | No | Array of item objects |
| items[].label | string | Yes | Max 300 chars |
| items[].category | string | No | Max 100 chars |
| items[].sortOrder | integer | Yes | Order in list |

**Success Response (201):**
Returns created template with items (same structure as GET /:id)

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Name is required |
| 403 | FORBIDDEN | Admin access required |

**Related Test Cases:** TC-INSP-01

---

### PUT /api/inspection-templates/:id

Update template and items.

**Auth Required:** Yes (admin only)

**URL Parameters:**
- `id` (UUID) - Template ID

**Request Body:**
Same structure as POST. Items array replaces all existing items.

**Success Response (200):**
Returns updated template with items.

**Related Test Cases:** TC-INSP-02

---

## 7. Inspections Endpoints

### GET /api/inspections

List inspections with optional filters.

**Auth Required:** Yes

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| siteId | UUID | Filter by site |
| templateId | UUID | Filter by template |
| result | string | Filter by result: pass, fail |

**Success Response (200):**
```json
{
  "inspections": [
    {
      "id": -550e8400-e29b-41d4-a716-446655440040",
      "template": {
        "id": -550e8400-e29b-41d4-a716-446655440030",
        "name": "Fire Safety Inspection"
      },
      "site": {
        "id": -550e8400-e29b-41d4-a716-446655440002",
        "name": "Warehouse 1"
      },
      "performedBy": {
        "id": -550e8400-e29b-41d4-a716-446655440000",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "performedAt": -2025-01-10T10:00:00Z",
      "overallResult": "pass",
      "createdAt": -2025-01-10T10:30:00Z"
    }
  ]
}
```

**Related Test Cases:** TC-INSP-07

---

### GET /api/inspections/:id

Get inspection with responses.

**Auth Required:** Yes

**URL Parameters:**
- `id` (UUID) - Inspection ID

**Success Response (200):**
```json
{
  "id": -550e8400-e29b-41d4-a716-446655440040",
  "template": {
    "id": -550e8400-e29b-41d4-a716-446655440030",
    "name": "Fire Safety Inspection"
  },
  "site": {
    "id": -550e8400-e29b-41d4-a716-446655440002",
    "name": "Warehouse 1"
  },
  "performedBy": {
    "id": -550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "performedAt": -2025-01-10T10:00:00Z",
  "overallResult": "pass",
  "notes": "All items satisfactory",
  "responses": [
    {
      "id": -550e8400-e29b-41d4-a716-446655440041",
      "templateItem": {
        "id": -550e8400-e29b-41d4-a716-446655440031",
        "label": "Fire extinguishers accessible",
        "category": "Equipment"
      },
      "result": "ok",
      "comment": null
    },
    {
      "id": -550e8400-e29b-41d4-a716-446655440042",
      "templateItem": {
        "id": -550e8400-e29b-41d4-a716-446655440032",
        "label": "Emergency exits clear",
        "category": "Egress"
      },
      "result": "ok",
      "comment": "Minor obstruction removed during inspection"
    }
  ],
  "createdAt": -2025-01-10T10:30:00Z"
}
```

**Related Test Cases:** TC-INSP-08

---

### POST /api/inspections

Create a new inspection with responses.

**Auth Required:** Yes (manager/admin)

**Request Body:**
```json
{
  "templateId": -550e8400-e29b-41d4-a716-446655440030",
  "siteId": -550e8400-e29b-41d4-a716-446655440002",
  "performedAt": -2025-01-10T10:00:00Z",
  "notes": "All items satisfactory",
  "responses": [
    {
      "templateItemId": -550e8400-e29b-41d4-a716-446655440031",
      "result": "ok",
      "comment": null
    },
    {
      "templateItemId": -550e8400-e29b-41d4-a716-446655440032",
      "result": "not_ok",
      "comment": "Extinguisher expired"
    }
  ]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| templateId | UUID | Yes | Must exist |
| siteId | UUID | Yes | Must exist |
| performedAt | ISO datetime | Yes | Valid datetime |
| notes | string | No | Text |
| responses | array | Yes | One per template item |
| responses[].templateItemId | UUID | Yes | Must match template |
| responses[].result | string | Yes | One of: ok, not_ok, na |
| responses[].comment | string | No | Text |

**Success Response (201):**
Returns created inspection with computed `overallResult`.

**Notes:**
- `overallResult` is computed automatically:
  - `fail` if ANY response.result is `not_ok`
  - `pass` if all responses are `ok` or `na`
- `performed_by` is set to the current authenticated user

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Template not found |
| 400 | VALIDATION_ERROR | Missing response for template item |
| 403 | FORBIDDEN | Manager access required |

**Related Test Cases:** TC-INSP-04, TC-INSP-05, TC-INSP-06

---

## 8. Dashboard Endpoints

### GET /api/dashboard/summary

Get dashboard summary data.

**Auth Required:** Yes (any role)

**Success Response (200):**
```json
{
  "kpis": {
    "totalIncidents": 47,
    "openIncidents": 12,
    "incidentsLast30Days": 8,
    "inspectionsLast30Days": 15,
    "failedInspectionsLast30Days": 3
  },
  "incidentsByType": [
    { "type": "Injury", "count": 15 },
    { "type": "Near Miss", "count": 20 },
    { "type": "Property Damage", "count": 10 },
    { "type": "Environmental", "count": 2 }
  ],
  "severityTrend": [
    { "month": -2024-02", "low": 2, "medium": 3, "high": 1, "critical": 0 },
    { "month": -2024-03", "low": 1, "medium": 4, "high": 2, "critical": 1 },
    { "month": -2024-04", "low": 3, "medium": 2, "high": 1, "critical": 0 }
  ],
  "recentIncidents": [
    {
      "id": -550e8400-e29b-41d4-a716-446655440020",
      "title": "Slip in warehouse",
      "severity": "medium",
      "status": "open",
      "occurredAt": -2025-01-10T14:30:00Z"
    }
  ],
  "recentInspections": [
    {
      "id": -550e8400-e29b-41d4-a716-446655440040",
      "templateName": "Fire Safety",
      "siteName": "Warehouse 1",
      "overallResult": "pass",
      "performedAt": -2025-01-10T10:00:00Z"
    }
  ]
}
```

**Response Fields:**

| Field | Description |
|-------|-------------|
| kpis.totalIncidents | Total count of all incidents |
| kpis.openIncidents | Count where status = 'open' |
| kpis.incidentsLast30Days | Created in last 30 days |
| kpis.inspectionsLast30Days | Performed in last 30 days |
| kpis.failedInspectionsLast30Days | overall_result = 'fail' in last 30 days |
| incidentsByType | Grouped count by incident type |
| severityTrend | Monthly breakdown by severity (last 12 months) |
| recentIncidents | 5-10 most recent incidents |
| recentInspections | 5-10 most recent inspections |

**Related Test Cases:** TC-DASH-01, TC-DASH-02, TC-DASH-03, TC-DASH-04

---

## 9. Checklist Mapping

| Endpoint | Checklist IDs |
|----------|---------------|
| POST /api/auth/login | C35 |
| GET /api/auth/me | C36 |
| GET /api/sites | C18 |
| POST /api/sites | C16 |
| PUT /api/sites/:id | C17 |
| GET /api/incident-types | C6, C7, C19 |
| POST /api/incident-types | C6, C19 |
| PUT /api/incident-types/:id | C6, C19 |
| PATCH /api/incident-types/:id | C6, C19 |
| GET /api/incidents | C2, C3 |
| POST /api/incidents | C1 |
| PUT /api/incidents/:id | C5 |
| GET /api/inspection-templates | C8, C9 |
| POST /api/inspection-templates | C8, C9, C10, C11 |
| PUT /api/inspection-templates/:id | C10, C11 |
| GET /api/inspections | C14 |
| POST /api/inspections | C12, C13 |
| GET /api/inspections/:id | C15 |
| GET /api/dashboard/summary | C47-C55 |

---

## 10. Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DATA_MODEL.md](./DATA_MODEL.md) - Database schema
- [FRONTEND_UX_PHASE1.md](./FRONTEND_UX_PHASE1.md) - UI screens and flows
- [TEST_STRATEGY_PHASE1.md](./TEST_STRATEGY_PHASE1.md) - Testing approach




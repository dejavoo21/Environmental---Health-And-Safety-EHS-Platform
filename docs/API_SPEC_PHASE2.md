# API Specification - EHS Portal (Phase 2)

## 1. Overview

This document defines all REST API endpoints for Phase 2 of the EHS Portal:
- Actions / CAPA
- Attachments / Evidence
- Audit log / Activity history
- In-app Help

### Base Configuration

| Setting | Value |
|---------|-------|
| Base URL | `http://localhost:3001/api` |
| Content-Type | `application/json` (or `multipart/form-data` for uploads) |
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
| 413 | File too large |
| 415 | Unsupported media type |
| 500 | Server error |

---

## 2. Actions / CAPA Endpoints

### RBAC Summary (Actions)

| Endpoint | Worker | Manager | Admin |
|----------|--------|---------|-------|
| GET /api/actions (scope=my) | Yes | Yes | Yes |
| GET /api/actions (scope=all) | No | Yes | Yes |
| GET /api/actions/:id | Assignee only | Yes | Yes |
| GET /api/incidents/:id/actions | Yes (if incident visible) | Yes | Yes |
| GET /api/inspections/:id/actions | Yes (if inspection visible) | Yes | Yes |
| POST /api/actions | No | Yes | Yes |
| PUT /api/actions/:id | Assignee only (status) | Yes | Yes |

---

### GET /api/actions

List actions with filters.

**Auth Required:** Yes

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| scope | string | `my` (default) or `all` |
| status | string | open, in_progress, done, overdue |
| siteId | UUID | Filter by site (via incident/inspection source) |
| dueDateFrom | date | Filter by due_date (inclusive) |
| dueDateTo | date | Filter by due_date (inclusive) |

**Role Behavior:**
- scope=my: returns actions assigned to current user
- scope=all: managers/admins only

**Site Filter Derivation:**
- For sourceType=incident, siteId = incidents.site_id
- For sourceType=inspection, siteId = inspections.site_id
- Responses may include computed `siteId` to simplify frontend filtering

**Success Response (200):**
```json
{
  "actions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "title": "Replace damaged extinguisher",
      "description": "Replace unit in Warehouse 1",
      "sourceType": "inspection",
      "sourceId": "550e8400-e29b-41d4-a716-446655440200",
      "siteId": "550e8400-e29b-41d4-a716-446655440002",
      "linkedResponseId": "550e8400-e29b-41d4-a716-446655440201",
      "assignedTo": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "dueDate": "2025-02-01",
      "status": "open",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### GET /api/incidents/:id/actions

List actions linked to an incident.

**Auth Required:** Yes (any role with access to incident)

**Success Response (200):** Same structure as GET /api/actions

---

### GET /api/actions/:id

Get action details.

**Auth Required:** Yes (assignee or manager/admin)

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "title": "Replace damaged extinguisher",
  "description": "Replace unit in Warehouse 1",
  "sourceType": "inspection",
  "sourceId": "550e8400-e29b-41d4-a716-446655440200",
  "siteId": "550e8400-e29b-41d4-a716-446655440002",
  "linkedResponseId": "550e8400-e29b-41d4-a716-446655440201",
  "assignedTo": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "firstName": "Manager",
    "lastName": "User"
  },
  "dueDate": "2025-02-01",
  "status": "open",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Not allowed to view this action |
| 404 | NOT_FOUND | Action not found |

---

### GET /api/inspections/:id/actions

List actions linked to an inspection.

**Auth Required:** Yes (any role with access to inspection)

**Success Response (200):** Same structure as GET /api/actions

---

### POST /api/actions

Create a new action (incident or inspection source).

**Auth Required:** Yes (manager/admin)

**Request Body:**
```json
{
  "title": "Install guard rail",
  "description": "Install guard rail near loading dock",
  "sourceType": "incident",
  "sourceId": "550e8400-e29b-41d4-a716-446655440020",
  "linkedResponseId": null,
  "assignedToId": "550e8400-e29b-41d4-a716-446655440001",
  "dueDate": "2025-02-10"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| title | string | Yes | Max 255 chars |
| description | string | No | Max 5000 chars |
| sourceType | string | Yes | incident or inspection |
| sourceId | UUID | Yes | Must exist |
| linkedResponseId | UUID | No | Required only if sourceType=inspection and linking to item |
| assignedToId | UUID | Yes | Must be a valid user |
| dueDate | date | No | Cannot be in the past |

**Success Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "title": "Install guard rail",
  "description": "Install guard rail near loading dock",
  "sourceType": "incident",
  "sourceId": "550e8400-e29b-41d4-a716-446655440020",
  "linkedResponseId": null,
  "assignedTo": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "firstName": "Manager",
    "lastName": "User"
  },
  "dueDate": "2025-02-10",
  "status": "open",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Missing required fields |
| 400 | INVALID_SOURCE | Source entity not found |
| 403 | FORBIDDEN | Manager/Admin access required |

---

### PUT /api/actions/:id

Update an action (status, assignee, due date, title, description).

**Auth Required:** Yes

**Role Rules:**
- Assignee can update status only
- Manager/Admin can update status and assignee/due date

**Request Body:**
```json
{
  "status": "in_progress",
  "assignedToId": "550e8400-e29b-41d4-a716-446655440001",
  "dueDate": "2025-02-15"
}
```

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "status": "in_progress",
  "updatedAt": "2025-01-16T08:30:00Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Not permitted to update this action |
| 404 | NOT_FOUND | Action not found |

---

## 3. Attachments Endpoints

### RBAC Summary (Attachments)

| Endpoint | Worker | Manager | Admin |
|----------|--------|---------|-------|
| POST /api/attachments | Yes (own incident/action) | Yes | Yes |
| GET /api/attachments | Yes | Yes | Yes |
| GET /api/attachments/:id/download | Yes | Yes | Yes |

---

### POST /api/attachments

Upload an attachment to an incident, inspection, or action.

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| entityType | string | Yes | incident, inspection, action |
| entityId | UUID | Yes | ID of the target entity |
| file | file | Yes | Max 10 MB, allowed types only |

**Allowed File Types:**  
image/jpeg, image/png, image/gif, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

**Success Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440300",
  "entityType": "incident",
  "entityId": "550e8400-e29b-41d4-a716-446655440020",
  "filename": "photo.jpg",
  "fileType": "image/jpeg",
  "fileSize": 245678,
  "uploadedBy": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "firstName": "Jane",
    "lastName": "Smith"
  },
  "uploadedAt": "2025-01-15T12:00:00Z"
}
```

**Error Responses:**

| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | Invalid entity or missing file |
| 413 | FILE_TOO_LARGE | File exceeds max size |
| 415 | UNSUPPORTED_MEDIA | File type not allowed |
| 403 | FORBIDDEN | Not allowed to upload to target entity |

---

### GET /api/attachments

List attachments by entity.

**Auth Required:** Yes

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| entityType | string | incident, inspection, action |
| entityId | UUID | ID of the target entity |

**Success Response (200):**
```json
{
  "attachments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440300",
      "filename": "photo.jpg",
      "fileType": "image/jpeg",
      "fileSize": 245678,
      "uploadedBy": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "uploadedAt": "2025-01-15T12:00:00Z"
    }
  ]
}
```

---

### GET /api/attachments/:id/download

Download an attachment file.

**Auth Required:** Yes

**Success Response (200):**
- Binary file stream with original filename

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Not allowed to access this attachment |
| 404 | NOT_FOUND | Attachment not found |

---

## 4. Audit Log Endpoints

### RBAC Summary (Audit)

| Endpoint | Worker | Manager | Admin |
|----------|--------|---------|-------|
| GET /api/incidents/:id/audit-log | Yes (if incident visible) | Yes | Yes |
| GET /api/inspections/:id/audit-log | Yes (if inspection visible) | Yes | Yes |
| GET /api/actions/:id/audit-log | Assignee or manager/admin | Yes | Yes |
| GET /api/audit-logs | No | No | Yes |

---

### GET /api/incidents/:id/audit-log

Get audit history for an incident.

**Auth Required:** Yes

**Visibility Rules:**
- Workers: only incidents they reported
- Managers/Admins: all incidents they can access

**Success Response (200):**
```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440500",
      "eventType": "created",
      "entityType": "incident",
      "entityId": "550e8400-e29b-41d4-a716-446655440020",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "occurredAt": "2025-01-10T15:00:00Z",
      "oldValue": null,
      "newValue": { "status": "open" },
      "metadata": null
    }
  ]
}
```

---

### GET /api/inspections/:id/audit-log

Get audit history for an inspection.

**Auth Required:** Yes

**Visibility Rules:**
- Workers: only inspections they performed (if applicable)
- Managers/Admins: all inspections they can access

**Success Response (200):** Same structure as incident audit log

---

### GET /api/actions/:id/audit-log

Get audit history for an action.

**Auth Required:** Yes (assignee or manager/admin)

**Visibility Rules:**
- Workers: only actions assigned to them
- Managers/Admins: actions they can access

**Success Response (200):** Same structure as incident audit log

---

### GET /api/audit-logs

Admin-only system audit log.

**Auth Required:** Yes (admin only)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| entityType | string | incident, inspection, action |
| entityId | UUID | Filter by entity ID |
| eventType | string | created, updated, status_changed, severity_changed, attachment_added, attachment_removed, assigned |
| from | datetime | Filter by start date |
| to | datetime | Filter by end date |

**Success Response (200):** Same structure as incident audit log

**Error Responses:**
| Status | Code | Message |
|--------|------|---------|
| 403 | FORBIDDEN | Admin access required |

---

## 5. Help Endpoints

### GET /api/help

List help topics.

**Auth Required:** Yes (any role)

**Success Response (200):**
```json
{
  "topics": [
    {
      "id": "help-incidents",
      "title": "How to report an incident",
      "slug": "incidents",
      "summary": "Steps for reporting a new incident",
      "updatedAt": "2025-01-10T10:00:00Z"
    }
  ]
}
```

---

### GET /api/help/:slug

Get help content by slug.

**Auth Required:** Yes (any role)

**Success Response (200):**
```json
{
  "id": "help-incidents",
  "title": "How to report an incident",
  "slug": "incidents",
  "content": "Step 1: Open Incidents. Step 2: Click New Incident...",
  "updatedAt": "2025-01-10T10:00:00Z"
}
```

---

## 6. Checklist Mapping

| Endpoint | Checklist IDs |
|----------|---------------|
| GET /api/actions | C25, C26, C27 |
| GET /api/actions/:id | C25, C26 |
| GET /api/incidents/:id/actions | C20 |
| GET /api/inspections/:id/actions | C21 |
| POST /api/actions | C20, C21, C22, C23 |
| PUT /api/actions/:id | C23, C24 |
| POST /api/attachments | C28, C29, C30, C31, C33 |
| GET /api/attachments | C32 |
| GET /api/attachments/:id/download | C32 |
| GET /api/incidents/:id/audit-log | C40, C41, C44 |
| GET /api/inspections/:id/audit-log | C42, C45 |
| GET /api/actions/:id/audit-log | C43 |
| GET /api/audit-logs | C46 |
| GET /api/help | C68, C69 |
| GET /api/help/:slug | C69, C70 |

---

## 7. Related Documents

- [ARCHITECTURE_PHASE2.md](./ARCHITECTURE_PHASE2.md) - Phase 2 architecture
- [DATA_MODEL_PHASE2.md](./DATA_MODEL_PHASE2.md) - Phase 2 data model
- [FRONTEND_UX_PHASE2.md](./FRONTEND_UX_PHASE2.md) - Phase 2 UI screens
- [TEST_STRATEGY_PHASE2.md](./TEST_STRATEGY_PHASE2.md) - Phase 2 testing approach

Activity log endpoints return history only if the caller is authorised to view the underlying entity. Workers see logs for incidents they reported, inspections they performed, and actions assigned to them; managers and admins see logs for all entities within their normal visibility.

For filtering actions by site, the siteId is derived from the source entity: incident.site_id for incident-sourced actions, inspection.site_id for inspection-sourced actions.

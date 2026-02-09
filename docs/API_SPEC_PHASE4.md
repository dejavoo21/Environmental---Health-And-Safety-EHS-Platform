# API Specification – Phase 4: Notifications & Escalations

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-01-31 |
| Phase | 4 – Notifications & Escalations |

---

## 1. Overview

Phase 4 introduces API endpoints for notifications, user preferences, and admin job management. All endpoints require authentication and are scoped to the user's organisation.

### 1.1 Base URL

```
/api
```

### 1.2 Authentication

All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <token>
```

### 1.3 Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

---

## 2. Notifications Endpoints

### 2.1 GET /notifications

Retrieve paginated list of notifications for the authenticated user.

**Authorization:** Any authenticated user

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number |
| limit | integer | No | 20 | Items per page (max 100) |
| type | string | No | all | Filter by type: `action_assigned`, `action_overdue`, `incident_high_severity`, etc. |
| is_read | boolean | No | all | Filter by read status |
| startDate | ISO date | No | - | Filter notifications created after this date |
| endDate | ISO date | No | - | Filter notifications created before this date |

**Response:**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "action_assigned",
        "priority": "normal",
        "title": "New action assigned",
        "message": "You have been assigned to: Review fire extinguisher compliance",
        "relatedType": "action",
        "relatedId": "uuid",
        "isRead": false,
        "readAt": null,
        "metadata": {
          "actionTitle": "Review fire extinguisher compliance",
          "dueDate": "2026-02-07"
        },
        "createdAt": "2026-01-31T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**Example Request:**

```bash
GET /api/notifications?page=1&limit=20&is_read=false
Authorization: Bearer <token>
```

---

### 2.2 GET /notifications/unread-count

Get the count of unread notifications (for badge display).

**Authorization:** Any authenticated user

**Response:**

```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

**Notes:**
- Returns maximum of 99 (for "99+" badge display)
- Optimized query using partial index

---

### 2.3 PUT /notifications/:id/read

Mark a single notification as read.

**Authorization:** Owner of notification only

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Notification ID |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isRead": true,
    "readAt": "2026-01-31T11:00:00Z"
  }
}
```

**Error Responses:**

- `404 NOT_FOUND` - Notification not found or belongs to another user

---

### 2.4 PUT /notifications/mark-all-read

Mark all notifications as read for the authenticated user.

**Authorization:** Any authenticated user

**Response:**

```json
{
  "success": true,
  "data": {
    "updated": 15
  }
}
```

---

### 2.5 DELETE /notifications/:id

Delete a single notification.

**Authorization:** Owner of notification only

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Notification ID |

**Response:**

```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## 3. Preferences Endpoints

### 3.1 GET /preferences/notifications

Get the authenticated user's notification preferences.

**Authorization:** Any authenticated user

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "emailActionAssigned": true,
    "emailActionOverdue": true,
    "emailHighSeverityIncident": true,
    "emailInspectionFailed": false,
    "digestFrequency": "weekly",
    "digestTime": "07:00",
    "digestDayOfWeek": 1,
    "inappEnabled": true,
    "createdAt": "2026-01-15T08:00:00Z",
    "updatedAt": "2026-01-31T10:00:00Z"
  }
}
```

**Notes:**
- If no preferences exist, creates default preferences based on user role
- Managers/admins default to weekly digest; workers default to none

---

### 3.2 PUT /preferences/notifications

Update the authenticated user's notification preferences.

**Authorization:** Any authenticated user

**Request Body:**

```json
{
  "emailActionAssigned": true,
  "emailActionOverdue": true,
  "emailHighSeverityIncident": false,
  "emailInspectionFailed": false,
  "digestFrequency": "daily",
  "digestTime": "08:00",
  "digestDayOfWeek": 1,
  "inappEnabled": true
}
```

**Field Validation:**

| Field | Type | Constraints |
|-------|------|-------------|
| emailActionAssigned | boolean | - |
| emailActionOverdue | boolean | - |
| emailHighSeverityIncident | boolean | - |
| emailInspectionFailed | boolean | - |
| digestFrequency | enum | `daily`, `weekly`, `none` |
| digestTime | time string | HH:MM format (00:00 - 23:59) |
| digestDayOfWeek | integer | 0-6 (0=Sunday, 1=Monday, etc.) |
| inappEnabled | boolean | - |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "emailActionAssigned": true,
    "emailActionOverdue": true,
    "emailHighSeverityIncident": false,
    "emailInspectionFailed": false,
    "digestFrequency": "daily",
    "digestTime": "08:00",
    "digestDayOfWeek": 1,
    "inappEnabled": true,
    "updatedAt": "2026-01-31T11:00:00Z"
  }
}
```

**Error Responses:**

- `400 VALIDATION_ERROR` - Invalid field values

---

## 4. Admin Endpoints

### 4.1 GET /admin/jobs/runs

View scheduled job execution history.

**Authorization:** Admin only

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| jobName | string | No | all | Filter by job name |
| status | string | No | all | Filter by status: `running`, `completed`, `failed` |
| limit | integer | No | 20 | Items per page (max 100) |

**Response:**

```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "id": "uuid",
        "jobName": "daily_digest",
        "organisationId": null,
        "status": "completed",
        "startedAt": "2026-01-31T07:00:00Z",
        "completedAt": "2026-01-31T07:02:30Z",
        "itemsProcessed": 50,
        "itemsSucceeded": 48,
        "itemsFailed": 2,
        "errorMessage": null,
        "metadata": {
          "emailsSent": 48,
          "skipped": 12
        }
      }
    ]
  }
}
```

---

### 4.2 POST /admin/jobs/digest/trigger

Manually trigger a digest job (for testing).

**Authorization:** Admin only

**Request Body:**

```json
{
  "type": "daily",
  "userId": "uuid"
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | enum | Yes | `daily` or `weekly` |
| userId | UUID | No | Specific user to send to (for testing). If omitted, runs for all eligible users. |

**Response:**

```json
{
  "success": true,
  "data": {
    "jobRunId": "uuid",
    "status": "running",
    "message": "Digest job triggered"
  }
}
```

**Notes:**
- Creates a job run record for tracking
- Runs asynchronously; check job runs for completion

---

### 4.3 PUT /admin/organisation/escalation

Update organisation escalation settings.

**Authorization:** Admin only

**Request Body:**

```json
{
  "enabled": true,
  "daysOverdue": 5,
  "notifyManagers": true,
  "customEmail": "safety-team@company.com"
}
```

**Fields:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| enabled | boolean | Yes | - | Enable/disable escalations |
| daysOverdue | integer | Yes | 1-30 | Days after due date before escalation |
| notifyManagers | boolean | Yes | - | Send to all org managers |
| customEmail | string | No | Valid email or null | Additional escalation email |

**Response:**

```json
{
  "success": true,
  "data": {
    "escalation": {
      "enabled": true,
      "daysOverdue": 5,
      "notifyManagers": true,
      "customEmail": "safety-team@company.com"
    }
  }
}
```

---

## 5. Notification Trigger Points

These are internal triggers (not direct API calls) that create notifications:

### 5.1 Action Assignment

**Trigger:** POST /api/actions (when `assigned_to` is set)

**Creates:**
- In-app notification for assignee
- Email to assignee (if preference enabled)

**Notification Data:**

```json
{
  "type": "action_assigned",
  "priority": "normal",
  "title": "New action assigned",
  "message": "You have been assigned to: {actionTitle}",
  "relatedType": "action",
  "relatedId": "{actionId}",
  "metadata": {
    "actionTitle": "...",
    "dueDate": "...",
    "sourceType": "incident",
    "sourceId": "..."
  }
}
```

---

### 5.2 Action Status Change

**Trigger:** PUT /api/actions/:id (when `status` changes)

**Creates (for status = 'completed'):**
- In-app notification for action creator

**Creates (for status = 'overdue'):**
- In-app notification for assignee and creator
- Email to assignee (if preference enabled)

---

### 5.3 High-Severity Incident

**Trigger:** POST /api/incidents (when `severity` = 'high' or 'critical')

**Creates:**
- In-app notification (priority: HIGH) for all managers/admins
- Email to managers/admins (if preference enabled)

---

### 5.4 Escalation

**Trigger:** Scheduled escalation job

**Creates:**
- In-app notification (type: `action_escalated`) for assignee and managers
- Email to assignee, managers, and custom email

---

## 6. Email Log Endpoints (Internal/Debug)

### 6.1 GET /admin/email-logs

View email send history.

**Authorization:** Admin only

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | all | `pending`, `sent`, `failed`, `bounced` |
| type | string | all | `notification`, `digest`, `escalation` |
| limit | integer | 50 | Max 200 |

**Response:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "recipientEmail": "user@example.com",
        "subject": "EHS Portal - New Action Assigned",
        "emailType": "notification",
        "status": "sent",
        "attempts": 1,
        "sentAt": "2026-01-31T10:30:15Z",
        "createdAt": "2026-01-31T10:30:00Z"
      }
    ]
  }
}
```

---

## 7. Rate Limiting

| Endpoint | Limit |
|----------|-------|
| GET /notifications | 60/minute |
| GET /notifications/unread-count | 120/minute (for polling) |
| PUT /notifications/* | 30/minute |
| POST /admin/jobs/digest/trigger | 5/hour |

---

## 8. WebSocket (Future Enhancement)

For real-time notifications without polling, a future enhancement could add:

```javascript
// WebSocket endpoint
ws://api.example.com/ws/notifications

// Events
{
  "type": "notification",
  "data": { /* notification object */ }
}

{
  "type": "count_update",
  "data": { "count": 6 }
}
```

---

## 9. API Summary Table

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /notifications | User | List notifications |
| GET | /notifications/unread-count | User | Get unread count |
| PUT | /notifications/:id/read | User | Mark as read |
| PUT | /notifications/mark-all-read | User | Mark all as read |
| DELETE | /notifications/:id | User | Delete notification |
| GET | /preferences/notifications | User | Get preferences |
| PUT | /preferences/notifications | User | Update preferences |
| GET | /admin/jobs/runs | Admin | View job history |
| POST | /admin/jobs/digest/trigger | Admin | Trigger digest |
| PUT | /admin/organisation/escalation | Admin | Update escalation settings |
| GET | /admin/email-logs | Admin | View email logs |

# API Specification – EHS Portal Phase 8
## Training & Competence Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 8 – Training & Competence Management |

---

## 1. Overview

Phase 8 introduces API endpoints for:
- Training course catalogue management
- Training session scheduling and enrollment
- Training assignment management (individual, role, site)
- Training completion recording and verification
- Training matrix retrieval
- Report generation and exports

All endpoints are scoped to the authenticated user's organisation.

**Base URL:** `/api/training`

---

## 2. Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

Organisation ID is derived from the authenticated user's token.

---

## 3. Categories API

### 3.1 GET /api/training/categories

List training categories.

**Request:**
```http
GET /api/training/categories?includeSystem=true
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| includeSystem | boolean | No | Include system categories (default: true) |
| activeOnly | boolean | No | Only active categories (default: true) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat-uuid-1",
        "name": "Safety Training",
        "code": "SAFETY",
        "description": "General safety and hazard awareness",
        "displayOrder": 1,
        "isSystem": true,
        "isActive": true
      },
      {
        "id": "cat-uuid-2",
        "name": "Site-Specific",
        "code": "SITE-SPEC",
        "description": "Custom site-specific training",
        "displayOrder": 10,
        "isSystem": false,
        "isActive": true
      }
    ]
  }
}
```

---

### 3.2 POST /api/training/categories

Create a custom category.

**Request:**
```http
POST /api/training/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Contractor Training",
  "code": "CONTRACTOR",
  "description": "Training for external contractors",
  "displayOrder": 15
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "cat-uuid-new",
      "name": "Contractor Training",
      "code": "CONTRACTOR",
      "organisationId": "org-uuid",
      "isSystem": false,
      "isActive": true
    }
  }
}
```

---

## 4. Courses API

### 4.1 GET /api/training/courses

List training courses.

**Request:**
```http
GET /api/training/courses?status=active&categoryId=xxx&deliveryType=classroom
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: draft, active, inactive, archived |
| categoryId | UUID | No | Filter by category |
| deliveryType | string | No | online, classroom, virtual, toolbox_talk, on_the_job, blended |
| courseType | string | No | initial, refresher |
| requirementLevel | string | No | mandatory, optional |
| search | string | No | Search by title, code, description |
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 20, max: 100) |
| sortBy | string | No | Sort field: title, code, created_at |
| sortOrder | string | No | asc or desc (default: asc) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "course-uuid-1",
        "code": "FS-001",
        "title": "Fire Safety Awareness",
        "description": "Basic fire safety and evacuation procedures",
        "category": {
          "id": "cat-uuid-1",
          "name": "Safety Training",
          "code": "SAFETY"
        },
        "durationHours": 4,
        "deliveryType": "classroom",
        "courseType": "initial",
        "requirementLevel": "mandatory",
        "validityMonths": 12,
        "refresherCourseId": "course-uuid-2",
        "passingScore": 80,
        "selfEnrollment": true,
        "status": "active",
        "assignmentCount": 45,
        "completionCount": 120,
        "createdAt": "2026-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 35,
      "totalPages": 2
    }
  }
}
```

---

### 4.2 GET /api/training/courses/:id

Get course detail.

**Request:**
```http
GET /api/training/courses/course-uuid-1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "course": {
      "id": "course-uuid-1",
      "code": "FS-001",
      "title": "Fire Safety Awareness",
      "description": "Basic fire safety and evacuation procedures...",
      "category": {
        "id": "cat-uuid-1",
        "name": "Safety Training",
        "code": "SAFETY"
      },
      "durationHours": 4,
      "deliveryType": "classroom",
      "courseType": "initial",
      "requirementLevel": "mandatory",
      "validityMonths": 12,
      "refresherCourse": {
        "id": "course-uuid-2",
        "code": "FS-002",
        "title": "Fire Safety Refresher"
      },
      "owner": {
        "id": "user-uuid",
        "fullName": "Sarah Johnson"
      },
      "externalUrl": null,
      "passingScore": 80,
      "maxAttempts": 3,
      "selfEnrollment": true,
      "status": "active",
      "prerequisites": [
        {
          "id": "prereq-uuid",
          "course": {
            "id": "course-uuid-0",
            "code": "IND-001",
            "title": "General Induction"
          },
          "isMandatory": true
        }
      ],
      "attachments": [
        {
          "id": "att-uuid",
          "fileName": "fire_safety_syllabus.pdf",
          "fileType": "application/pdf",
          "fileSize": 524288,
          "uploadedAt": "2026-01-15T10:00:00Z"
        }
      ],
      "stats": {
        "totalAssignments": 45,
        "completedAssignments": 38,
        "overdueAssignments": 3,
        "totalCompletions": 120,
        "passRate": 95.5,
        "upcomingSessions": 2
      },
      "createdBy": {
        "id": "user-uuid",
        "fullName": "Admin User"
      },
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-02-01T14:30:00Z"
    }
  }
}
```

---

### 4.3 POST /api/training/courses

Create a new course.

**Request:**
```http
POST /api/training/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "CS-001",
  "title": "Confined Space Entry",
  "description": "Safety procedures for confined space work",
  "categoryId": "cat-uuid-1",
  "durationHours": 8,
  "deliveryType": "classroom",
  "courseType": "initial",
  "requirementLevel": "mandatory",
  "validityMonths": 12,
  "ownerId": "user-uuid",
  "passingScore": 80,
  "selfEnrollment": false,
  "status": "active",
  "prerequisiteCourseIds": ["course-uuid-0"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "course": {
      "id": "course-uuid-new",
      "code": "CS-001",
      "title": "Confined Space Entry",
      ...
    }
  }
}
```

---

### 4.4 PUT /api/training/courses/:id

Update a course.

**Request:**
```http
PUT /api/training/courses/course-uuid-1
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Fire Safety Awareness - Updated",
  "validityMonths": 24,
  "passingScore": 75
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "course": { ... }
  }
}
```

---

### 4.5 POST /api/training/courses/:id/attachments

Upload course attachment.

**Request:**
```http
POST /api/training/courses/course-uuid-1/attachments
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [binary]
description: Course syllabus
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "attachment": {
      "id": "att-uuid",
      "fileName": "syllabus.pdf",
      "fileType": "application/pdf",
      "fileSize": 524288
    }
  }
}
```

---

## 5. Sessions API

### 5.1 GET /api/training/sessions

List training sessions.

**Request:**
```http
GET /api/training/sessions?courseId=xxx&status=scheduled&fromDate=2026-02-01
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | UUID | No | Filter by course |
| siteId | UUID | No | Filter by location site |
| trainerId | UUID | No | Filter by trainer |
| status | string | No | scheduled, confirmed, in_progress, completed, cancelled |
| fromDate | date | No | Sessions from this date |
| toDate | date | No | Sessions until this date |
| page | number | No | Page number |
| limit | number | No | Results per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-uuid-1",
        "course": {
          "id": "course-uuid-1",
          "code": "FS-001",
          "title": "Fire Safety Awareness"
        },
        "site": {
          "id": "site-uuid-1",
          "name": "Headquarters"
        },
        "locationDetail": "Training Room A",
        "trainer": {
          "id": "user-uuid",
          "fullName": "John Trainer"
        },
        "sessionDate": "2026-02-20",
        "startTime": "09:00",
        "endTime": "13:00",
        "virtualLink": null,
        "maxParticipants": 20,
        "enrolledCount": 12,
        "waitlistCount": 0,
        "status": "scheduled",
        "enrollmentDeadline": "2026-02-18"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 5.2 POST /api/training/sessions

Create a training session.

**Request:**
```http
POST /api/training/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course-uuid-1",
  "siteId": "site-uuid-1",
  "locationDetail": "Training Room A",
  "trainerId": "user-uuid",
  "sessionDate": "2026-02-20",
  "startTime": "09:00",
  "endTime": "13:00",
  "maxParticipants": 20,
  "minParticipants": 5,
  "enrollmentDeadline": "2026-02-18",
  "notes": "Please bring safety equipment"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "session": { ... }
  }
}
```

---

### 5.3 GET /api/training/sessions/:id/enrollments

Get session enrollments.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "enrollments": [
      {
        "id": "enroll-uuid-1",
        "user": {
          "id": "user-uuid-1",
          "fullName": "Mary Johnson",
          "email": "mary@example.com"
        },
        "enrolledBy": {
          "id": "user-uuid-2",
          "fullName": "Manager Name"
        },
        "enrollmentDate": "2026-02-01T10:00:00Z",
        "status": "enrolled",
        "attendanceStatus": null,
        "hasAssignment": true,
        "assignmentDueDate": "2026-02-28"
      }
    ],
    "summary": {
      "enrolled": 12,
      "waitlisted": 2,
      "cancelled": 1,
      "capacity": 20,
      "availableSpots": 8
    }
  }
}
```

---

### 5.4 POST /api/training/sessions/:id/enrollments

Enroll users in a session.

**Request:**
```http
POST /api/training/sessions/session-uuid-1/enrollments
Authorization: Bearer <token>
Content-Type: application/json

{
  "userIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"],
  "allowWaitlist": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "enrolled": [
      { "userId": "user-uuid-1", "status": "enrolled" },
      { "userId": "user-uuid-2", "status": "enrolled" }
    ],
    "waitlisted": [
      { "userId": "user-uuid-3", "status": "waitlisted" }
    ],
    "skipped": []
  }
}
```

---

### 5.5 POST /api/training/sessions/:id/attendance

Record session attendance and completions.

**Request:**
```http
POST /api/training/sessions/session-uuid-1/attendance
Authorization: Bearer <token>
Content-Type: application/json

{
  "attendance": [
    {
      "userId": "user-uuid-1",
      "attendanceStatus": "attended",
      "result": "passed",
      "score": 92
    },
    {
      "userId": "user-uuid-2",
      "attendanceStatus": "attended",
      "result": "passed",
      "score": 85
    },
    {
      "userId": "user-uuid-3",
      "attendanceStatus": "absent",
      "notes": "Called in sick"
    }
  ],
  "completeSession": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "attendanceRecorded": 3,
    "completionsCreated": 2,
    "sessionStatus": "completed",
    "completions": [
      {
        "userId": "user-uuid-1",
        "completionId": "comp-uuid-1",
        "result": "passed",
        "expiresAt": "2027-02-20"
      },
      {
        "userId": "user-uuid-2",
        "completionId": "comp-uuid-2",
        "result": "passed",
        "expiresAt": "2027-02-20"
      }
    ]
  }
}
```

---

## 6. Assignments API

### 6.1 GET /api/training/assignments

List training assignments.

**Request:**
```http
GET /api/training/assignments?status=assigned&userId=xxx
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | No | Filter by assigned user |
| courseId | UUID | No | Filter by course |
| status | string | No | assigned, in_progress, completed, failed, overdue, cancelled, waived |
| priority | string | No | low, normal, high, urgent |
| sourceType | string | No | manual, role_rule, site_rule, action, incident |
| dueDateFrom | date | No | Due date range start |
| dueDateTo | date | No | Due date range end |
| overdueOnly | boolean | No | Only overdue assignments |
| page | number | No | Page number |
| limit | number | No | Results per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "assign-uuid-1",
        "user": {
          "id": "user-uuid-1",
          "fullName": "John Smith",
          "email": "john@example.com",
          "role": "worker",
          "site": { "id": "site-uuid", "name": "Site A" }
        },
        "course": {
          "id": "course-uuid-1",
          "code": "FS-001",
          "title": "Fire Safety Awareness",
          "deliveryType": "classroom"
        },
        "assignedBy": {
          "id": "user-uuid-2",
          "fullName": "Manager Name"
        },
        "assignedAt": "2026-01-15T10:00:00Z",
        "dueDate": "2026-02-28",
        "priority": "normal",
        "status": "assigned",
        "sourceType": "manual",
        "sourceId": null,
        "notes": null,
        "isOverdue": false,
        "daysUntilDue": 23,
        "upcomingSessions": 2
      }
    ],
    "pagination": { ... },
    "summary": {
      "total": 45,
      "assigned": 20,
      "inProgress": 5,
      "completed": 15,
      "overdue": 5
    }
  }
}
```

---

### 6.2 POST /api/training/assignments

Create individual assignment.

**Request:**
```http
POST /api/training/assignments
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid-1",
  "courseId": "course-uuid-1",
  "dueDate": "2026-02-28",
  "priority": "normal",
  "notes": "Complete before site access granted"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "assign-uuid-new",
      ...
    }
  }
}
```

---

### 6.3 POST /api/training/assignments/bulk

Bulk assign by role or site.

**Request:**
```http
POST /api/training/assignments/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course-uuid-1",
  "assignmentType": "role",
  "roleName": "Site Supervisor",
  "dueDate": "2026-03-31",
  "dueDaysFromAssignment": 30,
  "priority": "normal",
  "createRule": true,
  "autoAssignNewUsers": true
}
```

**Alternative - Site-based:**
```json
{
  "courseId": "course-uuid-1",
  "assignmentType": "site",
  "siteIds": ["site-uuid-1", "site-uuid-2"],
  "dueDaysFromAssignment": 30,
  "priority": "normal",
  "createRule": true,
  "autoAssignNewUsers": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "created": 15,
      "skipped": 3,
      "skippedReasons": {
        "alreadyAssigned": 2,
        "alreadyCompleted": 1
      }
    },
    "rule": {
      "id": "rule-uuid",
      "ruleType": "role",
      "roleName": "Site Supervisor",
      "autoAssignNewUsers": true
    }
  }
}
```

---

### 6.4 PATCH /api/training/assignments/:id

Update assignment.

**Request:**
```http
PATCH /api/training/assignments/assign-uuid-1
Authorization: Bearer <token>
Content-Type: application/json

{
  "dueDate": "2026-03-15",
  "priority": "high",
  "status": "in_progress"
}
```

---

### 6.5 POST /api/training/assignments/:id/waive

Waive an assignment.

**Request:**
```http
POST /api/training/assignments/assign-uuid-1/waive
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Equivalent external certification already held"
}
```

---

## 7. Assignment Rules API

### 7.1 GET /api/training/assignment-rules

List assignment rules.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": "rule-uuid-1",
        "course": {
          "id": "course-uuid-1",
          "code": "FS-001",
          "title": "Fire Safety Awareness"
        },
        "ruleType": "role",
        "roleName": "Site Supervisor",
        "siteId": null,
        "dueDaysFromStart": 30,
        "priority": "normal",
        "autoAssignNewUsers": true,
        "isActive": true,
        "assignmentCount": 25,
        "createdBy": {
          "id": "user-uuid",
          "fullName": "Admin User"
        },
        "createdAt": "2026-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

### 7.2 POST /api/training/assignment-rules

Create assignment rule.

**Request:**
```http
POST /api/training/assignment-rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "course-uuid-1",
  "ruleType": "role",
  "roleName": "Site Worker",
  "dueDaysFromStart": 14,
  "priority": "high",
  "autoAssignNewUsers": true,
  "applyToExisting": true
}
```

---

## 8. Completions API

### 8.1 GET /api/training/completions

List completions.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | UUID | No | Filter by user |
| courseId | UUID | No | Filter by course |
| result | string | No | passed, failed, attended, partial, not_completed |
| verificationStatus | string | No | pending, verified, rejected |
| expiringWithin | number | No | Days until expiry |
| expired | boolean | No | Only expired completions |
| fromDate | date | No | Completion date from |
| toDate | date | No | Completion date to |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "completions": [
      {
        "id": "comp-uuid-1",
        "user": {
          "id": "user-uuid-1",
          "fullName": "John Smith"
        },
        "course": {
          "id": "course-uuid-1",
          "code": "FS-001",
          "title": "Fire Safety Awareness"
        },
        "completionDate": "2026-02-05",
        "result": "passed",
        "score": 92,
        "trainer": {
          "id": "user-uuid-2",
          "fullName": "John Trainer"
        },
        "session": {
          "id": "session-uuid-1",
          "sessionDate": "2026-02-05"
        },
        "certificateNumber": "FS-2026-00123",
        "expiresAt": "2027-02-05",
        "isExpired": false,
        "daysUntilExpiry": 365,
        "isExternal": false,
        "verificationStatus": "verified",
        "evidenceCount": 1,
        "recordedBy": {
          "id": "user-uuid-2",
          "fullName": "John Trainer"
        },
        "createdAt": "2026-02-05T13:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 8.2 POST /api/training/completions

Record a completion (manual).

**Request:**
```http
POST /api/training/completions
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid-1",
  "courseId": "course-uuid-1",
  "completionDate": "2026-02-05",
  "result": "passed",
  "score": 85,
  "trainerId": "user-uuid-2",
  "certificateNumber": "CERT-12345",
  "notes": "Completed with distinction"
}
```

**For external training:**
```json
{
  "userId": "user-uuid-1",
  "courseId": "course-uuid-1",
  "completionDate": "2026-02-05",
  "result": "passed",
  "isExternal": true,
  "externalProvider": "ACME Training Co",
  "externalTrainerName": "External Trainer",
  "certificateNumber": "EXT-CERT-12345",
  "requiresVerification": true
}
```

---

### 8.3 POST /api/training/completions/:id/verify

Verify a pending completion.

**Request:**
```http
POST /api/training/completions/comp-uuid-1/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "verify",
  "notes": "Certificate verified against provider records"
}
```

**For rejection:**
```json
{
  "action": "reject",
  "reason": "Certificate appears to be invalid"
}
```

---

### 8.4 POST /api/training/completions/:id/evidence

Attach evidence to completion.

**Request:**
```http
POST /api/training/completions/comp-uuid-1/evidence
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [binary]
description: Training certificate
```

---

## 9. My Training API

### 9.1 GET /api/training/my-training

Get current user's training overview.

**Request:**
```http
GET /api/training/my-training
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "assignedCount": 5,
      "overdueCount": 1,
      "expiringCount": 2,
      "completedThisYear": 8
    },
    "assignments": [
      {
        "id": "assign-uuid-1",
        "course": {
          "id": "course-uuid-1",
          "code": "FS-001",
          "title": "Fire Safety Awareness",
          "deliveryType": "classroom",
          "durationHours": 4
        },
        "dueDate": "2026-02-28",
        "priority": "normal",
        "status": "assigned",
        "isOverdue": false,
        "daysUntilDue": 23,
        "upcomingSessions": [
          {
            "id": "session-uuid-1",
            "date": "2026-02-20",
            "time": "09:00-13:00",
            "location": "Training Room A",
            "spotsAvailable": 8
          }
        ]
      }
    ],
    "upcomingSessions": [
      {
        "id": "enroll-uuid-1",
        "session": {
          "id": "session-uuid-1",
          "course": { "code": "FS-001", "title": "Fire Safety Awareness" },
          "date": "2026-02-20",
          "startTime": "09:00",
          "endTime": "13:00",
          "location": "Training Room A"
        },
        "enrollmentStatus": "enrolled"
      }
    ],
    "recentCompletions": [
      {
        "id": "comp-uuid-1",
        "course": { "code": "CS-001", "title": "Confined Space Entry" },
        "completionDate": "2026-01-15",
        "result": "passed",
        "expiresAt": "2027-01-15",
        "daysUntilExpiry": 344
      }
    ],
    "expiringSoon": [
      {
        "id": "comp-uuid-2",
        "course": { "code": "FA-001", "title": "First Aid" },
        "completionDate": "2024-03-01",
        "expiresAt": "2026-03-01",
        "daysUntilExpiry": 24
      }
    ]
  }
}
```

---

### 9.2 POST /api/training/my-training/enroll/:sessionId

Self-enroll in a session.

**Request:**
```http
POST /api/training/my-training/enroll/session-uuid-1
Authorization: Bearer <token>
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "id": "enroll-uuid",
      "status": "enrolled",
      "session": { ... }
    }
  }
}
```

---

## 10. Training Matrix API

### 10.1 GET /api/training/matrix

Get training matrix.

**Request:**
```http
GET /api/training/matrix?type=user_course&siteId=xxx&mandatoryOnly=true
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | user_course, role_course, site_course |
| siteId | UUID | No | Filter users by site |
| roleFilter | string | No | Filter users by role |
| categoryId | UUID | No | Filter courses by category |
| mandatoryOnly | boolean | No | Only mandatory courses |
| statusFilter | string | No | all, gaps_only, expiring_only, overdue_only |
| userIds | UUID[] | No | Specific users (comma-separated) |
| courseIds | UUID[] | No | Specific courses (comma-separated) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "matrixType": "user_course",
    "rows": [
      {
        "id": "user-uuid-1",
        "name": "John Smith",
        "role": "Site Worker",
        "site": "Site A"
      },
      {
        "id": "user-uuid-2",
        "name": "Mary Johnson",
        "role": "Site Supervisor",
        "site": "Site A"
      }
    ],
    "columns": [
      {
        "id": "course-uuid-1",
        "code": "FS-001",
        "title": "Fire Safety",
        "validityMonths": 12
      },
      {
        "id": "course-uuid-2",
        "code": "CS-001",
        "title": "Confined Space",
        "validityMonths": 12
      }
    ],
    "cells": [
      {
        "rowId": "user-uuid-1",
        "columnId": "course-uuid-1",
        "status": "completed",
        "completionDate": "2026-01-15",
        "expiresAt": "2027-01-15",
        "daysUntilExpiry": 344
      },
      {
        "rowId": "user-uuid-1",
        "columnId": "course-uuid-2",
        "status": "assigned",
        "dueDate": "2026-02-28",
        "daysUntilDue": 23
      },
      {
        "rowId": "user-uuid-2",
        "columnId": "course-uuid-1",
        "status": "expiring_soon",
        "completionDate": "2025-03-01",
        "expiresAt": "2026-03-01",
        "daysUntilExpiry": 24
      },
      {
        "rowId": "user-uuid-2",
        "columnId": "course-uuid-2",
        "status": "not_assigned"
      }
    ],
    "summary": {
      "totalCells": 4,
      "completed": 1,
      "expiringSoon": 1,
      "assigned": 1,
      "notAssigned": 1,
      "overdue": 0,
      "expired": 0,
      "complianceRate": 75.0
    }
  }
}
```

---

### 10.2 GET /api/training/matrix/gaps

Get training gaps analysis.

**Request:**
```http
GET /api/training/matrix/gaps?userId=xxx
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-1",
      "fullName": "John Smith",
      "role": "Site Supervisor",
      "site": "Site A"
    },
    "gaps": [
      {
        "course": {
          "id": "course-uuid-2",
          "code": "CS-001",
          "title": "Confined Space Entry"
        },
        "requirementSource": "role",
        "requirementLevel": "mandatory",
        "status": "not_assigned",
        "recommendedAction": "assign"
      },
      {
        "course": {
          "id": "course-uuid-3",
          "code": "LOTO-001",
          "title": "Lockout Tagout"
        },
        "requirementSource": "site",
        "requirementLevel": "mandatory",
        "status": "expired",
        "lastCompletion": "2024-02-01",
        "expiredAt": "2025-02-01",
        "recommendedAction": "assign_refresher"
      }
    ],
    "summary": {
      "totalGaps": 2,
      "notAssigned": 1,
      "expired": 1,
      "overdue": 0
    }
  }
}
```

---

## 11. Requirements API

### 11.1 GET /api/training/requirements/role/:roleName

Get training requirements for a role.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roleName": "Site Supervisor",
    "requirements": [
      {
        "id": "req-uuid-1",
        "course": {
          "id": "course-uuid-1",
          "code": "FS-001",
          "title": "Fire Safety Awareness"
        },
        "isMandatory": true
      },
      {
        "id": "req-uuid-2",
        "course": {
          "id": "course-uuid-2",
          "code": "CS-001",
          "title": "Confined Space Entry"
        },
        "isMandatory": true
      }
    ]
  }
}
```

---

### 11.2 PUT /api/training/requirements/role/:roleName

Set training requirements for a role.

**Request:**
```http
PUT /api/training/requirements/role/Site%20Supervisor
Authorization: Bearer <token>
Content-Type: application/json

{
  "requirements": [
    { "courseId": "course-uuid-1", "isMandatory": true },
    { "courseId": "course-uuid-2", "isMandatory": true },
    { "courseId": "course-uuid-3", "isMandatory": false }
  ]
}
```

---

## 12. Reports API

### 12.1 GET /api/training/reports/user-history/:userId

Export user training history.

**Request:**
```http
GET /api/training/reports/user-history/user-uuid-1?format=pdf
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | pdf or excel (default: pdf) |

**Response:** Binary file download

---

### 12.2 GET /api/training/reports/course-completions/:courseId

Export course completion list.

**Request:**
```http
GET /api/training/reports/course-completions/course-uuid-1?format=excel&fromDate=2026-01-01
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | excel (default) |
| fromDate | date | No | Completions from |
| toDate | date | No | Completions to |
| siteId | UUID | No | Filter by site |

---

### 12.3 GET /api/training/reports/matrix-snapshot

Export training matrix.

**Request:**
```http
GET /api/training/reports/matrix-snapshot?type=user_course&siteId=xxx&format=excel
Authorization: Bearer <token>
```

**Query Parameters:** Same as matrix endpoint plus format

---

### 12.4 GET /api/training/reports/compliance

Export compliance report.

**Request:**
```http
GET /api/training/reports/compliance?format=pdf
Authorization: Bearer <token>
```

**Response:** PDF with:
- Overall compliance rate
- Compliance by site
- Compliance by role
- Overdue training list
- Expiring training list
- Gap analysis summary

---

## 13. Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "TRN001",
    "message": "Training course not found",
    "details": { ... }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| TRN001 | 404 | Training course not found |
| TRN002 | 404 | Training session not found |
| TRN003 | 409 | Session is at full capacity |
| TRN004 | 409 | User already enrolled in session |
| TRN005 | 409 | User already has active assignment for course |
| TRN006 | 400 | Course prerequisites not met |
| TRN007 | 400 | Completion date cannot be in the future |
| TRN008 | 400 | Session not yet completed |
| TRN009 | 400 | Cannot modify archived course |
| TRN010 | 400 | Score must be between 0 and 100 |
| TRN011 | 403 | Cannot self-enroll in this course |
| TRN012 | 400 | Invalid assignment rule configuration |
| TRN013 | 404 | Assignment not found |
| TRN014 | 404 | Completion not found |
| TRN015 | 400 | Cannot waive mandatory training without approval |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 8 API specification |

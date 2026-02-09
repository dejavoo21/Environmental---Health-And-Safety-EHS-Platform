# API Specification – EHS Portal Phase 5
## Analytics & Insights

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-02 |
| Status | Draft |
| Phase | 5 – Analytics & Insights |

---

## 1. Overview

Phase 5 introduces analytics API endpoints for:
- KPI summaries and trends
- Time-series chart data
- Site comparison data
- Risk scores
- Saved views management
- PDF report generation

All endpoints are scoped to the authenticated user's organisation.

**Base URL:** `/api/analytics`

---

## 2. Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

Organisation ID is derived from the authenticated user's token.

---

## 3. Common Query Parameters

### 3.1 Date Range Filters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `startDate` | ISO 8601 | Period start date | `2025-11-01` |
| `endDate` | ISO 8601 | Period end date | `2026-02-01` |
| `preset` | string | Predefined range | `last_30_days`, `last_90_days`, `last_365_days`, `this_year`, `last_year` |

**Note:** If `preset` is provided, `startDate` and `endDate` are ignored.

### 3.2 Filter Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `siteIds` | UUID[] | Filter by sites | `?siteIds=uuid1,uuid2` |
| `incidentTypeIds` | UUID[] | Filter by incident types | `?incidentTypeIds=uuid1` |
| `severities` | string[] | Filter by severities | `?severities=high,critical` |

---

## 4. Endpoints

### 4.1 GET /api/analytics/summary

Returns KPI summary with trend comparisons.

**Request:**
```http
GET /api/analytics/summary?preset=last_90_days
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `startDate` / `endDate` or `preset` | Yes | Date range |
| `siteIds` | No | Site filter |
| `severities` | No | Severity filter |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-11-01",
      "end": "2026-02-01",
      "days": 93
    },
    "previousPeriod": {
      "start": "2025-08-01",
      "end": "2025-10-31",
      "days": 92
    },
    "kpis": {
      "totalIncidents": {
        "value": 156,
        "previousValue": 142,
        "trend": "up",
        "percentChange": 9.86
      },
      "highSeverityPercent": {
        "value": 23.5,
        "previousValue": 28.1,
        "trend": "down",
        "percentChange": -16.37
      },
      "avgResolutionDays": {
        "value": 4.2,
        "previousValue": 5.1,
        "trend": "down",
        "percentChange": -17.65
      },
      "openActions": {
        "value": 45,
        "previousValue": 38,
        "trend": "up",
        "percentChange": 18.42
      },
      "overduePercent": {
        "value": 12.5,
        "previousValue": 15.2,
        "trend": "down",
        "percentChange": -17.76
      },
      "inspectionPassRate": {
        "value": 87.3,
        "previousValue": 82.1,
        "trend": "up",
        "percentChange": 6.33
      }
    },
    "generatedAt": "2026-02-02T10:30:00Z"
  }
}
```

**Trend Values:**
- `up` - Current value higher than previous
- `down` - Current value lower than previous
- `neutral` - No change or < 1% change

---

### 4.2 GET /api/analytics/incidents/time-series

Returns incident counts over time, grouped by severity.

**Request:**
```http
GET /api/analytics/incidents/time-series?preset=last_365_days&granularity=month
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| Date range | Yes | - | Period to analyse |
| `granularity` | No | `month` | Grouping: `day`, `week`, `month` |
| `siteIds` | No | All | Site filter |
| `incidentTypeIds` | No | All | Type filter |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "granularity": "month",
    "series": [
      {
        "period": "2025-03",
        "periodStart": "2025-03-01",
        "periodEnd": "2025-03-31",
        "low": 12,
        "medium": 8,
        "high": 3,
        "critical": 1,
        "total": 24
      },
      {
        "period": "2025-04",
        "periodStart": "2025-04-01",
        "periodEnd": "2025-04-30",
        "low": 15,
        "medium": 10,
        "high": 4,
        "critical": 0,
        "total": 29
      }
    ],
    "totals": {
      "low": 135,
      "medium": 92,
      "high": 38,
      "critical": 7,
      "total": 272
    }
  }
}
```

---

### 4.3 GET /api/analytics/incidents/by-site

Returns incident counts per site.

**Request:**
```http
GET /api/analytics/incidents/by-site?preset=last_90_days&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| Date range | Yes | - | Period to analyse |
| `limit` | No | 20 | Max sites to return |
| `severities` | No | All | Severity filter |
| `sortBy` | No | `count_desc` | Sort order |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "siteId": "uuid-1",
        "siteName": "Warehouse A",
        "incidentCount": 45,
        "bySeverity": {
          "low": 20,
          "medium": 15,
          "high": 8,
          "critical": 2
        }
      },
      {
        "siteId": "uuid-2",
        "siteName": "Distribution Center",
        "incidentCount": 32,
        "bySeverity": {
          "low": 18,
          "medium": 10,
          "high": 3,
          "critical": 1
        }
      }
    ],
    "other": {
      "siteCount": 5,
      "incidentCount": 23
    },
    "total": 100
  }
}
```

---

### 4.4 GET /api/analytics/incidents/by-type

Returns incident counts per type.

**Request:**
```http
GET /api/analytics/incidents/by-type?preset=last_90_days&limit=10
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "types": [
      {
        "typeId": "uuid-1",
        "typeName": "Near Miss",
        "incidentCount": 48,
        "percentage": 30.2
      },
      {
        "typeId": "uuid-2",
        "typeName": "Injury",
        "incidentCount": 35,
        "percentage": 22.0
      },
      {
        "typeId": "uuid-3",
        "typeName": "Property Damage",
        "incidentCount": 28,
        "percentage": 17.6
      }
    ],
    "total": 159
  }
}
```

---

### 4.5 GET /api/analytics/inspections/time-series

Returns inspection counts over time.

**Request:**
```http
GET /api/analytics/inspections/time-series?preset=last_365_days
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "granularity": "month",
    "series": [
      {
        "period": "2025-03",
        "total": 45,
        "passed": 40,
        "failed": 5,
        "passRate": 88.9
      },
      {
        "period": "2025-04",
        "total": 52,
        "passed": 48,
        "failed": 4,
        "passRate": 92.3
      }
    ],
    "totals": {
      "total": 485,
      "passed": 423,
      "failed": 62,
      "passRate": 87.2
    }
  }
}
```

---

### 4.6 GET /api/analytics/inspections/by-site

Returns inspection pass/fail rates per site.

**Request:**
```http
GET /api/analytics/inspections/by-site?preset=last_90_days
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "siteId": "uuid-1",
        "siteName": "Warehouse A",
        "total": 25,
        "passed": 22,
        "failed": 3,
        "passRate": 88.0
      },
      {
        "siteId": "uuid-2",
        "siteName": "Distribution Center",
        "total": 30,
        "passed": 28,
        "failed": 2,
        "passRate": 93.3
      }
    ]
  }
}
```

---

### 4.7 GET /api/analytics/actions/time-series

Returns action creation and completion over time.

**Request:**
```http
GET /api/analytics/actions/time-series?preset=last_365_days
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "granularity": "month",
    "series": [
      {
        "period": "2025-03",
        "created": 28,
        "completed": 22,
        "netChange": 6
      },
      {
        "period": "2025-04",
        "created": 35,
        "completed": 30,
        "netChange": 5
      }
    ],
    "totals": {
      "created": 312,
      "completed": 267,
      "currentOpen": 45
    }
  }
}
```

---

### 4.8 GET /api/analytics/actions/overdue-by-site

Returns overdue action counts per site.

**Request:**
```http
GET /api/analytics/actions/overdue-by-site
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "siteId": "uuid-1",
        "siteName": "Warehouse A",
        "overdueCount": 8,
        "totalOpen": 15,
        "overduePercent": 53.3
      },
      {
        "siteId": "uuid-2",
        "siteName": "Distribution Center",
        "overdueCount": 3,
        "totalOpen": 12,
        "overduePercent": 25.0
      }
    ],
    "totalOverdue": 11,
    "totalOpen": 45
  }
}
```

---

### 4.9 GET /api/analytics/risk-scores

Returns all site risk scores.

**Request:**
```http
GET /api/analytics/risk-scores?sortBy=score_desc
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `sortBy` | No | `score_desc` | Sort: `score_desc`, `score_asc`, `name_asc` |
| `category` | No | All | Filter by category: `low`, `medium`, `high`, `critical` |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "siteId": "uuid-1",
        "siteName": "Warehouse A",
        "riskScore": 46,
        "riskCategory": "high",
        "previousScore": 38,
        "trend": "up",
        "trendPercent": 21.1,
        "primaryFactor": "7 high-severity incidents",
        "breakdown": {
          "incidentScore": 30,
          "actionScore": 12,
          "inspectionScore": 4,
          "details": {
            "incidentsCritical": 0,
            "incidentsHigh": 4,
            "incidentsMedium": 5,
            "incidentsLow": 0,
            "overdueActions": 4,
            "failedInspections": 2
          }
        },
        "scoringWindowDays": 90,
        "calculatedAt": "2026-02-02T03:00:00Z"
      }
    ],
    "summary": {
      "totalSites": 10,
      "byCategoryCount": {
        "low": 5,
        "medium": 3,
        "high": 1,
        "critical": 1
      }
    }
  }
}
```

---

### 4.10 GET /api/analytics/risk-scores/top

Returns top N highest risk sites.

**Request:**
```http
GET /api/analytics/risk-scores/top?limit=5
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `limit` | No | 5 | Number of sites to return |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "siteId": "uuid-1",
        "siteName": "Distribution Center",
        "riskScore": 52,
        "riskCategory": "critical",
        "primaryFactor": "2 critical incidents",
        "previousScore": 45,
        "trend": "up"
      },
      {
        "siteId": "uuid-2",
        "siteName": "Warehouse A",
        "riskScore": 46,
        "riskCategory": "high",
        "primaryFactor": "4 overdue actions",
        "previousScore": 38,
        "trend": "up"
      }
    ]
  }
}
```

---

### 4.11 GET /api/analytics/risk-scores/:siteId/history

Returns historical risk scores for a site.

**Request:**
```http
GET /api/analytics/risk-scores/uuid-1/history?days=90
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `days` | No | 90 | Number of days of history |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "siteId": "uuid-1",
    "siteName": "Warehouse A",
    "history": [
      {
        "date": "2025-11-03",
        "riskScore": 28,
        "riskCategory": "medium"
      },
      {
        "date": "2025-11-10",
        "riskScore": 32,
        "riskCategory": "high"
      },
      {
        "date": "2025-11-17",
        "riskScore": 38,
        "riskCategory": "high"
      }
    ]
  }
}
```

---

### 4.12 GET /api/analytics/views

Returns user's saved views.

**Request:**
```http
GET /api/analytics/views
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "views": [
      {
        "id": "uuid-1",
        "name": "Monthly Board Review",
        "description": "Standard view for monthly board meetings",
        "filters": {
          "dateRange": {
            "preset": "last_90_days"
          },
          "siteIds": [],
          "severities": ["high", "critical"]
        },
        "isShared": true,
        "isDefault": true,
        "createdBy": "uuid-user",
        "createdByName": "John Smith",
        "createdAt": "2026-01-15T10:00:00Z",
        "updatedAt": "2026-01-20T14:30:00Z"
      }
    ],
    "sharedViews": [
      {
        "id": "uuid-2",
        "name": "Weekly Safety Huddle",
        "description": null,
        "filters": { ... },
        "isShared": true,
        "isDefault": false,
        "createdBy": "uuid-admin",
        "createdByName": "Admin User",
        "createdAt": "2026-01-10T09:00:00Z"
      }
    ]
  }
}
```

---

### 4.13 POST /api/analytics/views

Creates a new saved view.

**Request:**
```http
POST /api/analytics/views
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Quarterly High-Risk Review",
  "description": "Focus on high and critical incidents",
  "filters": {
    "dateRange": {
      "preset": "last_90_days"
    },
    "siteIds": ["uuid-1", "uuid-2"],
    "severities": ["high", "critical"],
    "incidentTypeIds": []
  },
  "isShared": false,
  "isDefault": false
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `name` | Required, 3-100 characters, unique per user |
| `filters` | Required, valid JSON object |
| `isShared` | Optional, default false |
| `isDefault` | Optional, default false |

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "view": {
      "id": "uuid-new",
      "name": "Quarterly High-Risk Review",
      "description": "Focus on high and critical incidents",
      "filters": { ... },
      "isShared": false,
      "isDefault": false,
      "createdAt": "2026-02-02T11:00:00Z"
    }
  }
}
```

**Error Responses:**
- 400: Validation error (name too short, invalid filters)
- 400: Maximum views limit reached (20 per user)
- 409: View name already exists

---

### 4.14 GET /api/analytics/views/:id

Returns a specific saved view.

**Request:**
```http
GET /api/analytics/views/uuid-1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "view": {
      "id": "uuid-1",
      "name": "Monthly Board Review",
      "description": "Standard view for monthly board meetings",
      "filters": { ... },
      "isShared": true,
      "isDefault": true,
      "createdBy": "uuid-user",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-20T14:30:00Z"
    }
  }
}
```

**Error Responses:**
- 404: View not found
- 403: Access denied (view is private and belongs to another user)

---

### 4.15 PUT /api/analytics/views/:id

Updates a saved view.

**Request:**
```http
PUT /api/analytics/views/uuid-1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Board Review",
  "description": "Updated description",
  "filters": { ... },
  "isShared": true,
  "isDefault": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "view": {
      "id": "uuid-1",
      "name": "Updated Board Review",
      ...
    }
  }
}
```

**Error Responses:**
- 403: Not owner of view
- 404: View not found

---

### 4.16 DELETE /api/analytics/views/:id

Deletes a saved view.

**Request:**
```http
DELETE /api/analytics/views/uuid-1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "View deleted successfully"
}
```

**Error Responses:**
- 403: Not owner of view
- 404: View not found

---

### 4.17 POST /api/analytics/report/pdf

Generates a PDF analytics report.

**Request:**
```http
POST /api/analytics/report/pdf
Authorization: Bearer <token>
Content-Type: application/json

{
  "filters": {
    "dateRange": {
      "preset": "last_90_days"
    },
    "siteIds": [],
    "severities": []
  },
  "sections": ["summary", "incidents", "inspections", "actions", "risk"],
  "includeCharts": true
}
```

**Request Body:**
| Field | Required | Description |
|-------|----------|-------------|
| `filters` | Yes | Filter configuration |
| `sections` | No | Sections to include (default: all) |
| `includeCharts` | No | Include chart images (default: true) |

**Response (200 OK):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="analytics-report-2026-02-02.pdf"

[PDF Binary Data]
```

**Error Responses:**
- 400: Invalid filter configuration
- 408: Report generation timed out
- 500: PDF generation failed

---

## 5. Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date range",
    "details": {
      "field": "startDate",
      "issue": "Start date must be before end date"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Access denied to resource |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate name) |
| `LIMIT_EXCEEDED` | 400 | Resource limit exceeded |
| `TIMEOUT` | 408 | Operation timed out |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 6. Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Analytics queries | 60 requests/minute |
| PDF generation | 5 requests/minute |
| Saved views CRUD | 30 requests/minute |

---

## 7. Related Documents

- [BRD_EHS_PORTAL_PHASE5.md](./BRD_EHS_PORTAL_PHASE5.md) - Business requirements
- [ARCHITECTURE_PHASE5.md](./ARCHITECTURE_PHASE5.md) - System architecture
- [DATA_MODEL_PHASE5.md](./DATA_MODEL_PHASE5.md) - Data model
- [FRONTEND_UX_PHASE5.md](./FRONTEND_UX_PHASE5.md) - Frontend UX design

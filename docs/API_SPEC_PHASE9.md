# API Specification – EHS Portal Phase 9
## Risk Register & Enterprise Risk Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | API Architect |
| Date | 2026-02-05 |
| Status | Draft |
| Phase | 9 – Risk Register & Enterprise Risk Management |

---

## 1. Overview

This document specifies the REST API endpoints for Phase 9 Risk Register functionality.

**Base URL:** `/api/risks`

**Authentication:** Bearer JWT token required for all endpoints.

---

## 2. Risk Register Endpoints

### 2.1 List Risks

```
GET /api/risks
```

**Description:** List all risks with filtering, sorting, and pagination.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `status` | string | No | Filter by status: `draft`, `open`, `under_review`, `treating`, `closed` |
| `level` | string | No | Filter by residual level: `low`, `medium`, `high`, `extreme` |
| `categoryId` | integer | No | Filter by category ID |
| `siteId` | integer | No | Filter by site ID |
| `ownerId` | integer | No | Filter by owner user ID |
| `reviewOverdue` | boolean | No | Filter to overdue reviews only |
| `search` | string | No | Full-text search in title, description, hazard |
| `sortBy` | string | No | Sort field: `created_at`, `residual_score`, `next_review_date`, `title` |
| `sortOrder` | string | No | `asc` or `desc` (default: `desc`) |

**Response: 200 OK**

```json
{
  "success": true,
  "data": {
    "risks": [
      {
        "id": 1,
        "reference": "RISK-2026-0001",
        "title": "Slip and Fall Hazard in Warehouse",
        "status": "open",
        "categoryId": 2,
        "categoryName": "Physical Hazards",
        "inherentLikelihood": 4,
        "inherentImpact": 4,
        "inherentScore": 16,
        "inherentLevel": "high",
        "residualLikelihood": 2,
        "residualImpact": 4,
        "residualScore": 8,
        "residualLevel": "medium",
        "ownerUserId": 15,
        "ownerName": "John Smith",
        "nextReviewDate": "2026-04-15",
        "reviewOverdue": false,
        "controlCount": 3,
        "linkCount": 2,
        "sites": [
          { "id": 1, "name": "Main Warehouse" }
        ],
        "createdAt": "2026-01-15T10:30:00Z",
        "updatedAt": "2026-02-01T14:22:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 45,
      "totalPages": 3
    },
    "summary": {
      "total": 45,
      "byLevel": {
        "extreme": 3,
        "high": 12,
        "medium": 18,
        "low": 12
      },
      "reviewOverdue": 4
    }
  }
}
```

---

### 2.2 Get Risk Detail

```
GET /api/risks/:id
```

**Description:** Get complete risk details including controls, links, and recent reviews.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Risk ID |

**Response: 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "reference": "RISK-2026-0001",
    "title": "Slip and Fall Hazard in Warehouse",
    "description": "Risk of employee injury from slipping on wet or oily floors in warehouse area.",
    "status": "open",
    "source": "internal_audit",
    "category": {
      "id": 2,
      "name": "Physical Hazards",
      "colour": "#FF9800"
    },
    "hazard": "Wet/oily floor surfaces in high-traffic areas",
    "potentialCauses": "Spilled liquids, cleaning operations, leaking equipment",
    "potentialConsequences": "Employee injury, lost work time, workers compensation claims",
    "inherentLikelihood": 4,
    "inherentImpact": 4,
    "inherentScore": 16,
    "inherentLevel": "high",
    "inherentRationale": "High foot traffic, frequent spill incidents historically",
    "residualLikelihood": 2,
    "residualImpact": 4,
    "residualScore": 8,
    "residualLevel": "medium",
    "residualRationale": "Floor mats and immediate cleanup procedures in place",
    "toleranceStatus": "within",
    "ownerUserId": 15,
    "owner": {
      "id": 15,
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@company.com"
    },
    "reviewFrequency": "quarterly",
    "nextReviewDate": "2026-04-15",
    "lastReviewDate": "2026-01-15",
    "reviewOverdue": false,
    "sites": [
      { "id": 1, "name": "Main Warehouse", "isPrimary": true },
      { "id": 2, "name": "Distribution Center", "isPrimary": false }
    ],
    "controls": [
      {
        "id": 1,
        "description": "Non-slip floor mats at entrances and high-traffic areas",
        "controlType": "preventive",
        "controlHierarchy": "engineering",
        "effectiveness": "effective",
        "ownerUserId": 15,
        "ownerName": "John Smith",
        "implementedDate": "2025-06-01",
        "lastVerifiedDate": "2026-01-15",
        "nextVerificationDate": "2026-04-15",
        "links": []
      },
      {
        "id": 2,
        "description": "Immediate spill cleanup procedure",
        "controlType": "corrective",
        "controlHierarchy": "administrative",
        "effectiveness": "effective",
        "ownerUserId": 20,
        "ownerName": "Jane Doe",
        "implementedDate": "2025-06-15",
        "lastVerifiedDate": "2026-01-15",
        "nextVerificationDate": "2026-04-15",
        "links": [
          {
            "id": 5,
            "entityType": "training_course",
            "entityId": 12,
            "entityReference": "TC-012",
            "entityTitle": "Spill Response Training"
          }
        ]
      }
    ],
    "links": [
      {
        "id": 1,
        "entityType": "incident",
        "entityId": 45,
        "entityReference": "INC-2025-0045",
        "entityTitle": "Slip injury in aisle 4",
        "linkReason": "Previous incident demonstrating this risk",
        "linkedAt": "2026-01-20T09:15:00Z",
        "linkedBy": {
          "id": 15,
          "firstName": "John",
          "lastName": "Smith"
        }
      },
      {
        "id": 2,
        "entityType": "action",
        "entityId": 78,
        "entityReference": "ACT-2026-0078",
        "entityTitle": "Install additional floor mats",
        "entityStatus": "completed",
        "linkReason": "Corrective action from incident",
        "linkedAt": "2026-01-22T11:30:00Z"
      }
    ],
    "recentReviews": [
      {
        "id": 1,
        "reviewDate": "2026-01-15",
        "reviewedBy": {
          "id": 15,
          "firstName": "John",
          "lastName": "Smith"
        },
        "outcome": "no_change",
        "previousResidualScore": 8,
        "newResidualScore": 8,
        "notes": "Controls remain effective. No new incidents since last review."
      }
    ],
    "createdAt": "2026-01-15T10:30:00Z",
    "createdBy": {
      "id": 10,
      "firstName": "Admin",
      "lastName": "User"
    },
    "updatedAt": "2026-02-01T14:22:00Z",
    "updatedBy": {
      "id": 15,
      "firstName": "John",
      "lastName": "Smith"
    }
  }
}
```

---

### 2.3 Create Risk

```
POST /api/risks
```

**Description:** Create a new risk entry.

**Required Role:** Manager, Admin

**Request Body:**

```json
{
  "title": "Chemical Exposure in Laboratory",
  "description": "Risk of employee exposure to hazardous chemicals during lab operations",
  "categoryId": 3,
  "source": "risk_assessment",
  "hazard": "Volatile organic compounds during sample analysis",
  "potentialCauses": "Inadequate ventilation, improper handling, PPE non-compliance",
  "potentialConsequences": "Respiratory illness, skin irritation, long-term health effects",
  "inherentLikelihood": 4,
  "inherentImpact": 5,
  "inherentRationale": "Daily exposure potential, multiple chemicals in use",
  "residualLikelihood": 2,
  "residualImpact": 3,
  "residualRationale": "Fume hoods and PPE requirements significantly reduce exposure",
  "ownerUserId": 25,
  "reviewFrequency": "monthly",
  "siteIds": [1, 3],
  "status": "open"
}
```

**Required Fields:** `title`, `categoryId`, `inherentLikelihood`, `inherentImpact`, `ownerUserId`, `siteIds`

**Response: 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 46,
    "reference": "RISK-2026-0046",
    "title": "Chemical Exposure in Laboratory",
    "status": "open",
    "inherentScore": 20,
    "inherentLevel": "extreme",
    "residualScore": 6,
    "residualLevel": "medium",
    "createdAt": "2026-02-05T09:30:00Z"
  },
  "message": "Risk created successfully"
}
```

---

### 2.4 Update Risk

```
PUT /api/risks/:id
```

**Description:** Update an existing risk.

**Required Role:** Manager (own risks), Admin (all risks)

**Request Body:** Same as create, all fields optional.

**Response: 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 46,
    "reference": "RISK-2026-0046",
    "title": "Chemical Exposure in Laboratory",
    "status": "open",
    "inherentScore": 20,
    "inherentLevel": "extreme",
    "residualScore": 4,
    "residualLevel": "low",
    "updatedAt": "2026-02-05T11:45:00Z"
  },
  "message": "Risk updated successfully"
}
```

---

### 2.5 Change Risk Status

```
POST /api/risks/:id/status
```

**Description:** Change risk status with optional justification.

**Request Body:**

```json
{
  "status": "closed",
  "justification": "Risk eliminated through process change. Chemical no longer used."
}
```

**Valid Status Transitions:**

| From | To |
|------|----|
| `draft` | `open` |
| `open` | `under_review`, `treating`, `closed` |
| `treating` | `open`, `under_review` |
| `under_review` | `open`, `treating`, `closed` |
| `closed` | `open` |

**Response: 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 46,
    "reference": "RISK-2026-0046",
    "status": "closed",
    "previousStatus": "open",
    "closedAt": "2026-02-05T12:00:00Z"
  },
  "message": "Risk status changed to closed"
}
```

---

### 2.6 Delete Risk

```
DELETE /api/risks/:id
```

**Description:** Soft delete a risk (changes status to closed).

**Required Role:** Admin

**Response: 200 OK**

```json
{
  "success": true,
  "message": "Risk deleted successfully"
}
```

---

## 3. Risk Controls Endpoints

### 3.1 List Controls for Risk

```
GET /api/risks/:riskId/controls
```

**Response: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "description": "Non-slip floor mats at entrances",
      "controlType": "preventive",
      "controlHierarchy": "engineering",
      "effectiveness": "effective",
      "ownerUserId": 15,
      "ownerName": "John Smith",
      "implementedDate": "2025-06-01",
      "lastVerifiedDate": "2026-01-15",
      "nextVerificationDate": "2026-04-15",
      "verificationFrequency": "quarterly",
      "links": []
    }
  ]
}
```

---

### 3.2 Add Control to Risk

```
POST /api/risks/:riskId/controls
```

**Request Body:**

```json
{
  "description": "Mandatory safety footwear in warehouse areas",
  "controlType": "preventive",
  "controlHierarchy": "ppe",
  "effectiveness": "effective",
  "ownerUserId": 15,
  "implementedDate": "2026-02-01",
  "verificationFrequency": "quarterly",
  "notes": "Steel-toe boots required for all warehouse staff"
}
```

**Control Types:** `preventive`, `detective`, `corrective`

**Control Hierarchy:** `elimination`, `substitution`, `engineering`, `administrative`, `ppe`

**Effectiveness:** `effective`, `partially_effective`, `ineffective`, `untested`

**Response: 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 4,
    "description": "Mandatory safety footwear in warehouse areas",
    "controlType": "preventive",
    "controlHierarchy": "ppe",
    "effectiveness": "effective",
    "nextVerificationDate": "2026-05-01"
  },
  "message": "Control added successfully"
}
```

---

### 3.3 Update Control

```
PUT /api/risks/:riskId/controls/:controlId
```

**Request Body:** Same as create, all fields optional.

**Response: 200 OK**

---

### 3.4 Delete Control

```
DELETE /api/risks/:riskId/controls/:controlId
```

**Response: 200 OK**

---

### 3.5 Link Control to Entity

```
POST /api/risks/:riskId/controls/:controlId/links
```

**Description:** Link a control to a related entity (action, training, permit).

**Request Body:**

```json
{
  "entityType": "training_course",
  "entityId": 12
}
```

**Valid Entity Types:** `action`, `training_course`, `permit`

**Response: 201 Created**

```json
{
  "success": true,
  "data": {
    "linkId": 5,
    "controlId": 2,
    "entityType": "training_course",
    "entityId": 12,
    "entityReference": "TC-012",
    "entityTitle": "Spill Response Training"
  },
  "message": "Control linked successfully"
}
```

---

## 4. Risk Links Endpoints

### 4.1 List Risk Links

```
GET /api/risks/:riskId/links
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `entityType` | string | Filter by type: `incident`, `action`, `inspection`, `training_course`, `chemical`, `permit` |

**Response: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "entityType": "incident",
      "entityId": 45,
      "entityReference": "INC-2025-0045",
      "entityTitle": "Slip injury in aisle 4",
      "entityStatus": "closed",
      "linkReason": "Previous incident demonstrating this risk",
      "linkedAt": "2026-01-20T09:15:00Z",
      "linkedBy": {
        "id": 15,
        "firstName": "John",
        "lastName": "Smith"
      }
    }
  ],
  "summary": {
    "incident": 1,
    "action": 2,
    "inspection": 0,
    "training_course": 1,
    "chemical": 0,
    "permit": 0
  }
}
```

---

### 4.2 Create Risk Link

```
POST /api/risks/:riskId/links
```

**Request Body:**

```json
{
  "entityType": "action",
  "entityId": 78,
  "linkReason": "Corrective action to mitigate this risk"
}
```

**Response: 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 3,
    "entityType": "action",
    "entityId": 78,
    "entityReference": "ACT-2026-0078",
    "entityTitle": "Install additional floor drainage",
    "linkedAt": "2026-02-05T14:00:00Z"
  },
  "message": "Link created successfully"
}
```

---

### 4.3 Delete Risk Link

```
DELETE /api/risks/:riskId/links/:linkId
```

**Response: 200 OK**

```json
{
  "success": true,
  "message": "Link removed successfully"
}
```

---

## 5. Risk Reviews Endpoints

### 5.1 List Reviews for Risk

```
GET /api/risks/:riskId/reviews
```

**Response: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "reviewDate": "2026-01-15",
      "reviewedBy": {
        "id": 15,
        "firstName": "John",
        "lastName": "Smith"
      },
      "outcome": "no_change",
      "previousInherentScore": 16,
      "newInherentScore": 16,
      "previousResidualScore": 8,
      "newResidualScore": 8,
      "controlsReviewed": 3,
      "notes": "Controls remain effective. No new incidents since last review.",
      "createdAt": "2026-01-15T11:30:00Z"
    }
  ]
}
```

---

### 5.2 Record Review

```
POST /api/risks/:riskId/reviews
```

**Description:** Record a review with updated scores and control status.

**Request Body:**

```json
{
  "outcome": "improved",
  "newResidualLikelihood": 1,
  "newResidualImpact": 4,
  "notes": "Additional controls implemented, residual risk reduced",
  "controlReviews": [
    {
      "controlId": 1,
      "verified": true,
      "effectiveness": "effective",
      "notes": "Mats in good condition"
    },
    {
      "controlId": 2,
      "verified": true,
      "effectiveness": "effective",
      "notes": "Procedure followed consistently"
    }
  ],
  "recommendClose": false
}
```

**Outcome Values:** `no_change`, `improved`, `deteriorated`, `recommend_close`

**Response: 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "reviewDate": "2026-02-05",
    "outcome": "improved",
    "previousResidualScore": 8,
    "newResidualScore": 4,
    "newResidualLevel": "low",
    "nextReviewDate": "2026-05-05"
  },
  "message": "Review recorded successfully"
}
```

---

## 6. Risk Analytics Endpoints

### 6.1 Get Heatmap Data

```
GET /api/risks/heatmap
```

**Description:** Get aggregated data for the 5×5 risk heatmap.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `scoreType` | string | `inherent` or `residual` (default: `residual`) |
| `categoryId` | integer | Filter by category |
| `siteId` | integer | Filter by site |
| `status` | string | Filter by status (default: excludes `closed`) |

**Response: 200 OK**

```json
{
  "success": true,
  "data": {
    "scoreType": "residual",
    "matrix": [
      { "likelihood": 1, "impact": 1, "level": "low", "count": 2, "riskIds": [10, 15] },
      { "likelihood": 1, "impact": 2, "level": "low", "count": 3, "riskIds": [11, 16, 22] },
      { "likelihood": 1, "impact": 3, "level": "low", "count": 1, "riskIds": [25] },
      { "likelihood": 1, "impact": 4, "level": "medium", "count": 0, "riskIds": [] },
      { "likelihood": 1, "impact": 5, "level": "medium", "count": 0, "riskIds": [] },
      { "likelihood": 2, "impact": 1, "level": "low", "count": 1, "riskIds": [30] },
      { "likelihood": 2, "impact": 2, "level": "low", "count": 2, "riskIds": [31, 32] },
      { "likelihood": 2, "impact": 3, "level": "medium", "count": 4, "riskIds": [33, 34, 35, 36] },
      { "likelihood": 2, "impact": 4, "level": "medium", "count": 2, "riskIds": [1, 37] },
      { "likelihood": 2, "impact": 5, "level": "high", "count": 1, "riskIds": [38] },
      { "likelihood": 3, "impact": 1, "level": "low", "count": 0, "riskIds": [] },
      { "likelihood": 3, "impact": 2, "level": "medium", "count": 2, "riskIds": [40, 41] },
      { "likelihood": 3, "impact": 3, "level": "medium", "count": 3, "riskIds": [42, 43, 44] },
      { "likelihood": 3, "impact": 4, "level": "high", "count": 2, "riskIds": [45, 46] },
      { "likelihood": 3, "impact": 5, "level": "high", "count": 1, "riskIds": [47] },
      { "likelihood": 4, "impact": 1, "level": "low", "count": 0, "riskIds": [] },
      { "likelihood": 4, "impact": 2, "level": "medium", "count": 1, "riskIds": [50] },
      { "likelihood": 4, "impact": 3, "level": "high", "count": 2, "riskIds": [51, 52] },
      { "likelihood": 4, "impact": 4, "level": "high", "count": 1, "riskIds": [53] },
      { "likelihood": 4, "impact": 5, "level": "extreme", "count": 1, "riskIds": [54] },
      { "likelihood": 5, "impact": 1, "level": "medium", "count": 0, "riskIds": [] },
      { "likelihood": 5, "impact": 2, "level": "high", "count": 0, "riskIds": [] },
      { "likelihood": 5, "impact": 3, "level": "high", "count": 1, "riskIds": [55] },
      { "likelihood": 5, "impact": 4, "level": "extreme", "count": 1, "riskIds": [56] },
      { "likelihood": 5, "impact": 5, "level": "extreme", "count": 1, "riskIds": [57] }
    ],
    "summary": {
      "totalRisks": 32,
      "byLevel": {
        "low": 9,
        "medium": 13,
        "high": 7,
        "extreme": 3
      }
    },
    "filters": {
      "categoryId": null,
      "siteId": null,
      "status": ["draft", "open", "under_review", "treating"]
    }
  }
}
```

---

### 6.2 Get Top Risks

```
GET /api/risks/top
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | integer | Number of risks (default: 5, max: 20) |
| `scoreType` | string | `inherent` or `residual` (default: `residual`) |
| `categoryId` | integer | Filter by category |
| `siteId` | integer | Filter by site |

**Response: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 57,
      "reference": "RISK-2026-0057",
      "title": "Critical Infrastructure Failure",
      "residualScore": 25,
      "residualLevel": "extreme",
      "status": "treating",
      "ownerName": "Mike Johnson",
      "nextReviewDate": "2026-02-28"
    },
    {
      "id": 56,
      "reference": "RISK-2026-0056",
      "title": "Major Chemical Spill",
      "residualScore": 20,
      "residualLevel": "extreme",
      "status": "open",
      "ownerName": "Sarah Williams",
      "nextReviewDate": "2026-03-15"
    }
  ]
}
```

---

### 6.3 Get Upcoming Reviews

```
GET /api/risks/upcoming-reviews
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | integer | Days ahead to look (default: 30) |
| `limit` | integer | Max results (default: 20) |

**Response: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "reference": "RISK-2026-0001",
      "title": "Slip and Fall Hazard",
      "residualLevel": "medium",
      "nextReviewDate": "2026-02-15",
      "daysUntilDue": 10,
      "ownerUserId": 15,
      "ownerName": "John Smith"
    }
  ]
}
```

---

### 6.4 Get Overdue Reviews

```
GET /api/risks/overdue-reviews
```

**Response: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "reference": "RISK-2025-0012",
      "title": "Electrical Safety Risk",
      "residualLevel": "high",
      "nextReviewDate": "2026-01-31",
      "daysOverdue": 5,
      "ownerUserId": 18,
      "ownerName": "David Brown"
    }
  ],
  "summary": {
    "totalOverdue": 4,
    "byDaysOverdue": {
      "1-7": 2,
      "8-30": 1,
      "30+": 1
    }
  }
}
```

---

## 7. Risk Export Endpoints

### 7.1 Export Risk Register

```
POST /api/risks/export
```

**Description:** Export risk register to Excel or PDF.

**Request Body:**

```json
{
  "format": "excel",
  "filters": {
    "status": ["open", "treating"],
    "categoryId": null,
    "siteId": 1,
    "level": null
  },
  "options": {
    "includeControls": true,
    "includeLinks": true,
    "includeReviews": false,
    "includeHeatmap": true
  }
}
```

**Format Values:** `excel`, `pdf`

**Response: 200 OK**

```json
{
  "success": true,
  "data": {
    "downloadUrl": "/api/exports/risk-register-2026-02-05-abc123.xlsx",
    "expiresAt": "2026-02-05T18:00:00Z",
    "recordCount": 32
  }
}
```

---

### 7.2 Export Single Risk

```
GET /api/risks/:id/export
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | `pdf` (default) |

**Response: 200 OK**

Returns PDF file as binary download.

---

## 8. Risk Categories Endpoints

### 8.1 List Categories

```
GET /api/risk-categories
```

**Response: 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Strategic",
      "description": "Risks affecting strategic objectives",
      "colour": "#2196F3",
      "sortOrder": 1,
      "riskCount": 12,
      "isActive": true
    },
    {
      "id": 2,
      "name": "Physical Hazards",
      "description": "Workplace physical safety risks",
      "colour": "#FF9800",
      "sortOrder": 2,
      "riskCount": 25,
      "isActive": true
    }
  ]
}
```

---

### 8.2 Create Category

```
POST /api/risk-categories
```

**Required Role:** Admin

**Request Body:**

```json
{
  "name": "Environmental",
  "description": "Environmental and sustainability risks",
  "colour": "#4CAF50",
  "sortOrder": 5
}
```

**Response: 201 Created**

---

### 8.3 Update Category

```
PUT /api/risk-categories/:id
```

**Required Role:** Admin

---

### 8.4 Delete Category

```
DELETE /api/risk-categories/:id
```

**Required Role:** Admin

**Note:** Cannot delete if risks exist in category. Use deactivation instead.

---

## 9. Risk Settings Endpoints

### 9.1 Get Scoring Matrix

```
GET /api/risk-settings/scoring-matrix
```

**Response: 200 OK**

```json
{
  "success": true,
  "data": {
    "likelihood": {
      "1": { "label": "Rare", "description": "Less than once per 5 years" },
      "2": { "label": "Unlikely", "description": "Once per 2-5 years" },
      "3": { "label": "Possible", "description": "Once per 1-2 years" },
      "4": { "label": "Likely", "description": "Once per year" },
      "5": { "label": "Almost Certain", "description": "Multiple times per year" }
    },
    "impact": {
      "1": { "label": "Negligible", "description": "No injury, < $10K loss" },
      "2": { "label": "Minor", "description": "First aid only, $10-50K loss" },
      "3": { "label": "Moderate", "description": "Medical treatment, $50-250K loss" },
      "4": { "label": "Major", "description": "Serious injury, $250K-1M loss" },
      "5": { "label": "Catastrophic", "description": "Fatality, > $1M loss" }
    },
    "levels": {
      "low": { "min": 1, "max": 4, "colour": "#4CAF50" },
      "medium": { "min": 5, "max": 9, "colour": "#FFEB3B" },
      "high": { "min": 10, "max": 16, "colour": "#FF9800" },
      "extreme": { "min": 17, "max": 25, "colour": "#F44336" }
    }
  }
}
```

---

### 9.2 Update Scoring Matrix

```
PUT /api/risk-settings/scoring-matrix
```

**Required Role:** Admin

---

### 9.3 Get Tolerance Settings

```
GET /api/risk-settings/tolerances
```

**Response: 200 OK**

```json
{
  "success": true,
  "data": {
    "acceptableLevel": "medium",
    "tolerableLevel": "high",
    "escalationRequired": ["high", "extreme"],
    "autoCloseLevel": null,
    "notifications": {
      "approachingTolerance": true,
      "exceedsTolerance": true,
      "extremeRiskCreated": true
    }
  }
}
```

---

### 9.4 Update Tolerance Settings

```
PUT /api/risk-settings/tolerances
```

**Required Role:** Admin

---

## 10. Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "RISK_NOT_FOUND",
    "message": "Risk with ID 999 not found",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RISK_NOT_FOUND` | 404 | Risk ID does not exist |
| `CATEGORY_NOT_FOUND` | 404 | Category ID does not exist |
| `CONTROL_NOT_FOUND` | 404 | Control ID does not exist |
| `LINK_NOT_FOUND` | 404 | Link ID does not exist |
| `INVALID_STATUS_TRANSITION` | 400 | Status transition not allowed |
| `ENTITY_NOT_FOUND` | 400 | Linked entity does not exist |
| `INVALID_ENTITY_TYPE` | 400 | Entity type not supported |
| `DUPLICATE_LINK` | 409 | Link already exists |
| `CATEGORY_HAS_RISKS` | 409 | Cannot delete category with risks |
| `INVALID_SCORE_VALUE` | 400 | Likelihood/Impact must be 1-5 |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `UNAUTHORISED` | 401 | Authentication required |

---

## 11. Rate Limiting

| Endpoint Pattern | Rate Limit |
|------------------|------------|
| `GET /api/risks/*` | 100/minute |
| `POST /api/risks/export` | 10/minute |
| `POST/PUT/DELETE` | 60/minute |

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | API Architect | Initial Phase 9 API specification |

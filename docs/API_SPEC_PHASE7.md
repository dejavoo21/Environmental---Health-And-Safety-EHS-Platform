# API Specification – EHS Portal Phase 7
## Chemical & Permit Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Status | Draft |
| Phase | 7 – Chemical & Permit Management |

---

## 1. Overview

Phase 7 introduces API endpoints for:
- Chemical register management (CRUD, filtering)
- SDS document management
- Storage locations and inventory
- Permit type configuration
- Permit lifecycle management
- Permit board and queries
- Chemical/permit linking to incidents, inspections, actions

All endpoints are scoped to the authenticated user's organisation.

**Base URLs:**
- `/api/chemicals` - Chemical management
- `/api/permit-types` - Permit type configuration
- `/api/permits` - Permit management

---

## 2. Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

Organisation ID is derived from the authenticated user's token.

---

## 3. Chemical Management APIs

### 3.1 GET /api/chemicals

List chemicals in the organisation's register.

**Request:**
```http
GET /api/chemicals?status=active&search=acetone&hazardClass=flammable_liquid
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: active, phase_out, banned |
| search | string | No | Search by name, CAS number, or internal code |
| hazardClass | string | No | Filter by GHS hazard class |
| siteId | UUID | No | Filter by chemicals stored at site |
| sdsExpiring | number | No | Filter SDS expiring within N days |
| sdsExpired | boolean | No | If true, show only expired SDS |
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 20, max: 100) |
| sortBy | string | No | Sort field: name, cas_number, sds_expiry_date, created_at |
| sortOrder | string | No | asc or desc (default: asc) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chemicals": [
      {
        "id": "uuid-1",
        "name": "Acetone",
        "internalCode": "CHM-001",
        "casNumber": "67-64-1",
        "supplier": "Sigma-Aldrich",
        "physicalState": "liquid",
        "sdsVersion": "2.1",
        "sdsExpiryDate": "2027-06-15",
        "sdsStatus": "valid",
        "status": "active",
        "ghsHazardClasses": [
          "flammable_liquid",
          "serious_eye_damage",
          "specific_target_organ_toxicity_single"
        ],
        "ppeRequirements": "Safety goggles, nitrile gloves",
        "storageLocationCount": 3,
        "createdAt": "2026-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 156,
      "totalPages": 8
    }
  }
}
```

---

### 3.2 GET /api/chemicals/:id

Get chemical detail with related data.

**Request:**
```http
GET /api/chemicals/uuid-1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "name": "Acetone",
    "internalCode": "CHM-001",
    "casNumber": "67-64-1",
    "supplier": "Sigma-Aldrich",
    "physicalState": "liquid",
    "sdsVersion": "2.1",
    "sdsExpiryDate": "2027-06-15",
    "status": "active",
    "ghsHazardClasses": [
      {
        "class": "flammable_liquid",
        "pictogram": "flame"
      },
      {
        "class": "serious_eye_damage",
        "pictogram": "corrosion"
      }
    ],
    "ppeRequirements": "Safety goggles, nitrile gloves",
    "handlingNotes": "Store away from heat sources. Use in well-ventilated area.",
    "createdBy": {
      "id": "user-uuid",
      "name": "John Smith"
    },
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-02-01T14:30:00Z",
    "storageLocations": [
      {
        "id": "loc-uuid-1",
        "siteName": "Warehouse A",
        "locationName": "Flammables Cabinet 1",
        "currentQuantity": 25.5,
        "unit": "L",
        "maxStorageAmount": 50
      }
    ],
    "sdsDocuments": [
      {
        "id": "attach-uuid-1",
        "fileName": "Acetone_SDS_v2.1.pdf",
        "version": "2.1",
        "isCurrent": true,
        "uploadedAt": "2026-01-15T10:00:00Z",
        "downloadUrl": "/api/attachments/attach-uuid-1/download"
      }
    ],
    "relatedIncidentsCount": 2,
    "relatedActionsCount": 1
  }
}
```

---

### 3.3 POST /api/chemicals

Create a new chemical record.

**Request:**
```http
POST /api/chemicals
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Toluene",
  "internalCode": "CHM-015",
  "casNumber": "108-88-3",
  "supplier": "Fisher Scientific",
  "physicalState": "liquid",
  "ghsHazardClasses": [
    "flammable_liquid",
    "skin_corrosion",
    "reproductive_toxicity"
  ],
  "ppeRequirements": "Full face respirator, chemical-resistant gloves, safety goggles",
  "handlingNotes": "Use only in fume hood. Avoid skin contact."
}
```

**Required Fields:**
- name
- physicalState

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "name": "Toluene",
    "internalCode": "CHM-015",
    "casNumber": "108-88-3",
    "supplier": "Fisher Scientific",
    "physicalState": "liquid",
    "status": "active",
    "ghsHazardClasses": ["flammable_liquid", "skin_corrosion", "reproductive_toxicity"],
    "ppeRequirements": "Full face respirator, chemical-resistant gloves, safety goggles",
    "handlingNotes": "Use only in fume hood. Avoid skin contact.",
    "createdAt": "2026-02-04T09:00:00Z"
  }
}
```

**Errors:**
- 400: Validation error (missing required fields, invalid physical state)
- 409: Duplicate CAS number in organisation

---

### 3.4 PUT /api/chemicals/:id

Update a chemical record.

**Request:**
```http
PUT /api/chemicals/uuid-1
Authorization: Bearer <token>
Content-Type: application/json

{
  "supplier": "New Supplier Inc",
  "ppeRequirements": "Updated PPE requirements",
  "ghsHazardClasses": ["flammable_liquid", "acute_toxicity"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "name": "Acetone",
    "supplier": "New Supplier Inc",
    "ppeRequirements": "Updated PPE requirements",
    "ghsHazardClasses": ["flammable_liquid", "acute_toxicity"],
    "updatedAt": "2026-02-04T09:30:00Z"
  }
}
```

---

### 3.5 PATCH /api/chemicals/:id/status

Change chemical status (retire, phase out, ban).

**Request:**
```http
PATCH /api/chemicals/uuid-1/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "phase_out",
  "reason": "Transitioning to safer alternative"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "status": "phase_out",
    "updatedAt": "2026-02-04T10:00:00Z"
  }
}
```

---

### 3.6 POST /api/chemicals/:id/sds

Upload SDS document.

**Request:**
```http
POST /api/chemicals/uuid-1/sds
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [PDF file]
version: "3.0"
expiryDate: "2028-06-15"
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "attachmentId": "attach-uuid-2",
    "fileName": "Acetone_SDS_v3.0.pdf",
    "version": "3.0",
    "expiryDate": "2028-06-15",
    "isCurrent": true,
    "downloadUrl": "/api/attachments/attach-uuid-2/download",
    "superseded": {
      "attachmentId": "attach-uuid-1",
      "version": "2.1"
    }
  }
}
```

---

### 3.7 GET /api/chemicals/:id/sds

List SDS documents for a chemical.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "attach-uuid-2",
      "fileName": "Acetone_SDS_v3.0.pdf",
      "version": "3.0",
      "expiryDate": "2028-06-15",
      "isCurrent": true,
      "uploadedBy": "John Smith",
      "uploadedAt": "2026-02-04T10:00:00Z",
      "downloadUrl": "/api/attachments/attach-uuid-2/download"
    },
    {
      "id": "attach-uuid-1",
      "fileName": "Acetone_SDS_v2.1.pdf",
      "version": "2.1",
      "expiryDate": "2027-06-15",
      "isCurrent": false,
      "supersededAt": "2026-02-04T10:00:00Z",
      "uploadedBy": "John Smith",
      "uploadedAt": "2026-01-15T10:00:00Z",
      "downloadUrl": "/api/attachments/attach-uuid-1/download"
    }
  ]
}
```

---

### 3.8 Chemical Locations

#### GET /api/chemicals/:id/locations

List storage locations for a chemical.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "loc-uuid-1",
      "site": {
        "id": "site-uuid",
        "name": "Warehouse A"
      },
      "locationName": "Flammables Cabinet 1",
      "maxStorageAmount": 50,
      "typicalStorageAmount": 30,
      "unit": "L",
      "storageConditions": "Below 25°C, away from ignition sources",
      "isActive": true,
      "currentInventory": {
        "quantity": 25.5,
        "recordedAt": "2026-02-01T08:00:00Z",
        "recordedBy": "Jane Doe"
      }
    }
  ]
}
```

#### POST /api/chemicals/:id/locations

Add storage location for a chemical.

**Request:**
```http
POST /api/chemicals/uuid-1/locations
Content-Type: application/json

{
  "siteId": "site-uuid",
  "locationName": "Lab Storage Room B",
  "maxStorageAmount": 10,
  "typicalStorageAmount": 5,
  "unit": "L",
  "storageConditions": "Refrigerated (4°C)"
}
```

#### POST /api/chemicals/:id/locations/:locationId/inventory

Record inventory update.

**Request:**
```http
POST /api/chemicals/uuid-1/locations/loc-uuid-1/inventory
Content-Type: application/json

{
  "quantity": 32.5,
  "notes": "Received new shipment"
}
```

---

### 3.9 Chemical Linking

#### GET /api/chemicals/:id/incidents

Get incidents linked to a chemical.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "inc-uuid-1",
      "title": "Chemical spill in Lab B",
      "severity": "medium",
      "status": "closed",
      "occurredAt": "2026-01-20T14:30:00Z",
      "involvementType": "spill",
      "notes": "Small spill during transfer"
    }
  ]
}
```

#### POST /api/incidents/:id/chemicals

Link chemicals to an incident.

**Request:**
```http
POST /api/incidents/inc-uuid-1/chemicals
Content-Type: application/json

{
  "chemicals": [
    {
      "chemicalId": "chem-uuid-1",
      "involvementType": "exposure",
      "notes": "Worker exposed during handling"
    }
  ]
}
```

---

## 4. Permit Type APIs

### 4.1 GET /api/permit-types

List permit types for the organisation.

**Request:**
```http
GET /api/permit-types?includeInactive=false
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "pt-uuid-1",
      "name": "Hot Work",
      "code": "HW",
      "description": "Welding, cutting, grinding, open flames",
      "defaultDurationHours": 8,
      "maxDurationHours": 12,
      "requiresGasTest": false,
      "approvalWorkflow": "single_approval",
      "isActive": true,
      "isSystem": true,
      "controlCount": 8,
      "sortOrder": 1
    },
    {
      "id": "pt-uuid-2",
      "name": "Confined Space Entry",
      "code": "CSE",
      "description": "Tanks, pits, vessels, ducts",
      "defaultDurationHours": 4,
      "maxDurationHours": 8,
      "requiresGasTest": true,
      "approvalWorkflow": "dual_approval",
      "isActive": true,
      "isSystem": true,
      "controlCount": 12,
      "sortOrder": 2
    }
  ]
}
```

---

### 4.2 GET /api/permit-types/:id

Get permit type with controls.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "pt-uuid-1",
    "name": "Hot Work",
    "code": "HW",
    "description": "Welding, cutting, grinding, open flames",
    "defaultDurationHours": 8,
    "maxDurationHours": 12,
    "requiresGasTest": false,
    "approvalWorkflow": "single_approval",
    "requiredFields": {
      "fireExtinguisherLocation": true,
      "smokeDetectorsIsolated": true
    },
    "controls": {
      "preWork": [
        {
          "id": "ctrl-uuid-1",
          "label": "Fire extinguisher present and accessible",
          "isMandatory": true,
          "requiresReading": false,
          "sortOrder": 1
        },
        {
          "id": "ctrl-uuid-2",
          "label": "Combustibles removed or protected",
          "isMandatory": true,
          "requiresReading": false,
          "sortOrder": 2
        }
      ],
      "duringWork": [
        {
          "id": "ctrl-uuid-3",
          "label": "Fire watch maintained",
          "isMandatory": true,
          "requiresReading": false,
          "sortOrder": 1
        }
      ],
      "postWork": [
        {
          "id": "ctrl-uuid-4",
          "label": "Area inspected for hot spots",
          "isMandatory": true,
          "requiresReading": false,
          "sortOrder": 1
        },
        {
          "id": "ctrl-uuid-5",
          "label": "Fire watch maintained for 60 minutes post-work",
          "isMandatory": true,
          "requiresReading": false,
          "sortOrder": 2
        }
      ]
    }
  }
}
```

---

### 4.3 POST /api/permit-types

Create custom permit type.

**Request:**
```http
POST /api/permit-types
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Roof Access",
  "code": "ROOF",
  "description": "Work on or access to roof areas",
  "defaultDurationHours": 4,
  "maxDurationHours": 8,
  "requiresGasTest": false,
  "approvalWorkflow": "single_approval",
  "controls": [
    {
      "label": "Fall protection equipment inspected",
      "category": "pre_work",
      "isMandatory": true
    },
    {
      "label": "Weather conditions checked - wind < 40km/h",
      "category": "pre_work",
      "isMandatory": true
    }
  ]
}
```

---

### 4.4 PUT /api/permit-types/:id

Update permit type.

---

### 4.5 POST /api/permit-types/:id/controls

Add control to permit type.

**Request:**
```http
POST /api/permit-types/pt-uuid-1/controls
Content-Type: application/json

{
  "label": "Smoke detectors isolated",
  "category": "pre_work",
  "isMandatory": true,
  "requiresReading": false,
  "sortOrder": 3
}
```

---

## 5. Permit Management APIs

### 5.1 GET /api/permits

List permits.

**Request:**
```http
GET /api/permits?status=active&siteId=uuid&permitTypeId=uuid&startDate=2026-02-01
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter: draft, submitted, approved, active, suspended, closed, cancelled, expired |
| siteId | UUID | No | Filter by site |
| permitTypeId | UUID | No | Filter by permit type |
| requesterId | UUID | No | Filter by requester |
| startDate | date | No | Permits starting on or after date |
| endDate | date | No | Permits ending on or before date |
| search | string | No | Search by permit number or description |
| page | number | No | Page number |
| limit | number | No | Results per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "permits": [
      {
        "id": "permit-uuid-1",
        "permitNumber": "HW-WH1-20260204-001",
        "permitType": {
          "id": "pt-uuid-1",
          "name": "Hot Work",
          "code": "HW"
        },
        "site": {
          "id": "site-uuid",
          "name": "Warehouse A"
        },
        "locationDescription": "Loading dock area near Bay 3",
        "descriptionOfWork": "Welding repair on loading dock ramp",
        "status": "active",
        "plannedStart": "2026-02-04T08:00:00Z",
        "plannedEnd": "2026-02-04T16:00:00Z",
        "validUntil": "2026-02-04T17:00:00Z",
        "actualStart": "2026-02-04T08:15:00Z",
        "requester": {
          "id": "user-uuid",
          "name": "Mike Johnson"
        },
        "controlsCompleted": 5,
        "controlsTotal": 8,
        "workerCount": 2
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 45,
      "totalPages": 3
    }
  }
}
```

---

### 5.2 GET /api/permits/board

Get permit board view (active permits).

**Request:**
```http
GET /api/permits/board?siteId=uuid&date=2026-02-04
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| siteId | UUID | No | Filter by site |
| permitTypeId | UUID | No | Filter by permit type |
| date | date | No | Show permits active on date (default: today) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2026-02-04",
    "permits": [
      {
        "id": "permit-uuid-1",
        "permitNumber": "HW-WH1-20260204-001",
        "permitType": {
          "id": "pt-uuid-1",
          "name": "Hot Work",
          "code": "HW",
          "color": "#FF6B35"
        },
        "site": {
          "id": "site-uuid",
          "name": "Warehouse A"
        },
        "locationDescription": "Loading dock area near Bay 3",
        "status": "active",
        "validUntil": "2026-02-04T17:00:00Z",
        "timeRemaining": 7200,
        "urgency": "normal",
        "requester": "Mike Johnson",
        "workerCount": 2
      },
      {
        "id": "permit-uuid-2",
        "permitNumber": "CSE-WH1-20260204-001",
        "permitType": {
          "id": "pt-uuid-2",
          "name": "Confined Space Entry",
          "code": "CSE",
          "color": "#4ECDC4"
        },
        "site": {
          "id": "site-uuid",
          "name": "Warehouse A"
        },
        "locationDescription": "Storage tank T-101",
        "status": "active",
        "validUntil": "2026-02-04T12:00:00Z",
        "timeRemaining": 1800,
        "urgency": "warning",
        "requester": "Sarah Williams",
        "workerCount": 3
      }
    ],
    "summary": {
      "totalActive": 5,
      "byType": {
        "HW": 2,
        "CSE": 1,
        "WAH": 2
      },
      "expiringSoon": 1
    }
  }
}
```

**Urgency Values:**
- `normal` - More than 2 hours remaining
- `warning` - Less than 2 hours remaining
- `critical` - Less than 30 minutes remaining
- `expired` - Past valid_until

---

### 5.3 GET /api/permits/:id

Get permit detail.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "permit-uuid-1",
    "permitNumber": "HW-WH1-20260204-001",
    "permitType": {
      "id": "pt-uuid-1",
      "name": "Hot Work",
      "code": "HW"
    },
    "site": {
      "id": "site-uuid",
      "name": "Warehouse A",
      "code": "WH1"
    },
    "locationDescription": "Loading dock area near Bay 3",
    "descriptionOfWork": "Welding repair on loading dock ramp. Expected duration 6 hours.",
    "status": "active",
    "plannedStart": "2026-02-04T08:00:00Z",
    "plannedEnd": "2026-02-04T16:00:00Z",
    "validUntil": "2026-02-04T17:00:00Z",
    "actualStart": "2026-02-04T08:15:00Z",
    "actualEnd": null,
    "specialPrecautions": "Additional fire watch required due to proximity to paint storage",
    "requester": {
      "id": "user-uuid-1",
      "name": "Mike Johnson",
      "email": "mike.johnson@example.com"
    },
    "approver": {
      "id": "user-uuid-2",
      "name": "Sarah Manager",
      "approvedAt": "2026-02-04T07:45:00Z"
    },
    "issuer": {
      "id": "user-uuid-2",
      "name": "Sarah Manager",
      "issuedAt": "2026-02-04T08:15:00Z"
    },
    "workers": [
      {
        "id": "worker-uuid-1",
        "userId": "user-uuid-3",
        "name": "John Welder",
        "role": "Lead Welder"
      },
      {
        "id": "worker-uuid-2",
        "userId": null,
        "name": "Tom Helper",
        "role": "Fire Watch"
      }
    ],
    "controls": {
      "preWork": [
        {
          "id": "pc-uuid-1",
          "label": "Fire extinguisher present and accessible",
          "isMandatory": true,
          "status": "completed",
          "completedBy": "Mike Johnson",
          "completedAt": "2026-02-04T08:10:00Z"
        }
      ],
      "duringWork": [
        {
          "id": "pc-uuid-3",
          "label": "Fire watch maintained",
          "isMandatory": true,
          "status": "completed",
          "completedBy": "Tom Helper",
          "completedAt": "2026-02-04T10:00:00Z"
        }
      ],
      "postWork": [
        {
          "id": "pc-uuid-4",
          "label": "Area inspected for hot spots",
          "isMandatory": true,
          "status": "pending"
        }
      ]
    },
    "conflicts": [],
    "attachments": [
      {
        "id": "attach-uuid-1",
        "fileName": "JSA_Welding_Repair.pdf",
        "uploadedAt": "2026-02-04T07:30:00Z"
      }
    ],
    "relatedIncidents": [],
    "relatedInspections": [],
    "stateHistory": [
      {
        "fromStatus": null,
        "toStatus": "draft",
        "changedBy": "Mike Johnson",
        "changedAt": "2026-02-04T07:00:00Z"
      },
      {
        "fromStatus": "draft",
        "toStatus": "submitted",
        "changedBy": "Mike Johnson",
        "changedAt": "2026-02-04T07:30:00Z"
      },
      {
        "fromStatus": "submitted",
        "toStatus": "approved",
        "changedBy": "Sarah Manager",
        "changedAt": "2026-02-04T07:45:00Z"
      },
      {
        "fromStatus": "approved",
        "toStatus": "active",
        "changedBy": "Sarah Manager",
        "changedAt": "2026-02-04T08:15:00Z"
      }
    ],
    "createdAt": "2026-02-04T07:00:00Z",
    "updatedAt": "2026-02-04T10:00:00Z"
  }
}
```

---

### 5.4 POST /api/permits

Create a new permit.

**Request:**
```http
POST /api/permits
Authorization: Bearer <token>
Content-Type: application/json

{
  "permitTypeId": "pt-uuid-1",
  "siteId": "site-uuid",
  "locationDescription": "Loading dock area near Bay 3",
  "descriptionOfWork": "Welding repair on loading dock ramp",
  "plannedStart": "2026-02-04T08:00:00Z",
  "plannedEnd": "2026-02-04T16:00:00Z",
  "validUntil": "2026-02-04T17:00:00Z",
  "specialPrecautions": "Additional fire watch required",
  "workers": [
    {
      "userId": "user-uuid-3",
      "role": "Lead Welder"
    },
    {
      "workerName": "Tom Helper",
      "role": "Fire Watch"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "permit-uuid-1",
    "permitNumber": "HW-WH1-20260204-001",
    "status": "draft",
    "controls": [
      {
        "id": "pc-uuid-1",
        "label": "Fire extinguisher present",
        "status": "pending"
      }
    ],
    "conflicts": []
  }
}
```

---

### 5.5 Permit Lifecycle Endpoints

#### POST /api/permits/:id/submit

Submit permit for approval.

**Request:**
```http
POST /api/permits/permit-uuid-1/submit
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "permit-uuid-1",
    "status": "submitted",
    "submittedAt": "2026-02-04T07:30:00Z"
  }
}
```

---

#### POST /api/permits/:id/approve

Approve a submitted permit.

**Request:**
```http
POST /api/permits/permit-uuid-1/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Approved with standard precautions"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "permit-uuid-1",
    "status": "approved",
    "approver": {
      "id": "user-uuid-2",
      "name": "Sarah Manager"
    },
    "approvedAt": "2026-02-04T07:45:00Z"
  }
}
```

---

#### POST /api/permits/:id/reject

Reject a submitted permit.

**Request:**
```http
POST /api/permits/permit-uuid-1/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "JSA not attached. Please upload risk assessment and resubmit."
}
```

---

#### POST /api/permits/:id/activate

Activate (issue) an approved permit.

**Preconditions:** All pre-work controls must be completed.

**Request:**
```http
POST /api/permits/permit-uuid-1/activate
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "permit-uuid-1",
    "status": "active",
    "actualStart": "2026-02-04T08:15:00Z",
    "issuer": {
      "id": "user-uuid-2",
      "name": "Sarah Manager"
    }
  }
}
```

**Errors:**
- 400: `PRE_WORK_INCOMPLETE` - Pre-work controls not completed

---

#### POST /api/permits/:id/suspend

Suspend an active permit.

**Request:**
```http
POST /api/permits/permit-uuid-1/suspend
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Severe weather warning - all outdoor work halted"
}
```

---

#### POST /api/permits/:id/resume

Resume a suspended permit.

---

#### POST /api/permits/:id/close

Close an active permit.

**Preconditions:** All post-work controls must be completed.

**Request:**
```http
POST /api/permits/permit-uuid-1/close
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Work completed without incident. Area cleared."
}
```

---

#### POST /api/permits/:id/cancel

Cancel a permit.

**Request:**
```http
POST /api/permits/permit-uuid-1/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Work postponed to next week"
}
```

---

### 5.6 Permit Controls

#### GET /api/permits/:id/controls

Get permit controls with status.

---

#### PATCH /api/permits/:id/controls/:controlId

Complete a permit control.

**Request:**
```http
PATCH /api/permits/permit-uuid-1/controls/pc-uuid-1
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "readingValue": "20.8",
  "notes": "O2 levels normal"
}
```

---

### 5.7 Permit Conflicts

#### GET /api/permits/:id/conflicts

Get conflicts for a permit.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hasConflicts": true,
    "conflicts": [
      {
        "type": "location_overlap",
        "severity": "warning",
        "message": "Another permit is active in the same area",
        "conflictingPermit": {
          "id": "permit-uuid-2",
          "permitNumber": "CSE-WH1-20260204-001",
          "permitType": "Confined Space Entry",
          "validUntil": "2026-02-04T12:00:00Z"
        }
      }
    ]
  }
}
```

---

#### POST /api/permits/check-conflicts

Check conflicts before creating permit.

**Request:**
```http
POST /api/permits/check-conflicts
Content-Type: application/json

{
  "siteId": "site-uuid",
  "locationDescription": "Loading dock",
  "permitTypeId": "pt-uuid-1",
  "plannedStart": "2026-02-04T08:00:00Z",
  "plannedEnd": "2026-02-04T16:00:00Z"
}
```

---

### 5.8 Permit PDF

#### GET /api/permits/:id/pdf

Generate permit PDF.

**Response:** PDF document (application/pdf)

---

### 5.9 Permit Linking

#### POST /api/incidents/:id/permits

Link permits to an incident.

**Request:**
```http
POST /api/incidents/inc-uuid-1/permits
Content-Type: application/json

{
  "permits": [
    {
      "permitId": "permit-uuid-1",
      "notes": "Incident occurred during permitted hot work"
    }
  ]
}
```

---

## 6. Analytics Extension APIs

### 6.1 GET /api/analytics/chemicals/incidents-by-chemical

Get incidents grouped by chemical.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-02-01",
      "end": "2026-02-04"
    },
    "chemicals": [
      {
        "chemicalId": "chem-uuid-1",
        "chemicalName": "Acetone",
        "casNumber": "67-64-1",
        "incidentCount": 5,
        "bySeverity": {
          "low": 2,
          "medium": 2,
          "high": 1,
          "critical": 0
        }
      }
    ]
  }
}
```

---

### 6.2 GET /api/analytics/chemicals/incidents-by-hazard

Get incidents grouped by GHS hazard class.

---

### 6.3 GET /api/analytics/permits/summary

Get permit statistics.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-01-01",
      "end": "2026-02-04"
    },
    "summary": {
      "totalPermits": 145,
      "byStatus": {
        "active": 5,
        "closed": 128,
        "expired": 8,
        "cancelled": 4
      },
      "byType": {
        "HW": 65,
        "CSE": 23,
        "WAH": 45,
        "ELEC": 12
      },
      "averageDurationHours": 5.2,
      "incidentsWithPermits": 3
    }
  }
}
```

---

## 7. Error Responses

### 7.1 Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Physical state is required",
    "field": "physicalState"
  }
}
```

### 7.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input data |
| DUPLICATE_CAS | 409 | CAS number already exists in org |
| CHEMICAL_NOT_FOUND | 404 | Chemical ID not found |
| PERMIT_NOT_FOUND | 404 | Permit ID not found |
| INVALID_STATE_TRANSITION | 400 | Cannot transition from current state |
| PRE_WORK_INCOMPLETE | 400 | Pre-work controls not complete |
| POST_WORK_INCOMPLETE | 400 | Post-work controls not complete |
| PERMIT_EXPIRED | 400 | Cannot modify expired permit |
| UNAUTHORIZED | 403 | Insufficient permissions |

---

## 8. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

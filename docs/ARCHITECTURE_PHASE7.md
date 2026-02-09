# System Architecture – EHS Portal Phase 7
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

Phase 7 extends the EHS Portal architecture with Chemical Management and Permit-to-Work modules. This document describes new services, integration points, and key architectural decisions.

### 1.1 Architecture Principles

1. **Service layer abstraction** - Business logic encapsulated in services
2. **Multi-tenant by design** - All queries scoped to organisation_id
3. **Integration with existing modules** - Reuse attachments, notifications, analytics
4. **Audit trail** - All state changes logged
5. **Eventual consistency** - Analytics aggregation via scheduled jobs

### 1.2 New Components

| Component | Layer | Purpose |
|-----------|-------|---------|
| ChemicalService | Backend | Chemical register and SDS management |
| ChemicalLocationService | Backend | Storage location and inventory |
| PermitService | Backend | Permit lifecycle management |
| PermitTypeService | Backend | Permit type configuration |
| PermitConflictService | Backend | Overlap/conflict detection |
| Chemical routes | API | REST endpoints for chemicals |
| Permit routes | API | REST endpoints for permits |
| ChemicalRegisterPage | Frontend | Chemical list and management |
| ChemicalDetailPage | Frontend | Chemical details with SDS |
| PermitBoardPage | Frontend | Active permits overview |
| PermitDetailPage | Frontend | Permit details and controls |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         React Frontend (Vite)                           │ │
│  │                                                                         │ │
│  │  Pages:                              Components:                        │ │
│  │  - ChemicalRegisterPage              - ChemicalCard                     │ │
│  │  - ChemicalDetailPage                - GHSPictograms                    │ │
│  │  - PermitBoardPage                   - SDSUploader                      │ │
│  │  - PermitDetailPage                  - PermitCard                       │ │
│  │  - PermitCreatePage                  - ControlChecklist                 │ │
│  │                                      - PermitTimeline                   │ │
│  │                                                                         │ │
│  │  Context: ChemicalContext, PermitContext                                │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    │ HTTP/REST                               │
│                                    │ Authorization: Bearer <JWT>             │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼─────────────────────────────────────────┐
│                         Node.js + Express Backend                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Middleware Layer                                                       │ │
│  │  - authMiddleware, roleMiddleware, orgScopeMiddleware                   │ │
│  │  - requestLogger, errorHandler                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Route Layer (Phase 7)                                                  │ │
│  │  - /api/chemicals/*           (CRUD, filtering)                         │ │
│  │  - /api/chemicals/:id/sds     (SDS management)                          │ │
│  │  - /api/chemicals/:id/locations (Storage locations)                     │ │
│  │  - /api/permit-types/*        (CRUD for permit types)                   │ │
│  │  - /api/permits/*             (CRUD, lifecycle, board)                  │ │
│  │  - /api/permits/:id/controls  (Control management)                      │ │
│  │  - /api/permits/:id/workers   (Worker management)                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Service Layer (Phase 7)                                                │ │
│  │  - ChemicalService            (register, SDS tracking)                  │ │
│  │  - ChemicalLocationService    (storage, inventory)                      │ │
│  │  - PermitService              (lifecycle, state machine)                │ │
│  │  - PermitTypeService          (templates, controls)                     │ │
│  │  - PermitConflictService      (overlap detection)                       │ │
│  │  - PermitNumberService        (number generation)                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Integration Points                                                     │ │
│  │  - AttachmentService          (SDS documents, permit attachments)       │ │
│  │  - NotificationService        (SDS expiry, permit events)               │ │
│  │  - AuditLogService           (chemical/permit changes)                  │ │
│  │  - AnalyticsService          (chemical/permit metrics)                  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    │ pg (node-postgres)                      │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼─────────────────────────────────────────┐
│                          PostgreSQL Database                                 │
│                                                                              │
│  Phase 7 Tables:                                                             │
│  - chemicals                    - permit_types                               │
│  - chemical_ghs_hazards         - permit_type_controls                       │
│  - chemical_locations           - permits                                    │
│  - chemical_inventory           - permit_controls                            │
│  - incident_chemicals           - permit_workers                             │
│  - action_chemicals             - permit_state_history                       │
│                                 - incident_permits                           │
│                                 - inspection_permits                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Service Layer Design

### 3.1 ChemicalService

Manages the chemical register and SDS tracking.

```javascript
class ChemicalService {
  // CRUD Operations
  async create(orgId, chemicalData, userId)
  async update(orgId, chemicalId, updates, userId)
  async getById(orgId, chemicalId)
  async list(orgId, filters)
  async retire(orgId, chemicalId, status, userId)  // phase_out or banned
  
  // SDS Management
  async getSdsDocuments(chemicalId)
  async uploadSds(chemicalId, file, version, expiryDate, userId)
  async supersedeSds(chemicalId, attachmentId, userId)
  
  // GHS Hazards
  async setHazardClasses(chemicalId, hazardClasses, userId)
  async getByHazardClass(orgId, hazardClass)
  
  // Expiry Tracking
  async getExpiringSds(orgId, daysAhead)
  async getExpiredSds(orgId)
  
  // Integration
  async linkToIncident(incidentId, chemicalId, involvementType, notes)
  async linkToAction(actionId, chemicalId)
  async getRelatedIncidents(chemicalId)
  async getRelatedActions(chemicalId)
}
```

### 3.2 ChemicalLocationService

Manages storage locations and inventory.

```javascript
class ChemicalLocationService {
  // Location Management
  async create(orgId, chemicalId, locationData)
  async update(locationId, updates)
  async deactivate(locationId)
  async listByChemical(chemicalId)
  async listBySite(siteId)
  
  // Inventory
  async recordInventory(locationId, quantity, userId, notes)
  async getCurrentInventory(locationId)
  async getInventoryHistory(locationId, startDate, endDate)
  async getLowStockLocations(orgId)
  async getOverStockLocations(orgId)
}
```

### 3.3 PermitService

Manages permit lifecycle with state machine.

```javascript
class PermitService {
  // CRUD Operations
  async create(orgId, permitData, userId)
  async update(orgId, permitId, updates, userId)
  async getById(orgId, permitId)
  async list(orgId, filters)
  
  // Lifecycle State Transitions
  async submit(permitId, userId)
  async approve(permitId, userId)
  async reject(permitId, userId, reason)
  async activate(permitId, userId)  // Issue
  async suspend(permitId, userId, reason)
  async resume(permitId, userId)
  async close(permitId, userId)
  async cancel(permitId, userId, reason)
  
  // Controls
  async getControls(permitId)
  async completeControl(permitId, controlId, status, reading, notes, userId)
  async validatePreWorkControls(permitId)
  async validatePostWorkControls(permitId)
  
  // Workers
  async addWorker(permitId, workerData)
  async removeWorker(permitId, workerId)
  async getWorkers(permitId)
  
  // Board & Queries
  async getActivePermits(orgId, siteId)
  async getPermitBoard(orgId, filters)
  async getExpiringPermits(orgId, withinHours)
  
  // Integration
  async linkToIncident(incidentId, permitId, notes)
  async linkToInspection(inspectionId, permitId)
  async getRelatedIncidents(permitId)
  async generatePdf(permitId)
  
  // State History
  async getStateHistory(permitId)
}
```

### 3.4 PermitTypeService

Manages permit type configuration.

```javascript
class PermitTypeService {
  // Type Management
  async create(orgId, typeData)
  async update(typeId, updates)
  async deactivate(typeId)
  async list(orgId, includeInactive)
  async getById(typeId)
  
  // Controls
  async addControl(typeId, controlData)
  async updateControl(controlId, updates)
  async removeControl(controlId)
  async getControls(typeId)
  async reorderControls(typeId, controlIds)
  
  // Seeding
  async seedDefaultTypes(orgId)
}
```

### 3.5 PermitConflictService

Detects and manages permit conflicts.

```javascript
class PermitConflictService {
  // Conflict Detection
  async detectConflicts(permitId)
  async detectConflictsForNew(orgId, siteId, location, startTime, endTime, permitTypeId)
  
  // Conflict Rules
  checkLocationOverlap(permit1, permit2)
  checkTypeConflict(permitType1, permitType2)  // e.g., hot work + confined space
  checkCapacityLimit(location, activePermitCount)
  
  // Response
  async getConflictWarnings(permitId)
}
```

---

## 4. State Machine - Permit Lifecycle

```
                              ┌───────────┐
                              │   DRAFT   │
                              └─────┬─────┘
                                    │ submit()
                                    ▼
                              ┌───────────┐
                    ┌─────────│ SUBMITTED │─────────┐
                    │         └─────┬─────┘         │
           reject() │               │ approve()     │ cancel()
                    ▼               ▼               ▼
              ┌───────────┐   ┌───────────┐   ┌───────────┐
              │ (return   │   │ APPROVED  │   │ CANCELLED │
              │ to draft) │   └─────┬─────┘   └───────────┘
              └───────────┘         │
                                    │ activate()
                                    ▼
                              ┌───────────┐
                    ┌─────────│  ACTIVE   │─────────┐
                    │         └─────┬─────┘         │
         suspend()  │               │               │ (auto) time expires
                    ▼               │               ▼
              ┌───────────┐         │         ┌───────────┐
              │ SUSPENDED │         │         │  EXPIRED  │
              └─────┬─────┘         │         └───────────┘
                    │               │
         resume()   │   close()     │
                    ▼               ▼
              ┌───────────┐   ┌───────────┐
              │ → ACTIVE  │   │  CLOSED   │
              └───────────┘   └───────────┘
```

### 4.1 State Transition Rules

| From | To | Triggered By | Preconditions |
|------|-----|-------------|---------------|
| - | draft | create() | Valid permit data |
| draft | submitted | submit() | All required fields complete |
| submitted | approved | approve() | User has approver role |
| submitted | draft | reject() | User has approver role |
| submitted | cancelled | cancel() | User has admin role |
| approved | active | activate() | Pre-work controls complete |
| active | suspended | suspend() | Reason provided |
| suspended | active | resume() | Issue resolved |
| active | closed | close() | Post-work controls complete |
| active | expired | (auto) | valid_until < now() |

---

## 5. Integration Architecture

### 5.1 Attachment Service Integration

```
┌──────────────────┐         ┌──────────────────┐
│  ChemicalService │         │ AttachmentService│
│                  │         │    (Phase 2)     │
│  uploadSds()     │────────►│                  │
│                  │         │  store(file)     │
│                  │◄────────│  return {id,url} │
│                  │         │                  │
│  Update chemical │         └──────────────────┘
│  sds_version,    │
│  sds_expiry_date │
└──────────────────┘

Attachment record:
{
  entity_type: 'chemical',
  chemical_id: <uuid>,
  file_name: 'SDS_ChemicalX_v2.1.pdf',
  mime_type: 'application/pdf',
  metadata: {
    is_current_sds: true,
    sds_version: '2.1',
    supersedes: <previous_attachment_id>
  }
}
```

### 5.2 Notification Service Integration

```
┌──────────────────┐         ┌──────────────────┐
│  Scheduled Job   │         │NotificationService│
│  (SDS Expiry)    │         │    (Phase 4)     │
│                  │         │                  │
│  Run daily       │────────►│  createBatch()   │
│  Check expiring  │         │                  │
│  SDS (30/60/90   │         │  - SDS expiring  │
│  days)           │         │  - SDS expired   │
│                  │         │                  │
└──────────────────┘         └──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  PermitService   │         │NotificationService│
│                  │         │    (Phase 4)     │
│  On state change │────────►│                  │
│                  │         │  create()        │
│  - Submitted     │         │                  │
│  - Approved      │         │  Notify:         │
│  - Rejected      │         │  - Requester     │
│  - Activated     │         │  - Approver      │
│  - Expiring soon │         │  - Site manager  │
│                  │         │                  │
└──────────────────┘         └──────────────────┘
```

### 5.3 Analytics Integration

```
┌──────────────────┐         ┌──────────────────┐
│  Analytics Job   │         │ analytics_daily_ │
│  (02:00 UTC)     │         │    summary       │
│                  │         │                  │
│  Aggregate:      │────────►│  New columns:    │
│  - Incidents by  │         │  - chemical_     │
│    chemical      │         │    incidents     │
│  - Incidents by  │         │  - permit_       │
│    hazard class  │         │    incidents     │
│  - Permits       │         │  - permits_      │
│    issued/closed │         │    issued        │
│                  │         │  - permits_      │
│                  │         │    closed        │
└──────────────────┘         └──────────────────┘

Analytics API extensions:
- GET /api/analytics/chemicals/incidents-by-chemical
- GET /api/analytics/chemicals/incidents-by-hazard
- GET /api/analytics/permits/summary
- GET /api/analytics/permits/by-type
```

---

## 6. Sequence Diagrams

### 6.1 Create Chemical + Upload SDS

```
┌──────┐       ┌────────┐       ┌──────────────┐   ┌────────────┐   ┌──────────┐
│ User │       │Frontend│       │Chemical Routes│   │ChemicalSvc │   │  Database│
└──┬───┘       └───┬────┘       └──────┬───────┘   └─────┬──────┘   └────┬─────┘
   │               │                   │                 │               │
   │ Fill form     │                   │                 │               │
   │──────────────>│                   │                 │               │
   │               │                   │                 │               │
   │               │ POST /api/chemicals                 │               │
   │               │──────────────────>│                 │               │
   │               │                   │                 │               │
   │               │                   │ create(orgId, data)             │
   │               │                   │────────────────>│               │
   │               │                   │                 │               │
   │               │                   │                 │ INSERT chemicals
   │               │                   │                 │──────────────>│
   │               │                   │                 │               │
   │               │                   │                 │ INSERT chemical_ghs_hazards
   │               │                   │                 │──────────────>│
   │               │                   │                 │               │
   │               │                   │                 │ Log to audit  │
   │               │                   │                 │──────────────>│
   │               │                   │                 │               │
   │               │                   │<────────────────│ {chemical}    │
   │               │<──────────────────│ 201 Created    │               │
   │               │                   │                 │               │
   │ Upload SDS    │                   │                 │               │
   │──────────────>│                   │                 │               │
   │               │                   │                 │               │
   │               │ POST /api/chemicals/:id/sds         │               │
   │               │──────────────────>│                 │               │
   │               │                   │                 │               │
   │               │                   │ uploadSds()     │               │
   │               │                   │────────────────>│               │
   │               │                   │                 │               │
   │               │                   │                 │ Store file    │
   │               │                   │                 │──────────────>│
   │               │                   │                 │               │
   │               │                   │                 │ INSERT attachment
   │               │                   │                 │──────────────>│
   │               │                   │                 │               │
   │               │                   │                 │ UPDATE chemicals
   │               │                   │                 │ (sds_version)  │
   │               │                   │                 │──────────────>│
   │               │                   │                 │               │
   │               │<──────────────────│ 200 OK         │               │
   │<──────────────│                   │                 │               │
   │               │                   │                 │               │
```

### 6.2 Permit Lifecycle: Create → Approve → Activate → Close

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐   ┌──────────────┐
│ Requester│   │ Approver │   │  Issuer  │   │Permit Routes│   │ PermitService│
└────┬─────┘   └────┬─────┘   └────┬─────┘   └─────┬──────┘   └──────┬───────┘
     │              │              │               │                 │
     │ Create permit│              │               │                 │
     │──────────────────────────────────────────────>               │
     │              │              │               │ create()        │
     │              │              │               │────────────────>│
     │              │              │               │                 │
     │              │              │               │ status: 'draft' │
     │              │              │               │<────────────────│
     │              │              │               │                 │
     │ Submit       │              │               │                 │
     │──────────────────────────────────────────────>               │
     │              │              │               │ submit()        │
     │              │              │               │────────────────>│
     │              │              │               │                 │
     │              │              │               │ Validate fields │
     │              │              │               │ status: 'submitted'
     │              │              │               │ Log state change│
     │              │              │               │ Notify approver │
     │              │              │               │<────────────────│
     │              │              │               │                 │
     │              │ Review permit│               │                 │
     │              │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                 │
     │              │              │               │                 │
     │              │ Approve      │               │                 │
     │              │──────────────────────────────>                 │
     │              │              │               │ approve()       │
     │              │              │               │────────────────>│
     │              │              │               │                 │
     │              │              │               │ Check role      │
     │              │              │               │ status: 'approved'
     │              │              │               │ Log state change│
     │              │              │               │ Notify requester│
     │              │              │               │<────────────────│
     │              │              │               │                 │
     │              │              │ Activate      │                 │
     │              │              │──────────────>│                 │
     │              │              │               │ activate()      │
     │              │              │               │────────────────>│
     │              │              │               │                 │
     │              │              │               │ Check pre-work  │
     │              │              │               │ controls done   │
     │              │              │               │ status: 'active'│
     │              │              │               │ Set actual_start│
     │              │              │               │ Log state change│
     │              │              │               │<────────────────│
     │              │              │               │                 │
     │              │              │ ... work ...  │                 │
     │              │              │               │                 │
     │              │              │ Close permit  │                 │
     │              │              │──────────────>│                 │
     │              │              │               │ close()         │
     │              │              │               │────────────────>│
     │              │              │               │                 │
     │              │              │               │ Check post-work │
     │              │              │               │ controls done   │
     │              │              │               │ status: 'closed'│
     │              │              │               │ Set actual_end  │
     │              │              │               │ Log state change│
     │              │              │               │<────────────────│
     │              │              │               │                 │
```

### 6.3 Link Permit to Incident

```
┌──────┐     ┌─────────────┐     ┌────────────────┐     ┌──────────────┐
│ User │     │IncidentForm │     │ Incident Routes│     │ PermitService│
└──┬───┘     └──────┬──────┘     └───────┬────────┘     └──────┬───────┘
   │                │                    │                     │
   │ Edit incident  │                    │                     │
   │───────────────>│                    │                     │
   │                │                    │                     │
   │ Select permit  │                    │                     │
   │ from dropdown  │                    │                     │
   │───────────────>│                    │                     │
   │                │                    │                     │
   │                │ GET /api/permits?status=active&           │
   │                │ site_id=X&time=incident_occurred_at       │
   │                │───────────────────>│                     │
   │                │                    │                     │
   │                │                    │ getActivePermitsAt()│
   │                │                    │────────────────────>│
   │                │                    │                     │
   │                │                    │<────────────────────│
   │                │                    │ {permits that were  │
   │                │                    │  active at that time}
   │                │<───────────────────│                     │
   │                │                    │                     │
   │ Save incident  │                    │                     │
   │ with permit    │                    │                     │
   │───────────────>│                    │                     │
   │                │                    │                     │
   │                │ PUT /api/incidents/:id                   │
   │                │ {permit_ids: [...]}│                     │
   │                │───────────────────>│                     │
   │                │                    │                     │
   │                │                    │ INSERT incident_permits
   │                │                    │────────────────────>│
   │                │                    │                     │
   │                │<───────────────────│ 200 OK              │
   │<───────────────│                    │                     │
   │                │                    │                     │
```

---

## 7. Scheduled Jobs

### 7.1 SDS Expiry Notification Job

**Schedule:** Daily at 07:00 UTC

```javascript
async function sdsExpiryNotificationJob() {
  // Get SDS expiring in 30, 60, 90 days
  const expiring30 = await chemicalService.getExpiringSds(null, 30);
  const expiring60 = await chemicalService.getExpiringSds(null, 60);
  const expiring90 = await chemicalService.getExpiringSds(null, 90);
  
  // Filter to those not already notified at this threshold
  // Create notifications for chemical register admins
  for (const chemical of expiring30) {
    await notificationService.create({
      type: 'sds_expiring',
      priority: 'high',
      title: `SDS Expiring in 30 Days: ${chemical.name}`,
      entity_type: 'chemical',
      entity_id: chemical.id,
      recipients: await getChemicalAdmins(chemical.organisation_id)
    });
  }
  // Similar for 60 and 90 days with lower priority
}
```

### 7.2 Permit Expiry Job

**Schedule:** Every 15 minutes

```javascript
async function permitExpiryJob() {
  // Find active permits past valid_until
  const expiredPermits = await permitService.getExpiredActivePermits();
  
  for (const permit of expiredPermits) {
    // Transition to expired
    await permitService.transitionToExpired(permit.id);
    
    // Notify issuer and requester
    await notificationService.create({
      type: 'permit_expired',
      priority: 'high',
      title: `Permit Expired: ${permit.permit_number}`,
      entity_type: 'permit',
      entity_id: permit.id
    });
  }
  
  // Also notify for permits expiring in next 2 hours
  const expiringPermits = await permitService.getExpiringPermits(null, 2);
  // Create warning notifications
}
```

### 7.3 Chemical Analytics Aggregation

**Schedule:** Daily at 02:00 UTC (runs after main analytics job)

```javascript
async function chemicalAnalyticsJob() {
  // Aggregate incidents by chemical for yesterday
  const yesterday = getYesterday();
  
  const incidentsByChemical = await db.query(`
    SELECT c.id as chemical_id, c.organisation_id, COUNT(ic.id) as count
    FROM chemicals c
    JOIN incident_chemicals ic ON ic.chemical_id = c.id
    JOIN incidents i ON i.id = ic.incident_id
    WHERE DATE(i.occurred_at) = $1
    GROUP BY c.id, c.organisation_id
  `, [yesterday]);
  
  // Store in analytics table or dedicated chemical_analytics table
}
```

---

## 8. Security Considerations

### 8.1 Access Control Matrix

| Resource | Worker | Manager | Admin |
|----------|--------|---------|-------|
| View chemicals | ✓ | ✓ | ✓ |
| Create/edit chemicals | ✗ | ✓ | ✓ |
| Delete chemicals | ✗ | ✗ | ✓ |
| Upload SDS | ✗ | ✓ | ✓ |
| View permits | ✓ | ✓ | ✓ |
| Create permits | ✓ | ✓ | ✓ |
| Approve permits | ✗ | ✓ | ✓ |
| Issue/close permits | ✗ | ✓ | ✓ |
| Configure permit types | ✗ | ✗ | ✓ |

### 8.2 Multi-Tenant Isolation

All queries include organisation_id filter:
- Chemicals: `WHERE organisation_id = $orgId`
- Permits: `WHERE organisation_id = $orgId`
- Cross-linking validations ensure entities belong to same organisation

### 8.3 Audit Trail

All changes logged via existing audit_log mechanism:
- Chemical create/update/retire
- SDS upload/supersede
- Permit state transitions
- Control completions

---

## 9. Performance Considerations

### 9.1 Indexes

Key indexes for Phase 7 (see DATA_MODEL_PHASE7.md for full list):
- `chemicals(organisation_id, status)` - Active chemicals list
- `chemicals(organisation_id, sds_expiry_date)` - Expiry queries
- `permits(organisation_id, site_id, status)` - Permit board
- `permits(organisation_id, valid_until)` - Expiry job

### 9.2 Query Optimization

- Permit board uses denormalized status for fast filtering
- Chemical search uses GIN index on name for full-text (optional)
- Conflict detection limited to same site + overlapping dates

### 9.3 Caching Strategy

- Permit types: Cache per organisation (rarely change)
- GHS hazard enum: Static, cache in frontend
- Chemical list: No caching (data freshness important)
- Permit board: 60-second cache with manual refresh

---

## 10. Folder Structure (Additions)

```
backend/src/
├── routes/
│   ├── chemicals.js                 # Chemical register routes
│   ├── chemicalLocations.js         # Storage location routes
│   └── permits.js                   # Permit routes
├── services/
│   ├── chemicalService.js           # Chemical business logic
│   ├── chemicalLocationService.js   # Location/inventory logic
│   ├── permitService.js             # Permit lifecycle logic
│   ├── permitTypeService.js         # Permit type config
│   ├── permitConflictService.js     # Conflict detection
│   └── permitNumberService.js       # Number generation
├── jobs/
│   ├── sdsExpiryNotification.js     # SDS expiry checker
│   └── permitExpiry.js              # Permit expiry handler
└── validators/
    ├── chemicalValidator.js         # Chemical validation
    └── permitValidator.js           # Permit validation

frontend/src/
├── pages/
│   ├── ChemicalRegisterPage.jsx     # Chemical list
│   ├── ChemicalDetailPage.jsx       # Chemical details
│   ├── PermitBoardPage.jsx          # Active permits
│   ├── PermitDetailPage.jsx         # Permit details
│   └── PermitCreatePage.jsx         # New permit form
├── components/
│   ├── chemicals/
│   │   ├── ChemicalCard.jsx
│   │   ├── ChemicalForm.jsx
│   │   ├── GHSPictograms.jsx
│   │   ├── SDSList.jsx
│   │   └── LocationList.jsx
│   └── permits/
│       ├── PermitCard.jsx
│       ├── PermitForm.jsx
│       ├── ControlChecklist.jsx
│       ├── PermitTimeline.jsx
│       └── PermitStatusBadge.jsx
└── context/
    ├── ChemicalContext.jsx
    └── PermitContext.jsx
```

---

## 11. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

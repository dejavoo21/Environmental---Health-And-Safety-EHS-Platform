# Business Requirements Document – EHS Portal Phase 7
## Chemical & Permit Management

| Item | Detail |
|------|--------|
| Document Version | 1.0 |
| Author | Solution Architect |
| Date | 2026-02-04 |
| Status | Draft |
| Phase | 7 – Chemical & Permit Management |

---

## 1. Executive Summary

Phase 7 introduces competitive Chemical Management and Permit-to-Work (PTW) modules to the EHS Portal. These capabilities enable organisations to maintain comprehensive chemical registers, track Safety Data Sheets (SDS), manage storage locations, and operate a formal permit system for high-risk work activities.

### 1.1 Business Context

With Phases 1-6 complete, the EHS Portal effectively manages incidents, inspections, actions, analytics, notifications, and security. However, two major gaps remain compared to leading EHS platforms:

- **No chemical tracking:** Organisations cannot systematically manage hazardous substances, leading to compliance risks and manual SDS tracking in spreadsheets
- **No permit management:** High-risk work (hot work, confined space entry, work at height) lacks formal control processes, increasing incident likelihood

Phase 7 addresses these gaps with:
1. **Chemical Register** – Centralised database of chemicals per organisation with SDS management
2. **Permit-to-Work System** – Structured workflow for requesting, approving, and closing work permits

### 1.2 Business Goals

| Goal ID | Goal | Success Metric |
|---------|------|----------------|
| G-P7-01 | Establish comprehensive chemical tracking | 100% of chemicals registered with current SDS |
| G-P7-02 | Ensure SDS currency and compliance | Zero expired SDS in use |
| G-P7-03 | Reduce chemical-related incidents | 25% reduction in chemical incidents within 12 months |
| G-P7-04 | Formalise high-risk work controls | 100% of high-risk work performed under valid permit |
| G-P7-05 | Enable permit oversight | All active permits visible to managers via permit board |
| G-P7-06 | Link chemicals and permits to incidents | 80% of relevant incidents linked to chemicals/permits |

### 1.3 Scope

**In Scope:**

*Chemical Management:*
- Chemical register with comprehensive attributes (CAS number, GHS classes, etc.)
- SDS document attachment and expiry tracking
- Storage location management per site
- Integration with incidents, inspections, and actions
- Analytics integration (incidents by chemical/hazard class)
- SDS expiry notifications (design in scope, implementation partial)

*Permit-to-Work:*
- Permit types and templates (admin-configurable)
- Full permit lifecycle (draft → submitted → approved → active → closed)
- Permit controls and conditions checklists
- Permit board view for active permits
- Integration with incidents, inspections, and actions
- Conflict detection (design in scope, warnings in implementation)
- PDF permit generation (leverages Phase 5 PDF system)

**Out of Scope:**
- Automated regulatory limit enforcement (future enhancement)
- Barcode/QR code scanning for chemicals
- Mobile-specific chemical lookup
- Advanced conflict resolution algorithms
- Integration with external chemical databases (ChemSpider, PubChem)
- Contractor management integration
- Work order system integration

---

## 2. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| HSE Manager | Primary user | Manage chemical register, approve permits, monitor compliance |
| Site Manager | Permit issuer | Issue and close permits, oversee on-site activities |
| Worker | End user | Request permits, view chemical handling information |
| Admin | System admin | Configure permit types, manage chemical register |
| Compliance Officer | Oversight | Ensure SDS currency, audit permit records |
| Procurement | Reference user | Access chemical register for ordering decisions |

---

## 3. Business Requirements – Chemical Management

### 3.1 Chemical Register (BR-CHEM-REG)

#### BR-CHEM-REG-01: Chemical Record Management
**Priority:** Must Have

Admins shall be able to create, edit, and retire chemicals in the organisation's register.

**Required Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | Common chemical name |
| internal_code | String | No | Organisation's internal code |
| cas_number | String | No | Chemical Abstracts Service number |
| supplier | String | No | Primary supplier name |
| sds_version | String | No | Current SDS version/revision |
| sds_expiry_date | Date | No | When SDS requires renewal |
| physical_state | Enum | Yes | solid / liquid / gas |
| ghs_hazard_classes | Array | No | GHS hazard classifications |
| ppe_requirements | Text | No | Required personal protective equipment |
| handling_notes | Text | No | Safe handling instructions |
| status | Enum | Yes | active / phase-out / banned |

**Acceptance Criteria:**
- Admin can create new chemical with all required fields
- Admin can edit existing chemical details
- Admin can change status to phase-out or banned
- Banned chemicals show warning when linked to new incidents
- All changes logged to audit trail
- Multi-tenant isolation enforced (chemicals scoped to organisation)

**Capability ID:** C-200

---

#### BR-CHEM-REG-02: SDS Document Management
**Priority:** Must Have

Users shall be able to upload, view, and manage Safety Data Sheets for each chemical.

**Acceptance Criteria:**
- Admin can upload SDS document (PDF, max 10MB) via existing attachment system
- System records SDS version and expiry date
- Users can view/download current SDS from chemical detail page
- Historical SDS versions are retained (marked as superseded)
- SDS documents linked to chemical_id via attachments table

**Capability ID:** C-201

---

#### BR-CHEM-REG-03: SDS Expiry Tracking
**Priority:** Must Have

The system shall track SDS expiry dates and enable proactive renewal.

**Acceptance Criteria:**
- Dashboard widget shows count of SDS expiring within 30/60/90 days
- Chemical list can be filtered to show expired or expiring-soon SDS
- List view shows expiry status indicator (valid/expiring soon/expired)
- SDS expiry notifications sent to chemical register admins (via Phase 4 notification system)

**Capability ID:** C-202

---

#### BR-CHEM-REG-04: GHS Hazard Classification
**Priority:** Must Have

Chemicals shall support GHS hazard classification tracking.

**GHS Hazard Classes (Enum):**
- flammable_gas
- flammable_aerosol
- flammable_liquid
- flammable_solid
- oxidising_gas
- oxidising_liquid
- oxidising_solid
- compressed_gas
- acute_toxicity
- skin_corrosion
- serious_eye_damage
- skin_sensitisation
- respiratory_sensitisation
- germ_cell_mutagenicity
- carcinogenicity
- reproductive_toxicity
- specific_target_organ_toxicity_single
- specific_target_organ_toxicity_repeated
- aspiration_hazard
- hazardous_to_aquatic_environment

**Acceptance Criteria:**
- Multiple hazard classes can be assigned to single chemical
- Hazard classes displayed with GHS pictogram icons
- Chemicals can be filtered/searched by hazard class
- Analytics support grouping by hazard class

**Capability ID:** C-203

---

### 3.2 Storage Locations & Inventory (BR-CHEM-LOC)

#### BR-CHEM-LOC-01: Storage Location Tracking
**Priority:** Must Have

Chemicals shall be linked to storage locations within sites.

**Storage Location Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| site_id | UUID | Yes | Which site contains this location |
| location_name | String | Yes | Name/identifier of storage area |
| max_storage_amount | Decimal | No | Maximum permitted quantity |
| typical_storage_amount | Decimal | No | Normal stock level |
| unit | Enum | Yes | kg / L / units / drums |
| storage_conditions | Text | No | Temperature, ventilation requirements |

**Acceptance Criteria:**
- Multiple storage locations can be created per site
- Chemicals can be linked to multiple storage locations
- Storage location detail shows all chemicals stored there
- Chemical detail shows all locations where it is stored

**Capability ID:** C-204

---

#### BR-CHEM-LOC-02: Inventory Quantity Tracking
**Priority:** Should Have

Basic inventory quantities shall be tracked per location.

**Acceptance Criteria:**
- Users can record current quantity at each location
- Quantity updates are timestamped
- Low stock warning when quantity < 20% of typical amount
- Exceeding max storage amount shows warning

**Capability ID:** C-205

---

### 3.3 Chemical Integration (BR-CHEM-INT)

#### BR-CHEM-INT-01: Link Chemicals to Incidents
**Priority:** Must Have

Incidents shall be linkable to one or more chemicals.

**Acceptance Criteria:**
- Incident form includes optional chemical selector
- Multiple chemicals can be linked to single incident
- Incident detail shows linked chemicals with quick access to SDS
- Chemical detail shows related incidents
- Linked chemicals searchable/filterable in incident list

**Capability ID:** C-206

---

#### BR-CHEM-INT-02: Link Chemicals to Inspections
**Priority:** Should Have

Inspection templates shall support chemical storage checks.

**Acceptance Criteria:**
- System template "Chemical Storage Inspection" available
- Inspection can be linked to specific storage location
- Inspection items can reference chemicals or hazard classes
- Chemical detail shows related inspections

**Capability ID:** C-207

---

#### BR-CHEM-INT-03: Link Chemicals to Actions
**Priority:** Should Have

Actions shall be linkable to chemicals.

**Acceptance Criteria:**
- Action form includes optional chemical selector
- Action detail shows linked chemical
- Chemical detail shows outstanding and completed actions
- Example: "Install ventilation for chemical XYZ storage"

**Capability ID:** C-208

---

### 3.4 Chemical Analytics (BR-CHEM-ANALYTICS)

#### BR-CHEM-ANALYTICS-01: Incidents by Chemical
**Priority:** Should Have

Analytics shall include chemical-based incident analysis.

**Acceptance Criteria:**
- Chart: Top 10 chemicals by incident count
- Filter: Date range, severity
- Drill-down to incident list for specific chemical

**Capability ID:** C-209

---

#### BR-CHEM-ANALYTICS-02: Incidents by Hazard Class
**Priority:** Should Have

Analytics shall include hazard class groupings.

**Acceptance Criteria:**
- Chart: Incidents grouped by GHS hazard class
- Shows which hazard categories have highest incident rates
- Filter: Date range, site

**Capability ID:** C-210

---

#### BR-CHEM-ANALYTICS-03: Site Chemical Risk Indicators
**Priority:** Could Have

Sites with high concentrations of hazardous chemicals shall be flagged.

**Acceptance Criteria:**
- Risk score component includes chemical risk factor
- Sites with many high-hazard chemicals show elevated score
- Chemical risk visible in site risk breakdown

**Capability ID:** C-211

---

## 4. Business Requirements – Permit-to-Work Management

### 4.1 Permit Types & Templates (BR-PERMIT-TYPE)

#### BR-PERMIT-TYPE-01: Permit Type Configuration
**Priority:** Must Have

Admins shall configure permit types with custom requirements.

**Standard Permit Types:**
| Type | Description | Typical Duration |
|------|-------------|------------------|
| Hot Work | Welding, cutting, grinding, open flames | 8 hours max |
| Confined Space Entry | Tanks, pits, vessels, ducts | Per entry |
| Work at Height | Above 2m, roof access, scaffolding | 8 hours max |
| Excavation | Ground breaking, trenching | Duration of work |
| Electrical Work | Live electrical systems | Per task |
| LOTO (Lock-Out Tag-Out) | Energy isolation | Duration of work |

**Permit Type Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | Permit type name |
| description | Text | No | Purpose and scope |
| default_duration_hours | Integer | No | Standard permit duration |
| requires_gas_test | Boolean | No | Whether gas testing required |
| required_fields | JSON | No | Additional fields to capture |
| required_controls | Array | No | Default control checklist items |
| approval_workflow | Enum | Yes | single_approval / dual_approval |
| max_duration_hours | Integer | No | Maximum permit duration allowed |

**Acceptance Criteria:**
- Admin can create custom permit types
- Default permit types seeded on organisation creation
- Permit type can be deactivated (not used for new permits)
- Deactivated types still visible on historical permits

**Capability ID:** C-220

---

#### BR-PERMIT-TYPE-02: Permit Control Checklists
**Priority:** Must Have

Each permit type shall have configurable control checklists.

**Acceptance Criteria:**
- Admin can define control items per permit type
- Control items can be marked as mandatory or optional
- Controls can be categorised (Pre-work, During, Post-work)
- Common controls: gas test, fire watch, isolation, PPE, rescue plan

**Capability ID:** C-221

---

### 4.2 Permit Lifecycle (BR-PERMIT-LIFE)

#### BR-PERMIT-LIFE-01: Permit States
**Priority:** Must Have

Permits shall follow a defined lifecycle.

**Permit States:**
| State | Description | Who Can Transition |
|-------|-------------|-------------------|
| draft | Being prepared by requester | Requester |
| submitted | Awaiting approval | - |
| approved | Approved, not yet active | Approver |
| active | Work in progress | Issuer |
| suspended | Temporarily halted | Issuer/Manager |
| closed | Work complete, permit closed out | Issuer |
| cancelled | Permit cancelled before use | Approver/Admin |
| expired | Exceeded valid_until without closure | System |

**State Transitions:**
```
draft → submitted → approved → active → closed
                 ↓           ↓         ↓
            cancelled    suspended   expired
                         ↓
                      resumed → active
```

**Acceptance Criteria:**
- State transitions enforced by system
- Each transition logged with timestamp and user
- Invalid transitions return clear error
- Expired permits auto-transitioned by scheduled job

**Capability ID:** C-222

---

#### BR-PERMIT-LIFE-02: Permit Request Fields
**Priority:** Must Have

Permit requests shall capture essential information.

**Permit Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| permit_type_id | UUID | Yes | Type of permit |
| site_id | UUID | Yes | Work location site |
| location_description | Text | Yes | Specific location details |
| requester_id | UUID | Yes | Who is requesting |
| description_of_work | Text | Yes | What work will be performed |
| planned_start | DateTime | Yes | When work should begin |
| planned_end | DateTime | Yes | When work should complete |
| valid_until | DateTime | Yes | Permit expiry time |
| workers | Array | No | Workers covered by permit |
| related_jsa_id | UUID | No | Link to job safety analysis |
| special_precautions | Text | No | Additional safety measures |

**Acceptance Criteria:**
- All required fields validated on submission
- planned_end cannot exceed permit type max_duration
- valid_until defaults to planned_end but can be extended
- Warnings shown if conflicting permits exist

**Capability ID:** C-223

---

#### BR-PERMIT-LIFE-03: Permit Approval
**Priority:** Must Have

Permits shall require formal approval before activation.

**Acceptance Criteria:**
- Submitted permits appear in approver's queue
- Approver can approve, reject, or request changes
- Approval records approver ID and timestamp
- Rejection requires reason
- Notification sent to requester on approval/rejection
- Dual approval types require two separate approvers

**Capability ID:** C-224

---

#### BR-PERMIT-LIFE-04: Permit Activation and Closure
**Priority:** Must Have

Approved permits shall be activated at work start and closed on completion.

**Acceptance Criteria:**
- Issuer (site manager) activates permit at work start
- Activation records actual_start timestamp
- During active period, controls can be recorded (e.g., gas test results)
- On closure, issuer confirms all controls complete
- Closure records actual_end timestamp
- Closure requires sign-off on all mandatory controls

**Capability ID:** C-225

---

### 4.3 Controls & Conditions (BR-PERMIT-CTRL)

#### BR-PERMIT-CTRL-01: Control Checklist Completion
**Priority:** Must Have

Permit controls shall be completed and recorded.

**Control Record Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| control_item_id | UUID | Yes | Which control |
| status | Enum | Yes | pending / completed / not_applicable |
| completed_by | UUID | No | Who completed |
| completed_at | DateTime | No | When completed |
| notes | Text | No | Additional notes |
| reading_value | String | No | For gas tests etc. |

**Acceptance Criteria:**
- Pre-work controls must be complete before activation
- During-work controls can be recorded at any time
- Post-work controls must be complete before closure
- Not_applicable requires justification
- Gas test readings stored with timestamp

**Capability ID:** C-226

---

#### BR-PERMIT-CTRL-02: Permit Attachments
**Priority:** Should Have

Permits shall support document attachments.

**Acceptance Criteria:**
- JSA/risk assessment can be attached
- Isolation diagrams can be attached
- Photos of work area can be attached
- Uses existing attachment mechanism

**Capability ID:** C-227

---

### 4.4 Permit Board & Oversight (BR-PERMIT-BOARD)

#### BR-PERMIT-BOARD-01: Active Permit Board View
**Priority:** Must Have

Managers shall have visibility of all active permits.

**Acceptance Criteria:**
- Permit board shows all active permits for today
- Filterable by site, permit type, status
- Card view showing: type, location, time remaining, requester
- Colour coding: green (plenty of time), amber (< 2 hours), red (expired)
- Click to view full permit details
- Auto-refresh every 60 seconds

**Capability ID:** C-228

---

#### BR-PERMIT-BOARD-02: Permit Calendar View
**Priority:** Should Have

Planned permits shall be visible on a calendar.

**Acceptance Criteria:**
- Calendar shows approved and active permits
- Week view and day view available
- Permits shown as time blocks
- Overlapping permits visually distinct
- Click to view permit details

**Capability ID:** C-229

---

#### BR-PERMIT-BOARD-03: Permit PDF Generation
**Priority:** Should Have

Active permits shall be printable as PDF.

**Acceptance Criteria:**
- PDF includes all permit details
- Control checklist shown with completion status
- QR code links to live permit status (optional)
- Uses Phase 5 PDF generation infrastructure
- Suitable for posting at work location

**Capability ID:** C-230

---

### 4.5 Permit Conflict Detection (BR-PERMIT-CONFLICT)

#### BR-PERMIT-CONFLICT-01: Overlapping Permit Warnings
**Priority:** Should Have

System shall warn of potentially conflicting permits.

**Conflict Detection Rules:**
1. Same site + same location + overlapping time period
2. Hot work + confined space at same location
3. Multiple permits exceeding location capacity

**Acceptance Criteria:**
- Warning shown during permit submission
- Warning is advisory (does not block submission)
- Conflict list shows in permit detail
- Manager can acknowledge and proceed
- Conflicts logged for audit

**Capability ID:** C-231

---

### 4.6 Permit Integration (BR-PERMIT-INT)

#### BR-PERMIT-INT-01: Link Permits to Incidents
**Priority:** Must Have

Incidents shall be linkable to permits.

**Acceptance Criteria:**
- Incident form includes optional permit selector
- Shows permits that were active at incident time
- Permit detail shows related incidents
- Analytics: incidents by permit type

**Capability ID:** C-232

---

#### BR-PERMIT-INT-02: Link Permits to Inspections
**Priority:** Should Have

Inspections can be linked to permit activities.

**Acceptance Criteria:**
- Inspection can reference a permit
- Useful for hot work fire watch inspections
- Permit detail shows related inspections

**Capability ID:** C-233

---

#### BR-PERMIT-INT-03: Link Permits to Actions
**Priority:** Should Have

Actions can be generated from permit activities.

**Acceptance Criteria:**
- Failed permit control can generate action
- Action linked to source permit
- Permit detail shows related actions

**Capability ID:** C-234

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target |
|-------------|--------|
| Chemical register load (1000 chemicals) | < 2 seconds |
| Permit board refresh | < 1 second |
| SDS document upload (10MB) | < 10 seconds |
| Permit state transition | < 500ms |

### 5.2 Security

| Requirement | Implementation |
|-------------|----------------|
| Chemical register access | Organisation-scoped |
| Permit access | Organisation-scoped |
| Permit approval | Role-based (manager/admin) |
| Audit trail | All changes logged |
| SDS downloads | Authenticated access only |

### 5.3 Availability

| Requirement | Target |
|-------------|--------|
| System availability | 99.5% uptime |
| Permit board availability | 99.9% during work hours |
| Offline capability | Not in scope (future) |

---

## 6. Acceptance Criteria Summary

### 6.1 Chemical Management

| Feature | Acceptance Criteria |
|---------|---------------------|
| Chemical Register | Admin can CRUD chemicals with all required fields |
| SDS Management | Upload, view, download SDS documents with version tracking |
| SDS Expiry | Dashboard shows expiring/expired SDS; notifications sent |
| GHS Hazards | Multiple hazard classes per chemical; pictogram display |
| Storage Locations | Track chemicals by site and location with quantities |
| Incident Integration | Link incidents to chemicals; view related incidents |
| Analytics | Charts for incidents by chemical and hazard class |

### 6.2 Permit-to-Work

| Feature | Acceptance Criteria |
|---------|---------------------|
| Permit Types | Admin can configure permit types with controls |
| Permit Lifecycle | Full state machine from draft to closed/expired |
| Approval Workflow | Formal approval with notifications |
| Control Checklists | Record control completion with readings |
| Permit Board | Real-time view of active permits |
| Conflict Detection | Warnings for overlapping permits |
| Integration | Link permits to incidents, inspections, actions |

---

## 7. Dependencies

### 7.1 Phase Dependencies

| Dependency | Phase | Impact |
|------------|-------|--------|
| Attachment system | Phase 2 | SDS storage |
| Notification system | Phase 4 | SDS expiry alerts, permit notifications |
| Analytics framework | Phase 5 | Chemical/permit analytics |
| Multi-tenant model | Phase 3 | Organisation scoping |
| Scheduled jobs | Phase 4 | Permit expiry job |

### 7.2 External Dependencies

| Dependency | Description | Risk |
|------------|-------------|------|
| None | Phase 7 is self-contained | Low |

---

## 8. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| GHS classification complexity | High | Medium | Provide reference data; allow freeform entry |
| SDS expiry notification noise | Medium | Medium | Configurable notification thresholds |
| Permit conflict false positives | Medium | High | Advisory warnings only; user can override |
| Permit workflow too rigid | Medium | Low | Configurable approval types per permit type |
| Chemical inventory accuracy | Low | High | Clear that system tracks reference data, not real-time inventory |

---

## 9. Glossary

| Term | Definition |
|------|------------|
| CAS Number | Chemical Abstracts Service registry number – unique identifier for chemicals |
| GHS | Globally Harmonized System of Classification and Labelling of Chemicals |
| SDS | Safety Data Sheet – document with chemical hazard and handling information |
| PTW | Permit-to-Work – formal system for controlling high-risk activities |
| JSA | Job Safety Analysis – risk assessment for specific work activity |
| LOTO | Lock-Out Tag-Out – energy isolation procedure |
| Hot Work | Work involving ignition sources (welding, cutting, grinding) |

---

## 10. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

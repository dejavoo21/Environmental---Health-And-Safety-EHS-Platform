# Data Model – EHS Portal Phase 7
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

Phase 7 introduces new tables for Chemical Management and Permit-to-Work functionality. The design integrates with existing Phase 1-6 entities while maintaining multi-tenant isolation.

**New Tables:**
- `chemicals` - Chemical register per organisation
- `chemical_ghs_hazards` - GHS hazard classes per chemical (many-to-many)
- `chemical_locations` - Storage locations for chemicals
- `chemical_inventory` - Inventory records at locations
- `incident_chemicals` - Link chemicals to incidents
- `action_chemicals` - Link chemicals to actions
- `permit_types` - Configurable permit type definitions
- `permit_type_controls` - Control items per permit type
- `permits` - Permit records
- `permit_controls` - Control completions per permit
- `permit_workers` - Workers covered by permit
- `permit_state_history` - Permit state change log
- `incident_permits` - Link permits to incidents
- `inspection_permits` - Link permits to inspections

**Modified Tables:**
- `attachments` - Add `chemical_id` and `permit_id` columns
- `analytics_daily_summary` - Add chemical/permit metrics (optional)

---

## 2. Design Decisions

### 2.1 Chemical-Location Relationship

**Decision:** Use junction table `chemical_locations` with inventory tracking in separate table.

**Rationale:**
- Many-to-many: one chemical can be stored in multiple locations
- Inventory updates frequent; separating from location config allows audit trail
- Future: regulatory limits can be added to location table

### 2.2 GHS Hazard Classes Storage

**Decision:** Use normalised junction table `chemical_ghs_hazards` with enum values.

**Rationale:**
- Enables filtering/grouping by hazard class in queries
- Avoids parsing JSON arrays for analytics
- Easy to validate against known enum values

### 2.3 Permit Control Storage

**Decision:** Store controls at type level (template) and permit level (instance).

**Rationale:**
- `permit_type_controls` defines what's required
- `permit_controls` stores actual completion records
- Supports audit trail of who completed what and when

### 2.4 Permit State History

**Decision:** Maintain explicit `permit_state_history` table.

**Rationale:**
- Full audit trail of state transitions
- Enables compliance reporting on permit durations
- Required for permit-related incident investigations

---

## 3. New Entity Definitions

### 3.1 chemicals

Chemical register for an organisation.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| name | VARCHAR(200) | NOT NULL | Common chemical name |
| internal_code | VARCHAR(50) | NULL | Organisation's internal code |
| cas_number | VARCHAR(20) | NULL | Chemical Abstracts Service number |
| supplier | VARCHAR(200) | NULL | Primary supplier name |
| sds_version | VARCHAR(50) | NULL | Current SDS version/revision |
| sds_expiry_date | DATE | NULL | When SDS requires renewal |
| physical_state | VARCHAR(20) | NOT NULL, CHECK IN ('solid', 'liquid', 'gas') | Physical form |
| ppe_requirements | TEXT | NULL | Required PPE notes |
| handling_notes | TEXT | NULL | Safe handling instructions |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active', CHECK IN ('active', 'phase_out', 'banned') | Chemical status |
| created_by | UUID | FK → users, NOT NULL | Who created |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `(organisation_id, status)` - Active chemicals list
- Index on `(organisation_id, sds_expiry_date)` - Expiry queries
- Index on `(organisation_id, cas_number)` - CAS lookup
- Index on `(organisation_id, name)` - Name search

---

### 3.2 chemical_ghs_hazards

GHS hazard class assignments per chemical.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| chemical_id | UUID | FK → chemicals, NOT NULL, ON DELETE CASCADE | Parent chemical |
| hazard_class | VARCHAR(50) | NOT NULL | GHS hazard class enum |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Hazard Class Enum Values:**
```
flammable_gas, flammable_aerosol, flammable_liquid, flammable_solid,
oxidising_gas, oxidising_liquid, oxidising_solid, compressed_gas,
acute_toxicity, skin_corrosion, serious_eye_damage, skin_sensitisation,
respiratory_sensitisation, germ_cell_mutagenicity, carcinogenicity,
reproductive_toxicity, specific_target_organ_toxicity_single,
specific_target_organ_toxicity_repeated, aspiration_hazard,
hazardous_to_aquatic_environment
```

**Indexes:**
- Primary key on `id`
- Unique index on `(chemical_id, hazard_class)` - Prevent duplicates
- Index on `hazard_class` - Filter by hazard class

---

### 3.3 chemical_locations

Storage locations for chemicals.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| chemical_id | UUID | FK → chemicals, NOT NULL, ON DELETE CASCADE | Which chemical |
| site_id | UUID | FK → sites, NOT NULL | Which site |
| location_name | VARCHAR(200) | NOT NULL | Storage area name |
| max_storage_amount | DECIMAL(12,3) | NULL | Maximum permitted quantity |
| typical_storage_amount | DECIMAL(12,3) | NULL | Normal stock level |
| unit | VARCHAR(20) | NOT NULL, DEFAULT 'kg', CHECK IN ('kg', 'L', 'units', 'drums', 'bottles', 'containers') | Measurement unit |
| storage_conditions | TEXT | NULL | Temperature, ventilation notes |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether location is active |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `(organisation_id, site_id)` - Site-based queries
- Index on `chemical_id` - Chemical's locations
- Index on `(site_id, location_name)` - Location lookup

---

### 3.4 chemical_inventory

Inventory records for chemicals at locations.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| chemical_location_id | UUID | FK → chemical_locations, NOT NULL, ON DELETE CASCADE | Which location record |
| current_quantity | DECIMAL(12,3) | NOT NULL | Current stock quantity |
| recorded_by | UUID | FK → users, NOT NULL | Who recorded |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | When recorded |
| notes | TEXT | NULL | Inventory notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `(chemical_location_id, recorded_at DESC)` - Latest inventory

**Note:** Each record is a snapshot. To get current inventory, select most recent per location.

---

### 3.5 incident_chemicals

Links chemicals to incidents (many-to-many).

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| incident_id | UUID | FK → incidents, NOT NULL, ON DELETE CASCADE | Related incident |
| chemical_id | UUID | FK → chemicals, NOT NULL, ON DELETE CASCADE | Related chemical |
| involvement_type | VARCHAR(50) | NULL | Type of involvement (exposure, spill, etc.) |
| notes | TEXT | NULL | Additional context |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(incident_id, chemical_id)` - Prevent duplicates
- Index on `chemical_id` - Chemical's incidents

---

### 3.6 action_chemicals

Links chemicals to actions.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| action_id | UUID | FK → actions, NOT NULL, ON DELETE CASCADE | Related action |
| chemical_id | UUID | FK → chemicals, NOT NULL, ON DELETE CASCADE | Related chemical |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(action_id, chemical_id)` - Prevent duplicates
- Index on `chemical_id` - Chemical's actions

---

### 3.7 permit_types

Permit type definitions per organisation.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| name | VARCHAR(100) | NOT NULL | Permit type name |
| description | TEXT | NULL | Purpose and scope |
| code | VARCHAR(20) | NULL | Short code (e.g., HW, CSE) |
| default_duration_hours | INTEGER | NULL | Standard duration |
| max_duration_hours | INTEGER | NULL | Maximum allowed duration |
| requires_gas_test | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether gas testing required |
| approval_workflow | VARCHAR(30) | NOT NULL, DEFAULT 'single_approval', CHECK IN ('single_approval', 'dual_approval') | Approval type |
| required_fields | JSONB | NULL | Additional required fields |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether type is active |
| is_system | BOOLEAN | NOT NULL, DEFAULT FALSE | True for seeded types |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `(organisation_id, is_active)` - Active types list
- Unique index on `(organisation_id, code)` WHERE code IS NOT NULL - Unique codes

**Seed Data (per organisation):**
| Name | Code | Description |
|------|------|-------------|
| Hot Work | HW | Welding, cutting, grinding, open flames |
| Confined Space Entry | CSE | Tanks, pits, vessels, ducts |
| Work at Height | WAH | Work above 2m, roof access |
| Excavation | EXC | Ground breaking, trenching |
| Electrical Work | ELEC | Live electrical systems |
| Lock-Out Tag-Out | LOTO | Energy isolation |

---

### 3.8 permit_type_controls

Control checklist items per permit type.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| permit_type_id | UUID | FK → permit_types, NOT NULL, ON DELETE CASCADE | Parent permit type |
| label | VARCHAR(300) | NOT NULL | Control item text |
| category | VARCHAR(50) | NOT NULL, DEFAULT 'pre_work', CHECK IN ('pre_work', 'during_work', 'post_work') | When control applies |
| is_mandatory | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether required |
| requires_reading | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether numeric reading required |
| reading_unit | VARCHAR(20) | NULL | Unit for reading (ppm, %, etc.) |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `(permit_type_id, category, sort_order)` - Ordered controls

---

### 3.9 permits

Permit records.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| permit_type_id | UUID | FK → permit_types, NOT NULL | Type of permit |
| permit_number | VARCHAR(50) | NOT NULL | Human-readable number |
| site_id | UUID | FK → sites, NOT NULL | Work location site |
| location_description | TEXT | NOT NULL | Specific location details |
| description_of_work | TEXT | NOT NULL | What work will be performed |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'draft' | Current state |
| planned_start | TIMESTAMPTZ | NOT NULL | When work should begin |
| planned_end | TIMESTAMPTZ | NOT NULL | When work should complete |
| valid_until | TIMESTAMPTZ | NOT NULL | Permit expiry time |
| actual_start | TIMESTAMPTZ | NULL | When work actually started |
| actual_end | TIMESTAMPTZ | NULL | When work actually ended |
| requester_id | UUID | FK → users, NOT NULL | Who requested |
| approver_id | UUID | FK → users, NULL | Who approved |
| approved_at | TIMESTAMPTZ | NULL | When approved |
| issuer_id | UUID | FK → users, NULL | Who issued (activated) |
| issued_at | TIMESTAMPTZ | NULL | When issued |
| closed_by | UUID | FK → users, NULL | Who closed |
| closed_at | TIMESTAMPTZ | NULL | When closed |
| special_precautions | TEXT | NULL | Additional safety measures |
| rejection_reason | TEXT | NULL | If rejected |
| suspension_reason | TEXT | NULL | If suspended |
| additional_fields | JSONB | NULL | Custom field values |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Status Enum Values:**
```
draft, submitted, approved, active, suspended, closed, cancelled, expired
```

**Permit Number Format:** `{TYPE_CODE}-{SITE_CODE}-{YYYYMMDD}-{SEQ}`
Example: `HW-WH1-20260204-001`

**Indexes:**
- Primary key on `id`
- Index on `(organisation_id, status)` - Status queries
- Index on `(organisation_id, site_id, status)` - Site permit board
- Index on `(organisation_id, valid_until)` - Expiry queries
- Index on `(organisation_id, planned_start, planned_end)` - Conflict detection
- Unique index on `(organisation_id, permit_number)` - Unique permit numbers

---

### 3.10 permit_controls

Control completion records per permit.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| permit_id | UUID | FK → permits, NOT NULL, ON DELETE CASCADE | Parent permit |
| permit_type_control_id | UUID | FK → permit_type_controls, NOT NULL | Template control |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'completed', 'not_applicable') | Completion status |
| completed_by | UUID | FK → users, NULL | Who completed |
| completed_at | TIMESTAMPTZ | NULL | When completed |
| reading_value | VARCHAR(50) | NULL | For gas tests etc. |
| notes | TEXT | NULL | Additional notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(permit_id, permit_type_control_id)` - One record per control
- Index on `(permit_id, status)` - Pending controls

---

### 3.11 permit_workers

Workers covered by a permit.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| permit_id | UUID | FK → permits, NOT NULL, ON DELETE CASCADE | Parent permit |
| user_id | UUID | FK → users, NULL | System user (if registered) |
| worker_name | VARCHAR(200) | NULL | Name (if not system user) |
| worker_role | VARCHAR(100) | NULL | Role on permit |
| added_at | TIMESTAMPTZ | DEFAULT NOW() | When added |

**Indexes:**
- Primary key on `id`
- Index on `permit_id` - Permit's workers
- Index on `user_id` - User's permits

---

### 3.12 permit_state_history

Audit trail of permit state changes.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| permit_id | UUID | FK → permits, NOT NULL, ON DELETE CASCADE | Parent permit |
| from_status | VARCHAR(20) | NULL | Previous state (NULL for creation) |
| to_status | VARCHAR(20) | NOT NULL | New state |
| changed_by | UUID | FK → users, NOT NULL | Who made change |
| changed_at | TIMESTAMPTZ | DEFAULT NOW() | When changed |
| reason | TEXT | NULL | Reason for change |

**Indexes:**
- Primary key on `id`
- Index on `(permit_id, changed_at)` - Chronological history

---

### 3.13 incident_permits

Links permits to incidents.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| incident_id | UUID | FK → incidents, NOT NULL, ON DELETE CASCADE | Related incident |
| permit_id | UUID | FK → permits, NOT NULL, ON DELETE CASCADE | Related permit |
| notes | TEXT | NULL | Additional context |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(incident_id, permit_id)` - Prevent duplicates
- Index on `permit_id` - Permit's incidents

---

### 3.14 inspection_permits

Links permits to inspections.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| inspection_id | UUID | FK → inspections, NOT NULL, ON DELETE CASCADE | Related inspection |
| permit_id | UUID | FK → permits, NOT NULL, ON DELETE CASCADE | Related permit |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(inspection_id, permit_id)` - Prevent duplicates
- Index on `permit_id` - Permit's inspections

---

## 4. Modified Tables

### 4.1 attachments (Phase 2)

Add columns for chemical and permit linking.

| New Column | Type | Constraints | Purpose |
|------------|------|-------------|---------|
| chemical_id | UUID | FK → chemicals, NULL, ON DELETE CASCADE | Link to chemical |
| permit_id | UUID | FK → permits, NULL, ON DELETE CASCADE | Link to permit |

**Note:** Existing columns (incident_id, action_id, inspection_id) remain. An attachment can be linked to one entity type.

---

## 5. Migration Script

### 5.1 007_phase7_chemicals_permits.sql

```sql
-- Migration: 007_phase7_chemicals_permits.sql
-- Phase 7: Chemical & Permit Management
-- Date: 2026-02-04

BEGIN;

-- ============================================
-- CHEMICAL MANAGEMENT TABLES
-- ============================================

-- 1. Chemicals table
CREATE TABLE IF NOT EXISTS chemicals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    internal_code VARCHAR(50),
    cas_number VARCHAR(20),
    supplier VARCHAR(200),
    sds_version VARCHAR(50),
    sds_expiry_date DATE,
    physical_state VARCHAR(20) NOT NULL CHECK (physical_state IN ('solid', 'liquid', 'gas')),
    ppe_requirements TEXT,
    handling_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'phase_out', 'banned')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chemicals_org_status ON chemicals(organisation_id, status);
CREATE INDEX idx_chemicals_org_expiry ON chemicals(organisation_id, sds_expiry_date);
CREATE INDEX idx_chemicals_org_cas ON chemicals(organisation_id, cas_number);
CREATE INDEX idx_chemicals_org_name ON chemicals(organisation_id, name);

-- 2. Chemical GHS Hazards (junction table)
CREATE TABLE IF NOT EXISTS chemical_ghs_hazards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chemical_id UUID NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
    hazard_class VARCHAR(50) NOT NULL CHECK (hazard_class IN (
        'flammable_gas', 'flammable_aerosol', 'flammable_liquid', 'flammable_solid',
        'oxidising_gas', 'oxidising_liquid', 'oxidising_solid', 'compressed_gas',
        'acute_toxicity', 'skin_corrosion', 'serious_eye_damage', 'skin_sensitisation',
        'respiratory_sensitisation', 'germ_cell_mutagenicity', 'carcinogenicity',
        'reproductive_toxicity', 'specific_target_organ_toxicity_single',
        'specific_target_organ_toxicity_repeated', 'aspiration_hazard',
        'hazardous_to_aquatic_environment'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chemical_id, hazard_class)
);

CREATE INDEX idx_chemical_ghs_hazard ON chemical_ghs_hazards(hazard_class);

-- 3. Chemical Locations
CREATE TABLE IF NOT EXISTS chemical_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    chemical_id UUID NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    location_name VARCHAR(200) NOT NULL,
    max_storage_amount DECIMAL(12,3),
    typical_storage_amount DECIMAL(12,3),
    unit VARCHAR(20) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'L', 'units', 'drums', 'bottles', 'containers')),
    storage_conditions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chemical_locations_org_site ON chemical_locations(organisation_id, site_id);
CREATE INDEX idx_chemical_locations_chemical ON chemical_locations(chemical_id);
CREATE INDEX idx_chemical_locations_site_name ON chemical_locations(site_id, location_name);

-- 4. Chemical Inventory
CREATE TABLE IF NOT EXISTS chemical_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chemical_location_id UUID NOT NULL REFERENCES chemical_locations(id) ON DELETE CASCADE,
    current_quantity DECIMAL(12,3) NOT NULL,
    recorded_by UUID NOT NULL REFERENCES users(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chemical_inventory_location ON chemical_inventory(chemical_location_id, recorded_at DESC);

-- 5. Incident-Chemical Junction
CREATE TABLE IF NOT EXISTS incident_chemicals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    chemical_id UUID NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
    involvement_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (incident_id, chemical_id)
);

CREATE INDEX idx_incident_chemicals_chemical ON incident_chemicals(chemical_id);

-- 6. Action-Chemical Junction
CREATE TABLE IF NOT EXISTS action_chemicals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    chemical_id UUID NOT NULL REFERENCES chemicals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (action_id, chemical_id)
);

CREATE INDEX idx_action_chemicals_chemical ON action_chemicals(chemical_id);

-- ============================================
-- PERMIT MANAGEMENT TABLES
-- ============================================

-- 7. Permit Types
CREATE TABLE IF NOT EXISTS permit_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    code VARCHAR(20),
    default_duration_hours INTEGER,
    max_duration_hours INTEGER,
    requires_gas_test BOOLEAN NOT NULL DEFAULT FALSE,
    approval_workflow VARCHAR(30) NOT NULL DEFAULT 'single_approval' 
        CHECK (approval_workflow IN ('single_approval', 'dual_approval')),
    required_fields JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permit_types_org_active ON permit_types(organisation_id, is_active);
CREATE UNIQUE INDEX idx_permit_types_org_code ON permit_types(organisation_id, code) WHERE code IS NOT NULL;

-- 8. Permit Type Controls
CREATE TABLE IF NOT EXISTS permit_type_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_type_id UUID NOT NULL REFERENCES permit_types(id) ON DELETE CASCADE,
    label VARCHAR(300) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'pre_work' 
        CHECK (category IN ('pre_work', 'during_work', 'post_work')),
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    requires_reading BOOLEAN NOT NULL DEFAULT FALSE,
    reading_unit VARCHAR(20),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permit_type_controls ON permit_type_controls(permit_type_id, category, sort_order);

-- 9. Permits
CREATE TABLE IF NOT EXISTS permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    permit_type_id UUID NOT NULL REFERENCES permit_types(id),
    permit_number VARCHAR(50) NOT NULL,
    site_id UUID NOT NULL REFERENCES sites(id),
    location_description TEXT NOT NULL,
    description_of_work TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'suspended', 'closed', 'cancelled', 'expired')),
    planned_start TIMESTAMPTZ NOT NULL,
    planned_end TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    requester_id UUID NOT NULL REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    issuer_id UUID REFERENCES users(id),
    issued_at TIMESTAMPTZ,
    closed_by UUID REFERENCES users(id),
    closed_at TIMESTAMPTZ,
    special_precautions TEXT,
    rejection_reason TEXT,
    suspension_reason TEXT,
    additional_fields JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permits_org_status ON permits(organisation_id, status);
CREATE INDEX idx_permits_org_site_status ON permits(organisation_id, site_id, status);
CREATE INDEX idx_permits_org_valid ON permits(organisation_id, valid_until);
CREATE INDEX idx_permits_org_planned ON permits(organisation_id, planned_start, planned_end);
CREATE UNIQUE INDEX idx_permits_org_number ON permits(organisation_id, permit_number);

-- 10. Permit Controls (completions)
CREATE TABLE IF NOT EXISTS permit_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    permit_type_control_id UUID NOT NULL REFERENCES permit_type_controls(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'completed', 'not_applicable')),
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    reading_value VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (permit_id, permit_type_control_id)
);

CREATE INDEX idx_permit_controls_status ON permit_controls(permit_id, status);

-- 11. Permit Workers
CREATE TABLE IF NOT EXISTS permit_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    worker_name VARCHAR(200),
    worker_role VARCHAR(100),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (user_id IS NOT NULL OR worker_name IS NOT NULL)
);

CREATE INDEX idx_permit_workers_permit ON permit_workers(permit_id);
CREATE INDEX idx_permit_workers_user ON permit_workers(user_id);

-- 12. Permit State History
CREATE TABLE IF NOT EXISTS permit_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT
);

CREATE INDEX idx_permit_state_history ON permit_state_history(permit_id, changed_at);

-- 13. Incident-Permit Junction
CREATE TABLE IF NOT EXISTS incident_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (incident_id, permit_id)
);

CREATE INDEX idx_incident_permits_permit ON incident_permits(permit_id);

-- 14. Inspection-Permit Junction
CREATE TABLE IF NOT EXISTS inspection_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (inspection_id, permit_id)
);

CREATE INDEX idx_inspection_permits_permit ON inspection_permits(permit_id);

-- ============================================
-- MODIFY EXISTING TABLES
-- ============================================

-- 15. Add chemical_id and permit_id to attachments
ALTER TABLE attachments 
    ADD COLUMN IF NOT EXISTS chemical_id UUID REFERENCES chemicals(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS permit_id UUID REFERENCES permits(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_attachments_chemical ON attachments(chemical_id) WHERE chemical_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_permit ON attachments(permit_id) WHERE permit_id IS NOT NULL;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

-- Reuse existing trigger function or create if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
CREATE TRIGGER update_chemicals_updated_at BEFORE UPDATE ON chemicals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chemical_locations_updated_at BEFORE UPDATE ON chemical_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permit_types_updated_at BEFORE UPDATE ON permit_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permit_type_controls_updated_at BEFORE UPDATE ON permit_type_controls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON permits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permit_controls_updated_at BEFORE UPDATE ON permit_controls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

---

## 6. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CHEMICAL MANAGEMENT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  organisations                                                               │
│       │                                                                      │
│       │ 1:N                                                                  │
│       ▼                                                                      │
│  chemicals ──────────────────┬───────────────────┬──────────────────────┐   │
│       │                      │                   │                      │   │
│       │ 1:N                  │ N:M               │ N:M                  │   │
│       ▼                      ▼                   ▼                      │   │
│  chemical_ghs_hazards   chemical_locations   incident_chemicals         │   │
│                              │                   │                      │   │
│                              │ 1:N               │                      │   │
│                              ▼                   │                      │   │
│                      chemical_inventory          │                      │   │
│                                                  │                      │   │
│                                                  ▼                      ▼   │
│                                             incidents              actions  │
│                                                  │                      │   │
│                                                  │                      │   │
│                                                  ▼                      │   │
│                                          action_chemicals ◄─────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERMIT MANAGEMENT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  organisations                                                               │
│       │                                                                      │
│       │ 1:N                                                                  │
│       ▼                                                                      │
│  permit_types ──────────────┐                                               │
│       │                     │                                                │
│       │ 1:N                 │ 1:N                                            │
│       ▼                     ▼                                                │
│  permit_type_controls   permits ─────────────────┬──────────────────────┐   │
│                             │                    │                      │   │
│           ┌─────────────────┼────────────────────┼──────────────────┐   │   │
│           │                 │                    │                  │   │   │
│           ▼                 ▼                    ▼                  ▼   │   │
│   permit_controls   permit_workers   permit_state_history   attachments │   │
│                                                                         │   │
│                                                  ┌──────────────────────┘   │
│                                                  │                          │
│                                                  ▼                          │
│                                        ┌─────────────────┐                  │
│                                        │ incident_permits│                  │
│                                        │inspection_permits│                 │
│                                        └─────────────────┘                  │
│                                                  │                          │
│                                                  ▼                          │
│                                           incidents                         │
│                                           inspections                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Solution Architect | Initial draft |

# Data Model – EHS Portal (All Phases)

## 1. Overview

This document defines the complete database schema for the EHS Portal across all phases. It serves as the master reference for database structure.

**Phase Coverage:**
- **Phase 1 (Complete):** Users, Sites, Incident Types, Incidents, Inspection Templates, Inspections, Inspection Responses
- **Phase 2 (Complete):** Actions, Attachments, Audit Log
- **Phase 3 (Complete):** Organisations (multi-tenancy), User Management, Exports
- **Phase 4 (Complete):** Notifications, User Preferences, Email Logs, Scheduled Jobs
- **Phase 5 (Complete):** Analytics, Risk Scores, Saved Views, Daily Aggregations
- **Phase 6 (Complete):** Access Requests, Password Reset Tokens, 2FA, Security Audit Log, Login History
- **Phase 7 (Planned):** Chemicals, Permits, SDS, Storage Locations, Permit Controls
- **Phase 8 (Planned):** Training Categories, Courses, Sessions, Assignments, Completions, Training Matrix
- **Phase 9 (Planned):** Risk Register, Risk Categories, Controls, Risk Links, Reviews, Scoring Matrices, Tolerances
- **Phase 10 (Planned):** SSO Providers, Role Mappings, SSO Login Attempts, API Clients, Webhooks, Webhook Events, Integration Events

All entities include `organisation_id` (nullable) to support Phase 3 multi-tenancy.

For phase-specific details, see:
- [DATA_MODEL_PHASE1.md](./DATA_MODEL_PHASE1.md) - Detailed Phase 1 data model
- [DATA_MODEL_PHASE2.md](./DATA_MODEL_PHASE2.md) - Detailed Phase 2 data model
- [DATA_MODEL_PHASE3.md](./DATA_MODEL_PHASE3.md) - Detailed Phase 3 data model
- [DATA_MODEL_PHASE4.md](./DATA_MODEL_PHASE4.md) - Detailed Phase 4 data model (Notifications)
- [DATA_MODEL_PHASE5.md](./DATA_MODEL_PHASE5.md) - Detailed Phase 5 data model (Analytics)
- [DATA_MODEL_PHASE6.md](./DATA_MODEL_PHASE6.md) - Detailed Phase 6 data model (Security)
- [DATA_MODEL_PHASE7.md](./DATA_MODEL_PHASE7.md) - Detailed Phase 7 data model (Chemicals & Permits)
- [DATA_MODEL_PHASE8.md](./DATA_MODEL_PHASE8.md) - Detailed Phase 8 data model (Training & Competence)
- [DATA_MODEL_PHASE9.md](./DATA_MODEL_PHASE9.md) - Detailed Phase 9 data model (Risk Register & ERM)
- [DATA_MODEL_PHASE10.md](./DATA_MODEL_PHASE10.md) - Detailed Phase 10 data model (Integrations, SSO & External Connectivity)

---

## 2. Entity Definitions

### 2.1 users

Stores user accounts and credentials.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login identifier |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| first_name | VARCHAR(100) | NOT NULL | Display name |
| last_name | VARCHAR(100) | NOT NULL | Display name |
| role | VARCHAR(20) | NOT NULL, CHECK (role IN ('admin','manager','worker')) | Access control |
| organisation_id | UUID | NULL | Tenant isolation (Phase 3) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `email`

---

### 2.2 sites

Physical locations where incidents and inspections occur.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(200) | NOT NULL | Display name |
| code | VARCHAR(50) | UNIQUE | Short code (e.g., "WH1") |
| organisation_id | UUID | NULL | Tenant isolation (Phase 3) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `code`

---

### 2.3 incident_types

Categories for classifying incidents.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Type name |
| description | TEXT | NULL | Optional description |
| is_system | BOOLEAN | DEFAULT TRUE | True for seeded types |
| organisation_id | UUID | NULL | Tenant isolation (Phase 3) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Seed Data:**
- Injury
- Near Miss
- Property Damage
- Environmental
- Other

---

### 2.4 incidents

Safety incidents reported by users.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| title | VARCHAR(200) | NOT NULL | Brief title |
| description | TEXT | NULL | Detailed description |
| incident_type_id | UUID | FK → incident_types, NOT NULL | Categorisation |
| site_id | UUID | FK → sites, NOT NULL | Location |
| severity | VARCHAR(20) | NOT NULL, CHECK IN ('low','medium','high','critical') | Impact level |
| status | VARCHAR(30) | DEFAULT 'open', CHECK IN ('open','under_investigation','closed') | Workflow state |
| occurred_at | TIMESTAMPTZ | NOT NULL | When incident happened |
| reported_by | UUID | FK → users, NOT NULL | Who reported |
| organisation_id | UUID | NULL | Tenant isolation (Phase 3) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `status`
- Index on `site_id`
- Index on `reported_by`

**Severity Values:**
- `low` - Minor issue, no injury
- `medium` - Moderate issue, minor injury possible
- `high` - Serious issue, injury occurred
- `critical` - Severe issue, major injury or fatality

**Status Values:**
- `open` - Initial state when created
- `under_investigation` - Being reviewed by manager
- `closed` - Investigation complete

---

### 2.5 inspection_templates

Reusable templates defining inspection checklists.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(200) | NOT NULL | Template name |
| description | TEXT | NULL | Purpose/scope |
| organisation_id | UUID | NULL | Tenant isolation (Phase 3) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

---

### 2.6 inspection_template_items

Individual checklist items within a template.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| template_id | UUID | FK → inspection_templates, NOT NULL, ON DELETE CASCADE | Parent template |
| label | VARCHAR(300) | NOT NULL | Question/check text |
| category | VARCHAR(100) | NULL | Grouping (e.g., "Fire Safety") |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `template_id`

---

### 2.7 inspections

Completed inspections performed at sites.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| template_id | UUID | FK → inspection_templates, NOT NULL | Template used |
| site_id | UUID | FK → sites, NOT NULL | Location inspected |
| performed_by | UUID | FK → users, NOT NULL | Inspector |
| performed_at | TIMESTAMPTZ | NOT NULL | When inspection occurred |
| overall_result | VARCHAR(10) | CHECK IN ('pass','fail') | Computed result |
| notes | TEXT | NULL | General notes |
| organisation_id | UUID | NULL | Tenant isolation (Phase 3) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `site_id`
- Index on `template_id`

**overall_result Calculation:**
- `fail` if ANY inspection_response has result = 'not_ok'
- `pass` if all responses are 'ok' or 'na'

---

### 2.8 inspection_responses

Individual item responses within an inspection.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| inspection_id | UUID | FK → inspections, NOT NULL, ON DELETE CASCADE | Parent inspection |
| template_item_id | UUID | FK → inspection_template_items, NOT NULL | Which item |
| result | VARCHAR(10) | NOT NULL, CHECK IN ('ok','not_ok','na') | Item result |
| comment | TEXT | NULL | Optional note |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `inspection_id`

**Result Values:**
- `ok` - Item passes inspection
- `not_ok` - Item fails inspection
- `na` - Not applicable

---

## 3. Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │    incidents     │       │    sites     │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)          │    ┌──│ id (PK)      │
│ email        │  │    │ title            │    │  │ name         │
│ password_hash│  │    │ description      │    │  │ code (UNIQUE)│
│ first_name   │  │    │ incident_type_id │──┐ │  │ org_id       │
│ last_name    │  │    │ site_id ─────────┼──┼─┘  │ created_at   │
│ role         │  │    │ severity         │  │    │ updated_at   │
│ org_id       │  │    │ status           │  │    └──────────────┘
│ created_at   │  └────│ reported_by      │  │
│ updated_at   │       │ occurred_at      │  │    ┌──────────────────┐
└──────────────┘       │ org_id           │  │    │  incident_types  │
       │               │ created_at       │  │    ├──────────────────┤
       │               │ updated_at       │  └────│ id (PK)          │
       │               └──────────────────┘       │ name (UNIQUE)    │
       │                                          │ description      │
       │                                          │ is_system        │
       │       ┌──────────────────────┐           │ org_id           │
       │       │ inspection_templates │           │ created_at       │
       │       ├──────────────────────┤           └──────────────────┘
       │       │ id (PK)              │
       │       │ name                 │◄──────────────────────┐
       │       │ description          │                       │
       │       │ org_id               │                       │
       │       │ created_at           │                       │
       │       │ updated_at           │                       │
       │       └──────────────────────┘                       │
       │                   │                                  │
       │                   │ 1:N                              │
       │                   ▼                                  │
       │       ┌────────────────────────────┐                 │
       │       │ inspection_template_items  │                 │
       │       ├────────────────────────────┤                 │
       │       │ id (PK)                    │◄────────────┐   │
       │       │ template_id (FK)           │             │   │
       │       │ label                      │             │   │
       │       │ category                   │             │   │
       │       │ sort_order                 │             │   │
       │       │ created_at                 │             │   │
       │       └────────────────────────────┘             │   │
       │                                                  │   │
       │       ┌──────────────────┐                       │   │
       └──────►│   inspections    │                       │   │
               ├──────────────────┤                       │   │
               │ id (PK)          │                       │   │
               │ template_id ─────┼───────────────────────┼───┘
               │ site_id          │──► sites              │
               │ performed_by     │──► users              │
               │ performed_at     │                       │
               │ overall_result   │                       │
               │ notes            │                       │
               │ org_id           │                       │
               │ created_at       │                       │
               └──────────────────┘                       │
                        │                                 │
                        │ 1:N                             │
                        ▼                                 │
               ┌─────────────────────────┐                │
               │  inspection_responses   │                │
               ├─────────────────────────┤                │
               │ id (PK)                 │                │
               │ inspection_id (FK)      │                │
               │ template_item_id (FK) ──┼────────────────┘
               │ result                  │
               │ comment                 │
               │ created_at              │
               └─────────────────────────┘
```

---

## 4. Relationships Summary

### 4.1 Phase 1 Relationships

| From | To | Cardinality | FK Column | Description |
|------|----|----|-----------|-------------|
| users | incidents | 1:N | reported_by | One user reports many incidents |
| users | inspections | 1:N | performed_by | One user performs many inspections |
| sites | incidents | 1:N | site_id | One site has many incidents |
| sites | inspections | 1:N | site_id | One site has many inspections |
| incident_types | incidents | 1:N | incident_type_id | One type categorises many incidents |
| inspection_templates | inspection_template_items | 1:N | template_id | One template has many items |
| inspection_templates | inspections | 1:N | template_id | One template used for many inspections |
| inspections | inspection_responses | 1:N | inspection_id | One inspection has many responses |
| inspection_template_items | inspection_responses | 1:N | template_item_id | One item has many responses |

### 4.2 Phase 2 Relationships

| From | To | Cardinality | FK Column | Description |
|------|----|----|-----------|-------------|
| users | actions | 1:N | assigned_to | One user assigned many actions |
| users | actions | 1:N | created_by | One user creates many actions |
| users | attachments | 1:N | uploaded_by | One user uploads many attachments |
| users | audit_log | 1:N | user_id | One user triggers many audit events |
| incidents | actions | 1:N | source_id (type='incident') | One incident has many actions |
| inspections | actions | 1:N | source_id (type='inspection') | One inspection has many actions |
| inspection_responses | actions | 1:N | linked_response_id | One response can have many actions |
| incidents | attachments | 1:N | entity_id (type='incident') | One incident has many attachments |
| inspections | attachments | 1:N | entity_id (type='inspection') | One inspection has many attachments |
| actions | attachments | 1:N | entity_id (type='action') | One action has many attachments |
| incidents | audit_log | 1:N | entity_id (type='incident') | One incident has many audit entries |
| inspections | audit_log | 1:N | entity_id (type='inspection') | One inspection has many audit entries |
| actions | audit_log | 1:N | entity_id (type='action') | One action has many audit entries |

---

## 5. SQL Migration Script

```sql
-- migrations/001_initial_schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'worker')),
  organisation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites table
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE,
  organisation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident types table
CREATE TABLE incident_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT TRUE,
  organisation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents table
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  incident_type_id UUID NOT NULL REFERENCES incident_types(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open', 'under_investigation', 'closed')),
  occurred_at TIMESTAMPTZ NOT NULL,
  reported_by UUID NOT NULL REFERENCES users(id),
  organisation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection templates table
CREATE TABLE inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  organisation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection template items table
CREATE TABLE inspection_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES inspection_templates(id) ON DELETE CASCADE,
  label VARCHAR(300) NOT NULL,
  category VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspections table
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES inspection_templates(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL,
  overall_result VARCHAR(10) CHECK (overall_result IN ('pass', 'fail')),
  notes TEXT,
  organisation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspection responses table
CREATE TABLE inspection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES inspection_template_items(id),
  result VARCHAR(10) NOT NULL CHECK (result IN ('ok', 'not_ok', 'na')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_site_id ON incidents(site_id);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_occurred_at ON incidents(occurred_at);
CREATE INDEX idx_inspections_site_id ON inspections(site_id);
CREATE INDEX idx_inspections_template_id ON inspections(template_id);
CREATE INDEX idx_inspections_performed_at ON inspections(performed_at);
CREATE INDEX idx_inspection_responses_inspection_id ON inspection_responses(inspection_id);
CREATE INDEX idx_inspection_template_items_template_id ON inspection_template_items(template_id);
```

---

## 6. Seed Data Script

```sql
-- seeds/seed.sql

-- Incident Types (C6, C19)
INSERT INTO incident_types (name, description, is_system) VALUES
  ('Injury', 'Physical injury to person', TRUE),
  ('Near Miss', 'Close call without injury', TRUE),
  ('Property Damage', 'Damage to equipment or property', TRUE),
  ('Environmental', 'Spill, emission, or environmental impact', TRUE),
  ('Other', 'Other safety event', TRUE);

-- Sample Sites (for testing)
INSERT INTO sites (name, code) VALUES
  ('Head Office', 'HO'),
  ('Warehouse 1', 'WH1'),
  ('Distribution Center', 'DC1');

-- Test Users (passwords should be hashed via application)
-- These are placeholders - actual seed script will use bcrypt
-- admin@ehs.local / Admin123!
-- manager@ehs.local / Manager123!
-- worker@ehs.local / Worker123!
```

---

## 7. Phase 2 Entity Definitions

Phase 2 adds three new entities to support Actions/CAPA, Attachments, and Audit Logging.

### 7.1 actions

Corrective and preventive action items linked to incidents or inspections.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| title | VARCHAR(255) | NOT NULL | Action title |
| description | TEXT | NULL | Detailed description |
| source_type | ENUM | NOT NULL, CHECK IN ('incident','inspection') | Type of parent entity |
| source_id | UUID | NOT NULL | ID of parent incident/inspection |
| linked_response_id | UUID | FK → inspection_responses, NULL | Specific failed item (for inspections) |
| assigned_to | UUID | FK → users, NULL | User responsible for action |
| created_by | UUID | FK → users, NOT NULL | User who created action |
| due_date | DATE | NULL | Target completion date |
| completed_at | TIMESTAMPTZ | NULL | Actual completion timestamp |
| status | ENUM | NOT NULL, DEFAULT 'open', CHECK IN ('open','in_progress','done','overdue') | Workflow state |
| organisation_id | UUID | NULL | Tenant isolation (Phase 3) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Index on `(source_type, source_id)` - Find actions for incident/inspection
- Index on `assigned_to` - My Actions query
- Index on `status` - Filter by status
- Index on `due_date` - Find overdue actions

**Status Values:**
- `open` - Initial state when created
- `in_progress` - Work has started
- `done` - Action completed
- `overdue` - Past due date (set by system job)

**Checklist Coverage:** C20, C21, C22, C23, C24, C25, C26, C27

---

### 7.2 attachments

File metadata for documents attached to incidents, inspections, and actions.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| entity_type | ENUM | NOT NULL, CHECK IN ('incident','inspection','action') | Type of parent entity |
| entity_id | UUID | NOT NULL | ID of parent entity |
| filename | VARCHAR(255) | NOT NULL | Original uploaded filename |
| file_type | VARCHAR(100) | NOT NULL | MIME type |
| file_size | INTEGER | NOT NULL, CHECK (1 <= file_size <= 10485760) | Size in bytes (max 10MB) |
| storage_path | VARCHAR(512) | NOT NULL | File system or S3 path |
| uploaded_by | UUID | FK → users, NOT NULL | User who uploaded |
| uploaded_at | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

**Indexes:**
- Primary key on `id`
- Index on `(entity_type, entity_id)` - Find attachments for entity
- Index on `uploaded_by` - Find by uploader

**Allowed File Types:**
- Images: `image/jpeg`, `image/png`, `image/gif`
- Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Spreadsheets: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Checklist Coverage:** C28, C29, C30, C31, C32, C33

---

### 7.3 audit_log

Immutable record of significant system events for compliance and accountability.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| event_type | ENUM | NOT NULL | Type of event (created, updated, status_changed, etc.) |
| entity_type | ENUM | NOT NULL | Type of affected entity |
| entity_id | UUID | NOT NULL | ID of affected entity |
| user_id | UUID | FK → users, NULL | User who performed action (null for system) |
| occurred_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Event timestamp |
| old_value | JSONB | NULL | Previous state |
| new_value | JSONB | NULL | New state |
| metadata | JSONB | NULL | Additional context |
| ip_address | VARCHAR(45) | NULL | Client IP address |
| user_agent | VARCHAR(500) | NULL | Client user agent |

**Indexes:**
- Primary key on `id`
- Index on `(entity_type, entity_id)` - Activity log for entity
- Index on `user_id` - Find by user
- Index on `occurred_at` - Time-range queries

**Event Types:**
- `created` - Entity was created
- `updated` - Entity fields changed
- `status_changed` - Status field changed
- `severity_changed` - Severity field changed
- `attachment_added` - File attached
- `attachment_removed` - File removed
- `assigned` - Action assigned to user

**Immutability:** This table has database triggers preventing UPDATE and DELETE operations.

**Checklist Coverage:** C40, C41, C42, C43, C44, C45, C46

---

## 8. Phase 2 SQL Migration

```sql
-- migrations/002_phase2_actions_attachments_audit.sql

-- Enum types
CREATE TYPE action_status AS ENUM ('open', 'in_progress', 'done', 'overdue');
CREATE TYPE action_source_type AS ENUM ('incident', 'inspection');
CREATE TYPE attachable_entity_type AS ENUM ('incident', 'inspection', 'action');
CREATE TYPE audit_event_type AS ENUM ('created', 'updated', 'status_changed', 'severity_changed', 'attachment_added', 'attachment_removed', 'assigned');
CREATE TYPE auditable_entity_type AS ENUM ('incident', 'inspection', 'action', 'user');

-- Actions table
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source_type action_source_type NOT NULL,
  source_id UUID NOT NULL,
  linked_response_id UUID REFERENCES inspection_responses(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  status action_status NOT NULL DEFAULT 'open',
  organisation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_actions_source ON actions(source_type, source_id);
CREATE INDEX idx_actions_assigned_to ON actions(assigned_to);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_due_date ON actions(due_date);

-- Attachments table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type attachable_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  storage_path VARCHAR(512) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);

-- Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type audit_event_type NOT NULL,
  entity_type auditable_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500)
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_occurred_at ON audit_log(occurred_at);

-- Immutability triggers for audit_log
CREATE OR REPLACE FUNCTION prevent_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_update();

CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_delete();

-- Updated_at trigger for actions
CREATE TRIGGER actions_updated_at
  BEFORE UPDATE ON actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 9. Phase 3 Entity Definitions

Phase 3 adds the `organisations` table for multi-tenancy and modifies existing tables to enforce organisation scoping.

For detailed Phase 3 data model, see: [DATA_MODEL_PHASE3.md](./DATA_MODEL_PHASE3.md)

### 9.1 organisations

Tenant entity representing a company or business unit.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(200) | NOT NULL | Display name |
| slug | VARCHAR(50) | UNIQUE, NOT NULL | URL-safe identifier |
| logo_url | VARCHAR(512) | NULL | Path to uploaded logo |
| timezone | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' | Organisation timezone |
| settings | JSONB | NOT NULL, DEFAULT '{}' | Dashboard thresholds, defaults |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Organisation active status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `slug`
- Index on `is_active`

**Checklist Coverage:** C71, C91-C95

---

### 9.2 Phase 3 Table Modifications

| Table | Modification | Purpose |
|-------|--------------|---------|
| users | Add `is_active` BOOLEAN, `organisation_id` becomes NOT NULL | User enable/disable, org scoping |
| sites | `organisation_id` becomes NOT NULL | Org scoping |
| incident_types | `organisation_id` NOT NULL for custom types | Org-specific types |
| inspection_templates | `organisation_id` becomes NOT NULL | Org scoping |
| incidents | `organisation_id` becomes NOT NULL | Org scoping |
| inspections | `organisation_id` becomes NOT NULL | Org scoping |
| actions | `organisation_id` becomes NOT NULL | Org scoping |
| attachments | Add `organisation_id` NOT NULL | Org scoping |
| audit_log | Add `organisation_id` (nullable for system events) | Org scoping |

---

### 9.3 Phase 3 Relationships

| From | To | Cardinality | FK Column | Description |
|------|----|----|-----------|-------------|
| organisations | users | 1:N | organisation_id | Org has many users |
| organisations | sites | 1:N | organisation_id | Org has many sites |
| organisations | incident_types | 1:N | organisation_id | Org has custom types |
| organisations | inspection_templates | 1:N | organisation_id | Org has templates |
| organisations | incidents | 1:N | organisation_id | Org has incidents |
| organisations | inspections | 1:N | organisation_id | Org has inspections |
| organisations | actions | 1:N | organisation_id | Org has actions |
| organisations | attachments | 1:N | organisation_id | Org has attachments |
| organisations | audit_log | 1:N | organisation_id | Org has audit entries |

---

### 9.4 Phase 3 SQL Migration

```sql
-- migrations/003_phase3_multitenant.sql

-- Create organisations table
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  logo_url VARCHAR(512),
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  settings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add is_active to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add organisation_id to attachments
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS organisation_id UUID;

-- Add organisation_id to audit_log
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS organisation_id UUID;

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_organisation
  FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE sites ADD CONSTRAINT fk_sites_organisation
  FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE incident_types ADD CONSTRAINT fk_incident_types_organisation
  FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE inspection_templates ADD CONSTRAINT fk_inspection_templates_organisation
  FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE incidents ADD CONSTRAINT fk_incidents_organisation
  FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE inspections ADD CONSTRAINT fk_inspections_organisation
  FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE actions ADD CONSTRAINT fk_actions_organisation
  FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE attachments ADD CONSTRAINT fk_attachments_organisation
  FOREIGN KEY (organisation_id) REFERENCES organisations(id);
ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_organisation
  FOREIGN KEY (organisation_id) REFERENCES organisations(id);

-- Performance indexes for multi-tenant queries
CREATE INDEX idx_users_organisation_id ON users(organisation_id);
CREATE INDEX idx_sites_organisation_id ON sites(organisation_id);
CREATE INDEX idx_incidents_organisation_id ON incidents(organisation_id);
CREATE INDEX idx_inspections_organisation_id ON inspections(organisation_id);
CREATE INDEX idx_actions_organisation_id ON actions(organisation_id);
CREATE INDEX idx_attachments_organisation_id ON attachments(organisation_id);
CREATE INDEX idx_audit_log_organisation_id ON audit_log(organisation_id);

-- Composite indexes for export queries
CREATE INDEX idx_incidents_org_occurred_at ON incidents(organisation_id, occurred_at);
CREATE INDEX idx_inspections_org_performed_at ON inspections(organisation_id, performed_at);
CREATE INDEX idx_actions_org_due_date ON actions(organisation_id, due_date);
```

---

## 10. Phase 4 Entity Definitions

Phase 4 adds tables for notifications, user preferences, email logging, and scheduled job tracking.

For detailed Phase 4 data model, see: [DATA_MODEL_PHASE4.md](./DATA_MODEL_PHASE4.md)

### 10.1 notifications

In-app notification records for users.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users, NOT NULL | Notification recipient |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| type | ENUM | NOT NULL | Notification type (action_assigned, action_overdue, etc.) |
| priority | ENUM | NOT NULL, DEFAULT 'normal' | Priority level (low, normal, high) |
| title | VARCHAR(200) | NOT NULL | Short display title |
| message | TEXT | NOT NULL | Full notification message |
| related_type | VARCHAR(50) | NULL | Type of related entity (action, incident, etc.) |
| related_id | UUID | NULL | ID of related entity |
| is_read | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status |
| read_at | TIMESTAMPTZ | NULL | When marked as read |
| metadata | JSONB | DEFAULT '{}' | Additional context (due dates, assignee names) |
| expires_at | TIMESTAMPTZ | NULL | Expiration timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- Primary key on `id`
- Index on `(user_id, organisation_id, is_read)` - Unread count query
- Index on `(user_id, organisation_id, created_at DESC)` - Notification list
- Partial index on `is_read = FALSE` - Unread notifications

**Checklist Coverage:** C-096, C-097, C-098, C-099

---

### 10.2 user_notification_preferences

Per-user notification preferences.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | FK → users, NOT NULL, UNIQUE | Preference owner |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| email_action_assigned | BOOLEAN | NOT NULL, DEFAULT TRUE | Email on action assignment |
| email_action_overdue | BOOLEAN | NOT NULL, DEFAULT TRUE | Email on overdue actions |
| email_high_severity_incident | BOOLEAN | NOT NULL, DEFAULT TRUE | Email on critical incidents |
| email_inspection_failed | BOOLEAN | NOT NULL, DEFAULT FALSE | Email on failed inspections |
| digest_frequency | ENUM | NOT NULL, DEFAULT 'none' | Digest frequency (none, daily, weekly) |
| digest_time | TIME | NOT NULL, DEFAULT '07:00' | Preferred digest delivery time |
| digest_day_of_week | SMALLINT | DEFAULT 1 | Day for weekly digest (0=Sun, 1=Mon) |
| inapp_enabled | BOOLEAN | NOT NULL, DEFAULT TRUE | Enable in-app notifications |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `(user_id, organisation_id)`

**Checklist Coverage:** C-107, C-108, C-109, C-110

---

### 10.3 email_logs

Audit trail for email sending attempts.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations | Tenant isolation |
| recipient_email | VARCHAR(255) | NOT NULL | Email address |
| recipient_user_id | UUID | FK → users, NULL | User if internal |
| subject | VARCHAR(500) | NOT NULL | Email subject |
| email_type | VARCHAR(50) | NOT NULL | Type: notification, digest, escalation |
| notification_id | UUID | FK → notifications, NULL | Related notification |
| status | ENUM | NOT NULL, DEFAULT 'pending' | Status: pending, sent, failed, bounced |
| attempts | SMALLINT | NOT NULL, DEFAULT 0 | Send attempt count |
| sent_at | TIMESTAMPTZ | NULL | Successful send timestamp |
| error_message | TEXT | NULL | Last error message |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- Primary key on `id`
- Index on `(status, attempts)` - Retry queue
- Index on `organisation_id` - Org filtering

---

### 10.4 scheduled_job_runs

Execution history for scheduled jobs.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| job_name | VARCHAR(100) | NOT NULL | Job identifier |
| organisation_id | UUID | FK → organisations, NULL | Org-specific or global |
| status | ENUM | NOT NULL | Status: running, completed, failed |
| started_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Job start time |
| completed_at | TIMESTAMPTZ | NULL | Job completion time |
| items_processed | INTEGER | DEFAULT 0 | Items processed |
| items_succeeded | INTEGER | DEFAULT 0 | Successful items |
| items_failed | INTEGER | DEFAULT 0 | Failed items |
| error_message | TEXT | NULL | Error if failed |
| metadata | JSONB | DEFAULT '{}' | Additional job context |

**Indexes:**
- Primary key on `id`
- Index on `(job_name, started_at DESC)` - Job history
- Index on `organisation_id` - Org filtering

---

### 10.5 Phase 4 Relationships

| From | To | Cardinality | FK Column | Description |
|------|----|----|-----------|-------------|
| users | notifications | 1:N | user_id | User receives many notifications |
| users | user_notification_preferences | 1:1 | user_id | User has one preference record |
| users | email_logs | 1:N | recipient_user_id | User receives many emails |
| organisations | notifications | 1:N | organisation_id | Org has many notifications |
| organisations | user_notification_preferences | 1:N | organisation_id | Org has many preference records |
| organisations | email_logs | 1:N | organisation_id | Org has many email logs |
| organisations | scheduled_job_runs | 1:N | organisation_id | Org has many job runs |
| notifications | email_logs | 1:N | notification_id | Notification can trigger emails |

---

## 11. Phase 5 Entity Definitions

Phase 5 adds tables for analytics aggregation, site risk scores, and saved views.

For detailed Phase 5 data model, see: [DATA_MODEL_PHASE5.md](./DATA_MODEL_PHASE5.md)

### 11.1 analytics_daily_summary

Pre-aggregated daily statistics for analytics performance.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| site_id | UUID | FK → sites, NULL | Site filter (null for org-wide) |
| summary_date | DATE | NOT NULL | Date of the summary |
| incident_type_id | UUID | FK → incident_types, NULL | Incident type filter |
| severity | VARCHAR(20) | NULL | Severity filter |
| incident_count | INTEGER | NOT NULL, DEFAULT 0 | Incidents on this date |
| inspection_count | INTEGER | NOT NULL, DEFAULT 0 | Inspections on this date |
| inspection_pass_count | INTEGER | NOT NULL, DEFAULT 0 | Passed inspections |
| inspection_fail_count | INTEGER | NOT NULL, DEFAULT 0 | Failed inspections |
| actions_created | INTEGER | NOT NULL, DEFAULT 0 | Actions created |
| actions_completed | INTEGER | NOT NULL, DEFAULT 0 | Actions completed |
| actions_overdue | INTEGER | NOT NULL, DEFAULT 0 | Overdue actions |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, site_id, summary_date, incident_type_id, severity)`
- Index on `(organisation_id, summary_date)`
- Index on `(site_id, summary_date)`

**Checklist Coverage:** C-135

---

### 11.2 site_risk_scores

Current risk scores for each site.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| site_id | UUID | FK → sites, NOT NULL | Site being scored |
| risk_score | INTEGER | NOT NULL, DEFAULT 0 | Total risk score |
| risk_category | VARCHAR(20) | NOT NULL, DEFAULT 'low' | Category: low/medium/high/critical |
| incident_score | INTEGER | NOT NULL, DEFAULT 0 | Incident component |
| action_score | INTEGER | NOT NULL, DEFAULT 0 | Overdue action component |
| inspection_score | INTEGER | NOT NULL, DEFAULT 0 | Failed inspection component |
| critical_incidents | INTEGER | NOT NULL, DEFAULT 0 | Count of critical incidents |
| high_incidents | INTEGER | NOT NULL, DEFAULT 0 | Count of high incidents |
| medium_incidents | INTEGER | NOT NULL, DEFAULT 0 | Count of medium incidents |
| low_incidents | INTEGER | NOT NULL, DEFAULT 0 | Count of low incidents |
| overdue_actions | INTEGER | NOT NULL, DEFAULT 0 | Count of overdue actions |
| failed_inspections | INTEGER | NOT NULL, DEFAULT 0 | Count of failed inspections |
| primary_factor | VARCHAR(100) | NULL | Main contributing factor |
| calculation_window_days | INTEGER | NOT NULL, DEFAULT 90 | Days included in calculation |
| calculated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last calculation time |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, site_id)`
- Index on `(organisation_id)` - Org filtering
- Index on `(risk_score DESC)` - Top risk sites query

**Checklist Coverage:** C-124, C-125

---

### 11.3 site_risk_score_history

Historical risk scores for trending.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| site_id | UUID | FK → sites, NOT NULL | Site |
| risk_score | INTEGER | NOT NULL | Score at this point in time |
| risk_category | VARCHAR(20) | NOT NULL | Category at this point |
| recorded_at | DATE | NOT NULL | Date of recording |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- Primary key on `id`
- Index on `(site_id, recorded_at DESC)` - History queries

---

### 11.4 saved_views

Saved analytics filter configurations.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| user_id | UUID | FK → users, NOT NULL | View owner |
| name | VARCHAR(100) | NOT NULL | View name |
| description | TEXT | NULL | Optional description |
| filters | JSONB | NOT NULL, DEFAULT '{}' | Saved filter configuration |
| is_shared | BOOLEAN | NOT NULL, DEFAULT FALSE | Shared with org |
| is_default | BOOLEAN | NOT NULL, DEFAULT FALSE | Default view for user |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id` - User's views
- Index on `(organisation_id, is_shared)` - Shared views query

**Checklist Coverage:** C-128, C-129, C-130

---

### 11.5 Phase 5 SQL Migration

```sql
-- migrations/005_phase5_analytics.sql

-- Daily aggregation table
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  incident_type_id UUID REFERENCES incident_types(id) ON DELETE SET NULL,
  severity VARCHAR(20),
  incident_count INTEGER NOT NULL DEFAULT 0,
  inspection_count INTEGER NOT NULL DEFAULT 0,
  inspection_pass_count INTEGER NOT NULL DEFAULT 0,
  inspection_fail_count INTEGER NOT NULL DEFAULT 0,
  actions_created INTEGER NOT NULL DEFAULT 0,
  actions_completed INTEGER NOT NULL DEFAULT 0,
  actions_overdue INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organisation_id, site_id, summary_date, incident_type_id, severity)
);

-- Site risk scores (current)
CREATE TABLE IF NOT EXISTS site_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_category VARCHAR(20) NOT NULL DEFAULT 'low',
  incident_score INTEGER NOT NULL DEFAULT 0,
  action_score INTEGER NOT NULL DEFAULT 0,
  inspection_score INTEGER NOT NULL DEFAULT 0,
  critical_incidents INTEGER NOT NULL DEFAULT 0,
  high_incidents INTEGER NOT NULL DEFAULT 0,
  medium_incidents INTEGER NOT NULL DEFAULT 0,
  low_incidents INTEGER NOT NULL DEFAULT 0,
  overdue_actions INTEGER NOT NULL DEFAULT 0,
  failed_inspections INTEGER NOT NULL DEFAULT 0,
  primary_factor VARCHAR(100),
  calculation_window_days INTEGER NOT NULL DEFAULT 90,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organisation_id, site_id)
);

-- Risk score history for trending
CREATE TABLE IF NOT EXISTS site_risk_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL,
  risk_category VARCHAR(20) NOT NULL,
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved views
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analytics_summary_org_date ON analytics_daily_summary(organisation_id, summary_date);
CREATE INDEX idx_analytics_summary_site_date ON analytics_daily_summary(site_id, summary_date);
CREATE INDEX idx_risk_scores_org ON site_risk_scores(organisation_id);
CREATE INDEX idx_risk_scores_score ON site_risk_scores(risk_score DESC);
CREATE INDEX idx_risk_history_site_date ON site_risk_score_history(site_id, recorded_at);
CREATE INDEX idx_saved_views_user ON saved_views(user_id);
CREATE INDEX idx_saved_views_org_shared ON saved_views(organisation_id, is_shared);
```

---

## 12. Phase 6 Entity Summary

Phase 6 introduces security and self-service tables:

### access_requests
Self-service access requests from prospective users.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| organisation_id | UUID | Target organisation |
| full_name | VARCHAR(255) | Requester name |
| email | VARCHAR(255) | Requester email |
| requested_role | VARCHAR(20) | worker/manager |
| reason | TEXT | Optional justification |
| status | VARCHAR(20) | pending/approved/rejected |
| processed_by | UUID | Admin who processed |
| processed_at | TIMESTAMPTZ | When processed |
| created_at | TIMESTAMPTZ | Request submission time |

### password_reset_tokens
Secure tokens for password reset flow.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | User requesting reset |
| token_hash | VARCHAR(64) | SHA-256 hash of token |
| expires_at | TIMESTAMPTZ | Token expiry (30 min default) |
| used_at | TIMESTAMPTZ | When token was used |
| created_at | TIMESTAMPTZ | Token creation time |

### user_2fa
Two-factor authentication configuration.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | User (unique) |
| totp_secret_encrypted | TEXT | AES-256-GCM encrypted secret |
| totp_secret_iv | VARCHAR(32) | Initialization vector |
| is_enabled | BOOLEAN | 2FA active status |
| last_used_counter | INTEGER | Replay prevention |
| enabled_at | TIMESTAMPTZ | When enabled |
| created_at | TIMESTAMPTZ | Record creation |

### user_backup_codes
Backup codes for 2FA recovery.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | User owning codes |
| code_hash | VARCHAR(60) | Bcrypt hash of code |
| used_at | TIMESTAMPTZ | When code was used |
| created_at | TIMESTAMPTZ | Code generation time |

### security_audit_log
Immutable log of security events.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| organisation_id | UUID | Tenant isolation |
| user_id | UUID | Associated user |
| event_type | VARCHAR(50) | LOGIN_SUCCESS, 2FA_ENABLED, etc. |
| ip_address | VARCHAR(45) | Client IP |
| user_agent | TEXT | Browser/device |
| details | JSONB | Additional context |
| created_at | TIMESTAMPTZ | Event timestamp |

### login_history
User login attempt tracking.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | Attempting user |
| success | BOOLEAN | Login outcome |
| ip_address | VARCHAR(45) | Client IP |
| user_agent | TEXT | Browser/device |
| failure_reason | VARCHAR(50) | If failed |
| created_at | TIMESTAMPTZ | Attempt timestamp |

### user_password_history
Previous password hashes for reuse prevention.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| user_id | UUID | User |
| password_hash | VARCHAR(255) | Bcrypt hash |
| created_at | TIMESTAMPTZ | When password was set |

See [DATA_MODEL_PHASE6.md](./DATA_MODEL_PHASE6.md) for complete Phase 6 schema and migration script.

---

## 13. Phase 7: Chemical & Permit Management (Summary)

Phase 7 introduces 14 new tables for chemical register and permit-to-work management.

### Chemical Management Tables

| Table | Purpose |
|-------|---------|
| chemicals | Central register of all chemicals |
| chemical_ghs_hazards | GHS hazard class assignments |
| chemical_locations | Storage locations per site |
| chemical_inventory | Inventory tracking records |
| incident_chemicals | Link chemicals to incidents |
| action_chemicals | Link chemicals to actions |

### Permit Management Tables

| Table | Purpose |
|-------|---------|
| permit_types | Permit type configuration |
| permit_type_controls | Control templates per type |
| permits | Permit records and lifecycle |
| permit_controls | Control instances per permit |
| permit_workers | Workers assigned to permits |
| permit_state_history | Permit status audit trail |
| incident_permits | Link permits to incidents |
| inspection_permits | Link permits to inspections |

**Key Features:**
- GHS hazard classification with 9 standard classes
- SDS document management via attachments
- Storage location tracking with inventory
- Permit state machine: draft → submitted → approved → active → closed
- Pre-work, during-work, post-work control checklists
- Conflict detection for overlapping permits
- Auto-generated permit numbers

See [DATA_MODEL_PHASE7.md](./DATA_MODEL_PHASE7.md) for complete Phase 7 schema and migration script.

---

## 14. Phase 8: Training & Competence Management (Summary)

Phase 8 introduces 10 new tables for comprehensive training management.

### Training Course Tables

| Table | Purpose |
|-------|---------|  
| training_categories | Hierarchical training category structure |
| training_courses | Central training course catalogue |
| training_course_prerequisites | Course prerequisite relationships |

### Training Session Tables

| Table | Purpose |
|-------|---------|  
| training_sessions | Instructor-led training sessions |
| training_session_enrollments | User enrollments in sessions |

### Training Assignment Tables

| Table | Purpose |
|-------|---------|  
| training_assignments | Individual training assignments |
| training_assignment_rules | Auto-assignment rule configuration |

### Training Completion Tables

| Table | Purpose |
|-------|---------|  
| training_completions | Training completion records with expiry |

### Training Requirements Tables

| Table | Purpose |
|-------|---------|  
| training_role_requirements | Mandatory training by role |
| training_site_requirements | Mandatory training by site |

### Modified Existing Tables

| Table | Changes |
|-------|---------|  
| attachments | +training_course_id, +training_completion_id |
| actions | +training_course_id (link training as corrective action) |
| analytics_daily_summary | +training_completions, +training_overdue, +training_compliance_rate |

**Key Features:**
- Course catalogue with prerequisites and refresher course linking
- Validity period and expiry tracking with 30/14/7/1 day reminders
- Instructor-led training (ILT) session management with capacity
- Individual, bulk (role/site), and auto-assignment capabilities
- Completion with evidence upload and external training verification
- Training matrix with gap analysis per role/site requirements
- Integration with Actions module for corrective action training
- Integration with Analytics for training metrics

See [DATA_MODEL_PHASE8.md](./DATA_MODEL_PHASE8.md) for complete Phase 8 schema and migration script.

---

## 15. Future Phase Extensions

### Phase 5+: Risk Register
```sql
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
  status VARCHAR(30) DEFAULT 'identified',
  owner_id UUID REFERENCES users(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 16. Related Documents

- [DATA_MODEL_PHASE1.md](./DATA_MODEL_PHASE1.md) - Detailed Phase 1 data model
- [DATA_MODEL_PHASE2.md](./DATA_MODEL_PHASE2.md) - Detailed Phase 2 data model
- [DATA_MODEL_PHASE3.md](./DATA_MODEL_PHASE3.md) - Detailed Phase 3 data model (multi-tenancy)
- [DATA_MODEL_PHASE4.md](./DATA_MODEL_PHASE4.md) - Detailed Phase 4 data model (notifications)
- [DATA_MODEL_PHASE5.md](./DATA_MODEL_PHASE5.md) - Detailed Phase 5 data model (analytics)
- [DATA_MODEL_PHASE6.md](./DATA_MODEL_PHASE6.md) - Detailed Phase 6 data model (security)
- [DATA_MODEL_PHASE7.md](./DATA_MODEL_PHASE7.md) - Detailed Phase 7 data model (chemicals & permits)
- [DATA_MODEL_PHASE8.md](./DATA_MODEL_PHASE8.md) - Detailed Phase 8 data model (training & competence)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [API_SPEC_PHASE1.md](./API_SPEC_PHASE1.md) - Phase 1 API specification
- [API_SPEC_PHASE2.md](./API_SPEC_PHASE2.md) - Phase 2 API specification
- [API_SPEC_PHASE3.md](./API_SPEC_PHASE3.md) - Phase 3 API specification
- [API_SPEC_PHASE4.md](./API_SPEC_PHASE4.md) - Phase 4 API specification (notifications)
- [API_SPEC_PHASE5.md](./API_SPEC_PHASE5.md) - Phase 5 API specification (analytics)
- [API_SPEC_PHASE6.md](./API_SPEC_PHASE6.md) - Phase 6 API specification (security)
- [API_SPEC_PHASE7.md](./API_SPEC_PHASE7.md) - Phase 7 API specification (chemicals & permits)
- [API_SPEC_PHASE8.md](./API_SPEC_PHASE8.md) - Phase 8 API specification (training & competence)


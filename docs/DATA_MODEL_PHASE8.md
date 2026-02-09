# Data Model – EHS Portal Phase 8
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

Phase 8 introduces tables for Training & Competence Management. The design integrates with existing Phase 1-7 entities while maintaining multi-tenant isolation.

**New Tables:**
- `training_categories` - Course categories
- `training_courses` - Course catalogue
- `training_course_prerequisites` - Course prerequisites (many-to-many)
- `training_sessions` - Instructor-led training sessions
- `training_session_enrollments` - Session participants
- `training_assignments` - Training assignments to users
- `training_assignment_rules` - Role/site-based assignment rules
- `training_completions` - Completion records
- `training_role_requirements` - Required courses per role
- `training_site_requirements` - Required courses per site

**Modified Tables:**
- `attachments` - Add `training_course_id`, `training_completion_id` columns
- `actions` - Add `training_course_id` for training-type actions
- `analytics_daily_summary` - Add training metrics

---

## 2. Design Decisions

### 2.1 Assignment Model

**Decision:** Use explicit `training_assignments` with optional rule references.

**Rationale:**
- Each user has individual assignment records (trackable status)
- Role/site rules stored separately for "auto-assign to new users" feature
- Enables per-user due dates and status tracking

### 2.2 Completion vs Session Attendance

**Decision:** Separate `training_completions` from `training_session_enrollments`.

**Rationale:**
- Completions can come from sessions OR external training OR direct recording
- Session attendance feeds into completions but isn't the only source
- Allows flexible completion sources

### 2.3 Validity and Expiry

**Decision:** Store `expires_at` on completion record, calculated from course validity.

**Rationale:**
- Denormalised for query efficiency (avoid joining to course on every matrix query)
- Immutable once set (course validity change doesn't affect past completions)
- Enables simple expiry queries: `WHERE expires_at < NOW()`

### 2.4 Training Matrix Storage

**Decision:** Compute matrix on-demand, cache in `analytics_daily_summary`.

**Rationale:**
- Real-time matrix from source tables for accuracy
- Pre-aggregated summary stats for dashboard widgets
- Avoids maintaining separate materialized view

---

## 3. New Entity Definitions

### 3.1 training_categories

Course categories for organisation.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NULL for system | Tenant isolation (NULL = system) |
| name | VARCHAR(100) | NOT NULL | Category name |
| code | VARCHAR(20) | NOT NULL | Short code |
| description | TEXT | NULL | Category description |
| display_order | INTEGER | DEFAULT 0 | Sort order |
| is_system | BOOLEAN | DEFAULT FALSE | System vs custom category |
| is_active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, code)`
- Index on `(organisation_id, is_active, display_order)`

**System Categories (Seed Data):**
```
SAFETY     - Safety Training
COMPLIANCE - Regulatory Compliance
TECHNICAL  - Technical Skills
EMERGENCY  - Emergency Response
ENVIRON    - Environmental
MGMT       - Management & Leadership
INDUCTION  - Induction & Orientation
```

---

### 3.2 training_courses

Training course catalogue.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| category_id | UUID | FK → training_categories, NOT NULL | Course category |
| code | VARCHAR(50) | NOT NULL | Course code (org-unique) |
| title | VARCHAR(200) | NOT NULL | Course title |
| description | TEXT | NULL | Full description |
| duration_hours | DECIMAL(5,2) | NULL | Duration in hours |
| delivery_type | VARCHAR(30) | NOT NULL | Delivery method enum |
| course_type | VARCHAR(20) | NOT NULL, DEFAULT 'initial' | Initial or refresher |
| requirement_level | VARCHAR(20) | NOT NULL, DEFAULT 'mandatory' | Mandatory/optional |
| validity_months | INTEGER | DEFAULT 0 | Validity period (0 = no expiry) |
| refresher_course_id | UUID | FK → training_courses, NULL | Linked refresher course |
| owner_id | UUID | FK → users, NULL | Responsible person |
| external_url | VARCHAR(500) | NULL | External LMS/SCORM link |
| passing_score | DECIMAL(5,2) | NULL | Minimum passing score (%) |
| max_attempts | INTEGER | NULL | Max attempts allowed |
| self_enrollment | BOOLEAN | DEFAULT FALSE | Allow self-enrollment |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | Course status |
| created_by | UUID | FK → users, NOT NULL | Creator |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Delivery Type Enum:**
```
online        - Self-paced online/e-learning
classroom     - In-person instructor-led
virtual       - Virtual instructor-led (video call)
toolbox_talk  - Short on-site safety briefing
on_the_job    - Practical training with supervisor
blended       - Combination of methods
```

**Course Type Enum:**
```
initial   - First-time training
refresher - Renewal/update training
```

**Requirement Level Enum:**
```
mandatory - Required for role/site
optional  - Recommended but not required
```

**Status Enum:**
```
draft    - Being created, not available
active   - Available for assignment
inactive - No new assignments, existing valid
archived - Historical only
```

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, code)`
- Index on `(organisation_id, status)`
- Index on `(organisation_id, category_id, status)`
- Index on `(organisation_id, delivery_type)`
- Index on `refresher_course_id`

---

### 3.3 training_course_prerequisites

Prerequisite courses (many-to-many).

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| course_id | UUID | FK → training_courses, NOT NULL, ON DELETE CASCADE | Course requiring prereq |
| prerequisite_course_id | UUID | FK → training_courses, NOT NULL, ON DELETE CASCADE | Required prereq course |
| is_mandatory | BOOLEAN | DEFAULT FALSE | Enforced or advisory |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(course_id, prerequisite_course_id)`
- Index on `prerequisite_course_id`

---

### 3.4 training_sessions

Scheduled instructor-led training sessions.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| course_id | UUID | FK → training_courses, NOT NULL | Associated course |
| site_id | UUID | FK → sites, NULL | Location site (NULL = virtual) |
| location_detail | VARCHAR(200) | NULL | Room/area details |
| trainer_id | UUID | FK → users, NULL | Internal trainer |
| external_trainer_name | VARCHAR(200) | NULL | External trainer name |
| external_trainer_org | VARCHAR(200) | NULL | External trainer organisation |
| session_date | DATE | NOT NULL | Date of session |
| start_time | TIME | NOT NULL | Start time |
| end_time | TIME | NOT NULL | End time |
| virtual_link | VARCHAR(500) | NULL | Video call link |
| max_participants | INTEGER | DEFAULT 20 | Capacity limit |
| min_participants | INTEGER | DEFAULT 1 | Minimum to run |
| enrollment_deadline | DATE | NULL | Last date to enroll |
| notes | TEXT | NULL | Session notes |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'scheduled' | Session status |
| cancelled_reason | TEXT | NULL | Reason if cancelled |
| created_by | UUID | FK → users, NOT NULL | Creator |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Session Status Enum:**
```
scheduled   - Planned, open for enrollment
confirmed   - Minimum participants met
in_progress - Currently running
completed   - Session finished
cancelled   - Session cancelled
```

**Indexes:**
- Primary key on `id`
- Index on `(organisation_id, session_date, status)`
- Index on `(course_id, session_date)`
- Index on `(site_id, session_date)`
- Index on `(trainer_id, session_date)`

---

### 3.5 training_session_enrollments

Session participant enrollments.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| session_id | UUID | FK → training_sessions, NOT NULL, ON DELETE CASCADE | Session |
| user_id | UUID | FK → users, NOT NULL | Enrolled user |
| enrolled_by | UUID | FK → users, NOT NULL | Who enrolled them |
| enrollment_date | TIMESTAMPTZ | DEFAULT NOW() | When enrolled |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'enrolled' | Enrollment status |
| attendance_status | VARCHAR(20) | NULL | Attendance outcome |
| attendance_recorded_by | UUID | FK → users, NULL | Who recorded attendance |
| attendance_recorded_at | TIMESTAMPTZ | NULL | When recorded |
| notes | TEXT | NULL | Attendance notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Enrollment Status Enum:**
```
enrolled    - Confirmed enrollment
waitlisted  - On waitlist (capacity full)
cancelled   - User cancelled
removed     - Admin removed
```

**Attendance Status Enum:**
```
attended    - Fully attended
partial     - Partially attended
absent      - Did not attend
excused     - Absent with valid reason
```

**Indexes:**
- Primary key on `id`
- Unique index on `(session_id, user_id)` - One enrollment per user per session
- Index on `(user_id, status)`

---

### 3.6 training_assignments

Training assignments to individual users.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| user_id | UUID | FK → users, NOT NULL | Assigned user |
| course_id | UUID | FK → training_courses, NOT NULL | Assigned course |
| assignment_rule_id | UUID | FK → training_assignment_rules, NULL | Source rule (if from rule) |
| assigned_by | UUID | FK → users, NOT NULL | Who assigned |
| assigned_at | TIMESTAMPTZ | DEFAULT NOW() | When assigned |
| due_date | DATE | NULL | When training should be complete |
| priority | VARCHAR(20) | DEFAULT 'normal' | Assignment priority |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'assigned' | Assignment status |
| source_type | VARCHAR(20) | NOT NULL, DEFAULT 'manual' | How assignment was created |
| source_id | UUID | NULL | Reference to action/incident if linked |
| completion_id | UUID | FK → training_completions, NULL | Link to completion when done |
| notes | TEXT | NULL | Assignment notes |
| reminder_sent_at | TIMESTAMPTZ | NULL | Last reminder sent |
| escalation_sent_at | TIMESTAMPTZ | NULL | Last escalation sent |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Assignment Status Enum:**
```
assigned    - Assigned, not started
in_progress - User has started
completed   - Successfully completed
failed      - Completed but failed
overdue     - Past due date, not complete
cancelled   - Assignment cancelled
waived      - Requirement waived
```

**Source Type Enum:**
```
manual      - Manually assigned by user
role_rule   - Auto-assigned via role rule
site_rule   - Auto-assigned via site rule
action      - Created from corrective action
incident    - Created from incident investigation
```

**Priority Enum:**
```
low     - Low priority
normal  - Normal priority
high    - High priority
urgent  - Urgent
```

**Indexes:**
- Primary key on `id`
- Unique index on `(user_id, course_id)` WHERE status NOT IN ('completed', 'cancelled') - One active assignment per user/course
- Index on `(organisation_id, status)`
- Index on `(user_id, status)`
- Index on `(course_id, status)`
- Index on `(due_date)` WHERE status IN ('assigned', 'in_progress')
- Index on `(assignment_rule_id)`

---

### 3.7 training_assignment_rules

Rules for auto-assigning training to roles/sites.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| course_id | UUID | FK → training_courses, NOT NULL | Course to assign |
| rule_type | VARCHAR(20) | NOT NULL | Type of rule |
| role_name | VARCHAR(50) | NULL | Role name (if role rule) |
| site_id | UUID | FK → sites, NULL | Site (if site rule) |
| due_days_from_start | INTEGER | DEFAULT 30 | Days to complete from user start |
| priority | VARCHAR(20) | DEFAULT 'normal' | Assignment priority |
| auto_assign_new_users | BOOLEAN | DEFAULT TRUE | Apply to new users |
| is_active | BOOLEAN | DEFAULT TRUE | Rule active |
| created_by | UUID | FK → users, NOT NULL | Creator |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Rule Type Enum:**
```
role - Apply to all users with specific role
site - Apply to all users at specific site
```

**Indexes:**
- Primary key on `id`
- Index on `(organisation_id, rule_type, is_active)`
- Index on `(course_id, is_active)`
- Index on `(role_name)` WHERE rule_type = 'role'
- Index on `(site_id)` WHERE rule_type = 'site'

---

### 3.8 training_completions

Training completion records.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| user_id | UUID | FK → users, NOT NULL | User who completed |
| course_id | UUID | FK → training_courses, NOT NULL | Completed course |
| assignment_id | UUID | FK → training_assignments, NULL | Related assignment |
| session_id | UUID | FK → training_sessions, NULL | Session attended (if ILT) |
| completion_date | DATE | NOT NULL | When completed |
| result | VARCHAR(20) | NOT NULL | Outcome |
| score | DECIMAL(5,2) | NULL | Score achieved (%) |
| trainer_id | UUID | FK → users, NULL | Trainer/assessor |
| external_trainer_name | VARCHAR(200) | NULL | External trainer |
| external_provider | VARCHAR(200) | NULL | External training provider |
| certificate_number | VARCHAR(100) | NULL | Certificate/credential number |
| expires_at | DATE | NULL | When completion expires |
| is_external | BOOLEAN | DEFAULT FALSE | External training flag |
| verification_status | VARCHAR(20) | DEFAULT 'verified' | Verification status |
| verified_by | UUID | FK → users, NULL | Who verified |
| verified_at | TIMESTAMPTZ | NULL | When verified |
| notes | TEXT | NULL | Completion notes |
| recorded_by | UUID | FK → users, NOT NULL | Who recorded |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Result Enum:**
```
passed          - Passed assessment/attended fully
failed          - Did not pass assessment
attended        - Attended (no pass/fail applicable)
partial         - Partially completed
not_completed   - Did not complete
```

**Verification Status Enum:**
```
pending   - Awaiting verification (self-reported)
verified  - Verified by manager/admin
rejected  - Verification rejected
```

**Indexes:**
- Primary key on `id`
- Index on `(organisation_id, user_id, course_id)`
- Index on `(user_id, completion_date DESC)` - User history
- Index on `(course_id, completion_date DESC)` - Course completions
- Index on `(expires_at)` WHERE expires_at IS NOT NULL - Expiry queries
- Index on `(session_id)` - Session completions
- Index on `(verification_status)` WHERE verification_status = 'pending'

---

### 3.9 training_role_requirements

Required courses per role (training profile).

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| role_name | VARCHAR(50) | NOT NULL | Role name |
| course_id | UUID | FK → training_courses, NOT NULL, ON DELETE CASCADE | Required course |
| is_mandatory | BOOLEAN | DEFAULT TRUE | Required or recommended |
| created_by | UUID | FK → users, NOT NULL | Creator |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(organisation_id, role_name, course_id)`
- Index on `(organisation_id, role_name)`

---

### 3.10 training_site_requirements

Required courses per site.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| organisation_id | UUID | FK → organisations, NOT NULL | Tenant isolation |
| site_id | UUID | FK → sites, NOT NULL, ON DELETE CASCADE | Site |
| course_id | UUID | FK → training_courses, NOT NULL, ON DELETE CASCADE | Required course |
| is_mandatory | BOOLEAN | DEFAULT TRUE | Required or recommended |
| created_by | UUID | FK → users, NOT NULL | Creator |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Audit |

**Indexes:**
- Primary key on `id`
- Unique index on `(site_id, course_id)`
- Index on `(organisation_id, site_id)`

---

## 4. Modified Tables

### 4.1 attachments

Add training-related foreign keys.

```sql
ALTER TABLE attachments
ADD COLUMN training_course_id UUID REFERENCES training_courses(id) ON DELETE SET NULL,
ADD COLUMN training_completion_id UUID REFERENCES training_completions(id) ON DELETE SET NULL;

CREATE INDEX idx_attachments_training_course ON attachments(training_course_id) 
  WHERE training_course_id IS NOT NULL;
CREATE INDEX idx_attachments_training_completion ON attachments(training_completion_id) 
  WHERE training_completion_id IS NOT NULL;
```

### 4.2 actions

Add training course reference for training-type actions.

```sql
ALTER TABLE actions
ADD COLUMN training_course_id UUID REFERENCES training_courses(id) ON DELETE SET NULL;

CREATE INDEX idx_actions_training_course ON actions(training_course_id) 
  WHERE training_course_id IS NOT NULL;
```

### 4.3 analytics_daily_summary

Add training metrics (extend JSON structure or add columns).

```sql
ALTER TABLE analytics_daily_summary
ADD COLUMN training_assignments_count INTEGER DEFAULT 0,
ADD COLUMN training_completions_count INTEGER DEFAULT 0,
ADD COLUMN training_overdue_count INTEGER DEFAULT 0,
ADD COLUMN training_expiring_30d_count INTEGER DEFAULT 0,
ADD COLUMN training_compliance_rate DECIMAL(5,2) DEFAULT 0;
```

---

## 5. Entity Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           TRAINING MANAGEMENT ERD                               │
└────────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────┐         ┌─────────────────────┐
    │ organisations  │◄────────│ training_categories │
    │                │         │   - name            │
    │                │         │   - code            │
    └───────┬────────┘         │   - is_system       │
            │                  └──────────┬──────────┘
            │                             │
            │                             ▼
            │         ┌─────────────────────────────────────────┐
            │         │           training_courses              │
            │         │ - code, title, description              │
            ├────────►│ - delivery_type, course_type            │
            │         │ - validity_months, passing_score        │
            │         │ - refresher_course_id (self-ref)        │
            │         └───────────┬─────────────────────────────┘
            │                     │
            │    ┌────────────────┼────────────────┬──────────────────┐
            │    │                │                │                  │
            │    ▼                ▼                ▼                  ▼
            │ ┌──────────┐  ┌───────────────┐  ┌──────────────┐  ┌────────────┐
            │ │ prereqs  │  │   sessions    │  │ assignments  │  │completions │
            │ │(course_  │  │ - site_id     │  │ - user_id    │  │ - user_id  │
            │ │ prereqs) │  │ - trainer_id  │  │ - due_date   │  │ - date     │
            │ └──────────┘  │ - date/time   │  │ - status     │  │ - result   │
            │               │ - max_cap     │  │ - source     │  │ - expires  │
            │               └───────┬───────┘  └──────────────┘  └────────────┘
            │                       │
            │                       ▼
            │               ┌───────────────────┐
            │               │ session_enrollments│
            │               │ - user_id          │
            │               │ - status           │
            │               │ - attendance       │
            │               └───────────────────┘
            │
            │         ┌─────────────────────┐      ┌────────────────────┐
            │         │ assignment_rules    │      │ role_requirements  │
            ├────────►│ - rule_type         │      │ - role_name        │
            │         │ - role/site         │      │ - course_id        │
            │         │ - auto_assign       │      └────────────────────┘
            │         └─────────────────────┘
            │
            │         ┌─────────────────────┐
            └────────►│ site_requirements   │
                      │ - site_id           │
                      │ - course_id         │
                      └─────────────────────┘

Linking to Other Phases:
┌────────────────────────────────────────────────────────────────────────────────┐
│  incidents ◄───► training_assignments (source_type='incident')                 │
│  actions   ◄───► training_assignments (source_type='action')                   │
│  actions   ───── training_course_id (training as corrective action)            │
│  attachments ─── training_course_id, training_completion_id                    │
│  analytics_daily_summary ─── training metrics                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Migration Script

**File:** `migrations/008_phase8_training.sql`

```sql
-- =====================================================
-- Phase 8: Training & Competence Management
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Training Categories
-- -----------------------------------------------------
CREATE TABLE training_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_training_categories_org_code 
    ON training_categories(COALESCE(organisation_id, '00000000-0000-0000-0000-000000000000'), code);
CREATE INDEX idx_training_categories_org_active 
    ON training_categories(organisation_id, is_active, display_order);

-- System categories (organisation_id = NULL)
INSERT INTO training_categories (organisation_id, name, code, description, display_order, is_system) VALUES
(NULL, 'Safety Training', 'SAFETY', 'General safety and hazard awareness training', 1, TRUE),
(NULL, 'Regulatory Compliance', 'COMPLIANCE', 'Legal and regulatory compliance training', 2, TRUE),
(NULL, 'Technical Skills', 'TECHNICAL', 'Job-specific technical skills training', 3, TRUE),
(NULL, 'Emergency Response', 'EMERGENCY', 'Emergency procedures and first response', 4, TRUE),
(NULL, 'Environmental', 'ENVIRON', 'Environmental protection and sustainability', 5, TRUE),
(NULL, 'Management & Leadership', 'MGMT', 'Leadership and management training', 6, TRUE),
(NULL, 'Induction & Orientation', 'INDUCTION', 'New employee induction training', 7, TRUE);

-- -----------------------------------------------------
-- 2. Training Courses
-- -----------------------------------------------------
CREATE TABLE training_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES training_categories(id),
    code VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration_hours DECIMAL(5,2),
    delivery_type VARCHAR(30) NOT NULL CHECK (delivery_type IN 
        ('online', 'classroom', 'virtual', 'toolbox_talk', 'on_the_job', 'blended')),
    course_type VARCHAR(20) NOT NULL DEFAULT 'initial' CHECK (course_type IN ('initial', 'refresher')),
    requirement_level VARCHAR(20) NOT NULL DEFAULT 'mandatory' CHECK (requirement_level IN ('mandatory', 'optional')),
    validity_months INTEGER DEFAULT 0,
    refresher_course_id UUID REFERENCES training_courses(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    external_url VARCHAR(500),
    passing_score DECIMAL(5,2),
    max_attempts INTEGER,
    self_enrollment BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_training_courses_org_code ON training_courses(organisation_id, code);
CREATE INDEX idx_training_courses_org_status ON training_courses(organisation_id, status);
CREATE INDEX idx_training_courses_org_cat ON training_courses(organisation_id, category_id, status);
CREATE INDEX idx_training_courses_delivery ON training_courses(organisation_id, delivery_type);
CREATE INDEX idx_training_courses_refresher ON training_courses(refresher_course_id);

-- -----------------------------------------------------
-- 3. Course Prerequisites
-- -----------------------------------------------------
CREATE TABLE training_course_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    prerequisite_course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_prereq_not_self CHECK (course_id != prerequisite_course_id)
);

CREATE UNIQUE INDEX idx_course_prereqs_unique ON training_course_prerequisites(course_id, prerequisite_course_id);
CREATE INDEX idx_course_prereqs_prereq ON training_course_prerequisites(prerequisite_course_id);

-- -----------------------------------------------------
-- 4. Training Sessions
-- -----------------------------------------------------
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    location_detail VARCHAR(200),
    trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    external_trainer_name VARCHAR(200),
    external_trainer_org VARCHAR(200),
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    virtual_link VARCHAR(500),
    max_participants INTEGER DEFAULT 20,
    min_participants INTEGER DEFAULT 1,
    enrollment_deadline DATE,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN 
        ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    cancelled_reason TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_session_times CHECK (end_time > start_time)
);

CREATE INDEX idx_sessions_org_date ON training_sessions(organisation_id, session_date, status);
CREATE INDEX idx_sessions_course ON training_sessions(course_id, session_date);
CREATE INDEX idx_sessions_site ON training_sessions(site_id, session_date);
CREATE INDEX idx_sessions_trainer ON training_sessions(trainer_id, session_date);

-- -----------------------------------------------------
-- 5. Session Enrollments
-- -----------------------------------------------------
CREATE TABLE training_session_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_by UUID NOT NULL REFERENCES users(id),
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'enrolled' CHECK (status IN 
        ('enrolled', 'waitlisted', 'cancelled', 'removed')),
    attendance_status VARCHAR(20) CHECK (attendance_status IN 
        ('attended', 'partial', 'absent', 'excused')),
    attendance_recorded_by UUID REFERENCES users(id),
    attendance_recorded_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_enrollments_session_user ON training_session_enrollments(session_id, user_id);
CREATE INDEX idx_enrollments_user ON training_session_enrollments(user_id, status);

-- -----------------------------------------------------
-- 6. Training Assignments
-- -----------------------------------------------------
CREATE TABLE training_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    assignment_rule_id UUID, -- FK added after rules table
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (status IN 
        ('assigned', 'in_progress', 'completed', 'failed', 'overdue', 'cancelled', 'waived')),
    source_type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source_type IN 
        ('manual', 'role_rule', 'site_rule', 'action', 'incident')),
    source_id UUID,
    completion_id UUID, -- FK added after completions table
    notes TEXT,
    reminder_sent_at TIMESTAMPTZ,
    escalation_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments_org_status ON training_assignments(organisation_id, status);
CREATE INDEX idx_assignments_user_status ON training_assignments(user_id, status);
CREATE INDEX idx_assignments_course ON training_assignments(course_id, status);
CREATE INDEX idx_assignments_due ON training_assignments(due_date) 
    WHERE status IN ('assigned', 'in_progress');

-- -----------------------------------------------------
-- 7. Assignment Rules
-- -----------------------------------------------------
CREATE TABLE training_assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('role', 'site')),
    role_name VARCHAR(50),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    due_days_from_start INTEGER DEFAULT 30,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    auto_assign_new_users BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_rule_type_fields CHECK (
        (rule_type = 'role' AND role_name IS NOT NULL) OR
        (rule_type = 'site' AND site_id IS NOT NULL)
    )
);

CREATE INDEX idx_rules_org_type ON training_assignment_rules(organisation_id, rule_type, is_active);
CREATE INDEX idx_rules_course ON training_assignment_rules(course_id, is_active);
CREATE INDEX idx_rules_role ON training_assignment_rules(role_name) WHERE rule_type = 'role';
CREATE INDEX idx_rules_site ON training_assignment_rules(site_id) WHERE rule_type = 'site';

-- Add FK to assignments
ALTER TABLE training_assignments 
    ADD CONSTRAINT fk_assignments_rule 
    FOREIGN KEY (assignment_rule_id) REFERENCES training_assignment_rules(id) ON DELETE SET NULL;

CREATE INDEX idx_assignments_rule ON training_assignments(assignment_rule_id);

-- -----------------------------------------------------
-- 8. Training Completions
-- -----------------------------------------------------
CREATE TABLE training_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES training_assignments(id) ON DELETE SET NULL,
    session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
    completion_date DATE NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN 
        ('passed', 'failed', 'attended', 'partial', 'not_completed')),
    score DECIMAL(5,2),
    trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    external_trainer_name VARCHAR(200),
    external_provider VARCHAR(200),
    certificate_number VARCHAR(100),
    expires_at DATE,
    is_external BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(20) DEFAULT 'verified' CHECK (verification_status IN 
        ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_completions_org_user ON training_completions(organisation_id, user_id, course_id);
CREATE INDEX idx_completions_user_date ON training_completions(user_id, completion_date DESC);
CREATE INDEX idx_completions_course_date ON training_completions(course_id, completion_date DESC);
CREATE INDEX idx_completions_expires ON training_completions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_completions_session ON training_completions(session_id);
CREATE INDEX idx_completions_pending ON training_completions(verification_status) 
    WHERE verification_status = 'pending';

-- Add FK to assignments
ALTER TABLE training_assignments 
    ADD CONSTRAINT fk_assignments_completion 
    FOREIGN KEY (completion_id) REFERENCES training_completions(id) ON DELETE SET NULL;

-- -----------------------------------------------------
-- 9. Role Requirements
-- -----------------------------------------------------
CREATE TABLE training_role_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_role_reqs_unique ON training_role_requirements(organisation_id, role_name, course_id);
CREATE INDEX idx_role_reqs_org_role ON training_role_requirements(organisation_id, role_name);

-- -----------------------------------------------------
-- 10. Site Requirements
-- -----------------------------------------------------
CREATE TABLE training_site_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_site_reqs_unique ON training_site_requirements(site_id, course_id);
CREATE INDEX idx_site_reqs_org_site ON training_site_requirements(organisation_id, site_id);

-- -----------------------------------------------------
-- 11. Modify Attachments Table
-- -----------------------------------------------------
ALTER TABLE attachments
    ADD COLUMN training_course_id UUID REFERENCES training_courses(id) ON DELETE SET NULL,
    ADD COLUMN training_completion_id UUID REFERENCES training_completions(id) ON DELETE SET NULL;

CREATE INDEX idx_attachments_training_course ON attachments(training_course_id) 
    WHERE training_course_id IS NOT NULL;
CREATE INDEX idx_attachments_training_completion ON attachments(training_completion_id) 
    WHERE training_completion_id IS NOT NULL;

-- -----------------------------------------------------
-- 12. Modify Actions Table
-- -----------------------------------------------------
ALTER TABLE actions
    ADD COLUMN training_course_id UUID REFERENCES training_courses(id) ON DELETE SET NULL;

CREATE INDEX idx_actions_training_course ON actions(training_course_id) 
    WHERE training_course_id IS NOT NULL;

-- -----------------------------------------------------
-- 13. Modify Analytics Summary Table
-- -----------------------------------------------------
ALTER TABLE analytics_daily_summary
    ADD COLUMN training_assignments_count INTEGER DEFAULT 0,
    ADD COLUMN training_completions_count INTEGER DEFAULT 0,
    ADD COLUMN training_overdue_count INTEGER DEFAULT 0,
    ADD COLUMN training_expiring_30d_count INTEGER DEFAULT 0,
    ADD COLUMN training_compliance_rate DECIMAL(5,2) DEFAULT 0;

-- -----------------------------------------------------
-- 14. Updated_at Triggers
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_training_categories_updated 
    BEFORE UPDATE ON training_categories FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();
CREATE TRIGGER trg_training_courses_updated 
    BEFORE UPDATE ON training_courses FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();
CREATE TRIGGER trg_training_sessions_updated 
    BEFORE UPDATE ON training_sessions FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();
CREATE TRIGGER trg_training_enrollments_updated 
    BEFORE UPDATE ON training_session_enrollments FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();
CREATE TRIGGER trg_training_assignments_updated 
    BEFORE UPDATE ON training_assignments FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();
CREATE TRIGGER trg_training_rules_updated 
    BEFORE UPDATE ON training_assignment_rules FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();
CREATE TRIGGER trg_training_completions_updated 
    BEFORE UPDATE ON training_completions FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();
CREATE TRIGGER trg_training_role_reqs_updated 
    BEFORE UPDATE ON training_role_requirements FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();
CREATE TRIGGER trg_training_site_reqs_updated 
    BEFORE UPDATE ON training_site_requirements FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

COMMIT;
```

---

## 7. Sample Queries

### 7.1 Training Matrix Query (User × Course)

```sql
-- Get training status for all users in an org for mandatory courses
WITH user_courses AS (
    SELECT 
        u.id AS user_id,
        u.full_name,
        u.role,
        c.id AS course_id,
        c.code,
        c.title
    FROM users u
    CROSS JOIN training_courses c
    WHERE u.organisation_id = :org_id
      AND c.organisation_id = :org_id
      AND c.status = 'active'
      AND c.requirement_level = 'mandatory'
),
latest_completions AS (
    SELECT DISTINCT ON (user_id, course_id)
        user_id,
        course_id,
        completion_date,
        result,
        expires_at
    FROM training_completions
    WHERE organisation_id = :org_id
      AND result IN ('passed', 'attended')
    ORDER BY user_id, course_id, completion_date DESC
),
active_assignments AS (
    SELECT 
        user_id,
        course_id,
        due_date,
        status
    FROM training_assignments
    WHERE organisation_id = :org_id
      AND status NOT IN ('completed', 'cancelled', 'waived')
)
SELECT
    uc.user_id,
    uc.full_name,
    uc.role,
    uc.course_id,
    uc.code,
    uc.title,
    CASE
        WHEN lc.expires_at IS NOT NULL AND lc.expires_at < CURRENT_DATE THEN 'expired'
        WHEN lc.expires_at IS NOT NULL AND lc.expires_at < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        WHEN lc.result IS NOT NULL THEN 'completed'
        WHEN aa.status = 'overdue' OR (aa.due_date < CURRENT_DATE AND aa.status IN ('assigned', 'in_progress')) THEN 'overdue'
        WHEN aa.user_id IS NOT NULL THEN 'assigned'
        ELSE 'not_assigned'
    END AS training_status,
    lc.completion_date,
    lc.expires_at,
    aa.due_date
FROM user_courses uc
LEFT JOIN latest_completions lc ON uc.user_id = lc.user_id AND uc.course_id = lc.course_id
LEFT JOIN active_assignments aa ON uc.user_id = aa.user_id AND uc.course_id = aa.course_id
ORDER BY uc.full_name, uc.code;
```

### 7.2 Expiring Training Query

```sql
-- Get completions expiring in next 30 days
SELECT 
    tc.user_id,
    u.full_name,
    u.email,
    tc.course_id,
    c.code,
    c.title,
    tc.completion_date,
    tc.expires_at,
    tc.expires_at - CURRENT_DATE AS days_until_expiry,
    c.refresher_course_id
FROM training_completions tc
JOIN users u ON tc.user_id = u.id
JOIN training_courses c ON tc.course_id = c.id
WHERE tc.organisation_id = :org_id
  AND tc.result IN ('passed', 'attended')
  AND tc.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND NOT EXISTS (
      -- Exclude if already has active refresher assignment
      SELECT 1 FROM training_assignments ta
      WHERE ta.user_id = tc.user_id
        AND ta.course_id = COALESCE(c.refresher_course_id, c.id)
        AND ta.status NOT IN ('completed', 'cancelled')
  )
ORDER BY tc.expires_at;
```

### 7.3 Compliance Rate by Site

```sql
-- Calculate training compliance rate per site
WITH site_users AS (
    SELECT s.id AS site_id, s.name AS site_name, u.id AS user_id
    FROM sites s
    JOIN users u ON u.site_id = s.id
    WHERE s.organisation_id = :org_id
      AND u.is_active = TRUE
),
mandatory_courses AS (
    SELECT id AS course_id, validity_months
    FROM training_courses
    WHERE organisation_id = :org_id
      AND status = 'active'
      AND requirement_level = 'mandatory'
),
user_course_status AS (
    SELECT 
        su.site_id,
        su.user_id,
        mc.course_id,
        CASE
            WHEN tc.result IN ('passed', 'attended') 
                 AND (tc.expires_at IS NULL OR tc.expires_at >= CURRENT_DATE)
            THEN 1
            ELSE 0
        END AS is_compliant
    FROM site_users su
    CROSS JOIN mandatory_courses mc
    LEFT JOIN training_completions tc ON su.user_id = tc.user_id 
        AND mc.course_id = tc.course_id
        AND tc.result IN ('passed', 'attended')
)
SELECT
    site_id,
    (SELECT name FROM sites WHERE id = site_id) AS site_name,
    COUNT(*) AS total_requirements,
    SUM(is_compliant) AS compliant_count,
    ROUND(100.0 * SUM(is_compliant) / COUNT(*), 1) AS compliance_rate
FROM user_course_status
GROUP BY site_id
ORDER BY compliance_rate DESC;
```

---

## 8. Data Migration Notes

### 8.1 Importing Historical Training Records

For organisations with existing training records:

```sql
-- Template for importing historical completions
INSERT INTO training_completions (
    organisation_id, user_id, course_id, completion_date, 
    result, expires_at, is_external, verification_status,
    notes, recorded_by
)
SELECT
    :org_id,
    u.id,
    c.id,
    :completion_date,
    'attended',
    CASE WHEN c.validity_months > 0 
         THEN :completion_date + (c.validity_months || ' months')::INTERVAL 
         ELSE NULL END,
    TRUE,
    'verified',
    'Imported from legacy system',
    :admin_user_id
FROM users u
JOIN training_courses c ON c.code = :course_code AND c.organisation_id = :org_id
WHERE u.email = :user_email AND u.organisation_id = :org_id;
```

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-05 | Solution Architect | Initial Phase 8 data model |

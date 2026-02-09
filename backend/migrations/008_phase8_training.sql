-- =====================================================
-- Phase 8: Training & Competence Management
-- Migration: 008_phase8_training.sql
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Training Categories
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_categories (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_categories_org_code 
    ON training_categories(COALESCE(organisation_id, '00000000-0000-0000-0000-000000000000'), code);
CREATE INDEX IF NOT EXISTS idx_training_categories_org_active 
    ON training_categories(organisation_id, is_active, display_order);

-- System categories (organisation_id = NULL)
INSERT INTO training_categories (organisation_id, name, code, description, display_order, is_system) VALUES
(NULL, 'Safety Training', 'SAFETY', 'General safety and hazard awareness training', 1, TRUE),
(NULL, 'Regulatory Compliance', 'COMPLIANCE', 'Legal and regulatory compliance training', 2, TRUE),
(NULL, 'Technical Skills', 'TECHNICAL', 'Job-specific technical skills training', 3, TRUE),
(NULL, 'Emergency Response', 'EMERGENCY', 'Emergency procedures and first response', 4, TRUE),
(NULL, 'Environmental', 'ENVIRON', 'Environmental protection and sustainability', 5, TRUE),
(NULL, 'Management & Leadership', 'MGMT', 'Leadership and management training', 6, TRUE),
(NULL, 'Induction & Orientation', 'INDUCTION', 'New employee induction training', 7, TRUE)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------
-- 2. Training Courses
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_courses (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_courses_org_code ON training_courses(organisation_id, code);
CREATE INDEX IF NOT EXISTS idx_training_courses_org_status ON training_courses(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_training_courses_org_cat ON training_courses(organisation_id, category_id, status);
CREATE INDEX IF NOT EXISTS idx_training_courses_delivery ON training_courses(organisation_id, delivery_type);
CREATE INDEX IF NOT EXISTS idx_training_courses_refresher ON training_courses(refresher_course_id);

-- -----------------------------------------------------
-- 3. Course Prerequisites
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_course_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    prerequisite_course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_prereq_not_self CHECK (course_id != prerequisite_course_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_prereqs_unique ON training_course_prerequisites(course_id, prerequisite_course_id);
CREATE INDEX IF NOT EXISTS idx_course_prereqs_prereq ON training_course_prerequisites(prerequisite_course_id);

-- -----------------------------------------------------
-- 4. Training Sessions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_sessions (
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

CREATE INDEX IF NOT EXISTS idx_sessions_org_date ON training_sessions(organisation_id, session_date, status);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON training_sessions(course_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_site ON training_sessions(site_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_trainer ON training_sessions(trainer_id, session_date);

-- -----------------------------------------------------
-- 5. Session Enrollments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_session_enrollments (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_session_user ON training_session_enrollments(session_id, user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON training_session_enrollments(user_id, status);

-- -----------------------------------------------------
-- 6. Training Assignments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_assignments (
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

CREATE INDEX IF NOT EXISTS idx_assignments_org_status ON training_assignments(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON training_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON training_assignments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON training_assignments(due_date) 
    WHERE status IN ('assigned', 'in_progress');

-- -----------------------------------------------------
-- 7. Assignment Rules
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_assignment_rules (
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

CREATE INDEX IF NOT EXISTS idx_rules_org_type ON training_assignment_rules(organisation_id, rule_type, is_active);
CREATE INDEX IF NOT EXISTS idx_rules_course ON training_assignment_rules(course_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rules_role ON training_assignment_rules(role_name) WHERE rule_type = 'role';
CREATE INDEX IF NOT EXISTS idx_rules_site ON training_assignment_rules(site_id) WHERE rule_type = 'site';

-- Add FK to assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_assignments_rule' 
        AND table_name = 'training_assignments'
    ) THEN
        ALTER TABLE training_assignments 
            ADD CONSTRAINT fk_assignments_rule 
            FOREIGN KEY (assignment_rule_id) REFERENCES training_assignment_rules(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assignments_rule ON training_assignments(assignment_rule_id);

-- -----------------------------------------------------
-- 8. Training Completions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    assignment_id UUID,
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

CREATE INDEX IF NOT EXISTS idx_completions_org_user ON training_completions(organisation_id, user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_date ON training_completions(user_id, completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_completions_course_date ON training_completions(course_id, completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_completions_expires ON training_completions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_completions_session ON training_completions(session_id);
CREATE INDEX IF NOT EXISTS idx_completions_pending ON training_completions(verification_status) 
    WHERE verification_status = 'pending';

-- Add FK to assignments for completion_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_assignments_completion' 
        AND table_name = 'training_assignments'
    ) THEN
        ALTER TABLE training_assignments 
            ADD CONSTRAINT fk_assignments_completion 
            FOREIGN KEY (completion_id) REFERENCES training_completions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add FK from completions to assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_completions_assignment' 
        AND table_name = 'training_completions'
    ) THEN
        ALTER TABLE training_completions 
            ADD CONSTRAINT fk_completions_assignment 
            FOREIGN KEY (assignment_id) REFERENCES training_assignments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- -----------------------------------------------------
-- 9. Role Requirements
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_role_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_reqs_unique ON training_role_requirements(organisation_id, role_name, course_id);
CREATE INDEX IF NOT EXISTS idx_role_reqs_org_role ON training_role_requirements(organisation_id, role_name);

-- -----------------------------------------------------
-- 10. Site Requirements
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS training_site_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_reqs_unique ON training_site_requirements(site_id, course_id);
CREATE INDEX IF NOT EXISTS idx_site_reqs_org_site ON training_site_requirements(organisation_id, site_id);

-- -----------------------------------------------------
-- 11. Modify Attachments Table
-- -----------------------------------------------------
ALTER TABLE attachments
    ADD COLUMN IF NOT EXISTS training_course_id UUID REFERENCES training_courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS training_completion_id UUID REFERENCES training_completions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_training_course ON attachments(training_course_id) 
    WHERE training_course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attachments_training_completion ON attachments(training_completion_id) 
    WHERE training_completion_id IS NOT NULL;

-- -----------------------------------------------------
-- 12. Modify Actions Table
-- -----------------------------------------------------
ALTER TABLE actions
    ADD COLUMN IF NOT EXISTS training_course_id UUID REFERENCES training_courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_actions_training_course ON actions(training_course_id) 
    WHERE training_course_id IS NOT NULL;

-- -----------------------------------------------------
-- 13. Modify Analytics Summary Table
-- -----------------------------------------------------
ALTER TABLE analytics_daily_summary
    ADD COLUMN IF NOT EXISTS training_assignments_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS training_completions_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS training_overdue_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS training_expiring_30d_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS training_compliance_rate DECIMAL(5,2) DEFAULT 0;

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

DROP TRIGGER IF EXISTS trg_training_categories_updated ON training_categories;
CREATE TRIGGER trg_training_categories_updated 
    BEFORE UPDATE ON training_categories FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_courses_updated ON training_courses;
CREATE TRIGGER trg_training_courses_updated 
    BEFORE UPDATE ON training_courses FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_sessions_updated ON training_sessions;
CREATE TRIGGER trg_training_sessions_updated 
    BEFORE UPDATE ON training_sessions FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_enrollments_updated ON training_session_enrollments;
CREATE TRIGGER trg_training_enrollments_updated 
    BEFORE UPDATE ON training_session_enrollments FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_assignments_updated ON training_assignments;
CREATE TRIGGER trg_training_assignments_updated 
    BEFORE UPDATE ON training_assignments FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_rules_updated ON training_assignment_rules;
CREATE TRIGGER trg_training_rules_updated 
    BEFORE UPDATE ON training_assignment_rules FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_completions_updated ON training_completions;
CREATE TRIGGER trg_training_completions_updated 
    BEFORE UPDATE ON training_completions FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_role_reqs_updated ON training_role_requirements;
CREATE TRIGGER trg_training_role_reqs_updated 
    BEFORE UPDATE ON training_role_requirements FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

DROP TRIGGER IF EXISTS trg_training_site_reqs_updated ON training_site_requirements;
CREATE TRIGGER trg_training_site_reqs_updated 
    BEFORE UPDATE ON training_site_requirements FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

COMMIT;

-- migrations/003_phase3_multitenant.sql
-- Phase 3: Multi-Organisation / Multi-Tenant Schema Changes

-- =============================================================================
-- Step 0: Add new audit event types for user management
-- =============================================================================

-- Add new event types for Phase 3 user management
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'user_created' AND enumtypid = 'audit_event_type'::regtype) THEN
    ALTER TYPE audit_event_type ADD VALUE 'user_created';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'user_updated' AND enumtypid = 'audit_event_type'::regtype) THEN
    ALTER TYPE audit_event_type ADD VALUE 'user_updated';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'user_disabled' AND enumtypid = 'audit_event_type'::regtype) THEN
    ALTER TYPE audit_event_type ADD VALUE 'user_disabled';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'user_enabled' AND enumtypid = 'audit_event_type'::regtype) THEN
    ALTER TYPE audit_event_type ADD VALUE 'user_enabled';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'password_reset' AND enumtypid = 'audit_event_type'::regtype) THEN
    ALTER TYPE audit_event_type ADD VALUE 'password_reset';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'org_updated' AND enumtypid = 'audit_event_type'::regtype) THEN
    ALTER TYPE audit_event_type ADD VALUE 'org_updated';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'logo_uploaded' AND enumtypid = 'audit_event_type'::regtype) THEN
    ALTER TYPE audit_event_type ADD VALUE 'logo_uploaded';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'logo_deleted' AND enumtypid = 'audit_event_type'::regtype) THEN
    ALTER TYPE audit_event_type ADD VALUE 'logo_deleted';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'settings_updated' AND enumtypid = 'audit_event_type'::regtype) THEN
    ALTER TYPE audit_event_type ADD VALUE 'settings_updated';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Also add 'organisation' to auditable_entity_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'organisation' AND enumtypid = 'auditable_entity_type'::regtype) THEN
    ALTER TYPE auditable_entity_type ADD VALUE 'organisation';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Step 1: Create organisations table
-- =============================================================================

CREATE TABLE IF NOT EXISTS organisations (
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

CREATE INDEX IF NOT EXISTS idx_organisations_is_active ON organisations(is_active);

-- =============================================================================
-- Step 2: Add is_active to users (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;

-- =============================================================================
-- Step 3: Add organisation_id to users (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'organisation_id') THEN
    ALTER TABLE users ADD COLUMN organisation_id UUID;
  END IF;
END $$;

-- =============================================================================
-- Step 4: Add organisation_id to sites (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'sites' AND column_name = 'organisation_id') THEN
    ALTER TABLE sites ADD COLUMN organisation_id UUID;
  END IF;
END $$;

-- =============================================================================
-- Step 5: Add organisation_id to incident_types (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'incident_types' AND column_name = 'organisation_id') THEN
    ALTER TABLE incident_types ADD COLUMN organisation_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'incident_types' AND column_name = 'is_system') THEN
    ALTER TABLE incident_types ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- =============================================================================
-- Step 6: Add organisation_id to inspection_templates (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'inspection_templates' AND column_name = 'organisation_id') THEN
    ALTER TABLE inspection_templates ADD COLUMN organisation_id UUID;
  END IF;
END $$;

-- =============================================================================
-- Step 7: Add organisation_id to incidents (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'incidents' AND column_name = 'organisation_id') THEN
    ALTER TABLE incidents ADD COLUMN organisation_id UUID;
  END IF;
END $$;

-- =============================================================================
-- Step 8: Add organisation_id to inspections (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'inspections' AND column_name = 'organisation_id') THEN
    ALTER TABLE inspections ADD COLUMN organisation_id UUID;
  END IF;
END $$;

-- =============================================================================
-- Step 9: Add organisation_id to actions (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'actions' AND column_name = 'organisation_id') THEN
    ALTER TABLE actions ADD COLUMN organisation_id UUID;
  END IF;
END $$;

-- =============================================================================
-- Step 10: Add organisation_id to attachments (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'attachments' AND column_name = 'organisation_id') THEN
    ALTER TABLE attachments ADD COLUMN organisation_id UUID;
  END IF;
END $$;

-- =============================================================================
-- Step 11: Add organisation_id to audit_log (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'audit_log' AND column_name = 'organisation_id') THEN
    ALTER TABLE audit_log ADD COLUMN organisation_id UUID;
  END IF;
END $$;

-- =============================================================================
-- Step 12: Create default organisation for existing data (if any)
-- =============================================================================

-- Temporarily disable audit_log triggers for migration
ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_update;
ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_delete;

DO $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Only create if there's existing data and no orgs yet
  IF EXISTS (SELECT 1 FROM users LIMIT 1) AND NOT EXISTS (SELECT 1 FROM organisations LIMIT 1) THEN
    INSERT INTO organisations (name, slug, timezone, settings)
    VALUES ('Default Organisation', 'default-org', 'UTC',
            '{"dashboard": {"openIncidentsWarning": 5, "openIncidentsCritical": 10, "overdueActionsWarning": 3, "overdueActionsCritical": 5, "failedInspectionsWarning": 2, "failedInspectionsCritical": 5}}')
    RETURNING id INTO default_org_id;

    -- Update all existing users
    UPDATE users SET organisation_id = default_org_id WHERE organisation_id IS NULL;

    -- Update all existing sites
    UPDATE sites SET organisation_id = default_org_id WHERE organisation_id IS NULL;

    -- Mark existing incident_types as system types
    UPDATE incident_types SET is_system = TRUE WHERE organisation_id IS NULL;

    -- Update non-system incident_types (if any user-created ones exist)
    -- For now, all existing are system types

    -- Update all existing inspection_templates
    UPDATE inspection_templates SET organisation_id = default_org_id WHERE organisation_id IS NULL;

    -- Update all existing incidents
    UPDATE incidents SET organisation_id = default_org_id WHERE organisation_id IS NULL;

    -- Update all existing inspections
    UPDATE inspections SET organisation_id = default_org_id WHERE organisation_id IS NULL;

    -- Update all existing actions
    UPDATE actions SET organisation_id = default_org_id WHERE organisation_id IS NULL;

    -- Update attachments.organisation_id from parent entities
    UPDATE attachments a
    SET organisation_id = (
      CASE a.entity_type
        WHEN 'incident' THEN (SELECT organisation_id FROM incidents WHERE id = a.entity_id)
        WHEN 'inspection' THEN (SELECT organisation_id FROM inspections WHERE id = a.entity_id)
        WHEN 'action' THEN (SELECT organisation_id FROM actions WHERE id = a.entity_id)
        ELSE default_org_id
      END
    )
    WHERE organisation_id IS NULL;

    -- Update audit_log.organisation_id from related entities
    UPDATE audit_log al
    SET organisation_id = (
      CASE al.entity_type
        WHEN 'incident' THEN (SELECT organisation_id FROM incidents WHERE id = al.entity_id)
        WHEN 'inspection' THEN (SELECT organisation_id FROM inspections WHERE id = al.entity_id)
        WHEN 'action' THEN (SELECT organisation_id FROM actions WHERE id = al.entity_id)
        WHEN 'user' THEN (SELECT organisation_id FROM users WHERE id = al.entity_id)
        ELSE default_org_id
      END
    )
    WHERE organisation_id IS NULL;

    RAISE NOTICE 'Migrated existing data to default organisation: %', default_org_id;
  END IF;
END $$;

-- Re-enable audit_log triggers after migration
ALTER TABLE audit_log ENABLE TRIGGER audit_log_no_update;
ALTER TABLE audit_log ENABLE TRIGGER audit_log_no_delete;

-- =============================================================================
-- Step 13: Add foreign key constraints
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_users_organisation') THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_organisation
      FOREIGN KEY (organisation_id) REFERENCES organisations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_sites_organisation') THEN
    ALTER TABLE sites
      ADD CONSTRAINT fk_sites_organisation
      FOREIGN KEY (organisation_id) REFERENCES organisations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_incident_types_organisation') THEN
    ALTER TABLE incident_types
      ADD CONSTRAINT fk_incident_types_organisation
      FOREIGN KEY (organisation_id) REFERENCES organisations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_inspection_templates_organisation') THEN
    ALTER TABLE inspection_templates
      ADD CONSTRAINT fk_inspection_templates_organisation
      FOREIGN KEY (organisation_id) REFERENCES organisations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_incidents_organisation') THEN
    ALTER TABLE incidents
      ADD CONSTRAINT fk_incidents_organisation
      FOREIGN KEY (organisation_id) REFERENCES organisations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_inspections_organisation') THEN
    ALTER TABLE inspections
      ADD CONSTRAINT fk_inspections_organisation
      FOREIGN KEY (organisation_id) REFERENCES organisations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_actions_organisation') THEN
    ALTER TABLE actions
      ADD CONSTRAINT fk_actions_organisation
      FOREIGN KEY (organisation_id) REFERENCES organisations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_attachments_organisation') THEN
    ALTER TABLE attachments
      ADD CONSTRAINT fk_attachments_organisation
      FOREIGN KEY (organisation_id) REFERENCES organisations(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_audit_log_organisation') THEN
    ALTER TABLE audit_log
      ADD CONSTRAINT fk_audit_log_organisation
      FOREIGN KEY (organisation_id) REFERENCES organisations(id);
  END IF;
END $$;

-- =============================================================================
-- Step 14: Create performance indexes for multi-tenant queries
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_organisation_id ON users(organisation_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_org_email ON users(organisation_id, email);
CREATE INDEX IF NOT EXISTS idx_users_org_active ON users(organisation_id, is_active);

-- Sites indexes
CREATE INDEX IF NOT EXISTS idx_sites_organisation_id ON sites(organisation_id);

-- Incident Types indexes
CREATE INDEX IF NOT EXISTS idx_incident_types_organisation_id ON incident_types(organisation_id);

-- Inspection Templates indexes
CREATE INDEX IF NOT EXISTS idx_inspection_templates_organisation_id ON inspection_templates(organisation_id);

-- Incidents indexes
CREATE INDEX IF NOT EXISTS idx_incidents_organisation_id ON incidents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_org_occurred_at ON incidents(organisation_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_incidents_org_site ON incidents(organisation_id, site_id);
CREATE INDEX IF NOT EXISTS idx_incidents_org_severity ON incidents(organisation_id, severity);

-- Inspections indexes
CREATE INDEX IF NOT EXISTS idx_inspections_organisation_id ON inspections(organisation_id);
CREATE INDEX IF NOT EXISTS idx_inspections_org_performed_at ON inspections(organisation_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_inspections_org_result ON inspections(organisation_id, overall_result);
CREATE INDEX IF NOT EXISTS idx_inspections_org_site ON inspections(organisation_id, site_id);

-- Actions indexes
CREATE INDEX IF NOT EXISTS idx_actions_organisation_id ON actions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_actions_org_status ON actions(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_actions_org_due_date ON actions(organisation_id, due_date);

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_organisation_id ON attachments(organisation_id);

-- Audit Log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_organisation_id ON audit_log(organisation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_occurred_at ON audit_log(organisation_id, occurred_at);

-- =============================================================================
-- Step 15: Create/update updated_at trigger for organisations
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organisations_updated_at ON organisations;
CREATE TRIGGER organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- End of Migration
-- =============================================================================

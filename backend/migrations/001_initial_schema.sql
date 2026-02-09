CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('worker', 'manager', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('open', 'under_investigation', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_result AS ENUM ('pass', 'fail');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE response_result AS ENUM ('ok', 'not_ok', 'na');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(is_active);

CREATE TABLE IF NOT EXISTS incident_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  type_id UUID NOT NULL REFERENCES incident_types(id) ON DELETE RESTRICT,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  severity incident_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'open',
  occurred_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type_id);
CREATE INDEX IF NOT EXISTS idx_incidents_site ON incidents(site_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_occurred_at ON incidents(occurred_at);

CREATE TABLE IF NOT EXISTS inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES inspection_templates(id) ON DELETE CASCADE,
  label VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_items_template ON inspection_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_sort ON inspection_template_items(template_id, sort_order);

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES inspection_templates(id) ON DELETE RESTRICT,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  performed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  performed_at TIMESTAMPTZ NOT NULL,
  overall_result inspection_result NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_template ON inspections(template_id);
CREATE INDEX IF NOT EXISTS idx_inspections_site ON inspections(site_id);
CREATE INDEX IF NOT EXISTS idx_inspections_performed_by ON inspections(performed_by);
CREATE INDEX IF NOT EXISTS idx_inspections_performed_at ON inspections(performed_at);
CREATE INDEX IF NOT EXISTS idx_inspections_result ON inspections(overall_result);

CREATE TABLE IF NOT EXISTS inspection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inspection_template_items(id) ON DELETE RESTRICT,
  result response_result NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inspection_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_inspection_responses_inspection ON inspection_responses(inspection_id);

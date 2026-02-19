-- Migration: 022_super_admin_role.sql
-- Adds super_admin role to user_role enum.

BEGIN;

DO $$
BEGIN
  ALTER TYPE user_role ADD VALUE 'super_admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

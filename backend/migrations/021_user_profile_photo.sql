-- Migration: 021_user_profile_photo.sql
-- Adds user profile photo URL support.

BEGIN;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

COMMIT;

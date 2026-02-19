-- Migration: 018_access_request_info_response_security.sql
-- Adds secure token/passphrase fields for public additional-info response flow

BEGIN;

ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS info_response_token_hash VARCHAR(128),
ADD COLUMN IF NOT EXISTS info_response_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS info_response_token_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS info_response_passphrase_hash VARCHAR(128),
ADD COLUMN IF NOT EXISTS info_response_passphrase_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS info_response_attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_access_requests_info_response_token
  ON access_requests(info_response_token_hash)
  WHERE info_response_token_hash IS NOT NULL;

COMMIT;

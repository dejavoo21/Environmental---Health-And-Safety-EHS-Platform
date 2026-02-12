-- Migration: 017_access_request_info_requested.sql
-- Adds 'info_requested' status and tracking fields for additional information requests

BEGIN;

-- 1. Drop the existing status constraint and add new one with 'info_requested'
ALTER TABLE access_requests 
DROP CONSTRAINT IF EXISTS access_requests_status_check;

ALTER TABLE access_requests 
ADD CONSTRAINT access_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'info_requested'));

-- 2. Add columns for tracking info requests
ALTER TABLE access_requests 
ADD COLUMN IF NOT EXISTS info_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS info_requested_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS info_request_message TEXT,
ADD COLUMN IF NOT EXISTS info_response TEXT,
ADD COLUMN IF NOT EXISTS info_responded_at TIMESTAMPTZ;

-- 3. Create index for info_requested status
CREATE INDEX IF NOT EXISTS idx_access_requests_info_requested ON access_requests(status, info_requested_at) 
WHERE status = 'info_requested';

COMMIT;

-- Set applicable roles for all safety moments
UPDATE safety_moments SET 
  applicable_roles = ARRAY['worker', 'manager', 'admin']::varchar[]
WHERE applicable_roles IS NULL 
  AND organisation_id IN (SELECT id FROM organisations WHERE slug = 'default-org');



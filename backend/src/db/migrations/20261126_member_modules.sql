BEGIN;
-- Legacy invitees keep exactly the two modules enabled by the existing API.
-- Only explicit member settings can narrow those rights.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS member_projects_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS member_calculator_enabled boolean NOT NULL DEFAULT true;
COMMIT;

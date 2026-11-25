BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE account_invites
  ADD COLUMN IF NOT EXISTS signup_challenge uuid,
  ADD COLUMN IF NOT EXISTS signup_code_hash text,
  ADD COLUMN IF NOT EXISTS signup_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS signup_code_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS signup_sends integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signup_failures integer NOT NULL DEFAULT 0;
COMMIT;

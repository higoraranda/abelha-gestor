BEGIN;
ALTER TABLE users
  ADD COLUMN password_reset_hash text,
  ADD COLUMN password_reset_requested_at timestamptz,
  ADD COLUMN password_reset_expires_at timestamptz,
  ADD COLUMN password_reset_version uuid;
CREATE UNIQUE INDEX users_password_reset_hash_key ON users(password_reset_hash)
  WHERE password_reset_hash IS NOT NULL;
COMMIT;

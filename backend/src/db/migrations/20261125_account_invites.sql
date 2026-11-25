BEGIN;
LOCK TABLE users, organizations IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF (SELECT count(*) FROM users) <> 1 OR (SELECT count(*) FROM organizations) <> 1 THEN
    RAISE EXCEPTION 'Expected one verified legacy owner and one organization. Review before migration.';
  END IF;
END $$;
ALTER TABLE users ADD COLUMN account_role text NOT NULL DEFAULT 'member'
  CHECK (account_role IN ('owner', 'member'));
UPDATE users SET account_role = 'owner';
CREATE UNIQUE INDEX users_email_canonical_key ON users (lower(btrim(email)));
CREATE TABLE account_invites (
  email text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  issued_by uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz
);
COMMIT;

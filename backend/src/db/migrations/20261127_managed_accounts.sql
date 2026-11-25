BEGIN;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_access_version uuid,
  ADD COLUMN IF NOT EXISTS member_last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS member_finance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_subscriptions_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_prices_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_hidden_modules jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(member_hidden_modules) = 'array');
ALTER TABLE account_invites
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS redeemed_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
UPDATE account_invites i SET redeemed_user_id=m.id
FROM users m
WHERE i.redeemed_at IS NOT NULL AND i.redeemed_user_id IS NULL AND m.account_role='member'
  AND lower(btrim(m.email))=i.email AND m.created_at=i.redeemed_at;
CREATE UNIQUE INDEX IF NOT EXISTS account_invites_redeemed_user
  ON account_invites(redeemed_user_id) WHERE redeemed_user_id IS NOT NULL;
COMMIT;

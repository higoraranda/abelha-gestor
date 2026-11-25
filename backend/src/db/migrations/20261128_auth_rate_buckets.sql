BEGIN;
CREATE TABLE auth_rate_buckets (
  bucket_key text PRIMARY KEY,
  window_id bigint NOT NULL,
  attempt_count integer NOT NULL CHECK (attempt_count>0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX auth_rate_buckets_expiry ON auth_rate_buckets(expires_at);
COMMIT;

BEGIN;
CREATE TABLE IF NOT EXISTS quote_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  model jsonb NOT NULL CHECK (jsonb_typeof(model) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS quote_models_scope ON quote_models(organization_id,user_id,updated_at DESC,id);
COMMIT;

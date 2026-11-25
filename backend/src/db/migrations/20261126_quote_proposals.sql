BEGIN;
CREATE TABLE IF NOT EXISTS quote_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_id uuid,
  client_name text NOT NULL CHECK (char_length(client_name) BETWEEN 1 AND 150),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  briefing text NOT NULL CHECK (char_length(briefing) BETWEEN 1 AND 5000),
  model jsonb NOT NULL CHECK (jsonb_typeof(model) = 'object'),
  quantities jsonb NOT NULL CHECK (jsonb_typeof(quantities) = 'object'),
  quote jsonb NOT NULL CHECK (jsonb_typeof(quote) = 'object'),
  proposal_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  FOREIGN KEY (organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id,client_id) REFERENCES clients(organization_id,id) ON DELETE SET NULL (client_id)
);
CREATE INDEX IF NOT EXISTS quote_proposals_scope ON quote_proposals(organization_id,user_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS quote_proposals_client ON quote_proposals(organization_id,client_id);
COMMIT;

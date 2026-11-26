BEGIN;
ALTER TABLE quote_proposals ADD COLUMN status text NOT NULL DEFAULT 'draft'
 CHECK (status IN ('draft','sent','awaiting_approval','approved','refused','cancelled')),
 ADD COLUMN status_history jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(status_history)='array');
UPDATE quote_proposals SET status=CASE WHEN approved_at IS NOT NULL THEN 'approved' WHEN refused_at IS NOT NULL THEN 'refused' ELSE 'draft' END;
ALTER TABLE quote_proposals ADD CONSTRAINT quote_proposal_status_decision CHECK (
 (status='approved' AND approved_at IS NOT NULL AND refused_at IS NULL) OR
 (status='refused' AND refused_at IS NOT NULL AND approved_at IS NULL) OR
 (status IN ('draft','sent','awaiting_approval','cancelled') AND approved_at IS NULL AND refused_at IS NULL)),
 ADD CONSTRAINT quote_proposal_scope_unique UNIQUE(organization_id,user_id,id);
CREATE TABLE quote_proposal_prompts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL, user_id uuid NOT NULL, proposal_id uuid NOT NULL,
 content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 30000),
 source text NOT NULL CHECK (source IN ('generated','edited')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,user_id,proposal_id) REFERENCES quote_proposals(organization_id,user_id,id) ON DELETE CASCADE
);
CREATE INDEX quote_proposal_prompt_scope ON quote_proposal_prompts(organization_id,user_id,proposal_id,created_at DESC,id);
COMMIT;

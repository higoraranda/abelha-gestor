BEGIN;
ALTER TABLE quote_proposals
  ADD COLUMN refused_at timestamptz,
  ADD COLUMN terms text NOT NULL DEFAULT '',
  ADD CONSTRAINT quote_proposal_terms_length CHECK (char_length(terms)<=2000),
  ADD CONSTRAINT quote_proposal_single_decision CHECK (approved_at IS NULL OR refused_at IS NULL);
COMMIT;

BEGIN;

ALTER TABLE quote_proposals
  ADD COLUMN commercial jsonb CHECK (jsonb_typeof(commercial) = 'object'),
  ADD COLUMN presentation jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(presentation) = 'object'),
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  ADD COLUMN draft_key uuid,
  ADD COLUMN updated_at timestamptz,
  ADD CONSTRAINT commercial_quote_draft_key UNIQUE (organization_id, user_id, draft_key);

CREATE TABLE commercial_proposal_versions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  proposal_id uuid NOT NULL,
  number integer NOT NULL CHECK (number > 0),
  draft_revision integer NOT NULL CHECK (draft_revision > 0),
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'accepted', 'refused')),
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  viewed_at timestamptz,
  sent_at timestamptz,
  revoked_at timestamptz,
  decided_at timestamptz,
  CHECK (expires_at > published_at),
  CHECK ((status = 'published') = (decided_at IS NULL)),
  UNIQUE (organization_id, user_id, id),
  UNIQUE (organization_id, user_id, proposal_id, number),
  UNIQUE (organization_id, user_id, proposal_id, draft_revision),
  FOREIGN KEY (organization_id, user_id, proposal_id)
    REFERENCES quote_proposals (organization_id, user_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX commercial_active_proposal_version ON commercial_proposal_versions (proposal_id)
  WHERE status = 'published' AND revoked_at IS NULL;
CREATE UNIQUE INDEX commercial_accepted_proposal_version ON commercial_proposal_versions (proposal_id)
  WHERE status = 'accepted';

CREATE TABLE commercial_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  proposal_version_id uuid NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'formalized')),
  supplier_name text NOT NULL CHECK (length(supplier_name) BETWEEN 1 AND 255),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  clauses text NOT NULL DEFAULT '' CHECK (length(clauses) <= 16000),
  published_at timestamptz,
  acknowledged_at timestamptz,
  formalized_at timestamptz,
  evidence bytea CHECK (octet_length(evidence) BETWEEN 12 AND 2097152),
  evidence_filename text,
  evidence_digest text CHECK (length(evidence_digest) = 64),
  project_id uuid UNIQUE,
  CHECK ((status = 'draft') = (published_at IS NULL)),
  CHECK ((status = 'formalized') = (formalized_at IS NOT NULL)),
  CHECK ((formalized_at IS NULL AND evidence IS NULL AND evidence_filename IS NULL AND evidence_digest IS NULL)
      OR (formalized_at IS NOT NULL AND evidence IS NOT NULL AND evidence_filename IS NOT NULL AND evidence_digest IS NOT NULL)),
  CHECK (acknowledged_at IS NULL OR published_at IS NOT NULL),
  FOREIGN KEY (organization_id, user_id, proposal_version_id)
    REFERENCES commercial_proposal_versions (organization_id, user_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, user_id, project_id)
    REFERENCES personal_projects (organization_id, user_id, id) ON DELETE SET NULL (project_id)
);

CREATE TABLE commercial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  version_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('published', 'viewed', 'sent', 'revoked', 'accepted', 'refused',
    'contract_published', 'contract_acknowledged', 'formalized')),
  at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(details) = 'object'),
  UNIQUE (version_id, type),
  FOREIGN KEY (organization_id, user_id, version_id)
    REFERENCES commercial_proposal_versions (organization_id, user_id, id) ON DELETE CASCADE
);

ALTER TABLE delivery_tasks
  ALTER COLUMN contract_id DROP NOT NULL,
  ADD COLUMN project_id uuid,
  ADD COLUMN project_user_id uuid,
  ADD COLUMN parent_id uuid,
  ADD COLUMN dependency_id uuid,
  ADD COLUMN position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  ADD COLUMN priority text CHECK (priority IN ('high', 'normal', 'low')),
  ADD CONSTRAINT commercial_task_parent CHECK (
    (contract_id IS NOT NULL AND project_id IS NULL AND project_user_id IS NULL AND parent_id IS NULL AND dependency_id IS NULL)
    OR (contract_id IS NULL AND project_id IS NOT NULL AND project_user_id IS NOT NULL)
  ),
  ADD CONSTRAINT commercial_task_identity UNIQUE (organization_id, project_id, id),
  ADD CONSTRAINT commercial_task_project FOREIGN KEY (organization_id, project_user_id, project_id)
    REFERENCES personal_projects (organization_id, user_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT commercial_task_parent_fk FOREIGN KEY (organization_id, project_id, parent_id)
    REFERENCES delivery_tasks (organization_id, project_id, id) ON DELETE SET NULL (parent_id),
  ADD CONSTRAINT commercial_task_dependency_fk FOREIGN KEY (organization_id, project_id, dependency_id)
    REFERENCES delivery_tasks (organization_id, project_id, id) ON DELETE SET NULL (dependency_id);
CREATE INDEX commercial_project_tasks ON delivery_tasks (organization_id, project_user_id, project_id, position, id)
  WHERE project_id IS NOT NULL;

ALTER TABLE quote_proposal_prompts
  ADD COLUMN project_scope text CHECK (project_scope IN ('project', 'next_task')),
  ADD COLUMN task_id uuid;

COMMIT;

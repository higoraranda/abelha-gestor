-- Reformulação pessoal: migration aditiva. Não executar schema.sql/reset/seed.
-- Aplicar somente após revisão e autorização do ambiente. Executar em transação.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS is_next_action BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS clients_org_identity ON clients(organization_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS contracts_org_identity ON client_contracts(organization_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS one_next_action_per_client ON reminders(organization_id,linked_id)
  WHERE is_next_action AND linked_type='client';

CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  body TEXT NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(organization_id,client_id) REFERENCES clients(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS client_notes_lookup ON client_notes(organization_id,client_id,created_at DESC);

CREATE TABLE IF NOT EXISTS delivery_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL,
  title VARCHAR(240) NOT NULL CHECK(length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
  previous_status VARCHAR(20) CHECK(previous_status IN ('todo','in_progress')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(organization_id,contract_id) REFERENCES client_contracts(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS delivery_tasks_lookup ON delivery_tasks(organization_id,contract_id,status,due_date);

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  title VARCHAR(240) NOT NULL CHECK(length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL CHECK(amount > 0),
  expected_close DATE NOT NULL,
  stage VARCHAR(20) NOT NULL DEFAULT 'qualification' CHECK(stage IN ('qualification','proposal','negotiation','closing','won','lost')),
  contract_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  FOREIGN KEY(organization_id,client_id) REFERENCES clients(organization_id,id) ON DELETE CASCADE,
  FOREIGN KEY(organization_id,contract_id) REFERENCES client_contracts(organization_id,id) ON DELETE SET NULL (contract_id),
  CHECK(contract_id IS NULL OR stage='won')
);
CREATE INDEX IF NOT EXISTS opportunities_lookup ON opportunities(organization_id,stage,expected_close);

CREATE TABLE IF NOT EXISTS notification_states (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_key VARCHAR(240) NOT NULL,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY(organization_id,notification_key)
);

-- Despesas operacionais do CRM, isoladas por organização.
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('subscriptions', 'ads', 'tools', 'taxes', 'services', 'infrastructure', 'other')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('planned', 'paid')),
  paid_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'paid' AND paid_at IS NOT NULL) OR (status = 'planned' AND paid_at IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_expenses_organization_date
  ON expenses(organization_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_organization_status
  ON expenses(organization_id, status, expense_date DESC);

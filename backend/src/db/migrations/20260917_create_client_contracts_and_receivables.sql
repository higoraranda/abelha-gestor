-- Contratos e contas a receber do CRM Abelha.
-- Migração aditiva: preserva clientes, conversas, mensagens e catálogo existentes.

CREATE TABLE IF NOT EXISTS client_contracts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  catalog_item_id          UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  service_name             VARCHAR(255) NOT NULL,
  service_description      TEXT,
  service_snapshot         JSONB NOT NULL DEFAULT '{}'::jsonb,
  gross_amount             NUMERIC(12, 2) NOT NULL CHECK (gross_amount > 0),
  discount_percent         NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  final_amount             NUMERIC(12, 2) NOT NULL CHECK (final_amount > 0),
  payment_method           VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'two_installments', 'three_installments')),
  monthly_fee              NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  monthly_due_day          SMALLINT CHECK (monthly_due_day BETWEEN 1 AND 31),
  development_start_date   DATE NOT NULL,
  development_end_date     DATE NOT NULL,
  contract_end_date        DATE NOT NULL,
  status                   VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (development_start_date <= development_end_date),
  CHECK (development_end_date <= contract_end_date),
  CHECK (monthly_fee = 0 OR monthly_due_day IS NOT NULL),
  CHECK (payment_method <> 'three_installments' OR (monthly_fee > 0 AND monthly_due_day IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_client_contracts_organization ON client_contracts (organization_id, status, contract_end_date);
CREATE INDEX IF NOT EXISTS idx_client_contracts_client ON client_contracts (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_contracts_catalog ON client_contracts (catalog_item_id);

CREATE TABLE IF NOT EXISTS receivables (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_id         UUID NOT NULL REFERENCES client_contracts(id) ON DELETE CASCADE,
  kind                VARCHAR(30) NOT NULL CHECK (kind IN ('setup_installment', 'monthly_fee')),
  installment_number  INTEGER CHECK (installment_number IS NULL OR installment_number > 0),
  description         VARCHAR(500) NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date            DATE NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
  paid_at             DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'paid' AND paid_at IS NOT NULL) OR status <> 'paid')
);

CREATE INDEX IF NOT EXISTS idx_receivables_organization_due ON receivables (organization_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_receivables_client ON receivables (client_id, due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_contract ON receivables (contract_id, due_date);

-- SOMENTE database vazio abelha_homologacao, na branch de teste autorizada.
-- Nenhum reset/seed: reutiliza apenas DDL de criacao e migrations aditivas existentes.
-- Executar por conexao direta, em transacao com lock_timeout=5s e statement_timeout=60s.
-- Endpoint/branch e plano Free tambem devem ser conferidos no manifesto antes da execucao.
DO $abelha_bootstrap$
DECLARE total_tables integer; platform_tables integer;
BEGIN
  IF current_database() <> 'abelha_homologacao' THEN
    RAISE EXCEPTION 'Banco de homologacao recusado';
  END IF;
  IF current_schema() IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Schema de homologacao recusado';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND c.relkind IN('r','p','v','m','f','S')) THEN
    RAISE EXCEPTION 'O banco de homologacao deve estar vazio';
  END IF;

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- =============================================
-- USERS (1 por organização)
-- =============================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_users_organization ON users(organization_id);

-- =============================================
-- EVOLUTION API INSTANCES (1 por organização)
-- =============================================
CREATE TABLE evolution_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instance_name   VARCHAR(255) NOT NULL UNIQUE,
  api_url         VARCHAR(500) NOT NULL,
  api_key         VARCHAR(500) NOT NULL,
  phone_number    VARCHAR(50),
  status          VARCHAR(50)  DEFAULT 'disconnected',
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_evolution_organization ON evolution_instances(organization_id);

-- =============================================
-- COMPANIES (empresas contratantes / B2B)
-- =============================================
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  cnpj            VARCHAR(20),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  notes           TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_companies_organization ON companies(organization_id);

-- =============================================
-- COMPANY CONTACTS (pessoas dentro de cada empresa)
-- =============================================
CREATE TABLE company_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  role            VARCHAR(255),
  email           VARCHAR(255),
  whatsapp        VARCHAR(50),
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_company_contacts_company      ON company_contacts(company_id);
CREATE INDEX idx_company_contacts_organization ON company_contacts(organization_id);

-- =============================================
-- CLIENTS (clientes finais / B2C)
-- =============================================
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id      UUID         REFERENCES companies(id) ON DELETE SET NULL,
  name            VARCHAR(255),
  email           VARCHAR(255),
  whatsapp        VARCHAR(50),
  notes           TEXT,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_clients_organization ON clients(organization_id);
CREATE INDEX idx_clients_company      ON clients(company_id);
CREATE INDEX idx_clients_whatsapp     ON clients(organization_id, whatsapp);

-- =============================================
-- CONVERSATIONS
-- =============================================
CREATE TABLE conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        UUID         REFERENCES clients(id) ON DELETE SET NULL,
  whatsapp_chat_id VARCHAR(255) NOT NULL,
  last_message_at  TIMESTAMPTZ,
  unread_count     INT          DEFAULT 0,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(organization_id, whatsapp_chat_id)
);

CREATE INDEX idx_conversations_organization ON conversations(organization_id);
CREATE INDEX idx_conversations_client       ON conversations(client_id);
CREATE INDEX idx_conversations_last_message ON conversations(organization_id, last_message_at DESC);

-- =============================================
-- MESSAGES
-- =============================================
CREATE TABLE messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id     UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  whatsapp_message_id VARCHAR(255),
  content             TEXT         NOT NULL,
  direction           VARCHAR(10)  NOT NULL,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- Deduplicação por whatsapp_message_id quando presente
CREATE UNIQUE INDEX idx_messages_whatsapp_id
  ON messages(organization_id, whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_organization ON messages(organization_id);

-- =============================================
-- REMINDERS
-- =============================================
CREATE TABLE reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  due_at          TIMESTAMPTZ  NOT NULL,
  completed       BOOLEAN      DEFAULT FALSE,
  linked_type     VARCHAR(20),
  linked_id       UUID,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_reminders_organization ON reminders(organization_id);
CREATE INDEX idx_reminders_due_at       ON reminders(organization_id, due_at);

-- =============================================
-- CATALOG ITEMS (produtos, serviços e preços)
-- =============================================
CREATE TABLE catalog_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code                  VARCHAR(120),
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  item_type             VARCHAR(30) NOT NULL DEFAULT 'service'
                          CHECK (item_type IN ('service', 'package', 'plan', 'addon', 'option')),
  category              VARCHAR(60) NOT NULL DEFAULT 'outros',
  base_price            NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  setup_price           NUMERIC(12, 2) CHECK (setup_price IS NULL OR setup_price >= 0),
  monthly_price         NUMERIC(12, 2) CHECK (monthly_price IS NULL OR monthly_price >= 0),
  premium_monthly_price NUMERIC(12, 2) CHECK (premium_monthly_price IS NULL OR premium_monthly_price >= 0),
  weight                INTEGER CHECK (weight IS NULL OR weight >= 0),
  pages_included        INTEGER CHECK (pages_included IS NULL OR pages_included >= 0),
  extra_page_price      NUMERIC(12, 2) CHECK (extra_page_price IS NULL OR extra_page_price >= 0),
  multiplier            NUMERIC(8, 4) CHECK (multiplier IS NULL OR multiplier > 0),
  per_page              BOOLEAN NOT NULL DEFAULT FALSE,
  featured              BOOLEAN NOT NULL DEFAULT FALSE,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  included_item_codes   TEXT[] NOT NULL DEFAULT '{}',
  attributes            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE INDEX idx_catalog_items_organization
  ON catalog_items(organization_id, active, category, name);

-- =============================================
-- CLIENT CONTRACTS
-- =============================================
CREATE TABLE client_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  service_name VARCHAR(255) NOT NULL,
  service_description TEXT,
  service_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount > 0),
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  final_amount NUMERIC(12, 2) NOT NULL CHECK (final_amount > 0),
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'two_installments', 'three_installments')),
  monthly_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  monthly_due_day SMALLINT CHECK (monthly_due_day BETWEEN 1 AND 31),
  development_start_date DATE NOT NULL,
  development_end_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (development_start_date <= development_end_date),
  CHECK (development_end_date <= contract_end_date),
  CHECK (monthly_fee = 0 OR monthly_due_day IS NOT NULL),
  CHECK (payment_method <> 'three_installments' OR (monthly_fee > 0 AND monthly_due_day IS NOT NULL))
);

CREATE INDEX idx_client_contracts_organization ON client_contracts(organization_id, status, contract_end_date);
CREATE INDEX idx_client_contracts_client ON client_contracts(client_id, created_at DESC);
CREATE INDEX idx_client_contracts_catalog ON client_contracts(catalog_item_id);

-- =============================================
-- RECEIVABLES
-- =============================================
CREATE TABLE receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES client_contracts(id) ON DELETE CASCADE,
  kind VARCHAR(30) NOT NULL CHECK (kind IN ('setup_installment', 'monthly_fee')),
  installment_number INTEGER CHECK (installment_number IS NULL OR installment_number > 0),
  description VARCHAR(500) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
  paid_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'paid' AND paid_at IS NOT NULL) OR status <> 'paid')
);

CREATE INDEX idx_receivables_organization_due ON receivables(organization_id, due_date, status);
CREATE INDEX idx_receivables_client ON receivables(client_id, due_date);
CREATE INDEX idx_receivables_contract ON receivables(contract_id, due_date);

-- =============================================
-- EXPENSES
-- =============================================
CREATE TABLE expenses (
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

CREATE INDEX idx_expenses_organization_date ON expenses(organization_id, expense_date DESC);
CREATE INDEX idx_expenses_organization_status ON expenses(organization_id, status, expense_date DESC);

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

-- ADITIVA. Aplicar em transação somente no ambiente autorizado. Nunca executar schema.sql.
CREATE UNIQUE INDEX IF NOT EXISTS users_org_identity ON users(organization_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS clients_org_identity ON clients(organization_id,id);

CREATE TABLE IF NOT EXISTS personal_preferences (
 organization_id uuid NOT NULL, user_id uuid NOT NULL,
 morning_time time, weekly_time time, timezone text NOT NULL DEFAULT 'America/Sao_Paulo' CHECK(timezone='America/Sao_Paulo'),
 PRIMARY KEY(organization_id,user_id), FOREIGN KEY(organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL,
 endpoint text NOT NULL CHECK(length(endpoint)<4096), endpoint_hash text NOT NULL UNIQUE,
 p256dh text NOT NULL, auth text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,user_id,id),
 FOREIGN KEY(organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS push_owner ON push_subscriptions(organization_id,user_id);
CREATE TABLE IF NOT EXISTS personal_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL,
 event_key varchar(200) NOT NULL, title varchar(240) NOT NULL, detail text NOT NULL DEFAULT '', url text NOT NULL,
 read_at timestamptz, dismissed boolean NOT NULL DEFAULT false, push_sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,user_id,event_key), UNIQUE(organization_id,user_id,id),
 FOREIGN KEY(organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS personal_notifications_owner ON personal_notifications(organization_id,user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS personal_push_deliveries (
 organization_id uuid NOT NULL,user_id uuid NOT NULL,notification_id uuid NOT NULL,subscription_id uuid NOT NULL,
 delivered_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,user_id,notification_id,subscription_id),
 FOREIGN KEY(organization_id,user_id,notification_id) REFERENCES personal_notifications(organization_id,user_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,user_id,subscription_id) REFERENCES push_subscriptions(organization_id,user_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_projects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL,
 name varchar(240) NOT NULL CHECK(length(trim(name))>0), description text NOT NULL DEFAULT '', repository text,
 main_branch varchar(240) NOT NULL DEFAULT 'main', status text NOT NULL DEFAULT 'planned' CHECK(status IN('planned','active','paused','done')),
 next_step text NOT NULL DEFAULT '', blockers text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,user_id,id), FOREIGN KEY(organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_milestones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL, project_id uuid NOT NULL,
 title varchar(240) NOT NULL CHECK(length(trim(title))>0), acceptance text NOT NULL CHECK(length(trim(acceptance))>0),
 position integer NOT NULL DEFAULT 0, completed_at timestamptz, evidence jsonb,
 UNIQUE(organization_id,user_id,id), FOREIGN KEY(organization_id,user_id,project_id) REFERENCES personal_projects(organization_id,user_id,id) ON DELETE CASCADE,
 CHECK(completed_at IS NULL OR evidence IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS personal_project_updates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL, project_id uuid NOT NULL,
 event_key varchar(240) NOT NULL, kind text NOT NULL CHECK(kind IN('report','decision','milestone','github')),
 summary text NOT NULL, report jsonb, reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,user_id,event_key),
 FOREIGN KEY(organization_id,user_id,project_id) REFERENCES personal_projects(organization_id,user_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS personal_project_timeline ON personal_project_updates(organization_id,user_id,project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS personal_invoice_cycles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL,
 name varchar(160) NOT NULL, starts_on date NOT NULL, closes_on date NOT NULL, CHECK(closes_on>=starts_on),
 UNIQUE(organization_id,user_id,id), FOREIGN KEY(organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_invoice_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL, cycle_id uuid NOT NULL,
 recorded_on date NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount>=0), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,user_id,cycle_id,recorded_on),
 FOREIGN KEY(organization_id,user_id,cycle_id) REFERENCES personal_invoice_cycles(organization_id,user_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_monthly_plans (
 organization_id uuid NOT NULL, user_id uuid NOT NULL, month date NOT NULL CHECK(extract(day FROM month)=1),
 income numeric(12,2) NOT NULL DEFAULT 0 CHECK(income>=0), budget numeric(12,2) NOT NULL DEFAULT 0 CHECK(budget>=0),
 savings_goal numeric(12,2) NOT NULL DEFAULT 0 CHECK(savings_goal>=0), saved numeric(12,2) NOT NULL DEFAULT 0 CHECK(saved>=0),
 PRIMARY KEY(organization_id,user_id,month), FOREIGN KEY(organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL,
 name varchar(240) NOT NULL, category varchar(160) NOT NULL DEFAULT '', amount numeric(12,2) NOT NULL CHECK(amount>=0),
 frequency text NOT NULL CHECK(frequency IN('monthly','yearly')), due_on date NOT NULL, billing_day integer NOT NULL CHECK(billing_day BETWEEN 1 AND 31), payment_method varchar(160) NOT NULL DEFAULT '',
 scope text NOT NULL CHECK(scope IN('personal','professional')), active boolean NOT NULL DEFAULT true,
 reminder_days integer NOT NULL DEFAULT 3 CHECK(reminder_days BETWEEN 0 AND 30), notes text NOT NULL DEFAULT '',
 UNIQUE(organization_id,user_id,id), FOREIGN KEY(organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_subscription_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL, subscription_id uuid NOT NULL,
 due_on date NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount>=0), paid_on date NOT NULL,
 UNIQUE(organization_id,user_id,subscription_id,due_on),
 FOREIGN KEY(organization_id,user_id,subscription_id) REFERENCES personal_subscriptions(organization_id,user_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_subscription_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL, subscription_id uuid NOT NULL,
 previous_amount numeric(12,2) NOT NULL, new_amount numeric(12,2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,user_id,subscription_id) REFERENCES personal_subscriptions(organization_id,user_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_price_watches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL,
 name varchar(240) NOT NULL, product_url text, stores text NOT NULL DEFAULT '', target numeric(12,2) CHECK(target>=0),
 interval_minutes integer NOT NULL DEFAULT 60 CHECK(interval_minutes BETWEEN 15 AND 10080), active boolean NOT NULL DEFAULT true,
 provider text NOT NULL DEFAULT 'unconfigured', last_checked_at timestamptz,
 UNIQUE(organization_id,user_id,id), FOREIGN KEY(organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS personal_price_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL, watch_id uuid NOT NULL,
 event_key varchar(160) NOT NULL, store varchar(240) NOT NULL, product_url text NOT NULL, price numeric(12,2) NOT NULL CHECK(price>0),
 observed_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,user_id,watch_id,event_key),
 FOREIGN KEY(organization_id,user_id,watch_id) REFERENCES personal_price_watches(organization_id,user_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS personal_prices_history ON personal_price_observations(organization_id,user_id,watch_id,store,observed_at DESC);
CREATE TABLE IF NOT EXISTS personal_weekly_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id uuid NOT NULL, week_of date NOT NULL,
 data jsonb NOT NULL, finalized boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,user_id,week_of),
 FOREIGN KEY(organization_id,user_id) REFERENCES users(organization_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS crm_lead_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 source text NOT NULL, source_key varchar(200) NOT NULL, data jsonb NOT NULL, client_id uuid, reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,source,source_key),
 FOREIGN KEY(organization_id,client_id) REFERENCES clients(organization_id,id) ON DELETE SET NULL (client_id)
);
CREATE TABLE IF NOT EXISTS crm_service_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 client_id uuid NOT NULL, idempotency_key varchar(160) NOT NULL, template_key varchar(80) NOT NULL,
 title varchar(240) NOT NULL, proposal text NOT NULL, checklist jsonb NOT NULL, confirmed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,idempotency_key), FOREIGN KEY(organization_id,client_id) REFERENCES clients(organization_id,id) ON DELETE CASCADE
);

  SELECT count(*)::int,count(*) FILTER(WHERE tablename LIKE 'personal_%' OR tablename IN('push_subscriptions','crm_lead_candidates','crm_service_drafts'))::int
    INTO total_tables,platform_tables FROM pg_tables WHERE schemaname='public';
  IF total_tables <> 35 OR platform_tables <> 18 THEN
    RAISE EXCEPTION 'Schema de homologacao incompleto';
  END IF;
END $abelha_bootstrap$;

-- =============================================
-- RESET COMPLETO — rodar no Neon SQL Editor
-- =============================================

DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS pipeline_cards CASCADE;
DROP TABLE IF EXISTS pipeline_stages CASCADE;
DROP TABLE IF EXISTS company_contacts CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS evolution_instances CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- =============================================
-- ORGANIZATIONS
-- =============================================
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

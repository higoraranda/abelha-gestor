-- PREPARADO PARA REVISÃO. NÃO EXECUTADO. Exige autorização produtiva específica.
-- Alvo: neondb / br-square-sunset-acpb91u2 / ep-wandering-pond-acitqqn8.
-- Usar somente se TODAS as dez migrations estiverem ausentes; estrutura parcial exige novo plano.
-- account_invites já aplicada: NÃO incluída. Sem reset, seed ou rollback destrutivo.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $guard$ BEGIN
 IF current_database()<>'neondb' THEN RAISE EXCEPTION 'Destino incorreto'; END IF;
 IF NOT pg_try_advisory_xact_lock(hashtext('abelha-production-036')) THEN RAISE EXCEPTION 'Outra operação de schema em andamento'; END IF;
 IF (SELECT count(*) FROM pg_tables WHERE schemaname='public')<>36 OR to_regclass('public.account_invites') IS NULL THEN RAISE EXCEPTION 'Baseline produtivo divergiu; revisar catálogo'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(ARRAY['quote_models','quote_proposals','quote_proposal_prompts','auth_rate_buckets']) n WHERE to_regclass('public.'||n) IS NOT NULL) THEN RAISE EXCEPTION 'Migration já presente; não reaplicar'; END IF;
 IF EXISTS(WITH expected(table_name,column_name) AS (VALUES ('users','email_verified_at'),
('users','password_reset_hash'),
('users','password_reset_requested_at'),
('users','password_reset_expires_at'),
('users','password_reset_version'),
('users','member_projects_enabled'),
('users','member_calculator_enabled'),
('users','account_disabled_at'),
('users','account_status_changed_at'),
('users','account_access_version'),
('users','member_last_sign_in_at'),
('users','member_finance_enabled'),
('users','member_subscriptions_enabled'),
('users','member_prices_enabled'),
('users','member_hidden_modules'),
('account_invites','signup_challenge'),
('account_invites','signup_code_hash'),
('account_invites','signup_code_expires_at'),
('account_invites','signup_code_sent_at'),
('account_invites','signup_sends'),
('account_invites','signup_failures'),
('account_invites','revoked_at'),
('account_invites','redeemed_user_id'),
('personal_projects','pipeline_stage'),
('personal_projects','pipeline_links')) SELECT 1 FROM expected e JOIN information_schema.columns c ON c.table_schema='public' AND c.table_name=e.table_name AND c.column_name=e.column_name) THEN RAISE EXCEPTION 'Estrutura parcial ou migration presente; revisar lista'; END IF;
END $guard$;
LOCK TABLE public.users,public.organizations,public.account_invites,public.personal_projects IN SHARE MODE;
CREATE TEMP TABLE abelha036_before(table_name text PRIMARY KEY,signature text) ON COMMIT DROP;
DO $before$ DECLARE t record; digest text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
 EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(x)::text,''|'' ORDER BY to_jsonb(x)::text),'''')) FROM public.%I x',t.tablename) INTO digest;
 INSERT INTO abelha036_before VALUES(t.tablename,digest);
 END LOOP;
END $before$;

-- SOURCE 20261125_quote_models.sql; SHA256-LF 250e16a4f8653fbb0f727f6100b7891f6e4820675bd802f27f51c91fe0b644df
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

-- SOURCE 20261125_signup_email.sql; SHA256-LF 86bfab907ed2192752da0a22e956566afa6abafc3805d05d4c236a73806acc12
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE account_invites
  ADD COLUMN IF NOT EXISTS signup_challenge uuid,
  ADD COLUMN IF NOT EXISTS signup_code_hash text,
  ADD COLUMN IF NOT EXISTS signup_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS signup_code_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS signup_sends integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signup_failures integer NOT NULL DEFAULT 0;

-- SOURCE 20261125_password_reset.sql; SHA256-LF 17df7edd2728710b0b9d07f7e6c5aeaf83d8a881b0a45204bed4de141ab7ea62
ALTER TABLE users
  ADD COLUMN password_reset_hash text,
  ADD COLUMN password_reset_requested_at timestamptz,
  ADD COLUMN password_reset_expires_at timestamptz,
  ADD COLUMN password_reset_version uuid;
CREATE UNIQUE INDEX users_password_reset_hash_key ON users(password_reset_hash)
  WHERE password_reset_hash IS NOT NULL;

-- SOURCE 20261126_member_modules.sql; SHA256-LF 6d182d0560adca2028d9cec9c49effdc98920111f05eec150f9d79d336eee3d6
-- Legacy invitees keep exactly the two modules enabled by the existing API.
-- Only explicit member settings can narrow those rights.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS member_projects_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS member_calculator_enabled boolean NOT NULL DEFAULT true;

-- SOURCE 20261126_quote_proposals.sql; SHA256-LF d10adfc9e6585b0bfa2f55f6b0c137f957e8874fd317c0ec69d9c4798f20969a
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

-- SOURCE 20261127_managed_accounts.sql; SHA256-LF 5e099fb5b89513229f9402970ad378057e53ad4fa28de05ac07298c2dee3ac39
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_access_version uuid,
  ADD COLUMN IF NOT EXISTS member_last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS member_finance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_subscriptions_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_prices_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS member_hidden_modules jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(member_hidden_modules) = 'array');
ALTER TABLE account_invites
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS redeemed_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
UPDATE account_invites i SET redeemed_user_id=m.id
FROM users m
WHERE i.redeemed_at IS NOT NULL AND i.redeemed_user_id IS NULL AND m.account_role='member'
  AND lower(btrim(m.email))=i.email AND m.created_at=i.redeemed_at;
CREATE UNIQUE INDEX IF NOT EXISTS account_invites_redeemed_user
  ON account_invites(redeemed_user_id) WHERE redeemed_user_id IS NOT NULL;

-- SOURCE 20261127_project_pipeline.sql; SHA256-LF 7eb9f92d7960a2e7c8e9f2fe755a73a8e8fb20f84c37befb347219159d762f5a
ALTER TABLE personal_projects
  ADD COLUMN pipeline_stage text CHECK (pipeline_stage IN ('backlog','planning','development','testing','staging','awaiting_approval','production','completed')),
  ADD COLUMN pipeline_links jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(pipeline_links)='object');

-- SOURCE 20261127_quote_proposal_decisions.sql; SHA256-LF b3a277f995e6a0cf602665e16b5063197d954484bb81f3d395ecf6df26013de1
ALTER TABLE quote_proposals
  ADD COLUMN refused_at timestamptz,
  ADD COLUMN terms text NOT NULL DEFAULT '',
  ADD CONSTRAINT quote_proposal_terms_length CHECK (char_length(terms)<=2000),
  ADD CONSTRAINT quote_proposal_single_decision CHECK (approved_at IS NULL OR refused_at IS NULL);

-- SOURCE 20261128_auth_rate_buckets.sql; SHA256-LF 134000c34aa1e6793b0d56519bdab2b3bdc3d94433eae83b3d75970faaaeb922
CREATE TABLE auth_rate_buckets (
  bucket_key text PRIMARY KEY,
  window_id bigint NOT NULL,
  attempt_count integer NOT NULL CHECK (attempt_count>0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX auth_rate_buckets_expiry ON auth_rate_buckets(expires_at);

-- SOURCE 20261129_quote_proposal_workflow.sql; SHA256-LF 1197d060af04eaafda15473270d78b9f0763e1911a74a45666724d81a150a7e5
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

DO $after$ DECLARE t record; digest text; exclusions text[]; BEGIN
 FOR t IN SELECT * FROM abelha036_before ORDER BY table_name LOOP
 exclusions:=CASE t.table_name WHEN 'users' THEN ARRAY['email_verified_at','password_reset_hash','password_reset_requested_at','password_reset_expires_at','password_reset_version','member_projects_enabled','member_calculator_enabled','account_disabled_at','account_status_changed_at','account_access_version','member_last_sign_in_at','member_finance_enabled','member_subscriptions_enabled','member_prices_enabled','member_hidden_modules'] WHEN 'account_invites' THEN ARRAY['signup_challenge','signup_code_hash','signup_code_expires_at','signup_code_sent_at','signup_sends','signup_failures','revoked_at','redeemed_user_id'] WHEN 'personal_projects' THEN ARRAY['pipeline_stage','pipeline_links'] ELSE ARRAY[]::text[] END;
 EXECUTE format('SELECT md5(coalesce(string_agg((to_jsonb(x)-$1)::text,''|'' ORDER BY (to_jsonb(x)-$1)::text),'''')) FROM public.%I x',t.table_name) INTO digest USING exclusions;
 IF digest IS DISTINCT FROM t.signature THEN RAISE EXCEPTION 'Dados legados divergiram em %; transação será revertida',t.table_name; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated) OR EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid WHERE c.relnamespace='public'::regnamespace AND NOT i.indisvalid) THEN RAISE EXCEPTION 'Constraint ou índice inválido'; END IF;
 IF (SELECT count(*) FROM pg_tables WHERE schemaname='public')<>40 THEN RAISE EXCEPTION 'Quantidade final de tabelas inesperada'; END IF;
END $after$;
SELECT current_database() AS database,(SELECT count(*) FROM abelha036_before) AS preserved_tables,(SELECT count(*) FROM pg_tables WHERE schemaname='public') AS final_tables;
COMMIT;

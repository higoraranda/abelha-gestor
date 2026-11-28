-- SOMENTE LEITURA. Confirmar endpoint/branch de produção externamente.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog, public, pg_temp;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT current_database() AS database,current_user AS role,now() AS recovery_reference_utc,pg_current_wal_lsn()::text AS wal,
       current_setting('server_version_num')::integer AS postgres_version,
       has_schema_privilege(current_user,'public','CREATE') AS can_create_in_public;
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
WITH expected(table_name,column_name) AS (VALUES ('users','email_verified_at'),
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
('personal_projects','pipeline_links')) SELECT e.*,EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=e.table_name AND c.column_name=e.column_name) AS already_present FROM expected e ORDER BY table_name,column_name;
SELECT name,to_regclass('public.'||name) AS existing_relation FROM unnest(ARRAY['quote_models','quote_proposals','quote_proposal_prompts','auth_rate_buckets']) AS name;
SELECT name,to_regclass('public.'||name) AS existing_index
  FROM unnest(ARRAY['quote_models_scope','users_password_reset_hash_key','quote_proposals_scope',
                     'quote_proposals_client','account_invites_redeemed_user','auth_rate_buckets_expiry',
                     'quote_proposal_prompt_scope']) AS name;
WITH expected(table_name,index_name) AS (VALUES
  ('users','users_org_identity'),('clients','clients_org_identity'),('users','users_email_canonical_key')
)
SELECT e.*, i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AS valid_unique,
       pg_get_indexdef(i.indexrelid) AS definition
  FROM expected e LEFT JOIN pg_index i ON i.indrelid=to_regclass('public.'||e.table_name)
  AND i.indexrelid=to_regclass('public.'||e.index_name);
SELECT c.relname AS table_name,pg_get_userbyid(c.relowner) AS owner,
       pg_has_role(current_user,c.relowner,'USAGE') AS has_owner_privileges
  FROM pg_class c
  WHERE c.oid IN ('public.account_invites'::regclass,'public.organizations'::regclass,
                  'public.users'::regclass,'public.clients'::regclass,'public.personal_projects'::regclass)
  ORDER BY c.relname;
SELECT count(*) FILTER (WHERE i.redeemed_at IS NOT NULL) AS redeemed,
       count(*) FILTER (WHERE m.id IS NOT NULL AND m.created_at=i.redeemed_at) AS deterministic_matches,
       count(*) FILTER (WHERE m.id IS NOT NULL AND m.created_at IS DISTINCT FROM i.redeemed_at) AS legacy_matches_without_backfill,
       count(*) FILTER (WHERE i.redeemed_at IS NOT NULL AND m.id IS NULL) AS redeemed_without_current_member
  FROM public.account_invites i LEFT JOIN public.users m
  ON i.redeemed_at IS NOT NULL AND m.account_role='member' AND lower(btrim(m.email))=i.email;
SELECT count(*) FILTER (WHERE xact_start IS NOT NULL) AS other_open_transactions,
       count(*) FILTER (WHERE wait_event_type='Lock') AS other_lock_waiters
  FROM pg_stat_activity
  WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend';
SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated;
SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid WHERE t.relnamespace='public'::regnamespace AND NOT i.indisvalid;
COMMIT;

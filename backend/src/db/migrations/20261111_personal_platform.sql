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

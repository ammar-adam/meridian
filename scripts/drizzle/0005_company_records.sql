-- Company Records (docs/build-plan-slices.md Slice A):
-- durable system of record. Every pipeline writes sightings; every surface
-- reads records. first_observed_at is set once and never backdated.
-- Also created idempotently at runtime by lib/server/company-records.js.

CREATE TABLE IF NOT EXISTS companies (
  id text PRIMARY KEY,
  name text NOT NULL,
  domain text,
  one_liner text,
  geography text,
  stage text,
  sectors jsonb,
  meta jsonb,
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS companies_domain_idx ON companies (domain);

CREATE TABLE IF NOT EXISTS sightings (
  id text PRIMARY KEY,
  company_id text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  url text,
  cohort_date text,
  provenance text,
  raw jsonb,
  observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sightings_company_idx ON sightings (company_id);

CREATE TABLE IF NOT EXISTS people (
  id text PRIMARY KEY,
  name text NOT NULL,
  linkedin_url text,
  email text,
  email_status text NOT NULL DEFAULT 'none',
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_people (
  company_id text NOT NULL,
  person_id text NOT NULL,
  role text,
  PRIMARY KEY (company_id, person_id)
);

CREATE TABLE IF NOT EXISTS funding_events (
  id text PRIMARY KEY,
  company_id text NOT NULL,
  kind text NOT NULL,
  amount text,
  event_date text,
  investors jsonb,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS funding_events_company_idx ON funding_events (company_id);

CREATE TABLE IF NOT EXISTS company_research (
  company_id text NOT NULL,
  section text NOT NULL,
  content text,
  confidence text,
  source text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, section)
);

CREATE TABLE IF NOT EXISTS mandate_watches (
  id text PRIMARY KEY,
  actor_id text NOT NULL,
  fund_id text NOT NULL,
  fund_name text,
  thesis text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_digest_at timestamptz
);
CREATE INDEX IF NOT EXISTS mandate_watches_actor_idx ON mandate_watches (actor_id);

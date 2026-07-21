-- Truth Ledger (docs/rebuild-plan.md): server-side observations,
-- dated index checks, durable pursue/pass outcomes.
-- Also created idempotently at runtime by lib/server/truth-ledger.js.

CREATE TABLE IF NOT EXISTS ledger_entities (
  id text PRIMARY KEY,
  name text NOT NULL,
  domain text,
  source text,
  program text,
  cohort_date text,
  provenance text,
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb
);

CREATE TABLE IF NOT EXISTS index_checks (
  id text PRIMARY KEY,
  entity_id text NOT NULL,
  index_name text NOT NULL,
  present boolean,
  detail text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS index_checks_entity_idx ON index_checks (entity_id);

CREATE TABLE IF NOT EXISTS flow_outcomes (
  id text PRIMARY KEY,
  actor_id text NOT NULL,
  entity_name text NOT NULL,
  domain text,
  outcome text NOT NULL,
  fund_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flow_outcomes_actor_idx ON flow_outcomes (actor_id);

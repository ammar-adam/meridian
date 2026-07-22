-- Source registry + ingestion runs (docs/build-plan-slices.md Slice B).
-- Also created idempotently at runtime by lib/server/source-registry.js.

CREATE TABLE IF NOT EXISTS sources (
  id text PRIMARY KEY,
  label text,
  url text NOT NULL UNIQUE,
  type text,
  cadence text,
  geography text,
  active boolean DEFAULT true,
  last_run_at timestamptz,
  last_hash text,
  last_error text,
  meta jsonb
);
CREATE INDEX IF NOT EXISTS sources_active_cadence_idx ON sources (active, cadence);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id text PRIMARY KEY,
  started_at timestamptz,
  finished_at timestamptz,
  sources_checked int,
  new_companies int,
  new_sightings int,
  errors jsonb,
  summary text
);

-- Founder attestations (docs/rebuild-plan.md Phase 3, minimal cut):
-- claims are stored pending and marked confirmed only after manual review.
-- Also created idempotently at runtime by lib/server/truth-ledger.js.

CREATE TABLE IF NOT EXISTS attestations (
  id text PRIMARY KEY,
  company_name text NOT NULL,
  founder_name text,
  claimer_email text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  stage text,
  raise_amount text,
  deck_url text,
  sectors text
);

-- Structured claim fields (Slice E) — safe upgrade for pre-existing tables.
ALTER TABLE attestations ADD COLUMN IF NOT EXISTS stage text;
ALTER TABLE attestations ADD COLUMN IF NOT EXISTS raise_amount text;
ALTER TABLE attestations ADD COLUMN IF NOT EXISTS deck_url text;
ALTER TABLE attestations ADD COLUMN IF NOT EXISTS sectors text;

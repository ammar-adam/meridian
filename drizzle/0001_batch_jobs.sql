CREATE TABLE IF NOT EXISTS batch_jobs (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  status text NOT NULL,
  research_mode text NOT NULL DEFAULT 'quick',
  urls jsonb NOT NULL,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_context jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS batch_jobs_user_idx ON batch_jobs (user_id);

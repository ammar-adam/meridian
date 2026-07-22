import {
  pgTable,
  text,
  jsonb,
  timestamp,
  index,
  primaryKey,
  boolean,
  integer,
} from 'drizzle-orm/pg-core'

/** Full meridian_funds_store blob per user */
export const workspaces = pgTable('workspaces', {
  userId: text('user_id').primaryKey(),
  fundsStore: jsonb('funds_store'),
  teamContext: jsonb('team_context'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const memos = pgTable(
  'memos',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    entry: jsonb('entry').notNull(),
    savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('memos_user_idx').on(t.userId)]
)

export const edits = pgTable(
  'edits',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    entry: jsonb('entry').notNull(),
    editedAt: timestamp('edited_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('edits_user_idx').on(t.userId)]
)

export const shares = pgTable(
  'shares',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    teamId: text('team_id'),
    memoData: jsonb('memo_data').notNull(),
    meta: jsonb('meta').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('shares_team_idx').on(t.teamId),
    index('shares_expires_idx').on(t.expiresAt),
  ]
)

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  ownerId: text('owner_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const teamMembers = pgTable(
  'team_members',
  {
    teamId: text('team_id').notNull(),
    userId: text('user_id').notNull(),
    memberName: text('member_name'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userId] })]
)

/**
 * Truth Ledger — server-side observation record (docs/rebuild-plan.md).
 * first_observed_at is when MERIDIAN saw the entity, never the cohort date.
 */
export const ledgerEntities = pgTable('ledger_entities', {
  id: text('id').primaryKey(), // normalized company name
  name: text('name').notNull(),
  domain: text('domain'),
  source: text('source'),
  program: text('program'),
  cohortDate: text('cohort_date'),
  provenance: text('provenance'),
  firstObservedAt: timestamp('first_observed_at', { withTimezone: true }).defaultNow().notNull(),
  meta: jsonb('meta'),
})

/** Dated, falsifiable index-presence checks per ledger entity. */
export const indexChecks = pgTable(
  'index_checks',
  {
    id: text('id').primaryKey(),
    entityId: text('entity_id').notNull(),
    indexName: text('index_name').notNull(),
    present: boolean('present'),
    detail: text('detail'),
    checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('index_checks_entity_idx').on(t.entityId)]
)

/** Server-side pursue/pass outcomes — durable cross-device memory. */
export const flowOutcomes = pgTable(
  'flow_outcomes',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    entityName: text('entity_name').notNull(),
    domain: text('domain'),
    outcome: text('outcome').notNull(),
    fundName: text('fund_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('flow_outcomes_actor_idx').on(t.actorId)]
)

/** Founder claims — pending until manually verified; never auto-confirmed. */
export const attestations = pgTable('attestations', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull(),
  founderName: text('founder_name'),
  claimerEmail: text('claimer_email').notNull(),
  message: text('message'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  stage: text('stage'),
  raiseAmount: text('raise_amount'),
  deckUrl: text('deck_url'),
  sectors: text('sectors'),
})

/**
 * Company Records (docs/build-plan-slices.md Slice A).
 * first_observed_at is set once when Meridian first records the company.
 */
export const companies = pgTable(
  'companies',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    domain: text('domain'),
    oneLiner: text('one_liner'),
    geography: text('geography'),
    stage: text('stage'),
    sectors: jsonb('sectors'),
    meta: jsonb('meta'),
    firstObservedAt: timestamp('first_observed_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('companies_domain_idx').on(t.domain)]
)

export const sightings = pgTable(
  'sightings',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id'),
    url: text('url'),
    cohortDate: text('cohort_date'),
    provenance: text('provenance'),
    raw: jsonb('raw'),
    observedAt: timestamp('observed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('sightings_company_idx').on(t.companyId)]
)

export const people = pgTable('people', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  linkedinUrl: text('linkedin_url'),
  email: text('email'),
  emailStatus: text('email_status').notNull().default('none'),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const companyPeople = pgTable(
  'company_people',
  {
    companyId: text('company_id').notNull(),
    personId: text('person_id').notNull(),
    role: text('role'),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.personId] })]
)

export const fundingEvents = pgTable(
  'funding_events',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id').notNull(),
    kind: text('kind').notNull(),
    amount: text('amount'),
    eventDate: text('event_date'),
    investors: jsonb('investors'),
    sourceUrl: text('source_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('funding_events_company_idx').on(t.companyId)]
)

export const companyResearch = pgTable(
  'company_research',
  {
    companyId: text('company_id').notNull(),
    section: text('section').notNull(),
    content: text('content'),
    confidence: text('confidence'),
    source: text('source'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.section] })]
)

export const mandateWatches = pgTable(
  'mandate_watches',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    fundId: text('fund_id').notNull(),
    fundName: text('fund_name'),
    thesis: text('thesis').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastDigestAt: timestamp('last_digest_at', { withTimezone: true }),
  },
  (t) => [index('mandate_watches_actor_idx').on(t.actorId)]
)

/**
 * Source registry (docs/build-plan-slices.md Slice B).
 * Cadence-scheduled pages the ingestion worker fetches + extracts.
 */
export const sources = pgTable(
  'sources',
  {
    id: text('id').primaryKey(),
    label: text('label'),
    url: text('url').notNull().unique(),
    type: text('type'), // university|incubator|accelerator|launch|capital|registry|scout
    cadence: text('cadence'), // daily|weekly
    geography: text('geography'),
    active: boolean('active').default(true),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    lastHash: text('last_hash'),
    lastError: text('last_error'),
    meta: jsonb('meta'),
  },
  (t) => [index('sources_active_cadence_idx').on(t.active, t.cadence)]
)

export const ingestionRuns = pgTable('ingestion_runs', {
  id: text('id').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  sourcesChecked: integer('sources_checked'),
  newCompanies: integer('new_companies'),
  newSightings: integer('new_sightings'),
  errors: jsonb('errors'),
  summary: text('summary'),
})

export const batchJobs = pgTable(
  'batch_jobs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    status: text('status').notNull(),
    researchMode: text('research_mode').notNull().default('quick'),
    urls: jsonb('urls').notNull(),
    results: jsonb('results').notNull().default([]),
    progress: jsonb('progress').notNull().default({}),
    sourceContext: jsonb('source_context'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('batch_jobs_user_idx').on(t.userId)]
)

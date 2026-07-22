import {
  pgTable,
  text,
  jsonb,
  timestamp,
  index,
  primaryKey,
  boolean,
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

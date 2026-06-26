import {
  pgTable,
  text,
  jsonb,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'

/** Full meridian_funds_store blob per user */
export const workspaces = pgTable('workspaces', {
  userId: text('user_id').primaryKey(),
  fundsStore: jsonb('funds_store'),
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

import { pgTable, uuid, varchar, text, integer, boolean, date, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

// ═══════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleId: varchar('google_id', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  authMethod: varchar('auth_method', { length: 20 }).notNull(), // 'google' | 'email' | 'anonymous'
  passwordHash: varchar('password_hash', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActive: timestamp('last_active', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════
export const onboarding = pgTable('onboarding', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  mainPain: varchar('main_pain', { length: 20 }),
  desiredOutcome: text('desired_outcome'),
  priorityAreas: text('priority_areas').array(),
  dailyMinutes: integer('daily_minutes'),
  wakeTime: varchar('wake_time', { length: 10 }),
  trackerExperience: varchar('tracker_experience', { length: 20 }),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════
// USER HABITS
// ═══════════════════════════════════════════════
export const userHabits = pgTable('user_habits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  templateId: varchar('template_id', { length: 50 }).notNull(),
  columnStatus: varchar('column_status', { length: 20 }).notNull().default('todo'),
  sortOrder: integer('sort_order').notNull().default(0),
  dateAdded: date('date_added').notNull().defaultNow(),
  totalMinutesSpent: integer('total_minutes_spent').notNull().default(0),
  coverImageUrl: text('cover_image_url'),
  customDurationMinutes: integer('custom_duration_minutes'),
  prophecyText: text('prophecy_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('user_habit_unique').on(table.userId, table.templateId),
  index('idx_user_habits_user').on(table.userId),
]);

// ═══════════════════════════════════════════════
// HABIT COMPLETIONS
// ═══════════════════════════════════════════════
export const habitCompletions = pgTable('habit_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').notNull().references(() => userHabits.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  completedDate: date('completed_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('completion_unique').on(table.habitId, table.completedDate),
  index('idx_completions_user_date').on(table.userId, table.completedDate),
]);

// ═══════════════════════════════════════════════
// HABIT LOG ENTRIES
// ═══════════════════════════════════════════════
export const habitLogEntries = pgTable('habit_log_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').notNull().references(() => userHabits.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  text: text('text').notNull(),
  durationMinutes: integer('duration_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_log_entries_habit').on(table.habitId),
]);

// ═══════════════════════════════════════════════
// HABIT CHECKLIST ITEMS
// ═══════════════════════════════════════════════
export const habitChecklistItems = pgTable('habit_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  habitId: uuid('habit_id').notNull().references(() => userHabits.id, { onDelete: 'cascade' }),
  text: varchar('text', { length: 500 }).notNull(),
  done: boolean('done').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ═══════════════════════════════════════════════
// CUSTOM TEMPLATES
// ═══════════════════════════════════════════════
export const customTemplates = pgTable('custom_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  layer: varchar('layer', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  science: text('science'),
  timeOfDay: varchar('time_of_day', { length: 10 }).notNull().default('morning'),
  durationMinutes: integer('duration_minutes').notNull().default(10),
  difficulty: varchar('difficulty', { length: 10 }).notNull().default('easy'),
  tinyHabitAnchor: text('tiny_habit_anchor'),
  whatYouFeel: text('what_you_feel'),
  commonMistakes: text('common_mistakes'),
  customName: varchar('custom_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_custom_templates_user').on(table.userId),
]);

// ═══════════════════════════════════════════════
// JOURNAL ENTRIES (6 types)
// ═══════════════════════════════════════════════

export const luckEntries = pgTable('luck_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  event1: text('event1').notNull().default(''),
  event2: text('event2').notNull().default(''),
  event3: text('event3').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_luck_user').on(table.userId),
]);

export const gratitudeEntries = pgTable('gratitude_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  item1: text('item1').notNull().default(''),
  item2: text('item2').notNull().default(''),
  item3: text('item3').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_gratitude_user').on(table.userId),
]);

export const decisionEntries = pgTable('decision_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  decision: text('decision').notNull(),
  logic: text('logic').notNull().default(''),
  expectation: text('expectation').notNull().default(''),
  emotionalState: text('emotional_state').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_decision_user').on(table.userId),
]);

export const woopEntries = pgTable('woop_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  wish: text('wish').notNull(),
  outcome: text('outcome').notNull().default(''),
  obstacle: text('obstacle').notNull().default(''),
  plan: text('plan').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_woop_user').on(table.userId),
]);

export const prophecyEntries = pgTable('prophecy_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  prophecy: text('prophecy').notNull(),
  reasoning: text('reasoning').notNull().default(''),
  steps: text('steps').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_prophecy_user').on(table.userId),
]);

export const beliefEntries = pgTable('belief_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  belief: text('belief').notNull(),
  origin: text('origin').notNull().default(''),
  impact: text('impact').notNull().default(''),
  beliefType: varchar('belief_type', { length: 10 }).notNull(), // 'empowering' | 'limiting'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_belief_user').on(table.userId),
]);

// ═══════════════════════════════════════════════
// COMPLETION HISTORY (daily summary)
// ═══════════════════════════════════════════════
export const completionHistory = pgTable('completion_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recordDate: date('record_date').notNull(),
  completedCount: integer('completed_count').notNull().default(0),
}, (table) => [
  uniqueIndex('completion_history_unique').on(table.userId, table.recordDate),
  index('idx_completion_history_user').on(table.userId, table.recordDate),
]);

// ═══════════════════════════════════════════════
// USER STREAKS
// ═══════════════════════════════════════════════
export const userStreaks = pgTable('user_streaks', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').notNull().default(0),
  maxStreak: integer('max_streak').notNull().default(0),
  lastComputed: date('last_computed'),
});

// ═══════════════════════════════════════════════
// ADMIN USERS
// ═══════════════════════════════════════════════
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

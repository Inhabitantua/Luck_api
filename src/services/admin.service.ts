import { db } from '../config/database.js';
import {
  users, userHabits, habitCompletions, habitLogEntries,
  completionHistory, userStreaks, onboarding,
  luckEntries, gratitudeEntries, decisionEntries,
  woopEntries, prophecyEntries, beliefEntries
} from '../db/schema.js';
import { eq, desc, sql, count, gte, and } from 'drizzle-orm';

// ── Dashboard Stats ─────────────────────────────────────
export async function getDashboardStats() {
  const today = getLocalToday();
  const weekAgo = getDateOffset(-7);

  const [totalUsersResult] = await db.select({ count: count() }).from(users);
  const [todayUsersResult] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, new Date(today)));
  const [weekUsersResult] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, new Date(weekAgo)));
  const [activeTodayResult] = await db.select({ count: count() }).from(users).where(gte(users.lastActive, new Date(today)));
  const [activeWeekResult] = await db.select({ count: count() }).from(users).where(gte(users.lastActive, new Date(weekAgo)));
  const [totalHabitsResult] = await db.select({ count: count() }).from(userHabits);
  const [totalCompletionsResult] = await db.select({ count: count() }).from(habitCompletions);

  // Total minutes tracked
  const [minutesResult] = await db.select({
    total: sql<number>`COALESCE(SUM(${userHabits.totalMinutesSpent}), 0)`
  }).from(userHabits);

  // Total journal entries
  const journalCounts = await Promise.all([
    db.select({ count: count() }).from(luckEntries),
    db.select({ count: count() }).from(gratitudeEntries),
    db.select({ count: count() }).from(decisionEntries),
    db.select({ count: count() }).from(woopEntries),
    db.select({ count: count() }).from(prophecyEntries),
    db.select({ count: count() }).from(beliefEntries),
  ]);
  const totalJournalEntries = journalCounts.reduce((sum, [r]) => sum + (r?.count ?? 0), 0);

  // Top habit templates
  const topTemplates = await db.select({
    templateId: userHabits.templateId,
    count: count(),
  }).from(userHabits).groupBy(userHabits.templateId).orderBy(desc(count())).limit(10);

  // Registrations by day (last 30 days)
  const thirtyDaysAgo = getDateOffset(-30);
  const registrations = await db.select({
    date: sql<string>`DATE(${users.createdAt})`,
    count: count(),
  }).from(users)
    .where(gte(users.createdAt, new Date(thirtyDaysAgo)))
    .groupBy(sql`DATE(${users.createdAt})`)
    .orderBy(sql`DATE(${users.createdAt})`);

  return {
    totalUsers: totalUsersResult?.count ?? 0,
    usersToday: todayUsersResult?.count ?? 0,
    usersThisWeek: weekUsersResult?.count ?? 0,
    activeToday: activeTodayResult?.count ?? 0,
    activeThisWeek: activeWeekResult?.count ?? 0,
    totalHabitsCreated: totalHabitsResult?.count ?? 0,
    totalCompletions: totalCompletionsResult?.count ?? 0,
    totalJournalEntries,
    totalMinutesTracked: minutesResult?.total ?? 0,
    topHabitTemplates: topTemplates,
    registrationsByDay: registrations,
  };
}

// ── User List ───────────────────────────────────────────
export async function getUserList(page: number = 1, limit: number = 20, search?: string) {
  const offset = (page - 1) * limit;

  // Base query with aggregated stats
  let query = db.select({
    id: users.id,
    displayName: users.displayName,
    email: users.email,
    authMethod: users.authMethod,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
    lastActive: users.lastActive,
  }).from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);

  const userList = await query;

  // Enrich with stats
  const enriched = await Promise.all(userList.map(async (user) => {
    const [habitsCount] = await db.select({ count: count() }).from(userHabits).where(eq(userHabits.userId, user.id));
    const [completionsCount] = await db.select({ count: count() }).from(habitCompletions).where(eq(habitCompletions.userId, user.id));
    const [streakData] = await db.select().from(userStreaks).where(eq(userStreaks.userId, user.id)).limit(1);
    const [minutesData] = await db.select({
      total: sql<number>`COALESCE(SUM(${userHabits.totalMinutesSpent}), 0)`
    }).from(userHabits).where(eq(userHabits.userId, user.id));

    return {
      ...user,
      habitCount: habitsCount?.count ?? 0,
      totalCompletions: completionsCount?.count ?? 0,
      currentStreak: streakData?.currentStreak ?? 0,
      totalMinutes: minutesData?.total ?? 0,
    };
  }));

  const [totalResult] = await db.select({ count: count() }).from(users);
  const total = totalResult?.count ?? 0;

  return {
    users: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ── User Detail ─────────────────────────────────────────
export async function getUserDetail(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');

  const [streakData] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
  const [onboardingData] = await db.select().from(onboarding).where(eq(onboarding.userId, userId)).limit(1);
  const habits = await db.select().from(userHabits).where(eq(userHabits.userId, userId));
  const completions = await db.select().from(habitCompletions).where(eq(habitCompletions.userId, userId));
  const logs = await db.select().from(habitLogEntries).where(eq(habitLogEntries.userId, userId));
  const history = await db.select().from(completionHistory).where(eq(completionHistory.userId, userId)).orderBy(desc(completionHistory.recordDate));

  // Journal counts
  const [luckCount] = await db.select({ count: count() }).from(luckEntries).where(eq(luckEntries.userId, userId));
  const [gratCount] = await db.select({ count: count() }).from(gratitudeEntries).where(eq(gratitudeEntries.userId, userId));
  const [decCount] = await db.select({ count: count() }).from(decisionEntries).where(eq(decisionEntries.userId, userId));
  const [woopCount] = await db.select({ count: count() }).from(woopEntries).where(eq(woopEntries.userId, userId));
  const [propCount] = await db.select({ count: count() }).from(prophecyEntries).where(eq(prophecyEntries.userId, userId));
  const [belCount] = await db.select({ count: count() }).from(beliefEntries).where(eq(beliefEntries.userId, userId));

  const [minutesData] = await db.select({
    total: sql<number>`COALESCE(SUM(${userHabits.totalMinutesSpent}), 0)`
  }).from(userHabits).where(eq(userHabits.userId, userId));

  return {
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      authMethod: user.authMethod,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      lastActive: user.lastActive,
    },
    streaks: {
      current: streakData?.currentStreak ?? 0,
      max: streakData?.maxStreak ?? 0,
    },
    onboarding: onboardingData ?? null,
    stats: {
      habitCount: habits.length,
      totalCompletions: completions.length,
      totalLogEntries: logs.length,
      totalMinutes: minutesData?.total ?? 0,
      journalEntries: {
        luck: luckCount?.count ?? 0,
        gratitude: gratCount?.count ?? 0,
        decisions: decCount?.count ?? 0,
        woop: woopCount?.count ?? 0,
        prophecy: propCount?.count ?? 0,
        beliefs: belCount?.count ?? 0,
      },
    },
    habits: habits.map(h => ({
      id: h.id,
      templateId: h.templateId,
      dateAdded: h.dateAdded,
      totalMinutesSpent: h.totalMinutesSpent,
      completions: completions.filter(c => c.habitId === h.id).length,
    })),
    completionHistory: history,
  };
}

// ── Helpers ─────────────────────────────────────────────
function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

import { db } from '../config/database.js';
import {
  users, userHabits, habitCompletions, habitLogEntries, habitChecklistItems,
  completionHistory, userStreaks, onboarding, customTemplates,
  luckEntries, gratitudeEntries, decisionEntries,
  woopEntries, prophecyEntries, beliefEntries
} from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

// ── Get Full App State ──────────────────────────────────
export async function getFullState(userId: string) {
  // Fetch all data in parallel
  const [
    habits,
    history,
    streaks,
    onboardingData,
    templates,
    luck,
    gratitude,
    decisions,
    woop,
    prophecy,
    beliefs,
  ] = await Promise.all([
    getHabitsWithRelations(userId),
    db.select().from(completionHistory).where(eq(completionHistory.userId, userId)).orderBy(desc(completionHistory.recordDate)),
    db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1),
    db.select().from(onboarding).where(eq(onboarding.userId, userId)).limit(1),
    db.select().from(customTemplates).where(eq(customTemplates.userId, userId)),
    db.select().from(luckEntries).where(eq(luckEntries.userId, userId)).orderBy(desc(luckEntries.entryDate)),
    db.select().from(gratitudeEntries).where(eq(gratitudeEntries.userId, userId)).orderBy(desc(gratitudeEntries.entryDate)),
    db.select().from(decisionEntries).where(eq(decisionEntries.userId, userId)).orderBy(desc(decisionEntries.entryDate)),
    db.select().from(woopEntries).where(eq(woopEntries.userId, userId)).orderBy(desc(woopEntries.entryDate)),
    db.select().from(prophecyEntries).where(eq(prophecyEntries.userId, userId)).orderBy(desc(prophecyEntries.entryDate)),
    db.select().from(beliefEntries).where(eq(beliefEntries.userId, userId)).orderBy(desc(beliefEntries.entryDate)),
  ]);

  // Build completion history map
  const completionHistoryMap: Record<string, number> = {};
  history.forEach(h => {
    completionHistoryMap[h.recordDate] = h.completedCount;
  });

  return {
    habits,
    completionHistory: completionHistoryMap,
    streak: streaks[0]?.currentStreak ?? 0,
    maxStreak: streaks[0]?.maxStreak ?? 0,
    onboarding: onboardingData[0] ?? null,
    customTemplates: templates,
    luckEntries: luck,
    gratitudeEntries: gratitude,
    decisionEntries: decisions,
    woopEntries: woop,
    prophecyEntries: prophecy,
    beliefEntries: beliefs,
    currentDate: getLocalToday(),
  };
}

// ── Day Reset ───────────────────────────────────────────
export async function performDayReset(userId: string) {
  const today = getLocalToday();

  // Get current streaks
  let [streakData] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);

  if (!streakData) {
    [streakData] = await db.insert(userStreaks).values({ userId }).returning();
  }

  // If already computed for today, skip
  if (streakData.lastComputed === today) {
    return { message: 'Already reset today', streak: streakData.currentStreak, maxStreak: streakData.maxStreak };
  }

  // Count yesterday's completions
  const yesterday = getDateOffset(-1);
  const habits = await db.select().from(userHabits).where(eq(userHabits.userId, userId));
  const yesterdayCompletions = await db.select().from(habitCompletions)
    .where(sql`${habitCompletions.userId} = ${userId} AND ${habitCompletions.completedDate} = ${yesterday}`);

  const totalHabits = habits.length;
  const doneCount = yesterdayCompletions.length;

  // Record completion history for yesterday
  if (totalHabits > 0) {
    try {
      await db.insert(completionHistory).values({
        userId,
        recordDate: yesterday,
        completedCount: doneCount,
      });
    } catch {
      // Already recorded
    }
  }

  // Update streak
  let newStreak = streakData.currentStreak;
  let newMax = streakData.maxStreak;
  if (totalHabits > 0 && doneCount >= totalHabits * 0.5) {
    newStreak += 1;
    if (newStreak > newMax) newMax = newStreak;
  } else {
    newStreak = 0;
  }

  // Reset all habits to 'todo'
  await db.update(userHabits)
    .set({ columnStatus: 'todo', sortOrder: 0 })
    .where(eq(userHabits.userId, userId));

  // Save streak
  await db.update(userStreaks)
    .set({ currentStreak: newStreak, maxStreak: newMax, lastComputed: today })
    .where(eq(userStreaks.userId, userId));

  return { streak: newStreak, maxStreak: newMax };
}

// ── Import from localStorage (full replace strategy) ────
// This is called frequently (debounced) from the frontend.
// Strategy: DELETE all existing user data and re-import fresh.
// This avoids ID mismatch issues between local UUIDs and server UUIDs.
export async function importState(userId: string, data: {
  habits?: any[];
  luckEntries?: any[];
  gratitudeEntries?: any[];
  decisionEntries?: any[];
  woopEntries?: any[];
  prophecyEntries?: any[];
  beliefEntries?: any[];
  completionHistory?: Record<string, number>;
  streak?: number;
  maxStreak?: number;
  customTemplates?: any[];
}) {
  // ── Step 1: Delete all existing user data ──
  // Habit-related tables cascade from userHabits, so deleting habits
  // also removes completions, logs, and checklist items.
  await db.delete(userHabits).where(eq(userHabits.userId, userId));
  await db.delete(luckEntries).where(eq(luckEntries.userId, userId));
  await db.delete(gratitudeEntries).where(eq(gratitudeEntries.userId, userId));
  await db.delete(decisionEntries).where(eq(decisionEntries.userId, userId));
  await db.delete(woopEntries).where(eq(woopEntries.userId, userId));
  await db.delete(prophecyEntries).where(eq(prophecyEntries.userId, userId));
  await db.delete(beliefEntries).where(eq(beliefEntries.userId, userId));
  await db.delete(completionHistory).where(eq(completionHistory.userId, userId));
  await db.delete(customTemplates).where(eq(customTemplates.userId, userId));

  // ── Step 2: Import habits ──
  if (data.habits && data.habits.length > 0) {
    for (const h of data.habits) {
      try {
        const [habit] = await db.insert(userHabits).values({
          userId,
          templateId: h.templateId,
          columnStatus: h.column || 'todo',
          sortOrder: h.order || 0,
          dateAdded: h.dateAdded || getLocalToday(),
          totalMinutesSpent: h.totalMinutesSpent || 0,
          coverImageUrl: h.coverImageUrl || null,
          customDurationMinutes: h.customDurationMinutes || null,
          prophecyText: h.prophecyText || null,
        }).returning();

        // Import completions
        if (h.completionDates && h.completionDates.length > 0) {
          for (const d of h.completionDates) {
            try {
              await db.insert(habitCompletions).values({ habitId: habit.id, userId, completedDate: d });
            } catch { /* skip duplicate */ }
          }
        }

        // Import log entries
        if (h.logEntries && h.logEntries.length > 0) {
          await db.insert(habitLogEntries).values(
            h.logEntries.map((l: any) => ({
              habitId: habit.id,
              userId,
              entryDate: l.date || l.entryDate || getLocalToday(),
              text: l.text || '',
              durationMinutes: l.durationMinutes || null,
            }))
          );
        }

        // Import checklist
        if (h.checklist && h.checklist.length > 0) {
          await db.insert(habitChecklistItems).values(
            h.checklist.map((c: any, i: number) => ({
              habitId: habit.id,
              text: c.text,
              done: c.done || false,
              sortOrder: i,
            }))
          );
        }
      } catch (err) {
        console.warn(`[import] Failed to import habit ${h.templateId}:`, err);
      }
    }
  }

  // ── Step 3: Import journal entries ──
  const journalImports: { entries: any[] | undefined; table: any; mapFn: (e: any) => any }[] = [
    {
      entries: data.luckEntries,
      table: luckEntries,
      mapFn: (e: any) => ({
        userId,
        entryDate: e.date || e.entryDate || getLocalToday(),
        event1: e.event1 || '',
        event2: e.event2 || '',
        event3: e.event3 || '',
      }),
    },
    {
      entries: data.gratitudeEntries,
      table: gratitudeEntries,
      mapFn: (e: any) => ({
        userId,
        entryDate: e.date || e.entryDate || getLocalToday(),
        item1: e.item1 || '',
        item2: e.item2 || '',
        item3: e.item3 || '',
      }),
    },
    {
      entries: data.decisionEntries,
      table: decisionEntries,
      mapFn: (e: any) => ({
        userId,
        entryDate: e.date || e.entryDate || getLocalToday(),
        decision: e.decision || '',
        logic: e.logic || '',
        expectation: e.expectation || '',
        emotionalState: e.emotionalState || '',
      }),
    },
    {
      entries: data.woopEntries,
      table: woopEntries,
      mapFn: (e: any) => ({
        userId,
        entryDate: e.date || e.entryDate || getLocalToday(),
        wish: e.wish || '',
        outcome: e.outcome || '',
        obstacle: e.obstacle || '',
        plan: e.plan || '',
      }),
    },
    {
      entries: data.prophecyEntries,
      table: prophecyEntries,
      mapFn: (e: any) => ({
        userId,
        entryDate: e.date || e.entryDate || getLocalToday(),
        prophecy: e.prophecy || '',
        reasoning: e.reasoning || '',
        steps: e.steps || '',
      }),
    },
    {
      entries: data.beliefEntries,
      table: beliefEntries,
      mapFn: (e: any) => ({
        userId,
        entryDate: e.date || e.entryDate || getLocalToday(),
        belief: e.belief || '',
        origin: e.origin || '',
        impact: e.impact || '',
        beliefType: e.beliefType || 'empowering',
      }),
    },
  ];

  for (const { entries, table, mapFn } of journalImports) {
    if (entries && entries.length > 0) {
      for (const entry of entries) {
        try {
          await db.insert(table).values(mapFn(entry));
        } catch (err) {
          console.warn('[import] Failed to import journal entry:', err);
        }
      }
    }
  }

  // ── Step 4: Import completion history ──
  if (data.completionHistory) {
    for (const [date, count] of Object.entries(data.completionHistory)) {
      try {
        await db.insert(completionHistory).values({
          userId,
          recordDate: date,
          completedCount: count,
        });
      } catch { /* skip */ }
    }
  }

  // ── Step 5: Import custom templates ──
  if (data.customTemplates && data.customTemplates.length > 0) {
    for (const t of data.customTemplates) {
      try {
        await db.insert(customTemplates).values({
          userId,
          layer: t.layer || 'biology',
          name: t.name || '',
          description: t.description || null,
          science: t.science || null,
          timeOfDay: t.timeOfDay || 'morning',
          durationMinutes: t.durationMinutes || 10,
          difficulty: t.difficulty || 'easy',
          tinyHabitAnchor: t.tinyHabitAnchor || null,
          whatYouFeel: t.whatYouFeel || null,
          commonMistakes: t.commonMistakes || null,
          customName: t.customName || null,
        });
      } catch (err) {
        console.warn('[import] Failed to import custom template:', err);
      }
    }
  }

  // ── Step 6: Import streaks ──
  const existing = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(userStreaks).values({
      userId,
      currentStreak: data.streak ?? 0,
      maxStreak: data.maxStreak ?? 0,
    });
  } else {
    await db.update(userStreaks).set({
      currentStreak: data.streak ?? existing[0].currentStreak,
      maxStreak: data.maxStreak ?? existing[0].maxStreak,
    }).where(eq(userStreaks.userId, userId));
  }

  return { success: true };
}

// ── Helpers ─────────────────────────────────────────────
async function getHabitsWithRelations(userId: string) {
  const habits = await db.select().from(userHabits).where(eq(userHabits.userId, userId)).orderBy(userHabits.sortOrder);

  return Promise.all(habits.map(async (habit) => {
    const [completions, logs, checklist] = await Promise.all([
      db.select().from(habitCompletions).where(eq(habitCompletions.habitId, habit.id)).orderBy(desc(habitCompletions.completedDate)),
      db.select().from(habitLogEntries).where(eq(habitLogEntries.habitId, habit.id)).orderBy(desc(habitLogEntries.entryDate)),
      db.select().from(habitChecklistItems).where(eq(habitChecklistItems.habitId, habit.id)).orderBy(habitChecklistItems.sortOrder),
    ]);

    return {
      ...habit,
      completionDates: completions.map(c => c.completedDate),
      logEntries: logs.map(l => ({ id: l.id, date: l.entryDate, text: l.text, durationMinutes: l.durationMinutes })),
      checklist: checklist.map(c => ({ id: c.id, text: c.text, done: c.done })),
    };
  }));
}

function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

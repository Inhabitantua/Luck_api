import { db } from '../config/database.js';
import { userHabits, habitCompletions, habitLogEntries, habitChecklistItems } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

// ── Get All Habits ──────────────────────────────────────
export async function getUserHabits(userId: string) {
  const habits = await db.select().from(userHabits).where(eq(userHabits.userId, userId)).orderBy(userHabits.sortOrder);

  // Fetch related data for each habit
  const result = await Promise.all(habits.map(async (habit) => {
    const completions = await db.select().from(habitCompletions)
      .where(eq(habitCompletions.habitId, habit.id))
      .orderBy(desc(habitCompletions.completedDate));

    const logs = await db.select().from(habitLogEntries)
      .where(eq(habitLogEntries.habitId, habit.id))
      .orderBy(desc(habitLogEntries.entryDate));

    const checklist = await db.select().from(habitChecklistItems)
      .where(eq(habitChecklistItems.habitId, habit.id))
      .orderBy(habitChecklistItems.sortOrder);

    return {
      ...habit,
      completionDates: completions.map(c => c.completedDate),
      logEntries: logs.map(l => ({
        id: l.id,
        date: l.entryDate,
        text: l.text,
        durationMinutes: l.durationMinutes,
      })),
      checklist: checklist.map(c => ({
        id: c.id,
        text: c.text,
        done: c.done,
      })),
    };
  }));

  return result;
}

// ── Add Habit ───────────────────────────────────────────
export async function addHabit(userId: string, templateId: string, order: number = 0) {
  const [habit] = await db.insert(userHabits).values({
    userId,
    templateId,
    columnStatus: 'todo',
    sortOrder: order,
  }).returning();
  return { ...habit, completionDates: [], logEntries: [], checklist: [] };
}

// ── Update Habit ────────────────────────────────────────
export async function updateHabit(userId: string, habitId: string, data: {
  columnStatus?: string;
  sortOrder?: number;
  totalMinutesSpent?: number;
  coverImageUrl?: string | null;
  customDurationMinutes?: number | null;
  prophecyText?: string | null;
}) {
  const [habit] = await db.update(userHabits)
    .set(data)
    .where(and(eq(userHabits.id, habitId), eq(userHabits.userId, userId)))
    .returning();
  if (!habit) throw new Error('Habit not found');
  return habit;
}

// ── Delete Habit ────────────────────────────────────────
export async function deleteHabit(userId: string, habitId: string) {
  const result = await db.delete(userHabits)
    .where(and(eq(userHabits.id, habitId), eq(userHabits.userId, userId)))
    .returning();
  if (result.length === 0) throw new Error('Habit not found');
}

// ── Complete Habit ──────────────────────────────────────
export async function completeHabit(userId: string, habitId: string, date: string) {
  // Verify habit belongs to user
  const [habit] = await db.select().from(userHabits)
    .where(and(eq(userHabits.id, habitId), eq(userHabits.userId, userId))).limit(1);
  if (!habit) throw new Error('Habit not found');

  // Insert completion (ignore if already exists for this date)
  try {
    await db.insert(habitCompletions).values({
      habitId,
      userId,
      completedDate: date,
    });
  } catch (err: unknown) {
    // Unique constraint violation — already completed today
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      return; // Already completed, silently ignore
    }
    throw err;
  }
}

// ── Add Log Entry ───────────────────────────────────────
export async function addLogEntry(userId: string, habitId: string, data: {
  date: string;
  text: string;
  durationMinutes?: number;
}) {
  // Verify habit belongs to user
  const [habit] = await db.select().from(userHabits)
    .where(and(eq(userHabits.id, habitId), eq(userHabits.userId, userId))).limit(1);
  if (!habit) throw new Error('Habit not found');

  const [entry] = await db.insert(habitLogEntries).values({
    habitId,
    userId,
    entryDate: data.date,
    text: data.text,
    durationMinutes: data.durationMinutes,
  }).returning();

  // Update total minutes
  if (data.durationMinutes) {
    await db.update(userHabits)
      .set({ totalMinutesSpent: habit.totalMinutesSpent + data.durationMinutes })
      .where(eq(userHabits.id, habitId));
  }

  return entry;
}

// ── Add Time ────────────────────────────────────────────
export async function addTime(userId: string, habitId: string, minutes: number) {
  const [habit] = await db.select().from(userHabits)
    .where(and(eq(userHabits.id, habitId), eq(userHabits.userId, userId))).limit(1);
  if (!habit) throw new Error('Habit not found');

  await db.update(userHabits)
    .set({ totalMinutesSpent: habit.totalMinutesSpent + minutes })
    .where(eq(userHabits.id, habitId));
}

// ── Update Checklist ────────────────────────────────────
export async function updateChecklist(userId: string, habitId: string, items: { id?: string; text: string; done: boolean }[]) {
  // Verify habit
  const [habit] = await db.select().from(userHabits)
    .where(and(eq(userHabits.id, habitId), eq(userHabits.userId, userId))).limit(1);
  if (!habit) throw new Error('Habit not found');

  // Delete existing items and re-insert
  await db.delete(habitChecklistItems).where(eq(habitChecklistItems.habitId, habitId));

  if (items.length > 0) {
    await db.insert(habitChecklistItems).values(
      items.map((item, i) => ({
        habitId,
        text: item.text,
        done: item.done,
        sortOrder: i,
      }))
    );
  }
}

// ── Reorder Habits (batch) ──────────────────────────────
export async function reorderHabits(userId: string, updates: { id: string; column: string; order: number }[]) {
  await Promise.all(updates.map((u) =>
    db.update(userHabits)
      .set({ columnStatus: u.column, sortOrder: u.order })
      .where(and(eq(userHabits.id, u.id), eq(userHabits.userId, userId)))
  ));
}

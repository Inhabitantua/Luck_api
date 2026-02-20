import { db } from '../config/database.js';
import {
  luckEntries, gratitudeEntries, decisionEntries,
  woopEntries, prophecyEntries, beliefEntries
} from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

// Map of journal type to table
const tableMap = {
  luck: luckEntries,
  gratitude: gratitudeEntries,
  decisions: decisionEntries,
  woop: woopEntries,
  prophecy: prophecyEntries,
  beliefs: beliefEntries,
} as const;

export type JournalType = keyof typeof tableMap;

export function isValidJournalType(type: string): type is JournalType {
  return type in tableMap;
}

// ── Get Journal Entries ─────────────────────────────────
export async function getJournalEntries(userId: string, type: JournalType) {
  const table = tableMap[type];
  return db.select().from(table).where(eq(table.userId, userId)).orderBy(desc(table.entryDate));
}

// ── Save Journal Entry ──────────────────────────────────
export async function saveJournalEntry(userId: string, type: JournalType, data: Record<string, unknown>) {
  const table = tableMap[type];
  const values = { userId, ...data } as any;
  const [entry] = await db.insert(table).values(values).returning();
  return entry;
}

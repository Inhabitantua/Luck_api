import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../config/database.js';
import { onboarding, userHabits } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AuthRequest } from '../types/index.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/onboarding
router.get('/', async (req: AuthRequest, res) => {
  try {
    const [data] = await db.select().from(onboarding).where(eq(onboarding.userId, req.userId!)).limit(1);
    res.json(data || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/onboarding
router.put('/', async (req: AuthRequest, res) => {
  try {
    const { mainPain, desiredOutcome, priorityAreas, dailyMinutes, wakeTime, trackerExperience } = req.body;

    const [existing] = await db.select().from(onboarding).where(eq(onboarding.userId, req.userId!)).limit(1);

    if (existing) {
      const [updated] = await db.update(onboarding).set({
        mainPain, desiredOutcome, priorityAreas, dailyMinutes, wakeTime, trackerExperience,
      }).where(eq(onboarding.userId, req.userId!)).returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(onboarding).values({
        userId: req.userId!,
        mainPain, desiredOutcome, priorityAreas, dailyMinutes, wakeTime, trackerExperience,
      }).returning();
      res.json(created);
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/onboarding/complete
router.post('/complete', async (req: AuthRequest, res) => {
  try {
    const { templateIds } = req.body; // Array of habit templateIds to create

    // Mark onboarding as completed
    await db.update(onboarding)
      .set({ onboardingCompleted: true })
      .where(eq(onboarding.userId, req.userId!));

    // Create habits from template IDs
    if (templateIds && Array.isArray(templateIds)) {
      for (let i = 0; i < templateIds.length; i++) {
        try {
          await db.insert(userHabits).values({
            userId: req.userId!,
            templateId: templateIds[i],
            columnStatus: 'todo',
            sortOrder: i,
          });
        } catch {
          // Skip duplicates
        }
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export { router as onboardingRoutes };

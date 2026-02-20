import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getJournalEntries, saveJournalEntry, isValidJournalType } from '../services/journals.service.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/journals/:type
router.get('/:type', async (req: AuthRequest, res) => {
  try {
    const type = req.params.type as string;
    if (!isValidJournalType(type)) {
      res.status(400).json({ error: `Invalid journal type: ${type}. Valid types: luck, gratitude, decisions, woop, prophecy, beliefs` });
      return;
    }
    const entries = await getJournalEntries(req.userId!, type);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/journals/:type
router.post('/:type', async (req: AuthRequest, res) => {
  try {
    const type = req.params.type as string;
    if (!isValidJournalType(type)) {
      res.status(400).json({ error: `Invalid journal type: ${type}` });
      return;
    }
    const entry = await saveJournalEntry(req.userId!, type, req.body);
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export { router as journalsRoutes };

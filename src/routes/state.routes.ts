import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getFullState, performDayReset, importState } from '../services/state.service.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();
router.use(requireAuth);

// GET /api/v1/state
router.get('/', async (req: AuthRequest, res) => {
  try {
    const state = await getFullState(req.userId!);
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/state/day-reset
router.post('/day-reset', async (req: AuthRequest, res) => {
  try {
    const result = await performDayReset(req.userId!);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/state/import
router.post('/import', async (req: AuthRequest, res) => {
  try {
    const result = await importState(req.userId!, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export { router as stateRoutes };

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as habitsService from '../services/habits.service.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

// All habits routes require auth
router.use(requireAuth);

// GET /api/v1/habits
router.get('/', async (req: AuthRequest, res) => {
  try {
    const habits = await habitsService.getUserHabits(req.userId!);
    res.json(habits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/habits
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { templateId, order } = req.body;
    if (!templateId) {
      res.status(400).json({ error: 'templateId required' });
      return;
    }
    const habit = await habitsService.addHabit(req.userId!, templateId, order);
    res.status(201).json(habit);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/habits/reorder (batch update — must be before /:id)
router.put('/reorder', async (req: AuthRequest, res) => {
  try {
    const { habits } = req.body;
    if (!habits || !Array.isArray(habits)) {
      res.status(400).json({ error: 'habits array required' });
      return;
    }
    await habitsService.reorderHabits(req.userId!, habits);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/habits/:id
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const habit = await habitsService.updateHabit(req.userId!, req.params.id as string, req.body);
    res.json(habit);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// DELETE /api/v1/habits/:id
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await habitsService.deleteHabit(req.userId!, req.params.id as string);
    res.json({ success: true });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/v1/habits/:id/complete
router.post('/:id/complete', async (req: AuthRequest, res) => {
  try {
    const date = req.body.date || new Date().toISOString().split('T')[0];
    await habitsService.completeHabit(req.userId!, req.params.id as string, date);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/habits/:id/log
router.post('/:id/log', async (req: AuthRequest, res) => {
  try {
    const { date, text, durationMinutes } = req.body;
    if (!text) {
      res.status(400).json({ error: 'text required' });
      return;
    }
    const entry = await habitsService.addLogEntry(req.userId!, req.params.id as string, {
      date: date || new Date().toISOString().split('T')[0],
      text,
      durationMinutes,
    });
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/habits/:id/time
router.post('/:id/time', async (req: AuthRequest, res) => {
  try {
    const { minutes } = req.body;
    if (!minutes || minutes < 0) {
      res.status(400).json({ error: 'valid minutes required' });
      return;
    }
    await habitsService.addTime(req.userId!, req.params.id as string, minutes);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/habits/:id/checklist
router.put('/:id/checklist', async (req: AuthRequest, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      res.status(400).json({ error: 'items array required' });
      return;
    }
    await habitsService.updateChecklist(req.userId!, req.params.id as string, items);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export { router as habitsRoutes };

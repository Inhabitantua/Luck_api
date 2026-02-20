import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { adminLogin } from '../services/auth.service.js';
import { getDashboardStats, getUserList, getUserDetail } from '../services/admin.service.js';

const router = Router();

// GET /api/v1/admin/ping (debug)
router.get('/ping', (_req, res) => {
  res.json({ ping: 'pong', time: new Date().toISOString() });
});

// POST /api/v1/admin/login (no auth required)
router.post('/login', async (req, res) => {
  console.log('[admin/login] Request received, body:', JSON.stringify(req.body));
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'username and password required' });
      return;
    }
    const result = await adminLogin(username, password);
    console.log('[admin/login] Login success');
    res.json(result);
  } catch (err: any) {
    console.error('[admin/login] Caught error:', err.message);
    res.status(401).json({ error: err.message });
  }
});

// All routes below require admin auth
router.use(requireAdmin);

// GET /api/v1/admin/dashboard
router.get('/dashboard', async (_req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/users
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const result = await getUserList(page, limit, search);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/admin/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const result = await getUserDetail(req.params.id as string);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export { router as adminRoutes };

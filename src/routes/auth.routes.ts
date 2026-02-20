import { Router } from 'express';
import { authenticateWithGoogle, registerWithEmail, loginWithEmail, registerAnonymous, getUserProfile, updateProfile, changePassword } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

// POST /api/v1/auth/google
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: 'idToken required' });
      return;
    }
    const result = await authenticateWithGoogle(idToken);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email, and password required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    const result = await registerWithEmail(name, email, password);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }
    const result = await loginWithEmail(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// POST /api/v1/auth/anonymous
router.post('/anonymous', async (req, res) => {
  try {
    const { displayName } = req.body;
    const result = await registerAnonymous(displayName || 'Anonymous');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getUserProfile(req.userId!);
    res.json(user);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// PUT /api/v1/auth/profile
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { displayName, avatarUrl } = req.body;
    const user = await updateProfile(req.userId!, { displayName, avatarUrl });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/v1/auth/password
router.put('/password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'oldPassword and newPassword required' });
      return;
    }
    const result = await changePassword(req.userId!, oldPassword, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export { router as authRoutes };

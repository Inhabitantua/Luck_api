import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.routes.js';
import { habitsRoutes } from './routes/habits.routes.js';
import { journalsRoutes } from './routes/journals.routes.js';
import { stateRoutes } from './routes/state.routes.js';
import { onboardingRoutes } from './routes/onboarding.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { pool } from './config/database.js';

const app = express();

// ── Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    env.CORS_ORIGIN,
    'https://www.try-luck.com',
    'https://try-luck.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// ── Health Check ────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected', dbTime: result.rows[0].now });
  } catch (err: any) {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'error', dbError: err.message });
  }
});

// ── API Routes ──────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/habits', habitsRoutes);
app.use('/api/v1/journals', journalsRoutes);
app.use('/api/v1/state', stateRoutes);
app.use('/api/v1/onboarding', onboardingRoutes);
app.use('/api/v1/admin', adminRoutes);

// ── Error Handler ───────────────────────────────────────
app.use(errorHandler);

export { app };

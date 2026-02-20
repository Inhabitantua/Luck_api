import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthRequest } from '../types/index.js';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

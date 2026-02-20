import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AdminAuthRequest } from '../types/index.js';

export function requireAdmin(req: AdminAuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin token required' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as { adminId: string; role: string };
    if (payload.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    req.adminId = payload.adminId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

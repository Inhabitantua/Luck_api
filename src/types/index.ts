import type { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface AdminAuthRequest extends Request {
  adminId?: string;
}

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema.js';
import { env } from './env.js';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export const db = drizzle(pool, { schema });
export { pool };

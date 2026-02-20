import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema.js';
import { env } from './env.js';

// Remove channel_binding from connection string if present (causes issues with some drivers)
const connectionString = env.DATABASE_URL.replace(/[&?]channel_binding=[^&]*/g, '');

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

export const db = drizzle(pool, { schema });
export { pool };

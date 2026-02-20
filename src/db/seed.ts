import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { adminUsers } from './schema.js';
import { env } from '../config/env.js';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const existing = await db.select().from(adminUsers).where(eq(adminUsers.username, env.ADMIN_USERNAME)).limit(1);

  if (existing.length === 0) {
    const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    await db.insert(adminUsers).values({
      username: env.ADMIN_USERNAME,
      passwordHash: hash,
    });
    console.log(`✅ Admin user "${env.ADMIN_USERNAME}" created`);
  } else {
    console.log(`ℹ️  Admin user "${env.ADMIN_USERNAME}" already exists`);
  }

  console.log('🌱 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

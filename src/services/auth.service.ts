import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { users, adminUsers } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// ── Google OAuth ────────────────────────────────────────
export async function authenticateWithGoogle(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid Google token');
  }

  // Find or create user
  let [user] = await db.select().from(users).where(eq(users.googleId, payload.sub)).limit(1);

  if (!user) {
    // Check if user exists by email (maybe registered via email before)
    [user] = await db.select().from(users).where(eq(users.email, payload.email)).limit(1);

    if (user) {
      // Link Google account to existing user
      [user] = await db.update(users)
        .set({ googleId: payload.sub, avatarUrl: payload.picture, authMethod: 'google' })
        .where(eq(users.id, user.id))
        .returning();
    } else {
      // Create new user
      [user] = await db.insert(users).values({
        googleId: payload.sub,
        email: payload.email,
        displayName: payload.name || 'User',
        avatarUrl: payload.picture || null,
        authMethod: 'google',
      }).returning();
    }
  }

  // Update last_active
  await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, user.id));

  const token = createUserToken(user.id);
  return { token, user: sanitizeUser(user) };
}

// ── Email Registration ──────────────────────────────────
export async function registerWithEmail(name: string, email: string, password: string) {
  // Check if email already exists
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({
    email,
    displayName: name,
    authMethod: 'email',
    passwordHash,
  }).returning();

  const token = createUserToken(user.id);
  return { token, user: sanitizeUser(user) };
}

// ── Email Login ─────────────────────────────────────────
export async function loginWithEmail(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, user.id));

  const token = createUserToken(user.id);
  return { token, user: sanitizeUser(user) };
}

// ── Anonymous Registration ──────────────────────────────
export async function registerAnonymous(displayName: string) {
  const randomEmail = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}@anonymous.local`;
  const [user] = await db.insert(users).values({
    email: randomEmail,
    displayName: displayName || 'Anonymous',
    authMethod: 'anonymous',
  }).returning();

  const token = createUserToken(user.id);
  return { token, user: sanitizeUser(user) };
}

// ── Get User Profile ────────────────────────────────────
export async function getUserProfile(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('User not found');

  await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, user.id));
  return sanitizeUser(user);
}

// ── Admin Login ─────────────────────────────────────────
export async function adminLogin(username: string, password: string) {
  console.log('[adminLogin] Attempting login for:', username);

  let admin;
  try {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
    admin = result[0];
    console.log('[adminLogin] DB query complete, found:', !!admin);
  } catch (dbErr: any) {
    console.error('[adminLogin] Database error:', dbErr.message);
    throw new Error('Database connection error');
  }

  if (!admin) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { adminId: admin.id, role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  return { token, username: admin.username };
}

// ── Helpers ─────────────────────────────────────────────
function createUserToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '30d' });
}

function sanitizeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    authMethod: user.authMethod,
    createdAt: user.createdAt,
  };
}

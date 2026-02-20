import dotenv from 'dotenv';
dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Validate required env vars in production
if (env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'] as const;
  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

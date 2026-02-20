import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`
  🍀 Luck API Server running!
  ─────────────────────────────
  Port:        ${PORT}
  Environment: ${env.NODE_ENV}
  CORS Origin: ${env.CORS_ORIGIN}
  ─────────────────────────────
  Health:      http://localhost:${PORT}/health
  API:         http://localhost:${PORT}/api/v1
  `);
});

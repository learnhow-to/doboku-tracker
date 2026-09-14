import { app } from './app.js';
import { config } from './config/env.js';
import { getDatabase } from './config/database.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';

async function startServer() {
  try {
    console.log(`[DOBOKUTRACKER] Starting backend server in ${config.nodeEnv} mode...`);
    
    // Initialize database
    const db = await getDatabase();
    await runMigrations();

    // In development mode, auto-seed if empty
    if (config.nodeEnv === 'development' || config.demoModeAllowed) {
      await seedDatabase();
    }

    app.listen(config.port, () => {
      console.log(`[DOBOKUTRACKER] Server listening on port ${config.port}`);
      console.log(`[DOBOKUTRACKER] Health check: http://localhost:${config.port}/api/auth/health`);
    });
  } catch (err) {
    console.error('[DOBOKUTRACKER] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();

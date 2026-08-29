import { app } from './app.js';
import { initializeDatabase } from './db/schema.js';
import { seedDatabase } from './db/seed.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  try {
    await initializeDatabase();
    await seedDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[READY] Wanderly TypeScript REST API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err);
    process.exit(1);
  }
}

start();

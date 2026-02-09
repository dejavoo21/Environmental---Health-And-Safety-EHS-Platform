const app = require('./app');
const { port } = require('./config/env');
const { pool } = require('./config/db');
const { initializeScheduler, stopScheduler } = require('./jobs/scheduler');

async function start() {
  try {
    await pool.query('SELECT 1');

    // Initialize scheduled jobs (Phase 4)
    initializeScheduler();

    const server = app.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });

    // Graceful shutdown logic removed for debugging
  } catch (err) {
    console.error('Failed to connect to database', err);
    process.exit(1);
  }
}

start();

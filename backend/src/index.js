const app = require('./app');
const { port } = require('./config/env');
const { pool } = require('./config/db');
const { initializeScheduler } = require('./jobs/scheduler');
const fs = require('fs');
const path = require('path');

// Start server immediately without waiting for database
const server = app.listen(port || 3001, () => {
  console.log(`API listening on port ${port || 3001}`);
});

// Try to connect to database asynchronously
let dbConnected = false;

async function runMigrations() {
  try {
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    
    const client = await pool.connect();
    await client.query('BEGIN');
    
    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log(`[Migration] Applied ${file}`);
    }
    
    await client.query('COMMIT');
    console.log('[Migrations] All migrations completed successfully');
    client.release();
    return true;
  } catch (err) {
    console.error('[Migrations] Error:', err.message);
    // Don't throw - migrations might have already been applied
    return false;
  }
}

async function checkDatabase() {
  while (!dbConnected) {
    try {
      await pool.query('SELECT 1');
      dbConnected = true;
      console.log('Database connected successfully');
      
      // Run migrations after first successful connection
      await runMigrations();
      
      // Initialize scheduled jobs only after DB connects
      initializeScheduler();
      break;
    } catch (err) {
      console.log('Database connection failed, retrying in 5s:', err.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Start database check in background
checkDatabase();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection] Promise:', promise);
  console.error('[Unhandled Rejection] Reason:', reason);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
  // Don't exit - let the server continue running
});

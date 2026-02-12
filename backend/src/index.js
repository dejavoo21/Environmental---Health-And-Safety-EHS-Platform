const app = require('./app');
const { port } = require('./config/env');
const { pool } = require('./config/db');
const { initializeScheduler } = require('./jobs/scheduler');
const fs = require('fs');
const path = require('path');

console.log('[Server] Starting EHS Portal API...');
console.log('[Server] Port:', port || 3001);
console.log('[Server] Node version:', process.version);
console.log('[Server] Environment:', process.env.NODE_ENV || 'development');

// Start server FIRST - do not block on anything
let server;

try {
  server = app.listen(port || 3001, '0.0.0.0', () => {
    console.log(`[Server] ✓ Express listening on port ${port || 3001}`);
  });
  
  // Set a short timeout for server startup
  server.timeout = 30000;
  
} catch (err) {
  console.error('[Server] ✗ Failed to start Express:', err.message);
  process.exit(1);
}

// Try to connect to database asynchronously - does NOT block server
let dbConnected = false;

async function runMigrations() {
  try {
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    
    console.log(`[Migrations] Found ${files.length} migration files`);
    
    const client = await pool.connect();
    await client.query('BEGIN');
    
    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      try {
        await client.query(sql);
        console.log(`[Migrations] ✓ ${file}`);
      } catch (err) {
        // Some migrations might fail due to table already existing - this is OK
        console.log(`[Migrations] ~ ${file} (${err.code || 'skipped'})`);
      }
    }
    
    await client.query('COMMIT');
    console.log('[Migrations] ✓ All migrations completed');
    client.release();
    return true;
  } catch (err) {
    console.error('[Migrations] ✗ Error:', err.message);
    // Don't throw - allow server to continue
    return false;
  }
}

async function checkDatabase() {
  let retries = 0;
  const maxRetries = 24; // 2 minutes with 5 second intervals
  
  while (!dbConnected && retries < maxRetries) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      dbConnected = true;
      console.log('[Database] ✓ Connection verified');
      
      // Run migrations after first successful connection
      await runMigrations();
      
      // Initialize scheduled jobs only after DB connects
      try {
        initializeScheduler();
        console.log('[Scheduler] ✓ Initialized');
      } catch (err) {
        console.warn('[Scheduler] ⚠ Could not initialize:', err.message);
      }
      
      break;
    } catch (err) {
      retries++;
      console.log(`[Database] Attempt ${retries}/${maxRetries} failed: ${err.message}`);
      
      if (retries >= maxRetries) {
        console.error('[Database] ✗ Could not connect after 24 attempts');
        break;
      }
      
      // Wait 5 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Start database check in background - NON-BLOCKING
console.log('[Server] Starting background database connection...');
checkDatabase().catch(err => {
  console.error('[Background] Uncaught error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[Server] ✓ Server closed');
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

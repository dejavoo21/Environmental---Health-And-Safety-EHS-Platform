const app = require('./app');
const { port } = require('./config/env');
const { pool } = require('./config/db');
const { initializeScheduler } = require('./jobs/scheduler');

// Start server immediately without waiting for database
const server = app.listen(port || 3001, () => {
  console.log(`API listening on port ${port || 3001}`);
});

// Try to connect to database asynchronously
let dbConnected = false;

async function checkDatabase() {
  while (!dbConnected) {
    try {
      await pool.query('SELECT 1');
      dbConnected = true;
      console.log('Database connected successfully');
      
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

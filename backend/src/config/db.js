const { Pool } = require('pg');
const env = require('./env');

// Enhanced logging for Railway debugging
const dbConfig = env.databaseUrl
  ? { connectionString: env.databaseUrl }
  : {
      host: env.dbHost,
      port: env.dbPort,
      database: env.dbName,
      user: env.dbUser,
      password: env.dbPassword,
    };

console.log('[DB Config]', {
  usingConnectionString: !!env.databaseUrl,
  host: env.dbHost,
  port: env.dbPort,
  db: env.dbName,
  connectionStringFirstChars: env.databaseUrl ? env.databaseUrl.substring(0, 30) + '...' : 'N/A'
});

const pool = new Pool({
  ...dbConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB Pool Error]', {
    message: err.message,
    code: err.code,
    severity: err.severity,
  });
});

pool.on('connect', () => {
  console.log('[DB Connected]', 'Successfully connected to database');
});

pool.on('remove', () => {
  console.log('[DB Pool]', 'Connection removed from pool');
});

const query = (text, params) => pool.query(text, params);

const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, withTransaction };

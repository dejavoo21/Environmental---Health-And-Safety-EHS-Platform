const { Pool } = require('pg');
const env = require('./env');

console.log('DB Config:', {
  hasDatabaseUrl: !!env.databaseUrl,
  dbHost: env.dbHost,
  dbPort: env.dbPort,
  dbName: env.dbName,
  dbUser: env.dbUser
});

const pool = env.databaseUrl
  ? new Pool({ 
      connectionString: env.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: env.dbHost,
      port: env.dbPort,
      database: env.dbName,
      user: env.dbUser,
      password: env.dbPassword,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

pool.on('connect', () => {
  console.log('Database connection established');
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

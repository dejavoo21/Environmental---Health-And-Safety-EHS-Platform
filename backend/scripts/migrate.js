const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env = require('../src/config/env');

const pool = env.databaseUrl
  ? new Pool({ connectionString: env.databaseUrl })
  : new Pool({
      host: env.dbHost,
      port: env.dbPort,
      database: env.dbName,
      user: env.dbUser,
      password: env.dbPassword
    });

const run = async () => {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
    console.log('Migration applied');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

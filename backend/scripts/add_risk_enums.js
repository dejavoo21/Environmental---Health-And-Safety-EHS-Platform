/**
 * Add risk-related enum values to auditable_entity_type
 */
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
  const client = await pool.connect();
  try {
    const values = ['risk', 'risk_category', 'risk_control', 'risk_review'];
    
    for (const value of values) {
      try {
        await client.query(`ALTER TYPE auditable_entity_type ADD VALUE IF NOT EXISTS '${value}'`);
        console.log(`Added enum value: ${value}`);
      } catch (err) {
        if (err.code === '42710') {
          console.log(`Enum value already exists: ${value}`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('Enum values updated successfully');
  } catch (err) {
    console.error('Failed to add enum values:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

/**
 * Run Phase 10 Migration
 * Creates SSO, API Clients, Webhooks, and Integration Events tables
 */

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
  const client = await pool.connect();
  try {
    console.log('Running Phase 10 migration...');
    
    const migrationPath = path.resolve(__dirname, '../migrations/010_phase10_integrations.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Phase 10 migration completed successfully');
    
    // Verify tables exist
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sso_providers', 'sso_mappings', 'sso_states', 'sso_login_attempts', 
                         'api_clients', 'api_request_logs', 'webhooks', 'webhook_events', 'integration_events')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Phase 10 tables created:');
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
  } catch (err) {
    console.error('❌ Phase 10 migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

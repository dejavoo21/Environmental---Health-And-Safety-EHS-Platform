/**
 * Add Phase 10 integration-related enum values to auditable_entity_type
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'ehs_portal_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function addEnums() {
  const client = await pool.connect();
  try {
    console.log('Adding Phase 10 enum values to auditable_entity_type...');
    
    // Add api_client
    await client.query(`ALTER TYPE auditable_entity_type ADD VALUE IF NOT EXISTS 'api_client'`);
    console.log('  ✓ Added api_client');
    
    // Add webhook
    await client.query(`ALTER TYPE auditable_entity_type ADD VALUE IF NOT EXISTS 'webhook'`);
    console.log('  ✓ Added webhook');
    
    // Add sso_provider
    await client.query(`ALTER TYPE auditable_entity_type ADD VALUE IF NOT EXISTS 'sso_provider'`);
    console.log('  ✓ Added sso_provider');
    
    console.log('Done!');
  } catch (error) {
    console.error('Error adding enum values:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addEnums();

/**
 * Run Phase 9 Risk Register Migration
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  require('dotenv').config();
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'P@ssw0rd',
    database: process.env.DB_NAME || 'ehs_portal_dev'
  });

  try {
    const migrationPath = path.join(__dirname, '../migrations/009_phase9_risk_register.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running Phase 9 Risk Register migration...');
    await pool.query(sql);
    console.log('✅ Phase 9 migration completed successfully!');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('risks', 'risk_categories', 'risk_controls', 'risk_links', 'risk_reviews')
    `);
    
    console.log('\n✅ Phase 9 tables created:');
    result.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
  } catch (err) {
    console.error('Migration error:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

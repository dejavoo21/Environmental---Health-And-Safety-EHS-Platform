const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ehs_portal_dev',
  user: 'postgres',
  password: 'P@ssw0rd'
});

async function checkData() {
  // Check incidents count
  const incidents = await pool.query('SELECT COUNT(*) as count FROM incidents WHERE organisation_id = $1', ['7455092b-c0fe-4582-a2e8-30ec3a104589']);
  console.log('Incidents:', incidents.rows[0].count);
  
  // Check incidents with date range
  const rangeTest = await pool.query(`
    SELECT COUNT(*) as count FROM incidents 
    WHERE organisation_id = $1 
    AND occurred_at >= $2
    AND occurred_at <= $3
  `, ['7455092b-c0fe-4582-a2e8-30ec3a104589', '2025-11-07', '2026-02-05']);
  console.log('Incidents with date range comparison:', rangeTest.rows[0].count);
  
  // Check incidents with date range (end of day)
  const rangeTest2 = await pool.query(`
    SELECT COUNT(*) as count FROM incidents 
    WHERE organisation_id = $1 
    AND occurred_at >= $2
    AND occurred_at <= ($3::date + INTERVAL '1 day')
  `, ['7455092b-c0fe-4582-a2e8-30ec3a104589', '2025-11-07', '2026-02-05']);
  console.log('Incidents with end of day:', rangeTest2.rows[0].count);
  
  pool.end();
}

checkData().catch(console.error);

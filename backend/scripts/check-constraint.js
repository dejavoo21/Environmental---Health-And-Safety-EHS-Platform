const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ehs_portal_dev',
  user: 'postgres',
  password: 'P@ssw0rd'
});

async function checkConstraint() {
  const result = await pool.query(
    "SELECT conname, pg_get_constraintdef(oid) as definition FROM pg_constraint WHERE conrelid = 'site_risk_scores'::regclass AND contype = 'c'"
  );
  console.log('Check constraints:', result.rows);
  pool.end();
}

checkConstraint();

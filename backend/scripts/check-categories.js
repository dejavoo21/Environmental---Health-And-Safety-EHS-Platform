// Check risk categories
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

pool.query('SELECT id, name, organisation_id FROM risk_categories')
  .then(r => {
    console.log('Risk Categories:');
    r.rows.forEach(row => console.log(row.id, row.name, 'org:', row.organisation_id));
    pool.end();
  })
  .catch(e => {
    console.error(e);
    pool.end();
  });

// Check users table columns
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
  .then(r => {
    console.log('Users columns:', r.rows.map(row => row.column_name));
    pool.end();
  })
  .catch(e => {
    console.error(e);
    pool.end();
  });

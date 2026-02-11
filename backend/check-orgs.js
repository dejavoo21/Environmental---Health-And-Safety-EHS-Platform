const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:KwnfxUjsjaelJoNZTfmPkCbWjybMruxp@shuttle.proxy.rlwy.net:36736/railway'
});

const run = async () => {
  const client = await pool.connect();
  try {
    console.log('\n📋 Access Requests table columns:\n');
    const result = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_name = 'access_requests' ORDER BY ordinal_position;`
    );
    
    if (result.rowCount === 0) {
      console.log('❌ access_requests table not found!');
    } else {
      console.log('Column Name | Data Type');
      console.log('---|---');
      result.rows.forEach(col => {
        console.log(`${col.column_name} | ${col.data_type}`);
      });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
};

run();

/**
 * Quick user seeding script
 * Creates default users for testing
 */

const bcrypt = require('bcryptjs');
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
    // Get the default organisation
    const orgResult = await client.query(
      `SELECT id FROM organisations WHERE slug = 'default-org' LIMIT 1`
    );
    
    if (orgResult.rowCount === 0) {
      console.log('❌ Default organisation not found. Run seed.js first.');
      process.exitCode = 1;
      return;
    }
    
    const orgId = orgResult.rows[0].id;
    console.log('✓ Found organisation:', orgId);

    // Create password hashes
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const managerHash = await bcrypt.hash('Manager123!', 10);
    const workerHash = await bcrypt.hash('Worker123!', 10);

    // Create users
    const users = [
      { email: 'admin@ehs.local', name: 'Admin User', role: 'admin', hash: adminHash },
      { email: 'manager@ehs.local', name: 'Manager User', role: 'manager', hash: managerHash },
      { email: 'worker@ehs.local', name: 'Worker User', role: 'worker', hash: workerHash }
    ];

    let createdCount = 0;
    for (const user of users) {
      try {
        const result = await client.query(
          `INSERT INTO users (email, name, password_hash, role, organisation_id, is_active)
           VALUES ($1, $2, $3, $4, $5, TRUE)
           ON CONFLICT (organisation_id, email) DO UPDATE 
           SET password_hash = $3, name = $2, is_active = TRUE
           RETURNING id`,
          [user.email, user.name, user.hash, user.role, orgId]
        );
        
        if (result.rowCount > 0) {
          createdCount++;
          console.log(`✓ ${user.role.toUpperCase()}: ${user.email}`);
        }
      } catch (err) {
        console.error(`✗ Failed to create user ${user.email}:`, err.message);
      }
    }

    console.log(`\n✓ Created/updated ${createdCount} users`);
    console.log('\nYou can now login with:');
    console.log('  Email: admin@ehs.local');
    console.log('  Password: Admin123!');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

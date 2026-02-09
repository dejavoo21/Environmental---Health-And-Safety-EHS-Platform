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
    await client.query('BEGIN');

    // Create default organisation if not exists (Phase 3)
    const defaultSettings = {
      dashboard: {
        openIncidentsWarning: 5,
        openIncidentsCritical: 10,
        overdueActionsWarning: 3,
        overdueActionsCritical: 5,
        failedInspectionsWarning: 2,
        failedInspectionsCritical: 5
      }
    };

    const orgResult = await client.query(
      `INSERT INTO organisations (name, slug, timezone, settings)
       VALUES ('Default Organisation', 'default-org', 'UTC', $1)
       ON CONFLICT (slug) DO UPDATE SET name = 'Default Organisation'
       RETURNING id`,
      [JSON.stringify(defaultSettings)]
    );
    const orgId = orgResult.rows[0].id;
    console.log('Organisation created/updated with ID:', orgId);

    const adminHash = await bcrypt.hash('Admin123!', 10);
    const managerHash = await bcrypt.hash('Manager123!', 10);
    const workerHash = await bcrypt.hash('Worker123!', 10);

    // Create users with organisation_id (Phase 3)
    await client.query(
      `INSERT INTO users (email, name, password_hash, role, organisation_id, is_active)
       VALUES
       ('admin@ehs.local', 'Admin User', $1, 'admin', $4, TRUE),
       ('manager@ehs.local', 'Manager User', $2, 'manager', $4, TRUE),
       ('worker@ehs.local', 'Worker User', $3, 'worker', $4, TRUE)
       ON CONFLICT (organisation_id, email) DO NOTHING`,
      [adminHash, managerHash, workerHash, orgId]
    );

    // Create sites with organisation_id (Phase 3)
    await client.query(
      `INSERT INTO sites (name, code, organisation_id)
       VALUES
       ('Head Office', 'HO', $1),
       ('Warehouse 1', 'WH1', $1),
       ('Distribution Center', 'DC1', $1)
       ON CONFLICT DO NOTHING`,
      [orgId]
    );

    // Create system incident types (is_system = true, org_id = null)
    await client.query(
      `INSERT INTO incident_types (name, description, is_system, organisation_id)
       VALUES
       ('Injury', 'Physical injury to person', TRUE, NULL),
       ('Near Miss', 'Close call without injury', TRUE, NULL),
       ('Property Damage', 'Damage to equipment or property', TRUE, NULL),
       ('Environmental', 'Spill, emission, or environmental impact', TRUE, NULL),
       ('Other', 'Other safety event', TRUE, NULL)
       ON CONFLICT (name) DO UPDATE SET is_system = TRUE`
    );

    await client.query('COMMIT');
    console.log('Seed data inserted');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

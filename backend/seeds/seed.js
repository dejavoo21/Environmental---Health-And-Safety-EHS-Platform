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
    // Note: country_code, city, timezone, latitude, longitude may not exist in all versions
    const siteInsertQuery = `
      INSERT INTO sites (name, code, organisation_id)
      VALUES
      ('Head Office', 'HO', $1),
      ('Warehouse 1', 'WH1', $1),
      ('Warehouse 2', 'WH2', $1),
      ('Distribution Center', 'DC1', $1)
      ON CONFLICT DO NOTHING
    `;
    await client.query(siteInsertQuery, [orgId]);

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

    // Create safety moments for different categories (Phase 11)
    const safetyMoments = [
      {
        title: 'Ladder Safety',
        body: 'Always maintain 3 points of contact when climbing ladders. Never skip steps or lean too far to the side. Ensure the ladder is on stable, level ground before use.',
        category: 'ladder_safety'
      },
      {
        title: 'Warehouse Safety',
        body: 'Keep aisles clear and free from obstacles. Use proper lifting techniques - bend your knees, keep your back straight. Never overload shelves. Report damaged equipment immediately.',
        category: 'warehouse_safety'
      },
      {
        title: 'PPE Compliance',
        body: 'Personal Protective Equipment (PPE) is mandatory in all designated areas. Inspect PPE before use for damage. Replace any damaged PPE immediately. Proper fit is essential for protection.',
        category: 'ppe_compliance'
      },
      {
        title: 'Hazard Communication',
        body: 'Familiarize yourself with all Safety Data Sheets (SDS) for chemicals used in your area. Know the location of emergency eyewash and shower stations. Report chemical spills immediately to your supervisor.',
        category: 'chemical_safety'
      },
      {
        title: 'Emergency Procedures',
        body: 'Know the location of all emergency exits and assembly points. Participate in all emergency drills. In case of emergency, follow your supervisor\'s instructions and help evacuate others.',
        category: 'emergency_procedures'
      },
      {
        title: 'Electrical Safety',
        body: 'Never work on electrical equipment unless trained and authorized. Report damaged cords, plugs, or equipment. Keep electrical equipment away from water. Lock out/tag out equipment before maintenance.',
        category: 'electrical_safety'
      },
      {
        title: 'Manual Handling',
        body: 'Assess the load before lifting. Use mechanical aids when available. Keep loads close to your body. Ask for help with heavy items. Take breaks to prevent fatigue-related injuries.',
        category: 'manual_handling'
      },
      {
        title: 'Machine Safety',
        body: 'Never remove or disable safety guards. Keep hands and hair clear of moving parts. Report malfunctions to your supervisor. Never operate equipment without proper training and authorization.',
        category: 'machine_safety'
      }
    ];

    const sitesResult = await client.query('SELECT id FROM sites WHERE organisation_id = $1', [orgId]);
    const sites = sitesResult.rows;

    // Insert safety moments for each organization and site
    for (const moment of safetyMoments) {
      try {
        await client.query(
          `INSERT INTO safety_moments (title, body, category, is_active, organisation_id)
           VALUES ($1, $2, $3, TRUE, $4)`,
          [moment.title, moment.body, moment.category, orgId]
        );
      } catch (err) {
        // Silently ignore duplicates or if table doesn't exist
        if (err.code !== '23505' && err.code !== '42P01') {
          console.warn('Warning: Failed to insert safety moment:', err.message);
        }
      }
    }
    console.log('Created', safetyMoments.length, 'safety moments');

    // Create site legislation references (Phase 11)
    // Add legislation to each site
    const legislationForAllSites = [
      {
        title: 'Health and Safety at Work etc. Act 1974',
        jurisdiction: 'GB',
        category: 'primary_legislation',
        reference_url: 'https://www.legislation.gov.uk/ukpga/1974/37'
      },
      {
        title: 'Management of Health and Safety at Work Regulations 1999',
        jurisdiction: 'GB',
        category: 'management',
        reference_url: 'https://www.legislation.gov.uk/uksi/1999/3242'
      },
      {
        title: 'Manual Handling Operations Regulations 1992',
        jurisdiction: 'GB',
        category: 'manual_handling',
        reference_url: 'https://www.legislation.gov.uk/uksi/1992/2793'
      },
      {
        title: 'Personal Protective Equipment (PPE) Regulations 2002',
        jurisdiction: 'GB',
        category: 'ppe',
        reference_url: 'https://www.legislation.gov.uk/uksi/2002/1144'
      },
      {
        title: 'Workplace (Health, Safety and Welfare) Regulations 1992',
        jurisdiction: 'GB',
        category: 'workplace',
        reference_url: 'https://www.legislation.gov.uk/uksi/1992/3004'
      }
    ];

    // Insert legislation for each site
    for (const site of sites) {
      for (const leg of legislationForAllSites) {
        try {
          await client.query(
            `INSERT INTO site_legislation_refs (site_id, organisation_id, title, jurisdiction, category, reference_url, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
            [site.id, orgId, leg.title, leg.jurisdiction, leg.category, leg.reference_url]
          );
        } catch (err) {
          // If table doesn't exist or already exists, skip silently
          if (err.code === '42P01' || err.code === '23505') {
            // OK - either table doesn't exist or record already exists
          } else {
            console.warn('Failed to insert legislation for site:', err.message);
          }
        }
      }
    }
    console.log('Created legislation references for all sites');


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

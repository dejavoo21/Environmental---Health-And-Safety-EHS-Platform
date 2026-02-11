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

    // Create sites with organisation_id and location fields (Phase 3, 11.5)
    await client.query(
      `INSERT INTO sites (name, code, organisation_id, country_code, city, timezone, latitude, longitude)
       VALUES
       ('Head Office', 'HO', $1, 'GB', 'Manchester', 'Europe/London', 53.4808, -2.2426),
       ('Warehouse 1', 'WH1', $1, 'GB', 'Birmingham', 'Europe/London', 52.4862, -1.8904),
       ('Warehouse 2', 'WH2', $1, 'CA', 'Toronto', 'America/Toronto', 43.6629, -79.3957),
       ('Distribution Center', 'DC1', $1, 'GB', 'London', 'Europe/London', 51.5074, -0.1278)
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
      await client.query(
        `INSERT INTO safety_moments (title, body, category, is_active, organisation_id)
         VALUES ($1, $2, $3, TRUE, $4)
         ON CONFLICT (organisation_id, title) DO NOTHING`,
        [moment.title, moment.body, moment.category, orgId]
      );
    }
    console.log('Created', safetyMoments.length, 'safety moments');

    // Create legislation references (Phase 11)
    const legislationRefs = [
      {
        title: 'Health and Safety at Work etc. Act 1974',
        description: 'Primary UK health and safety legislation',
        country: 'GB',
        category: 'primary_legislation'
      },
      {
        title: 'Management of Health and Safety at Work Regulations 1999',
        description: 'Requires employers to manage risks and consult with workers',
        country: 'GB',
        category: 'management'
      },
      {
        title: 'Manual Handling Operations Regulations 1992',
        description: 'Covers safe lifting and manual material handling',
        country: 'GB',
        category: 'manual_handling'
      },
      {
        title: 'Personal Protective Equipment (PPE) Regulations 2002',
        description: 'Requirements for provision and use of protective equipment',
        country: 'GB',
        category: 'ppe'
      },
      {
        title: 'Workplace (Health, Safety and Welfare) Regulations 1992',
        description: 'Standards for safe working environment',
        country: 'GB',
        category: 'workplace'
      },
      {
        title: 'Provision and Use of Work Equipment Regulations (PUWER) 1998',
        description: 'Requirements for safe use of machinery and equipment',
        country: 'GB',
        category: 'equipment'
      },
      {
        title: 'Occupational Health and Safety Act (Canada)',
        description: 'Canadian legislation for workplace safety',
        country: 'CA',
        category: 'primary_legislation'
      },
      {
        title: 'Occupational Safety and Health Act (USA)',
        description: 'US federal legislation for workplace safety',
        country: 'US',
        category: 'primary_legislation'
      },
      {
        title: 'Occupational Health and Safety Act (South Africa)',
        description: 'South African legislation for workplace safety',
        country: 'ZA',
        category: 'primary_legislation'
      }
    ];

    for (const ref of legislationRefs) {
      await client.query(
        `INSERT INTO legislation_references (title, description, country_code, category, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT DO NOTHING`,
        [ref.title, ref.description, ref.country, ref.category]
      );
    }
    console.log('Created', legislationRefs.length, 'legislation references');

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

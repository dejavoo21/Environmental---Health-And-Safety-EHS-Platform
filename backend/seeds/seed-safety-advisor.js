/**
 * Seed script for Safety Advisor Phase 11 data
 * Specifically seeds legislation and safety moments for testing
 */

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

    // Get or create default organisation
    let orgResult = await client.query(
      `SELECT id FROM organisations WHERE slug = 'default-org' LIMIT 1`
    );
    
    if (orgResult.rowCount === 0) {
      console.log('No default organisation found. Run seed.js first.');
      await client.query('ROLLBACK');
      process.exitCode = 1;
      return;
    }
    
    const orgId = orgResult.rows[0].id;
    console.log('Found organisation:', orgId);

    // Get all sites for the organisation
    const sitesResult = await client.query(
      `SELECT id, name FROM sites WHERE organisation_id = $1`,
      [orgId]
    );

    if (sitesResult.rowCount === 0) {
      console.log('No sites found. Run seed.js first.');
      await client.query('ROLLBACK');
      process.exitCode = 1;
      return;
    }

    const sites = sitesResult.rows;
    console.log(`Found ${sites.length} sites`);

    // Seed legislation for each site
    const legislation = [
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

    let legislationCount = 0;
    for (const site of sites) {
      for (const leg of legislation) {
        try {
          const result = await client.query(
            `INSERT INTO site_legislation_refs (site_id, organisation_id, title, jurisdiction, category, reference_url, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE)
             RETURNING id`,
            [site.id, orgId, leg.title, leg.jurisdiction, leg.category, leg.reference_url]
          );
          
          if (result.rowCount > 0) {
            legislationCount++;
            console.log(`  ✓ Added "${leg.title}" to ${site.name}`);
          }
        } catch (err) {
          if (err.code === '23505') {
            // Duplicate entry - OK
          } else if (err.code === '42P01') {
            console.warn(`  ⚠ Table site_legislation_refs does not exist. Run migrations first.`);
            break;
          } else {
            console.error(`  ✗ Error adding legislation: ${err.message}`);
          }
        }
      }
    }
    console.log(`\nCreated ${legislationCount} legislation entries`);

    // Ensure safety moments exist for the organisation
    const safetyMoments = [
      {
        title: 'Ladder Safety',
        body: 'Always maintain 3 points of contact when climbing ladders. Never skip steps or lean too far to the side.',
        category: 'ladder_safety'
      },
      {
        title: "Today's Focus: Situational Awareness",
        body: 'Be aware of your surroundings and potential hazards. Report any unsafe conditions immediately.',
        category: 'situational_awareness'
      },
      {
        title: 'PPE Requirements',
        body: 'Personal Protective Equipment is mandatory in all designated work areas. Ensure proper fit and condition.',
        category: 'ppe_compliance'
      }
    ];

    let momentCount = 0;
    for (const moment of safetyMoments) {
      try {
        const result = await client.query(
          `INSERT INTO safety_moments (title, body, category, is_active, organisation_id)
           VALUES ($1, $2, $3, TRUE, $4)
           RETURNING id`,
          [moment.title, moment.body, moment.category, orgId]
        );
        
        if (result.rowCount > 0) {
          momentCount++;
          console.log(`  ✓ Created safety moment: "${moment.title}"`);
        }
      } catch (err) {
        if (err.code === '23505') {
          console.log(`  - Safety moment already exists: "${moment.title}"`);
        } else if (err.code === '42P01') {
          console.warn(`  ⚠ Table safety_moments does not exist. Run migrations first.`);
          break;
        } else {
          console.error(`  ✗ Error creating safety moment: ${err.message}`);
        }
      }
    }
    console.log(`\nCreated ${momentCount} safety moments`);

    await client.query('COMMIT');
    console.log('\n✓ Safety Advisor seed data applied successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n✗ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

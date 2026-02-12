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
      },
      // Kenya legislation
      {
        title: 'Occupational Safety and Health Act 2007',
        jurisdiction: 'KE',
        category: 'primary_legislation',
        reference_url: 'https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=78055'
      },
      {
        title: 'Kenya Safety and Health Rules',
        jurisdiction: 'KE',
        category: 'management',
        reference_url: 'https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=82658'
      },
      {
        title: 'Factories Act Cap 514',
        jurisdiction: 'KE',
        category: 'workplace',
        reference_url: 'https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=78020'
      },
      // Nigeria legislation
      {
        title: 'Factories Act',
        jurisdiction: 'NG',
        category: 'primary_legislation',
        reference_url: 'https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=91155'
      },
      {
        title: 'Occupational Safety and Health Convention Application',
        jurisdiction: 'NG',
        category: 'management',
        reference_url: 'https://www.ilo.org/dyn/natlex'
      },
      {
        title: 'Labour Act 2004',
        jurisdiction: 'NG',
        category: 'workplace',
        reference_url: 'https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=67889'
      },
      // Ghana legislation
      {
        title: 'Safety and Health at Work Law NRCD 54',
        jurisdiction: 'GH',
        category: 'primary_legislation',
        reference_url: 'https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=98149'
      },
      {
        title: 'Labour Act 2003',
        jurisdiction: 'GH',
        category: 'management',
        reference_url: 'https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=76773'
      },
      {
        title: 'Factories Offices and Shops Act 1970',
        jurisdiction: 'GH',
        category: 'workplace',
        reference_url: 'https://www.ilo.org/dyn/natlex'
      },
      // UAE legislation
      {
        title: 'Federal Law No. 8 of 1980 (Labour Law)',
        jurisdiction: 'AE',
        category: 'primary_legislation',
        reference_url: 'https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=84906'
      },
      {
        title: 'Health and Safety Regulations',
        jurisdiction: 'AE',
        category: 'management',
        reference_url: 'https://www.ilo.org/dyn/natlex'
      },
      {
        title: 'Workplace Health and Safety Standards',
        jurisdiction: 'AE',
        category: 'workplace',
        reference_url: 'https://www.ilo.org/dyn/natlex'
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
      },
      // Kenya-specific safety moments
      {
        title: 'Heat Illness Prevention - Kenya',
        body: 'In high temperature environments, drink plenty of water, take frequent breaks in shade, and monitor yourself for dizziness or heat exhaustion.',
        category: 'heat_safety'
      },
      {
        title: 'Safari/Wildlife Area Safety - Kenya',
        body: 'When working near wildlife areas, never approach animals, follow park regulations, and work in pairs when in remote locations.',
        category: 'environmental_safety'
      },
      // Nigeria-specific safety moments
      {
        title: 'Humid Climate Safety - Nigeria',
        body: 'High humidity increases heat stress risk. Ensure adequate ventilation, hydration stations, and respiratory protection where needed.',
        category: 'climate_safety'
      },
      {
        title: 'Road Safety - Nigeria',
        body: 'When traveling to/from work sites, always wear seatbelts, avoid driving at night when possible, and report unsafe road conditions.',
        category: 'travel_safety'
      },
      // Ghana-specific safety moments
      {
        title: 'Mining Area Safety - Ghana',
        body: 'For sites near mining operations, ensure proper ventilation, regular air quality monitoring, and dust suppression systems are operational.',
        category: 'mining_safety'
      },
      {
        title: 'Tropical Disease Prevention - Ghana',
        body: 'Protect yourself from malaria, dengue, and other tropical diseases. Use insect repellent, wear long sleeves in humid areas, and report fever symptoms immediately.',
        category: 'health_safety'
      },
      // UAE-specific safety moments
      {
        title: 'Extreme Heat Protection - UAE',
        body: 'During peak heat (May-September), mandatory work breaks apply. Avoid outdoor work 12:30pm-3:30pm. Drink 500ml water every 30 minutes.',
        category: 'heat_safety'
      },
      {
        title: 'Desert Work Safety - UAE',
        body: 'When working in desert environments, ensure adequate sun protection, emergency supplies of water, and regular communication with base camp.',
        category: 'desert_safety'
      },
      {
        title: 'Construction Site Safety - UAE',
        body: 'Follow all UAE labour law requirements for construction sites. Ensure scaffolding inspections, hard hat compliance, and proper ventilation in confined spaces.',
        category: 'construction_safety'
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

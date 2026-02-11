#!/usr/bin/env node

/**
 * Production Database Seeding Script
 * 
 * Usage:
 *   node seeds/seed-production.js <DATABASE_URL>
 * 
 * Example:
 *   node seeds/seed-production.js "postgresql://user:pass@host:5432/dbname"
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Get DATABASE_URL from command line argument or environment
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not provided');
  console.error('\nUsage:');
  console.error('  node seeds/seed-production.js "postgresql://user:pass@host:5432/dbname"');
  console.error('\nOr set DATABASE_URL environment variable and run:');
  console.error('  node seeds/seed-production.js');
  process.exit(1);
}

console.log('🔧 Connecting to production database...');
const pool = new Pool({ connectionString: DATABASE_URL });

const run = async () => {
  const client = await pool.connect();
  try {
    // ========================================================================
    // STEP 1: Ensure Default Organisation Exists
    // ========================================================================
    console.log('\n📋 Step 1: Checking organisation...');
    
    let orgResult = await client.query(
      `SELECT id FROM organisations WHERE slug = 'default-org' LIMIT 1`
    );
    
    let orgId;
    if (orgResult.rowCount === 0) {
      console.log('  Creating default organisation...');
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
      
      const newOrgResult = await client.query(
        `INSERT INTO organisations (name, slug, timezone, settings)
         VALUES ('Default Organisation', 'default-org', 'UTC', $1)
         RETURNING id`,
        [JSON.stringify(defaultSettings)]
      );
      orgId = newOrgResult.rows[0].id;
      console.log('  ✓ Created organisation:', orgId);
    } else {
      orgId = orgResult.rows[0].id;
      console.log('  ✓ Found existing organisation:', orgId);
    }

    // ========================================================================
    // STEP 2: Create Test Users
    // ========================================================================
    console.log('\n👤 Step 2: Creating test users...');
    
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const managerHash = await bcrypt.hash('Manager123!', 10);
    const workerHash = await bcrypt.hash('Worker123!', 10);

    const users = [
      { email: 'admin@ehs.local', name: 'Admin User', role: 'admin', hash: adminHash },
      { email: 'manager@ehs.local', name: 'Manager User', role: 'manager', hash: managerHash },
      { email: 'worker@ehs.local', name: 'Worker User', role: 'worker', hash: workerHash }
    ];

    let userCount = 0;
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
          userCount++;
          console.log(`  ✓ ${user.role.toUpperCase()}: ${user.email}`);
        }
      } catch (err) {
        console.warn(`  ⚠ Failed to create user ${user.email}:`, err.message);
      }
    }
    console.log(`  Created/updated ${userCount} users`);

    // ========================================================================
    // STEP 3: Ensure Sites Exist
    // ========================================================================
    console.log('\n🏭 Step 3: Checking sites...');
    
    const sitesResult = await client.query(
      `SELECT id, name FROM sites WHERE organisation_id = $1 ORDER BY name`,
      [orgId]
    );

    let sites = sitesResult.rows;
    if (sites.length === 0) {
      console.log('  Creating default sites...');
      const defaultSites = [
        { name: 'Head Office', code: 'HO' },
        { name: 'Warehouse 1', code: 'WH1' },
        { name: 'Warehouse 2', code: 'WH2' },
        { name: 'Distribution Center', code: 'DC1' }
      ];

      for (const site of defaultSites) {
        const result = await client.query(
          `INSERT INTO sites (name, code, organisation_id)
           VALUES ($1, $2, $3)
           RETURNING id, name`,
          [site.name, site.code, orgId]
        );
        if (result.rowCount > 0) {
          sites.push(result.rows[0]);
          console.log(`  ✓ Created: ${site.name}`);
        }
      }
    } else {
      console.log(`  ✓ Found ${sites.length} existing sites`);
    }

    // ========================================================================
    // STEP 4: Seed Legislation
    // ========================================================================
    console.log('\n⚖️  Step 4: Seeding legislation...');
    
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
          }
        } catch (err) {
          if (err.code !== '23505') {
            // 23505 = unique violation, which is OK
            console.warn(`  ⚠ Error adding legislation to ${site.name}:`, err.message);
          }
        }
      }
    }
    console.log(`  ✓ Created ${legislationCount} legislation entries across ${sites.length} sites`);

    // ========================================================================
    // STEP 5: Seed Safety Moments
    // ========================================================================
    console.log('\n✨ Step 5: Seeding safety moments...');
    
    const safetyMoments = [
      {
        title: 'Ladder Safety',
        body: 'Always maintain 3 points of contact when climbing ladders. Never skip steps or lean too far to the side. Ensure the ladder is on stable, level ground before use.',
        category: 'ladder_safety'
      },
      {
        title: "Today's Focus: Situational Awareness",
        body: 'Be aware of your surroundings and potential hazards. Report any unsafe conditions immediately to your supervisor.',
        category: 'situational_awareness'
      },
      {
        title: 'PPE Requirements',
        body: 'Personal Protective Equipment is mandatory in all designated work areas. Ensure proper fit and condition before each use. Replace damaged PPE immediately.',
        category: 'ppe_compliance'
      },
      {
        title: 'Warehouse Safety',
        body: 'Keep aisles clear and free from obstacles. Use proper lifting techniques - bend your knees, keep your back straight. Never overload shelves.',
        category: 'warehouse_safety'
      },
      {
        title: 'Emergency Procedures',
        body: 'Know the location of all emergency exits and assembly points. Participate in all emergency drills. In case of emergency, follow supervisor instructions.',
        category: 'emergency_procedures'
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
        }
      } catch (err) {
        if (err.code !== '23505' && err.code !== '42P01') {
          // 23505 = duplicate, 42P01 = table doesn't exist
          console.warn(`  ⚠ Error creating moment "${moment.title}":`, err.message);
        }
      }
    }
    console.log(`  ✓ Created ${momentCount} safety moments`);

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log('\n✅ Production database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Organisation: 1 (${orgId})`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Sites: ${sites.length}`);
    console.log(`   Legislation: ${legislationCount}`);
    console.log(`   Safety Moments: ${momentCount}`);
    console.log('\n🔐 Test Login Credentials:');
    console.log('   Email: admin@ehs.local');
    console.log('   Password: Admin123!');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

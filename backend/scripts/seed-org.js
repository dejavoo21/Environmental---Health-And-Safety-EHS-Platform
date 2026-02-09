#!/usr/bin/env node
/**
 * CLI script to create the first organisation and admin user
 *
 * Usage:
 *   npm run seed-org -- --name "Acme Corp" --slug "acme-corp" --admin-email "admin@acme.com" --admin-password "SecurePass123!"
 *   npm run seed-org -- --name "Acme Corp" --slug "acme-corp" --admin-email "admin@acme.com" --admin-password "SecurePass123!" --sample-data
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const env = require('../src/config/env');

// Parse command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    name: null,
    slug: null,
    adminEmail: null,
    adminPassword: null,
    adminName: 'Admin User',
    timezone: 'UTC',
    sampleData: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--name':
        result.name = value;
        i++;
        break;
      case '--slug':
        result.slug = value;
        i++;
        break;
      case '--admin-email':
        result.adminEmail = value;
        i++;
        break;
      case '--admin-password':
        result.adminPassword = value;
        i++;
        break;
      case '--admin-name':
        result.adminName = value;
        i++;
        break;
      case '--timezone':
        result.timezone = value;
        i++;
        break;
      case '--sample-data':
        result.sampleData = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return result;
};

const printHelp = () => {
  console.log(`
seed-org - Create first organisation and admin user

Usage:
  npm run seed-org -- [options]

Required Options:
  --name <name>           Organisation name (e.g., "Acme Corporation")
  --slug <slug>           URL-safe slug (e.g., "acme-corp")
  --admin-email <email>   Admin user email
  --admin-password <pwd>  Admin user password (min 8 characters)

Optional:
  --admin-name <name>     Admin user display name (default: "Admin User")
  --timezone <tz>         Organisation timezone (default: "UTC")
  --sample-data           Seed sample sites and incident types
  --help, -h              Show this help

Examples:
  npm run seed-org -- --name "Acme Corp" --slug "acme-corp" --admin-email "admin@acme.com" --admin-password "Admin123!"
  npm run seed-org -- --name "Beta Inc" --slug "beta-inc" --admin-email "admin@beta.com" --admin-password "Pass123!" --sample-data
`);
};

const validateArgs = (args) => {
  const errors = [];

  if (!args.name) {
    errors.push('--name is required');
  }

  if (!args.slug) {
    errors.push('--slug is required');
  } else if (!/^[a-z0-9-]+$/.test(args.slug)) {
    errors.push('--slug must be lowercase alphanumeric with hyphens only');
  }

  if (!args.adminEmail) {
    errors.push('--admin-email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.adminEmail)) {
    errors.push('Invalid email format for --admin-email');
  }

  if (!args.adminPassword) {
    errors.push('--admin-password is required');
  } else if (args.adminPassword.length < 8) {
    errors.push('--admin-password must be at least 8 characters');
  }

  return errors;
};

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
  const args = parseArgs();
  const errors = validateArgs(args);

  if (errors.length > 0) {
    console.error('Validation errors:');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('\nUse --help for usage information.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if organisation slug already exists
    const existing = await client.query(
      'SELECT id FROM organisations WHERE slug = $1',
      [args.slug]
    );
    if (existing.rowCount > 0) {
      throw new Error(`Organisation with slug "${args.slug}" already exists`);
    }

    // Create organisation
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
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug`,
      [args.name, args.slug, args.timezone, JSON.stringify(defaultSettings)]
    );
    const org = orgResult.rows[0];
    console.log(`✓ Created organisation: ${org.name} (${org.slug})`);

    // Hash admin password
    const passwordHash = await bcrypt.hash(args.adminPassword, 10);

    // Create admin user
    const userResult = await client.query(
      `INSERT INTO users (email, name, password_hash, role, organisation_id, is_active)
       VALUES ($1, $2, $3, 'admin', $4, TRUE)
       RETURNING id, email, name`,
      [args.adminEmail.toLowerCase(), args.adminName, passwordHash, org.id]
    );
    const admin = userResult.rows[0];
    console.log(`✓ Created admin user: ${admin.name} (${admin.email})`);

    // Seed sample data if requested
    if (args.sampleData) {
      // Create sample sites
      await client.query(
        `INSERT INTO sites (name, code, organisation_id)
         VALUES
         ('Head Office', 'HO', $1),
         ('Warehouse 1', 'WH1', $1),
         ('Distribution Center', 'DC1', $1)
         ON CONFLICT DO NOTHING`,
        [org.id]
      );
      console.log('✓ Created sample sites');

      // Create sample inspection template
      await client.query(
        `INSERT INTO inspection_templates (name, description, organisation_id)
         VALUES
         ('Daily Safety Checklist', 'Standard daily safety inspection', $1),
         ('Fire Safety Inspection', 'Monthly fire safety check', $1)
         ON CONFLICT DO NOTHING`,
        [org.id]
      );
      console.log('✓ Created sample inspection templates');

      // Create sample manager and worker users
      const managerHash = await bcrypt.hash('Manager123!', 10);
      const workerHash = await bcrypt.hash('Worker123!', 10);

      await client.query(
        `INSERT INTO users (email, name, password_hash, role, organisation_id, is_active)
         VALUES
         ($1, 'Manager User', $2, 'manager', $3, TRUE),
         ($4, 'Worker User', $5, 'worker', $3, TRUE)
         ON CONFLICT (organisation_id, email) DO NOTHING`,
        [`manager@${args.slug}.local`, managerHash, org.id, `worker@${args.slug}.local`, workerHash]
      );
      console.log('✓ Created sample users (manager, worker)');
    }

    await client.query('COMMIT');
    console.log('\n✅ Organisation setup complete!\n');
    console.log('Login credentials:');
    console.log(`  Email: ${args.adminEmail}`);
    console.log(`  Password: ${args.adminPassword}`);

    if (args.sampleData) {
      console.log('\nSample users created:');
      console.log(`  Manager: manager@${args.slug}.local / Manager123!`);
      console.log(`  Worker: worker@${args.slug}.local / Worker123!`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

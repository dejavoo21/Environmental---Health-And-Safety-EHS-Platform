/**
 * Seed Analytics Mock Data
 * Creates realistic incident, inspection, and action data for analytics dashboard
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Helper to get random date within last N days
const randomDate = (daysAgo) => {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return past.toISOString();
};

// Helper to get random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seedAnalyticsData() {
  const client = await pool.connect();
  
  try {
    console.log('Starting analytics data seed...');
    
    // Get organisation
    const orgResult = await client.query("SELECT id FROM organisations WHERE slug = 'default-org'");
    if (orgResult.rows.length === 0) {
      throw new Error('Default organisation not found. Run seed.js first.');
    }
    const orgId = orgResult.rows[0].id;
    console.log('Organisation ID:', orgId);

    // Get sites
    const sitesResult = await client.query('SELECT id, name FROM sites WHERE organisation_id = $1', [orgId]);
    if (sitesResult.rows.length === 0) {
      throw new Error('No sites found. Run seed.js first.');
    }
    const sites = sitesResult.rows;
    console.log('Found', sites.length, 'sites');

    // Get incident types
    const typesResult = await client.query(
      "SELECT id, name FROM incident_types WHERE organisation_id = $1 OR is_system = TRUE",
      [orgId]
    );
    const incidentTypes = typesResult.rows;
    console.log('Found', incidentTypes.length, 'incident types');

    // Get users
    const usersResult = await client.query(
      'SELECT id, name, role FROM users WHERE organisation_id = $1',
      [orgId]
    );
    const users = usersResult.rows;
    const workers = users.filter(u => u.role === 'worker' || u.role === 'manager');
    console.log('Found', users.length, 'users');

    // Get inspection templates
    const templatesResult = await client.query(
      'SELECT id, name FROM inspection_templates WHERE organisation_id = $1',
      [orgId]
    );
    let templates = templatesResult.rows;
    
    // Create a template if none exist
    if (templates.length === 0) {
      const templateResult = await client.query(
        `INSERT INTO inspection_templates (name, description, organisation_id)
         VALUES ('General Safety Inspection', 'Standard safety checklist', $1)
         RETURNING id, name`,
        [orgId]
      );
      templates = templateResult.rows;
      console.log('Created default inspection template');
    }

    await client.query('BEGIN');

    const severities = ['low', 'medium', 'high', 'critical'];
    const statuses = ['open', 'under_investigation', 'closed'];
    const inspectionResults = ['pass', 'fail'];

    // Create 50 incidents spread over last 180 days
    console.log('Creating incidents...');
    const incidentIds = [];
    for (let i = 0; i < 50; i++) {
      const severity = randomItem(severities);
      const status = randomItem(statuses);
      const site = randomItem(sites);
      const type = randomItem(incidentTypes);
      const reporter = randomItem(users);
      const occurredAt = randomDate(180);

      const result = await client.query(
        `INSERT INTO incidents (title, description, type_id, site_id, severity, status, occurred_at, reported_by, organisation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          `Incident ${i + 1} - ${type.name}`,
          `Mock incident for analytics testing. Severity: ${severity}. Site: ${site.name}`,
          type.id,
          site.id,
          severity,
          status,
          occurredAt,
          reporter.id,
          orgId
        ]
      );
      incidentIds.push(result.rows[0].id);
    }
    console.log('Created', incidentIds.length, 'incidents');

    // Create 30 inspections spread over last 180 days
    console.log('Creating inspections...');
    for (let i = 0; i < 30; i++) {
      const site = randomItem(sites);
      const template = randomItem(templates);
      const inspector = randomItem(users);
      const performedAt = randomDate(180);
      const result = randomItem(inspectionResults);

      await client.query(
        `INSERT INTO inspections (template_id, site_id, performed_by, performed_at, overall_result, notes, organisation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          template.id,
          site.id,
          inspector.id,
          performedAt,
          result,
          `Mock inspection - Result: ${result}`,
          orgId
        ]
      );
    }
    console.log('Created 30 inspections');

    // Create 40 actions linked to incidents
    console.log('Creating actions...');
    const actionStatuses = ['open', 'in_progress', 'done', 'overdue'];
    for (let i = 0; i < 40; i++) {
      const incidentId = randomItem(incidentIds);
      const assignee = workers.length > 0 ? randomItem(workers) : randomItem(users);
      const creator = randomItem(users);
      const status = randomItem(actionStatuses);
      const createdAt = randomDate(120);
      
      // Due date: some in past (overdue), some in future
      const dueOffset = Math.random() > 0.3 ? Math.random() * 30 : -Math.random() * 30;
      const dueDate = new Date(Date.now() + dueOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await client.query(
        `INSERT INTO actions (title, description, source_type, source_id, assigned_to, created_by, due_date, status, organisation_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          `Action ${i + 1} - Follow-up required`,
          `Mock action for analytics testing`,
          'incident',
          incidentId,
          assignee.id,
          creator.id,
          dueDate,
          status,
          orgId,
          createdAt
        ]
      );
    }
    console.log('Created 40 actions');

    // Create site risk scores
    console.log('Creating risk scores...');
    // First delete existing risk scores for this org
    await client.query('DELETE FROM site_risk_scores WHERE organisation_id = $1', [orgId]);
    
    for (const site of sites) {
      const riskScore = Math.floor(Math.random() * 80) + 10; // 10-90
      // Must be lowercase: low, medium, high, critical
      const riskCategory = riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low';
      const incidentsCritical = Math.floor(Math.random() * 3);
      const incidentsHigh = Math.floor(Math.random() * 5);
      const incidentsMedium = Math.floor(Math.random() * 8);
      const incidentsLow = Math.floor(Math.random() * 10);
      
      await client.query(
        `INSERT INTO site_risk_scores (site_id, organisation_id, risk_score, risk_category, incident_score, action_score, inspection_score, incidents_critical, incidents_high, incidents_medium, incidents_low, overdue_actions, failed_inspections, primary_factor, scoring_window_days, calculated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
        [
          site.id,
          orgId,
          riskScore,
          riskCategory,
          Math.floor(riskScore * 0.4), // incident_score
          Math.floor(riskScore * 0.3), // action_score
          Math.floor(riskScore * 0.3), // inspection_score
          incidentsCritical,
          incidentsHigh,
          incidentsMedium,
          incidentsLow,
          Math.floor(Math.random() * 8),
          Math.floor(Math.random() * 3),
          riskScore >= 70 ? 'High severity incidents' : riskScore >= 40 ? 'Overdue actions' : 'Normal operations',
          90
        ]
      );
    }
    console.log('Created risk scores for', sites.length, 'sites');

    await client.query('COMMIT');
    console.log('\n✅ Analytics mock data seeded successfully!');
    console.log('   - 50 incidents');
    console.log('   - 30 inspections');
    console.log('   - 40 actions');
    console.log('   - Risk scores for all sites');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding analytics data:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAnalyticsData().catch(console.error);

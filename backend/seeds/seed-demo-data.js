const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

async function seedDemoData() {
  const client = await pool.connect();

  try {
    console.log('Seeding demo data...');

    const orgResult = await client.query("SELECT id FROM organisations WHERE slug = 'default-org'");
    const orgId = orgResult.rows[0].id;

    const sitesResult = await client.query('SELECT id FROM sites WHERE organisation_id = $1', [orgId]);
    const sites = sitesResult.rows;
    const siteId = sites[0].id;

    const usersResult = await client.query('SELECT id FROM users WHERE organisation_id = $1', [orgId]);
    const users = usersResult.rows;
    const userId = users[0].id;

    await client.query('BEGIN');

    // Create site locations with coordinates for weather API
    console.log('Creating site locations with coordinates...');
    const siteLocations = [
      { name: 'London HQ', lat: 51.5074, lng: -0.1278, city: 'London', country: 'GB', timezone: 'Europe/London' },
      { name: 'Manchester Office', lat: 53.4808, lng: -2.2426, city: 'Manchester', country: 'GB', timezone: 'Europe/London' },
      { name: 'Birmingham Depot', lat: 52.4862, lng: -1.8904, city: 'Birmingham', country: 'GB', timezone: 'Europe/London' }
    ];

    for (let i = 0; i < sites.length && i < siteLocations.length; i++) {
      const site = sites[i];
      const loc = siteLocations[i];

      // Check if location already exists
      const existingLoc = await client.query(
        'SELECT id FROM site_locations WHERE site_id = $1 AND organisation_id = $2',
        [site.id, orgId]
      );

      if (existingLoc.rows.length === 0) {
        await client.query(
          `INSERT INTO site_locations (site_id, organisation_id, latitude, longitude, city, country_code, timezone, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [site.id, orgId, loc.lat, loc.lng, loc.city, loc.country, loc.timezone, userId]
        );
      } else {
        await client.query(
          `UPDATE site_locations SET latitude = $1, longitude = $2, city = $3, country_code = $4, timezone = $5
           WHERE site_id = $6 AND organisation_id = $7`,
          [loc.lat, loc.lng, loc.city, loc.country, loc.timezone, site.id, orgId]
        );
      }
    }
    console.log('Created/updated site locations with coordinates');

    // Create PPE recommendations for sites
    console.log('Creating PPE recommendations...');
    const ppeItems = ['Hard Hat', 'Safety Glasses', 'High-Visibility Vest', 'Steel-Toe Boots', 'Gloves', 'Ear Protection'];
    for (const site of sites) {
      // Check if PPE recommendation already exists
      const existingPpe = await client.query(
        'SELECT id FROM ppe_recommendations WHERE site_id = $1',
        [site.id]
      );

      if (existingPpe.rows.length === 0) {
        await client.query(
          `INSERT INTO ppe_recommendations (site_id, ppe_list) VALUES ($1, $2)`,
          [site.id, ppeItems]
        );
      }
    }
    console.log('Created PPE recommendations for', sites.length, 'sites');

    // Create safety moments
    console.log('Creating safety moments...');

    // First create today's safety moment so it shows in Safety Advisor
    const todayMoment = {
      title: "Today's Focus: Situational Awareness",
      content: "Stay alert and aware of your surroundings at all times. Before starting any task, take a moment to assess potential hazards and plan your work safely. If something doesn't feel right, stop and reassess."
    };

    await client.query(
      `INSERT INTO safety_moments (title, body, category, is_active, organisation_id, created_by, site_id, user_id, moment_type, moment_text, acknowledged, start_date, end_date)
       VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7, $8, $2, FALSE, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days') ON CONFLICT DO NOTHING`,
      [todayMoment.title, todayMoment.content, 'awareness', orgId, userId, siteId, userId, 'positive']
    );
    console.log('Created today\'s safety moment');

    const safetyMoments = [
      { title: 'Ladder Safety', content: 'Always maintain 3 points of contact when climbing ladders.' },
      { title: 'PPE Requirements', content: 'Wear appropriate Personal Protective Equipment for the task.' },
      { title: 'Emergency Exits', content: 'Know your nearest emergency exit location.' },
      { title: 'Spill Response', content: 'Report all spills immediately to your supervisor.' },
      { title: 'Fatigue Management', content: 'Take regular breaks to avoid fatigue-related incidents.' },
      { title: 'Manual Handling', content: 'Bend your knees and keep your back straight when lifting.' },
      { title: 'Housekeeping', content: 'Keep your work area clean and tidy.' }
    ];

    const momentTypes = ['near_miss', 'positive', 'hazard', 'incident'];
    for (let i = 0; i < safetyMoments.length; i++) {
      const sm = safetyMoments[i];
      const momentType = momentTypes[i % momentTypes.length];
      await client.query(
        `INSERT INTO safety_moments (title, body, category, is_active, organisation_id, created_by, site_id, user_id, moment_type, moment_text, acknowledged, start_date)
         VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7, $8, $2, FALSE, CURRENT_DATE - INTERVAL '${i} days') ON CONFLICT DO NOTHING`,
        [sm.title, sm.content, 'general', orgId, userId, siteId, userId, momentType]
      );
    }
    console.log('Created', safetyMoments.length, 'safety moments');

    // Create site legislation references
    console.log('Creating site legislation...');
    const legislation = [
      { title: 'OSHA 1910.134', summary: 'Respiratory Protection Standard', jurisdiction: 'Federal', category: 'Safety' },
      { title: 'OSHA 1926.501', summary: 'Fall Protection Requirements', jurisdiction: 'Federal', category: 'Safety' },
      { title: 'OSHA 1910.147', summary: 'Lockout/Tagout Procedures', jurisdiction: 'Federal', category: 'Safety' },
      { title: 'OSHA 1910.1200', summary: 'Hazard Communication Standard', jurisdiction: 'Federal', category: 'Chemical' }
    ];

    for (const site of sites) {
      for (const leg of legislation) {
        try {
          await client.query(
            `INSERT INTO site_legislation_refs (site_id, title, summary, jurisdiction, category, organisation_id, created_by, is_primary)
             VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) ON CONFLICT DO NOTHING`,
            [site.id, leg.title, leg.summary, leg.jurisdiction, leg.category, orgId, userId]
          );
        } catch (err) {
          // Log error but continue - table might not exist yet
          console.warn('[Legislation] Error creating legislation ref:', err.code, err.message);
        }
      }
    }
    console.log('Created site legislation for', sites.length, 'sites');

    // Create risk categories
    console.log('Creating risk categories...');
    const riskCategories = [
      { name: 'Operational', code: 'OPS', desc: 'Operational related risks' },
      { name: 'Environmental', code: 'ENV', desc: 'Environmental related risks' },
      { name: 'Health & Safety', code: 'H&S', desc: 'Health and safety related risks' },
      { name: 'Financial', code: 'FIN', desc: 'Financial related risks' },
      { name: 'Compliance', code: 'CMP', desc: 'Compliance related risks' }
    ];
    for (const cat of riskCategories) {
      await client.query(
        `INSERT INTO risk_categories (name, code, description, organisation_id, is_active)
         VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT DO NOTHING`,
        [cat.name, cat.code, cat.desc, orgId]
      );
    }
    console.log('Created', riskCategories.length, 'risk categories');

    // Get risk category ids
    const catResult = await client.query('SELECT id, name FROM risk_categories WHERE organisation_id = $1', [orgId]);
    const categories = catResult.rows;

    // Create risks
    console.log('Creating risks...');
    const risks = [
      { title: 'Slip and Fall Hazards', desc: 'Risk of slips, trips and falls', hazard: 'Wet floors', cause: 'Spillage', consequence: 'Injury', likelihood: 3, impact: 2 },
      { title: 'Chemical Exposure', desc: 'Risk of exposure to hazardous chemicals', hazard: 'Chemical fumes', cause: 'Improper handling', consequence: 'Health issues', likelihood: 2, impact: 4 },
      { title: 'Equipment Malfunction', desc: 'Risk of injury due to equipment failure', hazard: 'Faulty machinery', cause: 'Poor maintenance', consequence: 'Injury', likelihood: 2, impact: 3 },
      { title: 'Fire Hazard', desc: 'Risk of fire', hazard: 'Flammable materials', cause: 'Ignition source', consequence: 'Property damage', likelihood: 1, impact: 5 },
      { title: 'Noise Exposure', desc: 'Risk of hearing damage', hazard: 'High noise levels', cause: 'Machinery operation', consequence: 'Hearing loss', likelihood: 3, impact: 3 }
    ];

    for (let i = 0; i < risks.length; i++) {
      const risk = risks[i];
      const cat = categories[i % categories.length];
      const riskScore = risk.likelihood * risk.impact;
      const level = riskScore >= 12 ? 'extreme' : riskScore >= 8 ? 'high' : riskScore >= 4 ? 'medium' : 'low';

      const refNum = 'RISK-' + String(i + 1).padStart(4, '0');
      await client.query(
        `INSERT INTO risks (reference_number, title, description, category_id, hazard, cause, consequence, inherent_likelihood, inherent_impact, inherent_level, residual_likelihood, residual_impact, residual_level, status, created_by, owner_user_id, organisation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $8, $9, $10, 'active', $11, $11, $12) ON CONFLICT DO NOTHING`,
        [refNum, risk.title, risk.desc, cat.id, risk.hazard, risk.cause, risk.consequence, risk.likelihood, risk.impact, level, userId, orgId]
      );
    }
    console.log('Created', risks.length, 'risks');

    // Create training categories
    console.log('Creating training categories...');
    const trainingCats = [
      { name: 'Safety', code: 'SAF', desc: 'Safety training courses' },
      { name: 'Compliance', code: 'CMP', desc: 'Compliance training courses' },
      { name: 'Technical', code: 'TCH', desc: 'Technical training courses' },
      { name: 'Onboarding', code: 'ONB', desc: 'Onboarding training courses' }
    ];
    for (const cat of trainingCats) {
      await client.query(
        `INSERT INTO training_categories (name, code, description, organisation_id, is_active)
         VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT DO NOTHING`,
        [cat.name, cat.code, cat.desc, orgId]
      );
    }
    console.log('Created', trainingCats.length, 'training categories');

    // Get training category ids
    const tcResult = await client.query('SELECT id, name FROM training_categories WHERE organisation_id = $1', [orgId]);
    const trainingCategories = tcResult.rows;

    // Create training courses
    console.log('Creating training courses...');
    const courses = [
      { title: 'Fire Safety Awareness', desc: 'Basic fire safety training', duration: 1 },
      { title: 'Manual Handling', desc: 'Safe lifting techniques', duration: 0.75 },
      { title: 'First Aid Basics', desc: 'Introduction to first aid', duration: 2 },
      { title: 'Workplace Hazard Awareness', desc: 'Identifying hazards', duration: 0.5 },
      { title: 'PPE Usage', desc: 'Using PPE properly', duration: 0.75 }
    ];

    // Create sample training courses with validity periods (Phase 11.5)
    const sampleCourses = [
      { title: 'Fire Safety Awareness', desc: 'Learn fire prevention and emergency procedures', duration: 0.5, validity: 12, delivery: 'e-learning', mandatory: true },
      { title: 'First Aid Basics', desc: 'Introduction to emergency first aid certification', duration: 1, validity: 24, delivery: 'classroom', mandatory: true },
      { title: 'Manual Handling & Ergonomics', desc: 'Safe lifting and ergonomic workplace practices', duration: 0.75, validity: 24, delivery: 'e-learning', mandatory: false }
    ];

    // Get or create Safety Training category
    const catResult = await client.query(
      `INSERT INTO training_categories (organisation_id, name, description, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, 'Safety Training', 'Core safety and compliance training', userId]
    );

    let safetyCategoryId = catResult.rows[0]?.id;
    if (!safetyCategoryId) {
      const existCat = await client.query('SELECT id FROM training_categories WHERE organisation_id = $1 AND name = $2', [orgId, 'Safety Training']);
      safetyCategoryId = existCat.rows[0]?.id;
    }

    if (safetyCategoryId) {
      for (const course of sampleCourses) {
        const code = 'SAFE-' + course.title.substring(0, 3).toUpperCase() + '-001';
        await client.query(
          `INSERT INTO training_courses (code, title, description, category_id, duration_hours, delivery_type, requirement_level, validity_months, status, organisation_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
           ON CONFLICT (organisation_id, code) DO NOTHING`,
          [code, course.title, course.desc, safetyCategoryId, course.duration, course.delivery, course.mandatory ? 'mandatory' : 'optional', course.validity, orgId, userId]
        );
      }
      console.log('Created', sampleCourses.length, 'sample safety training courses');
    }

    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const cat = trainingCategories[i % trainingCategories.length];
      const code = 'TRN-' + String(i + 1).padStart(3, '0');

      await client.query(
        `INSERT INTO training_courses (code, title, description, category_id, duration_hours, delivery_type, requirement_level, status, organisation_id, created_by)
         VALUES ($1, $2, $3, $4, $5, 'online', 'mandatory', 'active', $6, $7) ON CONFLICT DO NOTHING`,
        [code, course.title, course.desc, cat.id, course.duration, orgId, userId]
      );
    }
    console.log('Created', courses.length, 'training courses');

    await client.query('COMMIT');
    console.log('\nDemo data seeded successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoData();

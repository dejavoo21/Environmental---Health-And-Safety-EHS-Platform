/**
 * Seed script for Training Courses, Site Legislation, PPE Rules, and Country Cities
 * Creates sample data for the EHS Portal
 */

const { Pool } = require('pg');
const env = require('../src/config/env');

const pool = env.databaseUrl
  ? new Pool({ connectionString: env.databaseUrl, ssl: { rejectUnauthorized: false } })
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

    // Get default organisation
    const orgResult = await client.query(
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

    // Get all sites
    const sitesResult = await client.query(
      `SELECT id, name FROM sites WHERE organisation_id = $1 LIMIT 1`,
      [orgId]
    );
    
    const siteId = sitesResult.rows[0]?.id || null;
    console.log('Using site ID:', siteId);

    // =====================================================
    // TRAINING CATEGORIES
    // =====================================================
    console.log('\n--- Seeding Training Categories ---');
    
    const trainingCategories = [
      { name: 'Safety Induction', code: 'SAFETY-IND', description: 'Initial safety training for new employees' },
      { name: 'Emergency Response', code: 'EMERG-RESP', description: 'Emergency procedures and response training' },
      { name: 'Hazard Management', code: 'HAZ-MGMT', description: 'Identifying and managing workplace hazards' },
      { name: 'PPE Training', code: 'PPE-TRAIN', description: 'Proper use and maintenance of PPE' },
      { name: 'Fire Safety', code: 'FIRE-SAFE', description: 'Fire prevention and evacuation procedures' },
      { name: 'First Aid', code: 'FIRST-AID', description: 'Basic first aid and medical emergency response' },
      { name: 'Working at Heights', code: 'WORK-HGT', description: 'Safe practices for elevated work' },
      { name: 'Confined Space', code: 'CONF-SPACE', description: 'Entry and work in confined spaces' },
      { name: 'Electrical Safety', code: 'ELEC-SAFE', description: 'Electrical hazards and safe practices' },
      { name: 'Manual Handling', code: 'MAN-HANDLE', description: 'Safe lifting and handling techniques' },
      { name: 'Chemical Safety', code: 'CHEM-SAFE', description: 'Handling hazardous substances safely' }
    ];

    for (const cat of trainingCategories) {
      // Check if category exists
      const existing = await client.query(
        `SELECT id FROM training_categories WHERE organisation_id = $1 AND name = $2`,
        [orgId, cat.name]
      );
      if (existing.rowCount === 0) {
        await client.query(`
          INSERT INTO training_categories (organisation_id, name, code, description)
          VALUES ($1, $2, $3, $4)
        `, [orgId, cat.name, cat.code, cat.description]);
      }
    }
    console.log('Training categories seeded');

    // Get category IDs
    const catResult = await client.query(
      `SELECT id, name FROM training_categories WHERE organisation_id = $1`,
      [orgId]
    );
    const categories = {};
    catResult.rows.forEach(r => { categories[r.name] = r.id; });

    // =====================================================
    // TRAINING COURSES
    // =====================================================
    console.log('\n--- Seeding Training Courses ---');
    
    // Get admin user
    const adminResult = await client.query(
      `SELECT id FROM users WHERE organisation_id = $1 AND role = 'admin' LIMIT 1`,
      [orgId]
    );
    const adminId = adminResult.rows[0]?.id;
    
    if (!adminId) {
      console.log('No admin user found, skipping training courses');
    } else {
      const trainingCourses = [
        {
          code: 'GEN-SAFETY-001',
          title: 'General Safety Induction',
          category: 'Safety Induction',
          description: 'Comprehensive introduction to workplace health and safety policies, procedures, and employee responsibilities.',
          duration_hours: 4,
          validity_months: 24,
          delivery_type: 'online',
          requirement_level: 'mandatory',
          passing_score: 80
        },
        {
          code: 'SITE-ORIENT-001',
          title: 'Site-Specific Safety Orientation',
          category: 'Safety Induction',
          description: 'Site-specific hazards, emergency procedures, and safety requirements for your work location.',
          duration_hours: 2,
          validity_months: 12,
          delivery_type: 'classroom',
          requirement_level: 'mandatory',
          passing_score: 80
        },
        {
          code: 'FIRE-WARDEN-001',
          title: 'Fire Warden Training',
          category: 'Fire Safety',
          description: 'Training for designated fire wardens including evacuation procedures, fire extinguisher use, and emergency coordination.',
          duration_hours: 8,
          validity_months: 12,
          delivery_type: 'classroom',
          requirement_level: 'optional',
          passing_score: 85
        },
        {
          code: 'FIRE-AWARE-001',
          title: 'Fire Safety Awareness',
          category: 'Fire Safety',
          description: 'Basic fire prevention, evacuation routes, alarm systems, and what to do in case of fire.',
          duration_hours: 2,
          validity_months: 24,
          delivery_type: 'online',
          requirement_level: 'mandatory',
          passing_score: 75
        },
        {
          code: 'EMERG-RESP-001',
          title: 'Emergency Response & Evacuation',
          category: 'Emergency Response',
          description: 'Comprehensive emergency response procedures including evacuation, shelter-in-place, and emergency communications.',
          duration_hours: 4,
          validity_months: 12,
          delivery_type: 'virtual',
          requirement_level: 'mandatory',
          passing_score: 80
        },
        {
          code: 'FIRST-AID-001',
          title: 'First Aid Certification',
          category: 'First Aid',
          description: 'Nationally accredited first aid training covering CPR, wound care, and emergency medical response.',
          duration_hours: 16,
          validity_months: 36,
          delivery_type: 'classroom',
          requirement_level: 'optional',
          passing_score: 80
        },
        {
          code: 'WORK-HGT-001',
          title: 'Working at Heights Safety',
          category: 'Working at Heights',
          description: 'Safe work practices for elevated work including ladder safety, fall protection, and rescue procedures.',
          duration_hours: 8,
          validity_months: 12,
          delivery_type: 'blended',
          requirement_level: 'mandatory',
          passing_score: 85
        },
        {
          code: 'CONF-SPACE-001',
          title: 'Confined Space Entry',
          category: 'Confined Space',
          description: 'Hazard recognition, atmospheric testing, entry permits, and emergency rescue for confined space work.',
          duration_hours: 8,
          validity_months: 12,
          delivery_type: 'classroom',
          requirement_level: 'mandatory',
          passing_score: 85
        },
        {
          code: 'MAN-HANDLE-001',
          title: 'Manual Handling & Ergonomics',
          category: 'Manual Handling',
          description: 'Safe lifting techniques, ergonomic workstation setup, and prevention of musculoskeletal injuries.',
          duration_hours: 2,
          validity_months: 24,
          delivery_type: 'online',
          requirement_level: 'mandatory',
          passing_score: 75
        },
        {
          code: 'COSHH-001',
          title: 'Hazardous Substances (COSHH)',
          category: 'Chemical Safety',
          description: 'Control of Substances Hazardous to Health - safe handling, storage, and disposal of chemicals.',
          duration_hours: 4,
          validity_months: 12,
          delivery_type: 'online',
          requirement_level: 'mandatory',
          passing_score: 80
        },
        {
          code: 'PPE-USE-001',
          title: 'PPE Selection & Use',
          category: 'PPE Training',
          description: 'Proper selection, fitting, use, and maintenance of personal protective equipment.',
          duration_hours: 2,
          validity_months: 24,
          delivery_type: 'toolbox_talk',
          requirement_level: 'mandatory',
          passing_score: 80
        },
        {
          code: 'ELEC-SAFE-001',
          title: 'Electrical Safety Awareness',
          category: 'Electrical Safety',
          description: 'Recognizing electrical hazards, safe work practices around electrical equipment, and lockout/tagout.',
          duration_hours: 4,
          validity_months: 24,
          delivery_type: 'online',
          requirement_level: 'optional',
          passing_score: 80
        },
        {
          code: 'RISK-ASSESS-001',
          title: 'Risk Assessment Workshop',
          category: 'Hazard Management',
          description: 'Practical training on conducting risk assessments, hazard identification, and control measures.',
          duration_hours: 4,
          validity_months: 24,
          delivery_type: 'virtual',
          requirement_level: 'optional',
          passing_score: 75
        },
        {
          code: 'INC-INVEST-001',
          title: 'Incident Investigation Training',
          category: 'Hazard Management',
          description: 'Root cause analysis, evidence gathering, and corrective action development for workplace incidents.',
          duration_hours: 8,
          validity_months: 24,
          delivery_type: 'classroom',
          requirement_level: 'optional',
          passing_score: 80
        }
      ];

      for (const course of trainingCourses) {
        const categoryId = categories[course.category];
        if (!categoryId) {
          console.log(`Skipping course ${course.title} - category not found`);
          continue;
        }
        
        // Check if course exists
        const existing = await client.query(
          `SELECT id FROM training_courses WHERE organisation_id = $1 AND code = $2`,
          [orgId, course.code]
        );
        if (existing.rowCount === 0) {
          await client.query(`
            INSERT INTO training_courses (organisation_id, category_id, code, title, description, duration_hours, validity_months, delivery_type, requirement_level, passing_score, created_by, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
          `, [orgId, categoryId, course.code, course.title, course.description, course.duration_hours, course.validity_months, course.delivery_type, course.requirement_level, course.passing_score, adminId]);
        }
      }
      console.log('Training courses seeded');
    }

    // =====================================================
    // SITE LEGISLATION
    // =====================================================
    console.log('\n--- Seeding Site Legislation ---');
    
    if (siteId) {
      const legislations = [
        {
          title: 'Health and Safety at Work Act',
          jurisdiction: 'UK',
          category: 'Primary Legislation',
          reference_url: 'https://www.legislation.gov.uk/ukpga/1974/37',
          is_primary: true
        },
        {
          title: 'Management of Health and Safety at Work Regulations',
          jurisdiction: 'UK',
          category: 'Regulations',
          reference_url: 'https://www.legislation.gov.uk/uksi/1999/3242',
          is_primary: false
        },
        {
          title: 'Personal Protective Equipment at Work Regulations',
          jurisdiction: 'UK',
          category: 'Regulations',
          reference_url: 'https://www.legislation.gov.uk/uksi/1992/2966',
          is_primary: false
        },
        {
          title: 'Control of Substances Hazardous to Health (COSHH)',
          jurisdiction: 'UK',
          category: 'Regulations',
          reference_url: 'https://www.legislation.gov.uk/uksi/2002/2677',
          is_primary: false
        },
        {
          title: 'Work at Height Regulations',
          jurisdiction: 'UK',
          category: 'Regulations',
          reference_url: 'https://www.legislation.gov.uk/uksi/2005/735',
          is_primary: false
        },
        {
          title: 'Reporting of Injuries, Diseases and Dangerous Occurrences (RIDDOR)',
          jurisdiction: 'UK',
          category: 'Regulations',
          reference_url: 'https://www.legislation.gov.uk/uksi/2013/1471',
          is_primary: true
        },
        {
          title: 'Fire Safety Order 2005',
          jurisdiction: 'UK',
          category: 'Fire Safety',
          reference_url: 'https://www.legislation.gov.uk/uksi/2005/1541',
          is_primary: true
        },
        {
          title: 'Manual Handling Operations Regulations',
          jurisdiction: 'UK',
          category: 'Regulations',
          reference_url: 'https://www.legislation.gov.uk/uksi/1992/2793',
          is_primary: false
        },
        {
          title: 'Electricity at Work Regulations',
          jurisdiction: 'UK',
          category: 'Regulations',
          reference_url: 'https://www.legislation.gov.uk/uksi/1989/635',
          is_primary: false
        },
        {
          title: 'Construction (Design and Management) Regulations',
          jurisdiction: 'UK',
          category: 'Construction',
          reference_url: 'https://www.legislation.gov.uk/uksi/2015/51',
          is_primary: false
        },
        {
          title: 'Nigeria Factories Act',
          jurisdiction: 'Nigeria',
          category: 'Primary Legislation',
          reference_url: 'https://laws.lawnigeria.com/2020/01/01/factories-act/',
          is_primary: true
        },
        {
          title: 'UAE Federal Law No. 8 - Labour Law',
          jurisdiction: 'UAE',
          category: 'Primary Legislation',
          reference_url: 'https://www.mohre.gov.ae/en/laws-and-regulations',
          is_primary: true
        },
        {
          title: 'Ghana Labour Act 2003 (Act 651)',
          jurisdiction: 'Ghana',
          category: 'Primary Legislation',
          reference_url: 'https://www.ilo.org/dyn/natlex/docs/WEBTEXT/66948/65316/E03GHA01.htm',
          is_primary: true
        },
        {
          title: 'Kenya Occupational Safety and Health Act',
          jurisdiction: 'Kenya',
          category: 'Primary Legislation',
          reference_url: 'http://kenyalaw.org/kl/fileadmin/pdfdownloads/Acts/OccupationalSafetyandHealthAct_No15of2007.pdf',
          is_primary: true
        }
      ];

      // Get admin user for created_by
      const adminResult2 = await client.query(
        `SELECT id FROM users WHERE organisation_id = $1 AND role = 'admin' LIMIT 1`,
        [orgId]
      );
      const creatorId = adminResult2.rows[0]?.id;
      
      for (const leg of legislations) {
        // Check if legislation exists
        const existing = await client.query(
          `SELECT id FROM site_legislation_refs WHERE site_id = $1 AND title = $2`,
          [siteId, leg.title]
        );
        if (existing.rowCount === 0) {
          await client.query(`
            INSERT INTO site_legislation_refs (organisation_id, site_id, title, jurisdiction, category, reference_url, is_primary, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [orgId, siteId, leg.title, leg.jurisdiction, leg.category, leg.reference_url, leg.is_primary, creatorId]);
        }
      }
      console.log('Site legislation seeded');

      // =====================================================
      // PPE RULES
      // =====================================================
      console.log('\n--- Seeding PPE Rules ---');
      
      const ppeRules = [
        {
          task_type: 'General Site Work',
          weather_conditions: 'any',
          priority: 'mandatory',
          required_ppe: JSON.stringify(['Hard Hat', 'Safety Boots', 'High-Visibility Vest', 'Safety Glasses']),
          description: 'Minimum PPE requirements for all site personnel'
        },
        {
          task_type: 'Welding Operations',
          weather_conditions: 'any',
          priority: 'mandatory',
          required_ppe: JSON.stringify(['Welding Helmet', 'Welding Gloves', 'Leather Apron', 'Safety Boots', 'Fire-Resistant Clothing']),
          description: 'Full welding protection including UV and heat protection'
        },
        {
          task_type: 'Chemical Handling',
          weather_conditions: 'any',
          priority: 'mandatory',
          required_ppe: JSON.stringify(['Chemical Goggles', 'Chemical-Resistant Gloves', 'Protective Apron', 'Respirator', 'Safety Boots']),
          description: 'PPE for handling hazardous substances and chemicals'
        },
        {
          task_type: 'Working at Heights',
          weather_conditions: 'any',
          priority: 'mandatory',
          required_ppe: JSON.stringify(['Hard Hat with Chin Strap', 'Full Body Harness', 'Safety Lanyard', 'Safety Boots', 'High-Visibility Vest']),
          description: 'Fall protection equipment for elevated work'
        },
        {
          task_type: 'Confined Space Entry',
          weather_conditions: 'any',
          priority: 'mandatory',
          required_ppe: JSON.stringify(['Hard Hat', 'Full Body Harness', 'Gas Detector', 'Respirator/SCBA', 'Safety Boots', 'Communication Device']),
          description: 'Entry equipment for confined space work'
        },
        {
          task_type: 'Outdoor Work',
          weather_conditions: 'hot',
          priority: 'recommended',
          required_ppe: JSON.stringify(['Light-Colored Hard Hat', 'Sunscreen SPF 50+', 'Cooling Vest', 'UV-Blocking Safety Glasses', 'Light Gloves']),
          description: 'Heat protection for outdoor work in hot weather'
        },
        {
          task_type: 'Outdoor Work',
          weather_conditions: 'wet',
          priority: 'recommended',
          required_ppe: JSON.stringify(['Waterproof Hard Hat Cover', 'Waterproof Jacket', 'Non-Slip Boots', 'Water-Resistant Gloves', 'Anti-Fog Safety Glasses']),
          description: 'Weather protection for work in rainy conditions'
        },
        {
          task_type: 'Electrical Work',
          weather_conditions: 'any',
          priority: 'mandatory',
          required_ppe: JSON.stringify(['Insulated Gloves', 'Safety Glasses', 'Insulated Boots', 'Arc Flash Suit', 'Face Shield']),
          description: 'Electrical safety PPE for work on or near live equipment'
        },
        {
          task_type: 'Grinding/Cutting',
          weather_conditions: 'any',
          priority: 'mandatory',
          required_ppe: JSON.stringify(['Face Shield', 'Safety Glasses', 'Hearing Protection', 'Leather Gloves', 'Fire-Resistant Clothing']),
          description: 'Protection from sparks, debris, and noise during grinding operations'
        },
        {
          task_type: 'Demolition Work',
          weather_conditions: 'any',
          priority: 'mandatory',
          required_ppe: JSON.stringify(['Hard Hat', 'P100 Respirator', 'Safety Glasses', 'Hearing Protection', 'Steel-Toe Boots', 'Heavy Duty Gloves']),
          description: 'Full protection for demolition activities'
        }
      ];

      for (const rule of ppeRules) {
        // Map weather_conditions to weather_category
        const weatherCategory = rule.weather_conditions === 'any' ? 'normal' : rule.weather_conditions;
        
        // Check if PPE recommendation exists
        const existing = await client.query(
          `SELECT id FROM ppe_recommendations WHERE site_id = $1 AND task_type = $2 AND (weather_category = $3 OR weather_category IS NULL)`,
          [siteId, rule.task_type, weatherCategory]
        );
        if (existing.rowCount === 0) {
          // Parse the JSON array for ppe_list
          const ppeList = JSON.parse(rule.required_ppe);
          const priorityNum = rule.priority === 'mandatory' ? 1 : 2;
          
          await client.query(`
            INSERT INTO ppe_recommendations (organisation_id, site_id, task_type, weather_category, ppe_list, recommendation_text, priority, is_active, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
          `, [orgId, siteId, rule.task_type, weatherCategory, ppeList, rule.description, priorityNum, creatorId]);
        }
      }
      console.log('PPE recommendations seeded');
    }

    await client.query('COMMIT');
    console.log('\n✅ All sample data seeded successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();

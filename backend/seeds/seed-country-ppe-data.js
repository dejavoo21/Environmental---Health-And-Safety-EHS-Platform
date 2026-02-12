/**
 * Seed script for country-specific PPE data
 * Adds PPE recommendations for Kenya, Nigeria, Ghana, and UAE
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

    // Get all sites for the organisation
    const sitesResult = await client.query(
      `SELECT id, name FROM sites WHERE organisation_id = $1`,
      [orgId]
    );

    const sites = sitesResult.rows;
    console.log(`Found ${sites.length} sites`);

    // PPE recommendations for different countries and weather conditions
    const ppeRecommendations = [
      // Kenya - Hot climate PPE
      {
        weather_category: 'hot',
        recommendation_text: 'Kenya high temperature PPE: lightweight breathable clothing, wide-brimmed hat, sunscreen SPF 50+, light-colored clothing',
        ppe_list: ['Light-colored Hard Hat', 'Sunscreen', 'Lightweight High-Visibility Vest', 'Safety Glasses with UV protection', 'Light Gloves', 'Gaiters for ground work'],
        priority: 1
      },
      {
        weather_category: 'wet',
        recommendation_text: 'Kenya rainy season PPE: waterproof outerwear, non-slip boots, eye protection with anti-fog coating',
        ppe_list: ['Hard Hat with rain cover', 'Waterproof High-Visibility Vest', 'Non-slip Safety Boots', 'Water-resistant Gloves', 'Anti-fog Safety Glasses'],
        priority: 2
      },
      // Nigeria - High humidity PPE
      {
        weather_category: 'wet',
        recommendation_text: 'Nigeria humidity and rainfall PPE: breathable protective gear, fungal protection considerations',
        ppe_list: ['Hard Hat', 'Moisture-wicking High-Visibility Vest', 'Breathable Safety Boots', 'Fungal-resistant Socks', 'Breathable Gloves', 'Safety Glasses'],
        priority: 1
      },
      {
        weather_category: 'hot',
        recommendation_text: 'Nigeria tropical heat PPE: light, breathable protective equipment with excellent ventilation',
        ppe_list: ['Lightweight Hard Hat with ventilation', 'Light High-Visibility Vest', 'Breathable Steel-Toe Boots', 'Moisture-wicking Gloves', 'Humidity-resistant Safety Glasses'],
        priority: 2
      },
      // Ghana - Mining adjacent areas
      {
        weather_category: 'normal',
        recommendation_text: 'Ghana standard PPE with dust protection: respiratory protection due to mining proximity',
        ppe_list: ['Hard Hat', 'N95/N100 Dust Mask', 'High-Visibility Vest', 'Safety Glasses', 'Steel-Toe Boots', 'Work Gloves', 'Hearing Protection'],
        priority: 1
      },
      {
        weather_category: 'hot',
        recommendation_text: 'Ghana heat with dust protection: combine thermal and respiratory protection',
        ppe_list: ['Ventilated Hard Hat', 'P100 Respirator with cooling vest', 'Light High-Visibility Vest', 'Safety Glasses with dust seal', 'Breathable Steel-Toe Boots', 'Dust-resistant Gloves'],
        priority: 2
      },
      // UAE - Extreme heat
      {
        weather_category: 'hot',
        recommendation_text: 'UAE extreme heat PPE (mandatory by law): full protective gear with cooling elements for temperatures exceeding 50°C',
        ppe_list: ['Light-colored Hard Hat with reflective band', 'Cooling Vest or wettable jacket', 'Light High-Visibility Vest with reflective tape', 'Light-colored Long-sleeve Shirt', 'Light Long Pants', 'UV-blocking Safety Glasses', 'Light Gloves', 'Light Safety Boots', 'Sunscreen SPF 70+'],
        priority: 1
      },
      {
        weather_category: 'windy',
        recommendation_text: 'UAE desert wind protection: sealed protection against dust and sand particles',
        ppe_list: ['Hard Hat with chin strap', 'Face mask/goggles for sand protection', 'High-Visibility Vest', 'Long sleeves (light color)', 'Sand-resistant Boots with gaiters', 'Dust-resistant Gloves', 'Eye protection with seal'],
        priority: 2
      },
      {
        weather_category: 'normal',
        recommendation_text: 'UAE standard moderate condition PPE: year-round high-visibility and sun protection',
        ppe_list: ['Hard Hat with reflective band', 'High-Visibility Vest with reflective tape', 'Safety Glasses with UV protection', 'Light-colored work shirt', 'Light-colored work pants', 'Steel-Toe Boots', 'Work Gloves', 'Sunscreen'],
        priority: 3
      }
    ];

    let count = 0;
    
    // For each site, add country-specific PPE recommendations
    for (const site of sites) {
      for (const ppe of ppeRecommendations) {
        try {
          const result = await client.query(
            `INSERT INTO ppe_recommendations 
             (organisation_id, site_id, weather_category, recommendation_text, ppe_list, priority, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [orgId, site.id, ppe.weather_category, ppe.recommendation_text, JSON.stringify(ppe.ppe_list), ppe.priority]
          );
          
          if (result.rowCount > 0) {
            count++;
            console.log(`  ✓ Added PPE recommendation for ${site.name} (${ppe.weather_category})`);
          }
        } catch (err) {
          if (err.code === '42P01') {
            console.warn(`  ⚠ Table ppe_recommendations does not exist. Run migrations first.`);
            break;
          } else if (err.code !== '23505') {
            console.error(`  ✗ Error adding PPE recommendation: ${err.message}`);
          }
        }
      }
    }
    
    console.log(`\nCreated ${count} PPE recommendations`);

    await client.query('COMMIT');
    console.log('\n✓ Country-specific PPE data applied successfully');
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

/**
 * Phase 5 Analytics Tests
 */

const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');
const analyticsService = require('../src/services/analyticsService');
const riskScoreService = require('../src/services/riskScoreService');
const aggregationService = require('../src/services/aggregationService');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');

// Test data
let testOrg;
let testUser;
let testSite1;
let testSite2;
let testIncidentType;
let userToken;

const uniqueSlug = `test-org-analytics-${Date.now()}`;

beforeAll(async () => {
  // Create test organisation
  const orgResult = await query(
    `INSERT INTO organisations (name, slug, risk_settings)
     VALUES ('Test Analytics Org', $1, '{"enabled": true, "scoringWindowDays": 90}')
     RETURNING id`,
    [uniqueSlug]
  );
  testOrg = { id: orgResult.rows[0].id };

  // Create test user
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const userResult = await query(
    `INSERT INTO users (name, email, password_hash, role, organisation_id)
     VALUES ('Test User', $1, $2, 'admin', $3)
     RETURNING id, name, email, role, organisation_id`,
    [`analytics-user-${Date.now()}@test.com`, hashedPassword, testOrg.id]
  );
  testUser = userResult.rows[0];

  // Create test sites
  const site1Result = await query(
    `INSERT INTO sites (name, location, organisation_id)
     VALUES ('Test Site 1', 'Location 1', $1)
     RETURNING id`,
    [testOrg.id]
  );
  testSite1 = { id: site1Result.rows[0].id };

  const site2Result = await query(
    `INSERT INTO sites (name, location, organisation_id)
     VALUES ('Test Site 2', 'Location 2', $1)
     RETURNING id`,
    [testOrg.id]
  );
  testSite2 = { id: site2Result.rows[0].id };

  // Create test incident type
  const typeResult = await query(
    `INSERT INTO incident_types (name, organisation_id)
     VALUES ('Test Type', $1)
     RETURNING id`,
    [testOrg.id]
  );
  testIncidentType = { id: typeResult.rows[0].id };

  // Generate JWT token
  userToken = jwt.sign(
    {
      id: testUser.id,
      name: testUser.name,
      email: testUser.email,
      role: testUser.role,
      organisation_id: testOrg.id
    },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  // Create test incidents
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  await query(
    `INSERT INTO incidents (title, description, occurred_at, severity, status, site_id, incident_type_id, organisation_id, created_by)
     VALUES
       ('Critical Incident', 'Test', $1, 'critical', 'open', $2, $3, $4, $5),
       ('High Incident', 'Test', $1, 'high', 'open', $2, $3, $4, $5),
       ('Medium Incident', 'Test', $1, 'medium', 'closed', $6, $3, $4, $5),
       ('Low Incident', 'Test', $1, 'low', 'open', $6, $3, $4, $5)`,
    [yesterday, testSite1.id, testIncidentType.id, testOrg.id, testUser.id, testSite2.id]
  );

  // Create test inspections
  await query(
    `INSERT INTO inspections (title, performed_at, overall_result, site_id, organisation_id, created_by)
     VALUES
       ('Inspection 1', $1, 'pass', $2, $3, $4),
       ('Inspection 2', $1, 'fail', $2, $3, $4),
       ('Inspection 3', $1, 'pass', $5, $3, $4)`,
    [yesterday, testSite1.id, testOrg.id, testUser.id, testSite2.id]
  );
});

afterAll(async () => {
  // Cleanup
  if (testOrg && testOrg.id) {
    await query('DELETE FROM saved_views WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM site_risk_score_history WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM site_risk_scores WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM analytics_daily_summary WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM actions WHERE source_id IN (SELECT id FROM incidents WHERE organisation_id = $1)', [testOrg.id]);
    await query('DELETE FROM inspections WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM incidents WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM incident_types WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM sites WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM users WHERE organisation_id = $1', [testOrg.id]);
    await query('DELETE FROM organisations WHERE id = $1', [testOrg.id]);
  }
});

// =============================================================================
// Analytics Service Tests
// =============================================================================

describe('AnalyticsService', () => {
  describe('getSummary', () => {
    it('should return summary KPIs', async () => {
      const summary = await analyticsService.getSummary(testOrg.id, { preset: 'last30' });

      expect(summary).toHaveProperty('period');
      expect(summary).toHaveProperty('kpis');
      expect(summary.kpis).toHaveProperty('totalIncidents');
      expect(summary.kpis).toHaveProperty('highSeverityPercent');
      expect(summary.kpis).toHaveProperty('openActions');
      expect(summary.kpis).toHaveProperty('inspectionPassRate');
    });

    it('should filter by site', async () => {
      const summary = await analyticsService.getSummary(testOrg.id, {
        preset: 'last30',
        siteIds: [testSite1.id]
      });

      expect(summary.kpis.totalIncidents.value).toBe(2); // Only Site 1 incidents
    });
  });

  describe('getIncidentTimeSeries', () => {
    it('should return time series data', async () => {
      const data = await analyticsService.getIncidentTimeSeries(testOrg.id, { preset: 'last30' });

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('period');
      expect(data[0]).toHaveProperty('data');
    });
  });

  describe('getIncidentsBySite', () => {
    it('should return incidents by site', async () => {
      const data = await analyticsService.getIncidentsBySite(testOrg.id, { preset: 'last30' });

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2); // 2 test sites
      expect(data[0]).toHaveProperty('siteId');
      expect(data[0]).toHaveProperty('siteName');
      expect(data[0]).toHaveProperty('incidentCount');
    });
  });

  describe('getIncidentsByType', () => {
    it('should return incidents by type', async () => {
      const data = await analyticsService.getIncidentsByType(testOrg.id, { preset: 'last30' });

      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty('typeId');
      expect(data[0]).toHaveProperty('typeName');
      expect(data[0]).toHaveProperty('incidentCount');
      expect(data[0]).toHaveProperty('percentage');
    });
  });

  describe('getInspectionsTimeSeries', () => {
    it('should return inspections time series', async () => {
      const data = await analyticsService.getInspectionsTimeSeries(testOrg.id, { preset: 'last30' });

      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty('period');
      expect(data[0]).toHaveProperty('total');
      expect(data[0]).toHaveProperty('passed');
      expect(data[0]).toHaveProperty('failed');
      expect(data[0]).toHaveProperty('passRate');
    });
  });
});

// =============================================================================
// Risk Score Service Tests
// =============================================================================

describe('RiskScoreService', () => {
  describe('calculateSiteRiskScore', () => {
    it('should calculate risk score for a site', async () => {
      const score = await riskScoreService.calculateSiteRiskScore(testOrg.id, testSite1.id);

      expect(score).toHaveProperty('risk_score');
      expect(score).toHaveProperty('risk_category');
      expect(score).toHaveProperty('incident_score');
      expect(score).toHaveProperty('action_score');
      expect(score).toHaveProperty('inspection_score');
      expect(['low', 'medium', 'high', 'critical']).toContain(score.risk_category);
    });

    it('should calculate higher score for site with more issues', async () => {
      const score1 = await riskScoreService.calculateSiteRiskScore(testOrg.id, testSite1.id);
      const score2 = await riskScoreService.calculateSiteRiskScore(testOrg.id, testSite2.id);

      // Site 1 has critical and high severity incidents, should have higher score
      expect(score1.risk_score).toBeGreaterThan(score2.risk_score);
    });
  });

  describe('getOrgRiskSettings', () => {
    it('should return org risk settings with defaults', async () => {
      const settings = await riskScoreService.getOrgRiskSettings(testOrg.id);

      expect(settings).toHaveProperty('enabled');
      expect(settings).toHaveProperty('scoringWindowDays');
      expect(settings).toHaveProperty('weights');
      expect(settings).toHaveProperty('thresholds');
      expect(settings.weights).toHaveProperty('incidentCritical');
      expect(settings.thresholds).toHaveProperty('low');
    });
  });

  describe('calculateAllSiteScoresForOrg', () => {
    it('should calculate scores for all sites in org', async () => {
      const result = await riskScoreService.calculateAllSiteScoresForOrg(testOrg.id);

      expect(result).toHaveProperty('sitesProcessed');
      expect(result.sitesProcessed).toBe(2);
    });
  });

  describe('getRiskScores', () => {
    beforeAll(async () => {
      // Ensure scores are calculated
      await riskScoreService.calculateAllSiteScoresForOrg(testOrg.id);
    });

    it('should return all risk scores', async () => {
      const scores = await riskScoreService.getRiskScores(testOrg.id);

      expect(Array.isArray(scores)).toBe(true);
      expect(scores.length).toBe(2);
      expect(scores[0]).toHaveProperty('risk_score');
      expect(scores[0]).toHaveProperty('site_name');
    });

    it('should return top risk sites', async () => {
      const scores = await riskScoreService.getTopRiskSites(testOrg.id, 5);

      expect(Array.isArray(scores)).toBe(true);
      expect(scores.length).toBeLessThanOrEqual(5);
      // Should be sorted by score descending
      if (scores.length >= 2) {
        expect(scores[0].risk_score).toBeGreaterThanOrEqual(scores[1].risk_score);
      }
    });
  });

  describe('getSiteRiskHistory', () => {
    it('should return risk score history', async () => {
      const history = await riskScoreService.getSiteRiskHistory(testOrg.id, testSite1.id, 30);

      expect(Array.isArray(history)).toBe(true);
    });
  });
});

// =============================================================================
// API Endpoint Tests
// =============================================================================

describe('Analytics API Endpoints', () => {
  describe('GET /api/analytics/summary', () => {
    it('should return summary with authentication', async () => {
      const response = await request(app)
        .get('/api/analytics/summary?preset=last30')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('kpis');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/analytics/summary')
        .expect(401);
    });
  });

  describe('GET /api/analytics/incidents/time-series', () => {
    it('should return time series data', async () => {
      const response = await request(app)
        .get('/api/analytics/incidents/time-series?preset=last30')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/analytics/incidents/by-site', () => {
    it('should return incidents by site', async () => {
      const response = await request(app)
        .get('/api/analytics/incidents/by-site?preset=last30')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/analytics/incidents/by-type', () => {
    it('should return incidents by type', async () => {
      const response = await request(app)
        .get('/api/analytics/incidents/by-type?preset=last30')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/analytics/inspections/time-series', () => {
    it('should return inspections time series', async () => {
      const response = await request(app)
        .get('/api/analytics/inspections/time-series?preset=last30')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/analytics/risk-scores', () => {
    it('should return risk scores', async () => {
      // First calculate scores
      await riskScoreService.calculateAllSiteScoresForOrg(testOrg.id);

      const response = await request(app)
        .get('/api/analytics/risk-scores')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/analytics/risk-scores/top', () => {
    it('should return top risk sites', async () => {
      const response = await request(app)
        .get('/api/analytics/risk-scores/top?limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });
});

// =============================================================================
// Saved Views API Tests
// =============================================================================

describe('Saved Views API', () => {
  let savedViewId;

  describe('POST /api/analytics/views', () => {
    it('should create a saved view', async () => {
      const response = await request(app)
        .post('/api/analytics/views')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test View',
          description: 'A test saved view',
          filters: { preset: 'last30', siteIds: [testSite1.id] },
          is_shared: false,
          is_default: false
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test View');
      savedViewId = response.body.id;
    });

    it('should require name', async () => {
      await request(app)
        .post('/api/analytics/views')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filters: { preset: 'last30' }
        })
        .expect(400);
    });
  });

  describe('GET /api/analytics/views', () => {
    it('should return user views', async () => {
      const response = await request(app)
        .get('/api/analytics/views')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/analytics/views/:id', () => {
    it('should return a specific view', async () => {
      const response = await request(app)
        .get(`/api/analytics/views/${savedViewId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.id).toBe(savedViewId);
      expect(response.body.name).toBe('Test View');
    });

    it('should return 404 for non-existent view', async () => {
      await request(app)
        .get('/api/analytics/views/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/analytics/views/:id', () => {
    it('should update a saved view', async () => {
      const response = await request(app)
        .put(`/api/analytics/views/${savedViewId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Test View',
          is_shared: true
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Test View');
      expect(response.body.is_shared).toBe(true);
    });
  });

  describe('DELETE /api/analytics/views/:id', () => {
    it('should delete a saved view', async () => {
      await request(app)
        .delete(`/api/analytics/views/${savedViewId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/analytics/views/${savedViewId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });
});

// =============================================================================
// Aggregation Service Tests
// =============================================================================

describe('AggregationService', () => {
  describe('aggregateOrganisation', () => {
    it('should aggregate data for an organisation', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      await aggregationService.aggregateOrganisation(testOrg.id, dateStr);

      // Verify aggregation was created
      const result = await query(
        `SELECT * FROM analytics_daily_summary
         WHERE organisation_id = $1 AND summary_date = $2`,
        [testOrg.id, dateStr]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('runDailyAggregation', () => {
    it('should run aggregation for all orgs', async () => {
      const result = await aggregationService.runDailyAggregation();

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('organisationsProcessed');
      expect(result.organisationsProcessed).toBeGreaterThan(0);
    });
  });
});

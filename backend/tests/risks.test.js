/**
 * Risk Register Tests - Phase 9
 * Tests for Risk Register & ERM APIs
 */

const {
  request,
  app,
  query,
  getToken,
  getActiveSites
} = require('./testUtils');

// TC-P9-* (API tests)

describe('Risk Register API', () => {
  const createdCategoryIds = [];
  const createdRiskIds = [];
  const createdControlIds = [];
  const createdLinkIds = [];
  const createdReviewIds = [];
  
  let siteIds = [];
  let workerToken;
  let managerToken;
  let adminToken;
  let workerId;
  let managerId;
  let adminId;
  let testCategoryId;
  let testRiskId;
  let testControlId;

  beforeAll(async () => {
    workerToken = await getToken('worker');
    managerToken = await getToken('manager');
    adminToken = await getToken('admin');

    const sites = await getActiveSites();
    siteIds = sites.map((site) => site.id);

    // Get user IDs
    const workerRes = await query("SELECT id FROM users WHERE email = 'worker@ehs.local'");
    workerId = workerRes.rows[0]?.id;

    const managerRes = await query("SELECT id FROM users WHERE email = 'manager@ehs.local'");
    managerId = managerRes.rows[0]?.id;

    const adminRes = await query("SELECT id FROM users WHERE email = 'admin@ehs.local'");
    adminId = adminRes.rows[0]?.id;

    // Get or create a test category
    const catRes = await query("SELECT id FROM risk_categories WHERE organisation_id IS NULL LIMIT 1");
    if (catRes.rows.length > 0) {
      testCategoryId = catRes.rows[0].id;
    }

    if (siteIds.length === 0 || !workerId || !managerId) {
      console.warn('Seed data may be missing for risk tests');
    }
  });

  afterAll(async () => {
    // Clean up in reverse order of dependencies
    if (createdReviewIds.length > 0) {
      await query('DELETE FROM risk_reviews WHERE id = ANY($1::uuid[])', [createdReviewIds]);
    }
    if (createdLinkIds.length > 0) {
      await query('DELETE FROM risk_links WHERE id = ANY($1::uuid[])', [createdLinkIds]);
    }
    if (createdControlIds.length > 0) {
      await query('DELETE FROM risk_control_links WHERE control_id = ANY($1::uuid[])', [createdControlIds]);
      await query('DELETE FROM risk_controls WHERE id = ANY($1::uuid[])', [createdControlIds]);
    }
    if (createdRiskIds.length > 0) {
      await query('DELETE FROM risk_sites WHERE risk_id = ANY($1::uuid[])', [createdRiskIds]);
      await query('DELETE FROM risks WHERE id = ANY($1::uuid[])', [createdRiskIds]);
    }
    if (createdCategoryIds.length > 0) {
      await query('DELETE FROM risk_categories WHERE id = ANY($1::uuid[])', [createdCategoryIds]);
    }
  });

  // ==================== CATEGORIES ====================

  describe('Categories', () => {
    // TC-P9-073: List risk categories
    it('lists risk categories (TC-P9-073)', async () => {
      const res = await request(app)
        .get('/api/risk-categories')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // TC-P9-074: Create new category (Admin only)
    it('creates category as admin (TC-P9-074)', async () => {
      const res = await request(app)
        .post('/api/risk-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Risk Category',
          description: 'Category for unit tests',
          colour: '#FF5500'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Risk Category');
      
      createdCategoryIds.push(res.body.data.id);
      testCategoryId = res.body.data.id;
    });

    // TC-P9-063: Manager cannot access category creation
    it('manager cannot create category (TC-P9-063)', async () => {
      const res = await request(app)
        .post('/api/risk-categories')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Should Fail',
          description: 'This should fail'
        });

      expect(res.statusCode).toBe(403);
    });

    // TC-P9-075: Edit category
    it('updates category as admin (TC-P9-075)', async () => {
      const res = await request(app)
        .put(`/api/risk-categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Test Category',
          colour: '#00FF55'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Updated Test Category');
    });
  });

  // ==================== RISKS CRUD ====================

  describe('Risks CRUD', () => {
    // TC-P9-011: Create risk with required fields
    it('creates risk with required fields (TC-P9-011)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Test Risk - Slips and Falls',
          categoryId: testCategoryId,
          inherentLikelihood: 3,
          inherentImpact: 4,
          ownerId: managerId,
          siteIds: [siteIds[0]]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Risk - Slips and Falls');
      expect(res.body.data.reference).toMatch(/^RISK-\d{4}-\d+$/);
      expect(res.body.data.inherent_score).toBe(12);
      expect(res.body.data.inherent_level).toBe('high');
      
      createdRiskIds.push(res.body.data.id);
      testRiskId = res.body.data.id;
    });

    // TC-P9-012: Create risk with all fields
    it('creates risk with all fields (TC-P9-012)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Complete Risk Entry',
          description: 'Full description of the risk',
          categoryId: testCategoryId,
          hazard: 'Wet floors near entrance',
          causes: 'Rain water, poor drainage',
          consequences: 'Injuries, liability claims',
          existingControls: 'Warning signs',
          inherentLikelihood: 4,
          inherentImpact: 3,
          inherentRationale: 'High foot traffic area',
          residualLikelihood: 2,
          residualImpact: 2,
          residualRationale: 'Controls reduce exposure',
          ownerId: managerId,
          siteIds: [siteIds[0]],
          reviewFrequency: 'quarterly'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.description).toBe('Full description of the risk');
      expect(res.body.data.inherent_score).toBe(12);
      expect(res.body.data.residual_score).toBe(4);
      expect(res.body.data.residual_level).toBe('low');
      
      createdRiskIds.push(res.body.data.id);
    });

    // TC-P9-013: Validation - missing title
    it('rejects risk without title (TC-P9-013)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          categoryId: testCategoryId,
          inherentLikelihood: 3,
          inherentImpact: 3,
          ownerId: managerId,
          siteIds: [siteIds[0]]
        });

      expect(res.statusCode).toBe(400);
    });

    // TC-P9-014: Validation - missing category
    it('rejects risk without category (TC-P9-014)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Missing Category Risk',
          inherentLikelihood: 3,
          inherentImpact: 3,
          ownerId: managerId,
          siteIds: [siteIds[0]]
        });

      expect(res.statusCode).toBe(400);
    });

    // TC-P9-015: Validation - invalid likelihood value
    it('rejects invalid likelihood value (TC-P9-015)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Invalid Likelihood Risk',
          categoryId: testCategoryId,
          inherentLikelihood: 6, // Invalid - must be 1-5
          inherentImpact: 3,
          ownerId: managerId,
          siteIds: [siteIds[0]]
        });

      expect(res.statusCode).toBe(400);
    });

    // TC-P9-017/TC-P9-058: Worker cannot create risk
    it('worker cannot create risk (TC-P9-017)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          title: 'Worker Created Risk',
          categoryId: testCategoryId,
          inherentLikelihood: 3,
          inherentImpact: 3,
          ownerId: workerId,
          siteIds: [siteIds[0]]
        });

      expect(res.statusCode).toBe(403);
    });

    // TC-P9-001: View risk register as Manager
    it('lists risks for manager (TC-P9-001)', async () => {
      const res = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.risks)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    // TC-P9-002: Filter by status
    it('filters risks by status (TC-P9-002)', async () => {
      const res = await request(app)
        .get('/api/risks')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      if (res.body.data.risks.length > 0) {
        res.body.data.risks.forEach(risk => {
          expect(risk.status).toBe('active');
        });
      }
    });

    // TC-P9-003: Filter by risk level
    it('filters risks by level (TC-P9-003)', async () => {
      const res = await request(app)
        .get('/api/risks')
        .query({ level: 'high' })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      // Verify filter works (may be empty if no high risks)
      expect(res.body.success).toBe(true);
    });

    // TC-P9-004: Filter by category
    it('filters risks by category (TC-P9-004)', async () => {
      const res = await request(app)
        .get('/api/risks')
        .query({ categoryId: testCategoryId })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      if (res.body.data.risks.length > 0) {
        res.body.data.risks.forEach(risk => {
          expect(risk.category_id).toBe(testCategoryId);
        });
      }
    });

    // TC-P9-006: Search by title
    it('searches risks by title (TC-P9-006)', async () => {
      const res = await request(app)
        .get('/api/risks')
        .query({ search: 'Slips' })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      if (res.body.data.risks.length > 0) {
        expect(res.body.data.risks[0].title.toLowerCase()).toContain('slip');
      }
    });

    // TC-P9-008: Pagination
    it('paginates results (TC-P9-008)', async () => {
      const res = await request(app)
        .get('/api/risks')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.risks.length).toBeLessThanOrEqual(5);
      expect(res.body.data.pagination.limit).toBe(5);
    });

    // TC-P9-018/TC-P9-019: Get risk detail
    it('gets risk details (TC-P9-018)', async () => {
      const res = await request(app)
        .get(`/api/risks/${testRiskId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(testRiskId);
      expect(res.body.data.inherent_score).toBeDefined();
      expect(res.body.data.inherent_level).toBeDefined();
    });

    // TC-P9-020: Edit risk
    it('updates risk (TC-P9-020)', async () => {
      const res = await request(app)
        .put(`/api/risks/${testRiskId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Updated Risk Title'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe('Updated Risk Title');
    });

    // TC-P9-021: Change risk status
    it('changes risk status (TC-P9-021)', async () => {
      const res = await request(app)
        .post(`/api/risks/${testRiskId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: 'under_review',
          justification: 'Scheduling review meeting'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('under_review');
    });

    // TC-P9-022: Invalid status transition
    it('rejects invalid status transition (TC-P9-022)', async () => {
      // First close the risk
      await request(app)
        .post(`/api/risks/${testRiskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'closed',
          justification: 'Test closure'
        });

      // Try invalid transition from closed
      const res = await request(app)
        .post(`/api/risks/${testRiskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'emerging',
          justification: 'Should fail'
        });

      expect(res.statusCode).toBe(400);

      // Reopen for remaining tests
      await request(app)
        .post(`/api/risks/${testRiskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'active',
          justification: 'Reopening for tests'
        });
    });
  });

  // ==================== SCORING ====================

  describe('Scoring', () => {
    // TC-P9-064: Score 1-4 is Low
    it('calculates low level for score 1-4 (TC-P9-064)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Low Risk Test',
          categoryId: testCategoryId,
          inherentLikelihood: 1,
          inherentImpact: 4, // Score = 4
          ownerId: managerId,
          siteIds: [siteIds[0]]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.inherent_score).toBe(4);
      expect(res.body.data.inherent_level).toBe('low');
      
      createdRiskIds.push(res.body.data.id);
    });

    // TC-P9-065: Score 5-9 is Medium
    it('calculates medium level for score 5-9 (TC-P9-065)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Medium Risk Test',
          categoryId: testCategoryId,
          inherentLikelihood: 3,
          inherentImpact: 3, // Score = 9
          ownerId: managerId,
          siteIds: [siteIds[0]]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.inherent_score).toBe(9);
      expect(res.body.data.inherent_level).toBe('medium');
      
      createdRiskIds.push(res.body.data.id);
    });

    // TC-P9-066: Score 10-16 is High
    it('calculates high level for score 10-16 (TC-P9-066)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'High Risk Test',
          categoryId: testCategoryId,
          inherentLikelihood: 4,
          inherentImpact: 4, // Score = 16
          ownerId: managerId,
          siteIds: [siteIds[0]]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.inherent_score).toBe(16);
      expect(res.body.data.inherent_level).toBe('high');
      
      createdRiskIds.push(res.body.data.id);
    });

    // TC-P9-067: Score 17-25 is Extreme
    it('calculates extreme level for score 17-25 (TC-P9-067)', async () => {
      const res = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Extreme Risk Test',
          categoryId: testCategoryId,
          inherentLikelihood: 5,
          inherentImpact: 5, // Score = 25
          ownerId: managerId,
          siteIds: [siteIds[0]]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.inherent_score).toBe(25);
      expect(res.body.data.inherent_level).toBe('extreme');
      
      createdRiskIds.push(res.body.data.id);
    });
  });

  // ==================== CONTROLS ====================

  describe('Controls', () => {
    // TC-P9-024: Add control to risk
    it('adds control to risk (TC-P9-024)', async () => {
      const res = await request(app)
        .post(`/api/risks/${testRiskId}/controls`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          description: 'Safety barrier installed',
          type: 'prevention',
          hierarchy: 'engineering',
          effectiveness: 'effective',
          ownerId: managerId
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.description).toBe('Safety barrier installed');
      expect(res.body.data.effectiveness).toBe('effective');
      
      createdControlIds.push(res.body.data.id);
      testControlId = res.body.data.id;
    });

    // TC-P9-025: Edit control
    it('updates control (TC-P9-025)', async () => {
      const res = await request(app)
        .put(`/api/risks/${testRiskId}/controls/${testControlId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          effectiveness: 'partially_effective'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.effectiveness).toBe('partially_effective');
    });

    // List controls
    it('lists controls for risk', async () => {
      const res = await request(app)
        .get(`/api/risks/${testRiskId}/controls`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    // Verify control
    it('verifies control', async () => {
      const res = await request(app)
        .post(`/api/risks/${testRiskId}/controls/${testControlId}/verify`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          verificationNotes: 'Confirmed barrier is in place',
          effectivenessUpdate: 'effective'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.last_verified_at).toBeDefined();
    });
  });

  // ==================== LINKS ====================

  describe('Links', () => {
    let testIncidentId;

    beforeAll(async () => {
      // Get an incident to link to (if exists)
      const incRes = await query('SELECT id FROM incidents LIMIT 1');
      if (incRes.rows.length > 0) {
        testIncidentId = incRes.rows[0].id;
      }
    });

    // TC-P9-031: Link risk to incident
    it('links risk to incident (TC-P9-031)', async () => {
      if (!testIncidentId) {
        console.log('Skipping - no incidents in database');
        return;
      }

      const res = await request(app)
        .post(`/api/risks/${testRiskId}/links`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          entityType: 'incident',
          entityId: testIncidentId,
          linkReason: 'Risk identified from this incident'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.entity_type).toBe('incident');
      
      createdLinkIds.push(res.body.data.id);
    });

    // TC-P9-039: View links grouped by type
    it('lists links for risk (TC-P9-039)', async () => {
      const res = await request(app)
        .get(`/api/risks/${testRiskId}/links`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // TC-P9-037: Prevent duplicate link
    it('prevents duplicate link (TC-P9-037)', async () => {
      if (!testIncidentId) {
        console.log('Skipping - no incidents in database');
        return;
      }

      const res = await request(app)
        .post(`/api/risks/${testRiskId}/links`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          entityType: 'incident',
          entityId: testIncidentId,
          linkReason: 'Duplicate attempt'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  // ==================== REVIEWS ====================

  describe('Reviews', () => {
    // TC-P9-040: Record review - no change
    it('records review with no change (TC-P9-040)', async () => {
      // Get current risk scores
      const riskRes = await request(app)
        .get(`/api/risks/${testRiskId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      const res = await request(app)
        .post(`/api/risks/${testRiskId}/reviews`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          outcome: 'no_change',
          notes: 'All controls verified as effective',
          newResidualLikelihood: riskRes.body.data.residual_likelihood,
          newResidualImpact: riskRes.body.data.residual_impact
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.outcome).toBe('no_change');
      expect(res.body.data.next_review_date).toBeDefined();
      
      createdReviewIds.push(res.body.data.id);
    });

    // TC-P9-041: Record review - improved
    it('records review with improvement (TC-P9-041)', async () => {
      const res = await request(app)
        .post(`/api/risks/${testRiskId}/reviews`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          outcome: 'improved',
          notes: 'New controls have reduced likelihood',
          newResidualLikelihood: 1,
          newResidualImpact: 2
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.outcome).toBe('improved');
      
      createdReviewIds.push(res.body.data.id);
    });

    // TC-P9-044: View review history
    it('lists review history (TC-P9-044)', async () => {
      const res = await request(app)
        .get(`/api/risks/${testRiskId}/reviews`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    // TC-P9-045: Next review date calculation
    it('calculates next review date correctly (TC-P9-045)', async () => {
      const reviewRes = await request(app)
        .get(`/api/risks/${testRiskId}/reviews`)
        .set('Authorization', `Bearer ${managerToken}`);

      const latestReview = reviewRes.body.data[0];
      expect(latestReview.next_review_date).toBeDefined();
      
      const reviewDate = new Date(latestReview.review_date);
      const nextDate = new Date(latestReview.next_review_date);
      expect(nextDate > reviewDate).toBe(true);
    });
  });

  // ==================== ANALYTICS ====================

  describe('Analytics', () => {
    // TC-P9-046: View heatmap
    it('gets heatmap data (TC-P9-046)', async () => {
      const res = await request(app)
        .get('/api/risks/heatmap')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.matrix).toBeDefined();
      expect(res.body.data.cells).toBeDefined();
    });

    // TC-P9-048: Toggle inherent/residual
    it('gets heatmap with inherent scores (TC-P9-048)', async () => {
      const res = await request(app)
        .get('/api/risks/heatmap')
        .query({ scoreType: 'inherent' })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.scoreType).toBe('inherent');
    });

    // TC-P9-077: Top risks widget
    it('gets top risks (TC-P9-077)', async () => {
      const res = await request(app)
        .get('/api/risks/top')
        .query({ count: 5 })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    // Upcoming reviews
    it('gets upcoming reviews', async () => {
      const res = await request(app)
        .get('/api/risks/upcoming-reviews')
        .query({ days: 30 })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // Overdue reviews
    it('gets overdue reviews', async () => {
      const res = await request(app)
        .get('/api/risks/overdue-reviews')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // TC-P9-079: Review compliance rate
    it('gets review compliance (TC-P9-079)', async () => {
      const res = await request(app)
        .get('/api/risks/review-compliance')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.compliance_percentage).toBeDefined();
    });

    // Control effectiveness
    it('gets control effectiveness (TC-P9-080)', async () => {
      const res = await request(app)
        .get('/api/risks/control-effectiveness')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.by_effectiveness).toBeDefined();
    });

    // TC-P9-078: Risk trends
    it('gets risk trends (TC-P9-078)', async () => {
      const res = await request(app)
        .get('/api/risks/trends')
        .query({ months: 6 })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // Analytics by dimension
    it('gets risks by dimension', async () => {
      const res = await request(app)
        .get('/api/risks/analytics/category')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.dimension).toBe('category');
    });
  });

  // ==================== SETTINGS ====================

  describe('Settings', () => {
    // TC-P9-062: Admin can access risk settings
    it('admin can get scoring matrix (TC-P9-062)', async () => {
      const res = await request(app)
        .get('/api/risk-settings/scoring-matrix')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.matrix).toBeDefined();
    });

    // Tolerances
    it('admin can get tolerances', async () => {
      const res = await request(app)
        .get('/api/risk-settings/tolerances')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.tolerances).toBeDefined();
    });

    // Config
    it('admin can get config', async () => {
      const res = await request(app)
        .get('/api/risk-settings/config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    // TC-P9-063: Manager cannot access settings (write)
    it('manager cannot update scoring matrix (TC-P9-063)', async () => {
      const res = await request(app)
        .put('/api/risk-settings/scoring-matrix')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ matrix: [] });

      expect(res.statusCode).toBe(403);
    });
  });

  // ==================== PERMISSIONS ====================

  describe('Permissions', () => {
    // TC-P9-056: Worker view limited to site (read access)
    it('worker can view risks (TC-P9-056)', async () => {
      const res = await request(app)
        .get('/api/risks')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.statusCode).toBe(200);
    });

    // TC-P9-061: Admin can edit any risk
    it('admin can edit any risk (TC-P9-061)', async () => {
      const res = await request(app)
        .put(`/api/risks/${testRiskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Admin updated description'
        });

      expect(res.statusCode).toBe(200);
    });

    // TC-P9-023: Delete risk (soft delete) - Admin only
    it('admin can delete risk (TC-P9-023)', async () => {
      // Create a risk to delete
      const createRes = await request(app)
        .post('/api/risks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          title: 'Risk to Delete',
          categoryId: testCategoryId,
          inherentLikelihood: 2,
          inherentImpact: 2,
          ownerId: managerId,
          siteIds: [siteIds[0]]
        });

      const riskToDeleteId = createRes.body.data.id;
      createdRiskIds.push(riskToDeleteId);

      const res = await request(app)
        .delete(`/api/risks/${riskToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    // Manager cannot delete risk
    it('manager cannot delete risk', async () => {
      const res = await request(app)
        .delete(`/api/risks/${testRiskId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});

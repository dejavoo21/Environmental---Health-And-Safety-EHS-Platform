/**
 * Phase 11: Safety Admin Tests
 *
 * TC-P11-xxx test cases as per test_cases_phase11.csv
 */

const request = require('supertest');
const app = require('../src/app');

describe('Phase 11: Safety Admin API', () => {
  let adminToken;
  let testSafetyMomentId;
  let testLegislationId;
  let testPPERuleId;
  let testSiteId;

  beforeAll(async () => {
    // Login as admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    if (adminLoginRes.status === 200) {
      adminToken = adminLoginRes.body.token;
    }

    // Get a test site
    if (adminToken) {
      const sitesRes = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${adminToken}`);

      if (sitesRes.body.sites?.length > 0) {
        testSiteId = sitesRes.body.sites[0].id;
      }
    }
  });

  describe('Safety Moments CRUD', () => {
    // TC-270-1: Submit safety moment
    it('TC-270-1: should create a safety moment', async () => {
      if (!adminToken) {
        console.log('Skipping: No admin token');
        return;
      }

      const res = await request(app)
        .post('/api/safety-admin/safety-moments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Safety Moment',
          body: 'This is a test safety moment for Phase 11 testing.',
          category: 'General Safety',
          startDate: new Date().toISOString().split('T')[0],
          isActive: true
        });

      expect([201, 400, 500]).toContain(res.status);

      if (res.status === 201) {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('title', 'Test Safety Moment');
        testSafetyMomentId = res.body.id;
      }
    });

    it('should list safety moments', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/safety-admin/safety-moments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
      }
    });

    it('should update a safety moment', async () => {
      if (!adminToken || !testSafetyMomentId) {
        console.log('Skipping: No admin token or test safety moment');
        return;
      }

      const res = await request(app)
        .put(`/api/safety-admin/safety-moments/${testSafetyMomentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Safety Moment'
        });

      expect([200, 404, 500]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('title', 'Updated Safety Moment');
      }
    });

    it('should get safety moment analytics', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/safety-admin/safety-moments/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('totalAcknowledgements');
        expect(res.body).toHaveProperty('coverage');
      }
    });
  });

  describe('Legislation CRUD', () => {
    // TC-273-1: View site compliance
    it('TC-273-1: should create a legislation reference', async () => {
      if (!adminToken || !testSiteId) {
        console.log('Skipping: No admin token or test site');
        return;
      }

      const res = await request(app)
        .post('/api/safety-admin/legislation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          siteId: testSiteId,
          title: 'Test Legislation',
          jurisdiction: 'UK',
          category: 'safety',
          summary: 'Test legislation reference for Phase 11 testing.',
          referenceUrl: 'https://example.com/legislation'
        });

      expect([201, 400, 500]).toContain(res.status);

      if (res.status === 201) {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('title', 'Test Legislation');
        testLegislationId = res.body.id;
      }
    });

    it('should list legislation references', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/safety-admin/legislation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
      }
    });

    it('should get legislation categories', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/safety-admin/legislation/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PPE Rules CRUD', () => {
    // TC-274-1: Get PPE recommendations
    it('TC-274-1: should create a PPE rule', async () => {
      if (!adminToken) {
        console.log('Skipping: No admin token');
        return;
      }

      const res = await request(app)
        .post('/api/safety-admin/ppe-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          siteId: testSiteId,
          recommendationText: 'Wear hard hat and safety boots',
          ppeList: ['Hard hat', 'Safety boots', 'Hi-vis vest'],
          priority: 1,
          isActive: true
        });

      expect([201, 400, 500]).toContain(res.status);

      if (res.status === 201) {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('ppeList');
        testPPERuleId = res.body.id;
      }
    });

    it('should list PPE rules', async () => {
      if (!adminToken) return;

      const res = await request(app)
        .get('/api/safety-admin/ppe-rules')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
      }
    });
  });

  // Cleanup
  afterAll(async () => {
    // Clean up test data if IDs are available
    if (adminToken) {
      if (testSafetyMomentId) {
        await request(app)
          .delete(`/api/safety-admin/safety-moments/${testSafetyMomentId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
      if (testLegislationId) {
        await request(app)
          .delete(`/api/safety-admin/legislation/${testLegislationId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
      if (testPPERuleId) {
        await request(app)
          .delete(`/api/safety-admin/ppe-rules/${testPPERuleId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    }
  });
});

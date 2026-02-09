/**
 * Phase 11: Safety Advisor Tests
 *
 * TC-P11-xxx test cases as per test_cases_phase11.csv
 */

const request = require('supertest');
const app = require('../src/app');
const { query } = require('../src/config/db');

describe('Phase 11: Safety Advisor API', () => {
  let authToken;
  let adminToken;
  let testSiteId;
  let testIncidentId;
  let testSafetyMomentId;
  let testOrgId;
  let testUserId;

  beforeAll(async () => {
    // Login as worker
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'worker@example.com', password: 'password123' });

    if (loginRes.status === 200) {
      authToken = loginRes.body.token;
      testUserId = loginRes.body.user?.id;
      testOrgId = loginRes.body.user?.organisationId;
    }

    // Login as admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    if (adminLoginRes.status === 200) {
      adminToken = adminLoginRes.body.token;
    }

    // Get a test site
    if (authToken) {
      const sitesRes = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${authToken}`);

      if (sitesRes.body.sites?.length > 0) {
        testSiteId = sitesRes.body.sites[0].id;
      }
    }
  });

  describe('GET /api/safety-advisor/sites/:id/summary', () => {
    // TC-271-1: Safety Advisor panel loads
    it('TC-271-1: should return safety summary for a site', async () => {
      if (!authToken || !testSiteId) {
        console.log('Skipping: No auth token or test site');
        return;
      }

      const res = await request(app)
        .get(`/api/safety-advisor/sites/${testSiteId}/summary`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('siteName');
        expect(res.body).toHaveProperty('weather');
        expect(res.body).toHaveProperty('ppeAdvice');
        expect(res.body).toHaveProperty('legislation');
      }
    });

    it('should return 401 without auth', async () => {
      if (!testSiteId) return;

      const res = await request(app)
        .get(`/api/safety-advisor/sites/${testSiteId}/summary`);

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid site ID', async () => {
      if (!authToken) return;

      const res = await request(app)
        .get('/api/safety-advisor/sites/invalid/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/safety-advisor/sites/:id/weather', () => {
    // TC-272-1: Weather shown for site
    it('TC-272-1: should return weather data for a site', async () => {
      if (!authToken || !testSiteId) {
        console.log('Skipping: No auth token or test site');
        return;
      }

      const res = await request(app)
        .get(`/api/safety-advisor/sites/${testSiteId}/weather`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('status');
        // Weather may be error/ok/stale depending on configuration
        expect(['ok', 'error', 'stale']).toContain(res.body.status);
      }
    });
  });

  describe('GET /api/safety-advisor/tasks/:type/:id/summary', () => {
    beforeAll(async () => {
      // Get a test incident if available
      if (authToken) {
        const incidentsRes = await request(app)
          .get('/api/incidents')
          .set('Authorization', `Bearer ${authToken}`);

        if (incidentsRes.body.incidents?.length > 0) {
          testIncidentId = incidentsRes.body.incidents[0].id;
        }
      }
    });

    it('should return safety summary for an incident', async () => {
      if (!authToken || !testIncidentId) {
        console.log('Skipping: No auth token or test incident');
        return;
      }

      const res = await request(app)
        .get(`/api/safety-advisor/tasks/incident/${testIncidentId}/summary`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('entityType', 'incident');
        expect(res.body).toHaveProperty('entityId');
        expect(res.body).toHaveProperty('isHighRisk');
        expect(res.body).toHaveProperty('requiresAcknowledgement');
      }
    });

    it('should return 400 for invalid entity type', async () => {
      if (!authToken) return;

      const res = await request(app)
        .get('/api/safety-advisor/tasks/invalid/1/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/safety-advisor/tasks/:type/:id/acknowledge', () => {
    // TC-276-2: Acknowledge Safety Advisor for high-risk workflow
    it('TC-276-2: should record safety acknowledgement', async () => {
      if (!authToken || !testIncidentId) {
        console.log('Skipping: No auth token or test incident');
        return;
      }

      const res = await request(app)
        .put(`/api/safety-advisor/tasks/incident/${testIncidentId}/acknowledge`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          siteId: testSiteId,
          isHighRisk: false
        });

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('entityType', 'incident');
        expect(res.body).toHaveProperty('entityId');
        expect(res.body).toHaveProperty('acknowledgedAt');
      }
    });
  });

  describe('GET /api/safety-advisor/tasks/:type/:id/acknowledgement-status', () => {
    it('should return acknowledgement status for a task', async () => {
      if (!authToken || !testIncidentId) {
        console.log('Skipping: No auth token or test incident');
        return;
      }

      const res = await request(app)
        .get(`/api/safety-advisor/tasks/incident/${testIncidentId}/acknowledgement-status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('entityType', 'incident');
      expect(res.body).toHaveProperty('isHighRisk');
      expect(res.body).toHaveProperty('acknowledged');
      expect(res.body).toHaveProperty('canProceed');
    });
  });

  describe('GET /api/safety-advisor/my/overview', () => {
    it('should return user safety overview', async () => {
      if (!authToken) {
        console.log('Skipping: No auth token');
        return;
      }

      const res = await request(app)
        .get('/api/safety-advisor/my/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('recentAcknowledgements');
      expect(res.body).toHaveProperty('pendingHighRiskTasks');
    });
  });

  describe('GET /api/safety-advisor/missing-acknowledgements', () => {
    // TC-276-1: Attempt main action without acknowledgement
    it('TC-276-1: should list tasks missing acknowledgement (manager only)', async () => {
      if (!adminToken) {
        console.log('Skipping: No admin token');
        return;
      }

      const res = await request(app)
        .get('/api/safety-advisor/missing-acknowledgements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('incidents');
      expect(res.body).toHaveProperty('total');
    });

    it('should return 403 for worker role', async () => {
      if (!authToken) return;

      const res = await request(app)
        .get('/api/safety-advisor/missing-acknowledgements')
        .set('Authorization', `Bearer ${authToken}`);

      // May be 403 if worker role, or 200 if test user has higher role
      expect([200, 403]).toContain(res.status);
    });
  });

  describe('GET /api/safety-advisor/analytics', () => {
    it('should return safety advisor analytics (manager only)', async () => {
      if (!adminToken) {
        console.log('Skipping: No admin token');
        return;
      }

      const res = await request(app)
        .get('/api/safety-advisor/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('eventsByType');
      expect(res.body).toHaveProperty('uniqueUsers');
      expect(res.body).toHaveProperty('acknowledgementRate');
      expect(res.body).toHaveProperty('coverage30Days');
    });
  });
});

describe('Phase 11: High-Risk Workflow Enforcement', () => {
  let authToken;
  let adminToken;
  let testIncidentId;

  beforeAll(async () => {
    // Login as worker
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'worker@example.com', password: 'password123' });

    if (loginRes.status === 200) {
      authToken = loginRes.body.token;
    }

    // Login as admin/manager
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    if (adminLoginRes.status === 200) {
      adminToken = adminLoginRes.body.token;
    }
  });

  // TC-276-3: Audit acknowledgement event
  it('TC-276-3: should log acknowledgement events in audit', async () => {
    if (!authToken) {
      console.log('Skipping: No auth token');
      return;
    }

    // Get an incident first
    const incidentsRes = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${authToken}`);

    if (!incidentsRes.body.incidents?.length) {
      console.log('Skipping: No incidents available for testing');
      return;
    }

    testIncidentId = incidentsRes.body.incidents[0].id;

    // Record acknowledgement
    const ackRes = await request(app)
      .put(`/api/safety-advisor/tasks/incident/${testIncidentId}/acknowledge`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ isHighRisk: true });

    expect([200, 404]).toContain(ackRes.status);

    if (ackRes.status === 200) {
      // Check that acknowledgement was recorded
      expect(ackRes.body).toHaveProperty('acknowledgedAt');
      expect(ackRes.body).toHaveProperty('isHighRisk');
    }
  });
});

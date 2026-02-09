const { app, request, query, getToken, closePool, getDefaultOrg } = require('./testUtils');

describe('Organisation API (Phase 3)', () => {
  let adminToken;
  let managerToken;
  let workerToken;

  beforeAll(async () => {
    adminToken = await getToken('admin');
    managerToken = await getToken('manager');
    workerToken = await getToken('worker');
  });

  afterAll(async () => {
    await closePool();
  });

  describe('GET /api/organisation', () => {
    // TC-P3-141: GET organisation returns current settings
    it('should return organisation profile for admin', async () => {
      const res = await request(app)
        .get('/api/organisation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('slug');
      expect(res.body.data).toHaveProperty('timezone');
      expect(res.body.data).toHaveProperty('settings');
    });

    // TC-P3-142: Worker can GET organisation
    it('should return organisation profile for worker', async () => {
      const res = await request(app)
        .get('/api/organisation')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('name');
    });

    it('should fail without auth token', async () => {
      const res = await request(app).get('/api/organisation');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/organisation', () => {
    // TC-P3-143: Admin updates org name
    it('should update organisation name as admin', async () => {
      const res = await request(app)
        .put('/api/organisation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Organisation' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Updated Organisation');

      // Reset name
      await request(app)
        .put('/api/organisation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Default Organisation' });
    });

    // TC-P3-144: Worker tries PUT organisation
    it('should reject update from worker', async () => {
      const res = await request(app)
        .put('/api/organisation')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ name: 'Hacked Name' });

      expect(res.statusCode).toBe(403);
    });

    // TC-P3-161: Admin updates timezone
    it('should update timezone as admin', async () => {
      const res = await request(app)
        .put('/api/organisation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ timezone: 'America/New_York' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.timezone).toBe('America/New_York');

      // Reset timezone
      await request(app)
        .put('/api/organisation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ timezone: 'UTC' });
    });

    // TC-P3-162: Admin sets invalid timezone
    it('should reject invalid timezone', async () => {
      const res = await request(app)
        .put('/api/organisation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ timezone: 'Invalid/Zone' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_TIMEZONE');
    });
  });

  describe('PUT /api/organisation/dashboard-settings', () => {
    // TC-P3-166: Admin sets dashboard thresholds
    it('should update dashboard thresholds as admin', async () => {
      const res = await request(app)
        .put('/api/organisation/dashboard-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          openIncidentsWarning: 10,
          openIncidentsCritical: 20
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.settings.dashboard.openIncidentsWarning).toBe(10);
      expect(res.body.data.settings.dashboard.openIncidentsCritical).toBe(20);
    });

    // TC-P3-167: Admin sets critical < warning
    it('should reject critical < warning threshold', async () => {
      const res = await request(app)
        .put('/api/organisation/dashboard-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          openIncidentsWarning: 20,
          openIncidentsCritical: 10
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_THRESHOLD');
    });

    it('should reject negative threshold values', async () => {
      const res = await request(app)
        .put('/api/organisation/dashboard-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          openIncidentsWarning: -5
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NEGATIVE_VALUE');
    });

    it('should reject manager from updating thresholds', async () => {
      const res = await request(app)
        .put('/api/organisation/dashboard-settings')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ openIncidentsWarning: 5 });

      expect(res.statusCode).toBe(403);
    });
  });
});

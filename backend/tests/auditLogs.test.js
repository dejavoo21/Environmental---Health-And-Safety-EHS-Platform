const {
  request,
  app,
  query,
  getToken,
  getActiveSites,
  getActiveIncidentTypes
} = require('./testUtils');

// TC-AUD-01 .. TC-AUD-04 (API tests)

describe('Audit Logs API', () => {
  const createdIncidentIds = [];
  let siteIds = [];
  let incidentTypeId = null;
  let workerToken;
  let managerToken;
  let adminToken;
  let testIncidentId;

  beforeAll(async () => {
    workerToken = await getToken('worker');
    managerToken = await getToken('manager');
    adminToken = await getToken('admin');

    const sites = await getActiveSites();
    siteIds = sites.map((site) => site.id);

    const types = await getActiveIncidentTypes();
    incidentTypeId = types[0]?.id;

    if (!incidentTypeId || siteIds.length === 0) {
      throw new Error('Seed data missing for audit log tests');
    }

    // Create a test incident
    const incidentRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        title: 'Test Incident for Audit',
        description: 'Test description',
        incidentTypeId,
        siteId: siteIds[0],
        severity: 'medium',
        occurredAt: new Date().toISOString()
      });

    if (incidentRes.statusCode === 201) {
      testIncidentId = incidentRes.body.id;
      createdIncidentIds.push(testIncidentId);
    }
  });

  afterAll(async () => {
    // Clean up created incidents (audit logs are immutable by design, so we leave them)
    if (createdIncidentIds.length > 0) {
      await query('DELETE FROM incidents WHERE id = ANY($1::uuid[])', [createdIncidentIds]);
    }
  });

  // TC-AUD-01: Incident activity log shows create and status change
  it('incident audit log shows creation event (TC-AUD-01)', async () => {
    const res = await request(app)
      .get(`/api/incidents/${testIncidentId}/audit-log`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.some(e => e.eventType === 'created')).toBe(true);
  });

  it('incident audit log shows status change (TC-AUD-01)', async () => {
    // Update status
    await request(app)
      .put(`/api/incidents/${testIncidentId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'under_investigation' });

    const res = await request(app)
      .get(`/api/incidents/${testIncidentId}/audit-log`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.some(e => e.eventType === 'status_changed')).toBe(true);
  });

  // TC-AUD-04: Audit log is immutable - only admin can access system audit log
  it('admin can access system audit log (TC-AUD-04)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  it('manager cannot access system audit log', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('worker cannot access system audit log', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('system audit log can be filtered by entityType', async () => {
    const res = await request(app)
      .get('/api/audit-logs?entityType=incident')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    res.body.events.forEach(e => {
      expect(e.entityType).toBe('incident');
    });
  });

  it('system audit log can be filtered by eventType', async () => {
    const res = await request(app)
      .get('/api/audit-logs?eventType=created')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    res.body.events.forEach(e => {
      expect(e.eventType).toBe('created');
    });
  });

  it('returns 404 for non-existent incident audit log', async () => {
    const res = await request(app)
      .get('/api/incidents/00000000-0000-0000-0000-000000000000/audit-log')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('audit log entries have required fields', async () => {
    const res = await request(app)
      .get(`/api/incidents/${testIncidentId}/audit-log`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);

    if (res.body.events.length > 0) {
      const event = res.body.events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('eventType');
      expect(event).toHaveProperty('entityType');
      expect(event).toHaveProperty('entityId');
      expect(event).toHaveProperty('userId');
      expect(event).toHaveProperty('occurredAt');
    }
  });

  it('validates invalid entityType filter', async () => {
    const res = await request(app)
      .get('/api/audit-logs?entityType=invalid')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('validates invalid eventType filter', async () => {
    const res = await request(app)
      .get('/api/audit-logs?eventType=invalid')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

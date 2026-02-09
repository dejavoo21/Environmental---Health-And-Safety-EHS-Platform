const {
  request,
  app,
  query,
  getToken,
  getActiveSites,
  getActiveIncidentTypes
} = require('./testUtils');

// TC-INC-01 .. TC-INC-08

describe('Incidents API', () => {
  const createdIncidentIds = [];
  let siteIds = [];
  let incidentTypeId = null;
  let workerToken;
  let managerToken;

  beforeAll(async () => {
    workerToken = await getToken('worker');
    managerToken = await getToken('manager');

    const sites = await getActiveSites();
    siteIds = sites.map((site) => site.id);

    const types = await getActiveIncidentTypes();
    incidentTypeId = types[0]?.id;

    if (!incidentTypeId || siteIds.length === 0) {
      throw new Error('Seed data missing for incident tests');
    }
  });

  afterAll(async () => {
    if (createdIncidentIds.length > 0) {
      await query('DELETE FROM incidents WHERE id = ANY($1::uuid[])', [createdIncidentIds]);
    }
  });

  const createIncident = async (overrides = {}) => {
    const payload = {
      title: 'Test Incident - Happy Path',
      description: 'Test description',
      incidentTypeId,
      siteId: siteIds[0],
      severity: 'medium',
      occurredAt: new Date().toISOString(),
      ...overrides
    };

    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${workerToken}`)
      .send(payload);

    if (res.statusCode === 201) {
      createdIncidentIds.push(res.body.id);
    }

    return res;
  };

  it('creates incident (TC-INC-01)', async () => {
    const res = await createIncident({ title: 'Test Incident - TC-INC-01' });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('open');
    expect(res.body.incidentType.id).toBe(incidentTypeId);
    expect(res.body.site.id).toBe(siteIds[0]);
  });

  it('validates missing title (TC-INC-02)', async () => {
    const res = await createIncident({ title: '' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('persists incident data (TC-INC-03)', async () => {
    const res = await createIncident({ title: 'Test Incident - TC-INC-03', severity: 'high' });

    expect(res.statusCode).toBe(201);

    const detail = await request(app)
      .get(`/api/incidents/${res.body.id}`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(detail.statusCode).toBe(200);
    expect(detail.body.title).toBe('Test Incident - TC-INC-03');
    expect(detail.body.severity).toBe('high');
    expect(detail.body.status).toBe('open');
  });

  it('lists incidents with required columns (TC-INC-04)', async () => {
    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.incidents)).toBe(true);

    if (res.body.incidents.length > 0) {
      const row = res.body.incidents[0];
      expect(row).toHaveProperty('title');
      expect(row).toHaveProperty('severity');
      expect(row).toHaveProperty('status');
      expect(row).toHaveProperty('site');
      expect(row).toHaveProperty('incidentType');
    }
  });

  it('filters incidents by status (TC-INC-05)', async () => {
    const openIncident = await createIncident({ title: 'Test Incident - Open' });
    const closedIncident = await createIncident({ title: 'Test Incident - Closed' });

    expect(openIncident.statusCode).toBe(201);
    expect(closedIncident.statusCode).toBe(201);

    await request(app)
      .put(`/api/incidents/${closedIncident.body.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'closed' });

    const res = await request(app)
      .get('/api/incidents?status=closed')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.incidents.every((row) => row.status === 'closed')).toBe(true);
  });

  it('filters incidents by site (TC-INC-06)', async () => {
    if (siteIds.length < 2) {
      throw new Error('Need at least two sites for TC-INC-06');
    }

    const siteA = siteIds[0];
    const siteB = siteIds[1];

    const incidentA = await createIncident({ title: 'Test Incident - Site A', siteId: siteA });
    const incidentB = await createIncident({ title: 'Test Incident - Site B', siteId: siteB });

    expect(incidentA.statusCode).toBe(201);
    expect(incidentB.statusCode).toBe(201);

    const res = await request(app)
      .get(`/api/incidents?siteId=${siteA}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.incidents.every((row) => row.site.id === siteA)).toBe(true);
  });

  it('manager can change status (TC-INC-07)', async () => {
    const incident = await createIncident({ title: 'Test Incident - Status Change' });

    expect(incident.statusCode).toBe(201);

    const res = await request(app)
      .put(`/api/incidents/${incident.body.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'under_investigation' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('under_investigation');
  });

  it('worker cannot change status (TC-INC-08)', async () => {
    const incident = await createIncident({ title: 'Test Incident - Worker Status' });

    expect(incident.statusCode).toBe(201);

    const res = await request(app)
      .put(`/api/incidents/${incident.body.id}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: 'closed' });

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

const {
  request,
  app,
  query,
  getToken,
  getActiveSites,
  getActiveIncidentTypes
} = require('./testUtils');

// TC-ACT-01 .. TC-ACT-07 (API tests)

describe('Actions API', () => {
  const createdActionIds = [];
  const createdIncidentIds = [];
  let siteIds = [];
  let incidentTypeId = null;
  let workerToken;
  let managerToken;
  let adminToken;
  let testIncidentId;
  let workerId;

  beforeAll(async () => {
    workerToken = await getToken('worker');
    managerToken = await getToken('manager');
    adminToken = await getToken('admin');

    const sites = await getActiveSites();
    siteIds = sites.map((site) => site.id);

    const types = await getActiveIncidentTypes();
    incidentTypeId = types[0]?.id;

    // Get worker ID
    const workerRes = await query("SELECT id FROM users WHERE email = 'worker@ehs.local'");
    workerId = workerRes.rows[0]?.id;

    if (!incidentTypeId || siteIds.length === 0 || !workerId) {
      throw new Error('Seed data missing for action tests');
    }

    // Create a test incident for action tests
    const incidentRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        title: 'Test Incident for Actions',
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
    // Clean up created actions (audit logs are immutable by design, so we leave them)
    if (createdActionIds.length > 0) {
      await query('DELETE FROM actions WHERE id = ANY($1::uuid[])', [createdActionIds]);
    }
    // Clean up created incidents
    if (createdIncidentIds.length > 0) {
      await query('DELETE FROM incidents WHERE id = ANY($1::uuid[])', [createdIncidentIds]);
    }
  });

  const createAction = async (overrides = {}, token = managerToken) => {
    const payload = {
      title: 'Test Action',
      description: 'Test action description',
      sourceType: 'incident',
      sourceId: testIncidentId,
      assignedToId: workerId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      ...overrides
    };

    const res = await request(app)
      .post('/api/actions')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    if (res.statusCode === 201) {
      createdActionIds.push(res.body.id);
    }

    return res;
  };

  // TC-ACT-01: Create action from incident
  it('creates action from incident (TC-ACT-01)', async () => {
    const res = await createAction({ title: 'Test Action - TC-ACT-01' });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('open');
    expect(res.body.sourceType).toBe('incident');
    expect(res.body.sourceId).toBe(testIncidentId);
    expect(res.body.assignedTo).toBeDefined();
    expect(res.body.assignedTo.id).toBe(workerId);
  });

  // TC-ACT-02: Validation on missing action fields
  it('validates missing title (TC-ACT-02)', async () => {
    const res = await createAction({ title: '' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('validates missing sourceType', async () => {
    const res = await request(app)
      .post('/api/actions')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Test Action',
        sourceId: testIncidentId,
        assignedToId: workerId
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('validates invalid source entity', async () => {
    const res = await createAction({
      title: 'Test Action - Invalid Source',
      sourceId: '00000000-0000-0000-0000-000000000000'
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INVALID_SOURCE');
  });

  // TC-ACT-04: My Actions list shows assigned items
  it('shows only assigned actions for worker (TC-ACT-04)', async () => {
    // Create an action assigned to worker
    const action = await createAction({ title: 'Test Action - My Actions' });
    expect(action.statusCode).toBe(201);

    const res = await request(app)
      .get('/api/actions?scope=my')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.actions)).toBe(true);
    // All actions should be assigned to current user
    res.body.actions.forEach(a => {
      expect(a.assignedTo.id).toBe(workerId);
    });
  });

  // TC-ACT-05: Assignee updates action status to done
  it('assignee can update action status (TC-ACT-05)', async () => {
    const action = await createAction({ title: 'Test Action - Status Update' });
    expect(action.statusCode).toBe(201);

    const updateRes = await request(app)
      .put(`/api/actions/${action.body.id}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: 'in_progress' });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.status).toBe('in_progress');

    const doneRes = await request(app)
      .put(`/api/actions/${action.body.id}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: 'done' });

    expect(doneRes.statusCode).toBe(200);
    expect(doneRes.body.status).toBe('done');
  });

  // TC-ACT-07: All Actions with filters
  it('manager can view all actions with filters (TC-ACT-07)', async () => {
    // Create some actions
    await createAction({ title: 'Test Action - Filter Test 1' });
    await createAction({ title: 'Test Action - Filter Test 2' });

    // Test scope=all
    const allRes = await request(app)
      .get('/api/actions?scope=all')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(allRes.statusCode).toBe(200);
    expect(Array.isArray(allRes.body.actions)).toBe(true);

    // Test status filter
    const openRes = await request(app)
      .get('/api/actions?scope=all&status=open')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(openRes.statusCode).toBe(200);
    openRes.body.actions.forEach(a => {
      expect(a.status).toBe('open');
    });
  });

  it('worker cannot view all actions', async () => {
    const res = await request(app)
      .get('/api/actions?scope=all')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('worker cannot create actions', async () => {
    const res = await createAction({ title: 'Test Action - Worker Create' }, workerToken);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('worker cannot update fields other than status', async () => {
    const action = await createAction({ title: 'Test Action - Worker Edit' });
    expect(action.statusCode).toBe(201);

    const res = await request(app)
      .put(`/api/actions/${action.body.id}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ title: 'Changed Title' });

    expect(res.statusCode).toBe(403);
  });

  it('gets action by ID', async () => {
    const action = await createAction({ title: 'Test Action - Get By ID' });
    expect(action.statusCode).toBe(201);

    const res = await request(app)
      .get(`/api/actions/${action.body.id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(action.body.id);
    expect(res.body.title).toBe('Test Action - Get By ID');
  });

  it('returns 404 for non-existent action', async () => {
    const res = await request(app)
      .get('/api/actions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('gets actions linked to incident', async () => {
    const action = await createAction({ title: 'Test Action - Incident Actions' });
    expect(action.statusCode).toBe(201);

    const res = await request(app)
      .get(`/api/incidents/${testIncidentId}/actions`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.actions)).toBe(true);
    expect(res.body.actions.some(a => a.id === action.body.id)).toBe(true);
  });
});

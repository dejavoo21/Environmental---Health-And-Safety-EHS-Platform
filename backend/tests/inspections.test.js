const {
  request,
  app,
  query,
  getToken,
  getActiveSites
} = require('./testUtils');

// TC-INSP-01 .. TC-INSP-08

describe('Inspection Templates & Inspections API', () => {
  const createdTemplateIds = [];
  const createdInspectionIds = [];
  let adminToken;
  let managerToken;
  let siteId;
  let templateId;
  let templateItems = [];

  const createTemplate = async (name, items) => {
    const res = await request(app)
      .post('/api/inspection-templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name,
        description: 'Test template description',
        items
      });

    if (res.statusCode === 201) {
      createdTemplateIds.push(res.body.id);
    }

    return res;
  };

  beforeAll(async () => {
    adminToken = await getToken('admin');
    managerToken = await getToken('manager');

    const sites = await getActiveSites();
    siteId = sites[0]?.id;

    if (!siteId) {
      throw new Error('Seed data missing for inspection tests');
    }
  });

  afterAll(async () => {
    if (createdInspectionIds.length > 0) {
      await query('DELETE FROM inspections WHERE id = ANY($1::uuid[])', [createdInspectionIds]);
    }
    if (createdTemplateIds.length > 0) {
      await query('DELETE FROM inspection_templates WHERE id = ANY($1::uuid[])', [createdTemplateIds]);
    }
  });

  it('creates template with name/description (TC-INSP-01)', async () => {
    const res = await createTemplate('Test Template - TC-INSP-01', [
      { label: 'Item A', category: 'Cat A', sortOrder: 1 },
      { label: 'Item B', category: 'Cat B', sortOrder: 2 }
    ]);

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Test Template - TC-INSP-01');
    templateId = res.body.id;
    templateItems = res.body.items;
  });

  it('updates template items (TC-INSP-02)', async () => {
    const res = await request(app)
      .put(`/api/inspection-templates/${templateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Template - Updated',
        description: 'Updated description',
        items: [
          { label: 'Updated Item 1', category: 'Cat A', sortOrder: 1 },
          { label: 'Updated Item 2', category: 'Cat B', sortOrder: 2 }
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.items.length).toBe(2);
    templateItems = res.body.items;
  });

  it('returns templates and items (TC-INSP-03)', async () => {
    const listRes = await request(app)
      .get('/api/inspection-templates')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.templates)).toBe(true);

    const detailRes = await request(app)
      .get(`/api/inspection-templates/${templateId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.body.items.length).toBeGreaterThan(0);
  });

  it('template detail shows checklist items (TC-INSP-04)', async () => {
    const detailRes = await request(app)
      .get(`/api/inspection-templates/${templateId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.body.items.length).toBe(templateItems.length);
  });

  it('creates inspection responses with ok/not_ok/na (TC-INSP-05)', async () => {
    const responses = templateItems.map((item, index) => ({
      templateItemId: item.id,
      result: index === 1 ? 'na' : 'ok',
      comment: index === 1 ? 'Not applicable' : null
    }));

    const res = await request(app)
      .post('/api/inspections')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        templateId,
        siteId,
        performedAt: new Date().toISOString(),
        notes: 'Inspection notes',
        responses
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.overallResult).toBe('pass');
    createdInspectionIds.push(res.body.id);

    const detailRes = await request(app)
      .get(`/api/inspections/${res.body.id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.body.responses.length).toBe(responses.length);
  });

  it('overall_result logic pass/fail (TC-INSP-06)', async () => {
    const passResponses = templateItems.map((item) => ({
      templateItemId: item.id,
      result: 'ok',
      comment: null
    }));

    const passRes = await request(app)
      .post('/api/inspections')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        templateId,
        siteId,
        performedAt: new Date().toISOString(),
        responses: passResponses
      });

    expect(passRes.statusCode).toBe(201);
    expect(passRes.body.overallResult).toBe('pass');
    createdInspectionIds.push(passRes.body.id);

    const failResponses = templateItems.map((item, index) => ({
      templateItemId: item.id,
      result: index === 0 ? 'not_ok' : 'ok',
      comment: index === 0 ? 'Issue found' : null
    }));

    const failRes = await request(app)
      .post('/api/inspections')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        templateId,
        siteId,
        performedAt: new Date().toISOString(),
        responses: failResponses
      });

    expect(failRes.statusCode).toBe(201);
    expect(failRes.body.overallResult).toBe('fail');
    createdInspectionIds.push(failRes.body.id);
  });

  it('lists inspections with required columns (TC-INSP-07)', async () => {
    const res = await request(app)
      .get('/api/inspections')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.inspections)).toBe(true);

    if (res.body.inspections.length > 0) {
      const row = res.body.inspections[0];
      expect(row).toHaveProperty('template');
      expect(row).toHaveProperty('site');
      expect(row).toHaveProperty('performedBy');
      expect(row).toHaveProperty('performedAt');
      expect(row).toHaveProperty('overallResult');
    }
  });

  it('inspection detail shows header and items (TC-INSP-08)', async () => {
    const inspectionId = createdInspectionIds[0];

    const res = await request(app)
      .get(`/api/inspections/${inspectionId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.template).toBeDefined();
    expect(res.body.site).toBeDefined();
    expect(Array.isArray(res.body.responses)).toBe(true);
  });
});

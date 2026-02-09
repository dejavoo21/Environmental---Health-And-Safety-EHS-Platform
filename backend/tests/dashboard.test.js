const {
  request,
  app,
  query,
  getToken,
  getActiveSites,
  getActiveIncidentTypes
} = require('./testUtils');

// TC-DASH-01 .. TC-DASH-04

describe('Dashboard API', () => {
  const createdIncidentIds = [];
  const createdTemplateIds = [];
  const createdInspectionIds = [];
  let adminToken;
  let workerToken;
  let managerToken;
  let siteId;
  let incidentTypeId;
  let templateId;

  beforeAll(async () => {
    adminToken = await getToken('admin');
    workerToken = await getToken('worker');
    managerToken = await getToken('manager');

    const sites = await getActiveSites();
    siteId = sites[0]?.id;

    const types = await getActiveIncidentTypes();
    incidentTypeId = types[0]?.id;

    if (!siteId || !incidentTypeId) {
      throw new Error('Seed data missing for dashboard tests');
    }

    const templateRes = await request(app)
      .post('/api/inspection-templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dashboard Template',
        description: 'Dashboard template',
        items: [
          { label: 'Dash Item 1', category: 'Dash', sortOrder: 1 }
        ]
      });

    if (templateRes.statusCode === 201) {
      templateId = templateRes.body.id;
      createdTemplateIds.push(templateId);
    }

    if (!templateId) {
      throw new Error('Failed to create dashboard template');
    }
  });

  afterAll(async () => {
    if (createdInspectionIds.length > 0) {
      await query('DELETE FROM inspections WHERE id = ANY($1::uuid[])', [createdInspectionIds]);
    }
    if (createdTemplateIds.length > 0) {
      await query('DELETE FROM inspection_templates WHERE id = ANY($1::uuid[])', [createdTemplateIds]);
    }
    if (createdIncidentIds.length > 0) {
      await query('DELETE FROM incidents WHERE id = ANY($1::uuid[])', [createdIncidentIds]);
    }
  });

  it('/dashboard/summary returns all metrics (TC-DASH-01)', async () => {
    const incidentRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        title: 'Dashboard Incident',
        description: 'Dashboard incident',
        incidentTypeId,
        siteId,
        severity: 'low',
        occurredAt: new Date().toISOString()
      });

    if (incidentRes.statusCode === 201) {
      createdIncidentIds.push(incidentRes.body.id);
    }

    const templateDetail = await request(app)
      .get(`/api/inspection-templates/${templateId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    const itemId = templateDetail.body.items[0].id;

    const inspectionRes = await request(app)
      .post('/api/inspections')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        templateId,
        siteId,
        performedAt: new Date().toISOString(),
        responses: [
          { templateItemId: itemId, result: 'not_ok', comment: 'Issue' }
        ]
      });

    if (inspectionRes.statusCode === 201) {
      createdInspectionIds.push(inspectionRes.body.id);
    }

    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.kpis).toBeDefined();
    expect(Array.isArray(res.body.incidentsByType)).toBe(true);
    expect(Array.isArray(res.body.severityTrend)).toBe(true);
    expect(Array.isArray(res.body.recentIncidents)).toBe(true);
    expect(Array.isArray(res.body.recentInspections)).toBe(true);
  });

  it('summary provides KPI and chart data (TC-DASH-02, TC-DASH-03, TC-DASH-04)', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.kpis.totalIncidents).toBeDefined();
    expect(res.body.kpis.openIncidents).toBeDefined();
    expect(res.body.severityTrend.length).toBeGreaterThan(0);
  });
});

const {
  request,
  app,
  getToken
} = require('./testUtils');

// TC-HELP-01 (API tests)

describe('Help API', () => {
  let workerToken;
  let managerToken;

  beforeAll(async () => {
    workerToken = await getToken('worker');
    managerToken = await getToken('manager');
  });

  // TC-HELP-01: Help page displays content and support contact
  it('lists help topics (TC-HELP-01)', async () => {
    const res = await request(app)
      .get('/api/help')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.topics)).toBe(true);
    expect(res.body.topics.length).toBeGreaterThan(0);

    // Each topic should have required fields
    res.body.topics.forEach(topic => {
      expect(topic).toHaveProperty('id');
      expect(topic).toHaveProperty('title');
      expect(topic).toHaveProperty('slug');
      expect(topic).toHaveProperty('summary');
      expect(topic).toHaveProperty('updatedAt');
    });
  });

  it('gets help topic by slug (TC-HELP-01)', async () => {
    // First get the list to find a valid slug
    const listRes = await request(app)
      .get('/api/help')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.topics.length).toBeGreaterThan(0);

    const slug = listRes.body.topics[0].slug;

    const res = await request(app)
      .get(`/api/help/${slug}`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('slug');
    expect(res.body).toHaveProperty('content');
    expect(res.body.content.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('updatedAt');
  });

  it('returns 404 for non-existent help topic', async () => {
    const res = await request(app)
      .get('/api/help/non-existent-topic')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('help topics are accessible by all authenticated users', async () => {
    // Worker can access
    const workerRes = await request(app)
      .get('/api/help')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(workerRes.statusCode).toBe(200);

    // Manager can access
    const managerRes = await request(app)
      .get('/api/help')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(managerRes.statusCode).toBe(200);
  });

  it('help content contains support contact information (C70)', async () => {
    // Get the support help topic
    const res = await request(app)
      .get('/api/help/support')
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.statusCode).toBe(200);
    // Content should contain contact information
    expect(res.body.content).toContain('support@');
  });

  it('help requires authentication', async () => {
    const res = await request(app)
      .get('/api/help');

    expect(res.statusCode).toBe(401);
  });
});

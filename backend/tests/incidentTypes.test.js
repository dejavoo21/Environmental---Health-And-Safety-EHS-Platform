const request = require('supertest');
const app = require('../src/app');

// TC-REF-01 (API)

describe('Incident Types API', () => {
  it('returns seeded incident types (TC-REF-01)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ehs.local', password: 'Admin123!' });

    const token = login.body.token;

    const res = await request(app)
      .get('/api/incident-types')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.incidentTypes.length).toBeGreaterThan(0);
  });
});

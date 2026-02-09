const request = require('supertest');
const app = require('../src/app');

// TC-SITE-03 (API)

describe('Sites API', () => {
  it('rejects duplicate site code (TC-SITE-03)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ehs.local', password: 'Admin123!' });

    const token = login.body.token;

    const res = await request(app)
      .post('/api/sites')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Warehouse 1', code: 'WH1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('DUPLICATE_CODE');
  });
});

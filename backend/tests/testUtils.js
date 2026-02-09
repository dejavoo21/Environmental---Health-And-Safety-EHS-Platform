const request = require('supertest');
const app = require('../src/app');
const { query, pool } = require('../src/config/db');

const tokenCache = {};
let poolClosed = false;

const login = async (email, password) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  if (res.statusCode !== 200 || !res.body.token) {
    throw new Error(`Login failed for ${email}`);
  }

  return res.body.token;
};

const getToken = async (role) => {
  if (tokenCache[role]) {
    return tokenCache[role];
  }

  const creds = {
    admin: ['admin@ehs.local', 'Admin123!'],
    manager: ['manager@ehs.local', 'Manager123!'],
    worker: ['worker@ehs.local', 'Worker123!']
  };

  const entry = creds[role];
  if (!entry) {
    throw new Error(`Unknown role ${role}`);
  }

  tokenCache[role] = await login(entry[0], entry[1]);
  return tokenCache[role];
};

const getActiveSites = async () => {
  const res = await query('SELECT id, name FROM sites WHERE is_active = TRUE ORDER BY name');
  return res.rows;
};

const getActiveIncidentTypes = async () => {
  const res = await query('SELECT id, name FROM incident_types WHERE is_active = TRUE ORDER BY name');
  return res.rows;
};

const getDefaultOrg = async () => {
  const res = await query("SELECT id, slug FROM organisations WHERE slug = 'default-org'");
  return res.rows[0];
};

const clearTokenCache = () => {
  Object.keys(tokenCache).forEach(key => delete tokenCache[key]);
};

const closePool = async () => {
  if (poolClosed) {
    return;
  }
  poolClosed = true;
  await pool.end();
};

module.exports = {
  app,
  request,
  query,
  getToken,
  getActiveSites,
  getActiveIncidentTypes,
  getDefaultOrg,
  clearTokenCache,
  closePool
};

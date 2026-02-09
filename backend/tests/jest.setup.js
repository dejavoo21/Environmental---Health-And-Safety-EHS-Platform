const { closePool } = require('./testUtils');

afterAll(async () => {
  await closePool();
});

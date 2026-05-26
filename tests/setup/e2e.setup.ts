import { initializeDatabase, truncateAllTables, closePool } from '../../src/shared/database';

beforeAll(async () => {
  process.env.DB_PORT = process.env.DB_PORT || '5433';
  process.env.DB_NAME = process.env.DB_NAME || 'ecommerce_test';
  process.env.JWT_SECRET = 'test-jwt-secret-2024';

  await initializeDatabase();
});

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await closePool();
});

import { Pool } from 'pg';

export default async function globalSetup() {
  // Ensure test env variables
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5433';
  process.env.DB_NAME = process.env.DB_NAME || 'ecommerce_test';
  process.env.DB_USER = process.env.DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  process.env.JWT_SECRET = 'test-jwt-secret-2024';

  // Verify database connectivity
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  });

  try {
    await pool.query('SELECT 1');
    console.log('\n✅ Test database connected');
  } catch (error) {
    console.error('\n❌ Test database connection failed');
    console.error('   Run: docker compose -f docker-compose.test.yml up -d');
    throw error;
  } finally {
    await pool.end();
  }
}

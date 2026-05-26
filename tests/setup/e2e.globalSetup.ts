export default async function globalSetup() {
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5433';
  process.env.DB_NAME = process.env.DB_NAME || 'ecommerce_test';
  process.env.DB_USER = process.env.DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  process.env.JWT_SECRET = 'test-jwt-secret-2024';
  process.env.NODE_ENV = 'test';

  console.log('\n🚀 E2E Global Setup complete');
}

import { closePool } from '../../src/shared/database';

export default async function globalTeardown() {
  await closePool();
  console.log('\n🧹 Integration test cleanup complete');
}

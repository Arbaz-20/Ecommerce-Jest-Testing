import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { initializeDatabase } from './shared/database';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function main() {
  try {
    // Initialize database tables
    await initializeDatabase();
    console.log('Database initialized');

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`Ecommerce SOA Gateway running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

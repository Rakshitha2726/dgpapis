/**
 * server.js
 * ---------
 * Application entry point.
 * 1. Loads environment variables
 * 2. Imports models (registers them with Sequelize + sets associations)
 * 3. Tests the database connection
 * 4. Syncs Sequelize models to the DB schema (development only)
 * 5. Starts the HTTP server
 */

import dotenv from 'dotenv';
dotenv.config(); // Must be called before importing anything that reads process.env

// ── Import all models so Sequelize registers them and wires associations ──
import './src/models/index.js';

import app from './src/config/app.js';
import { sequelize, testDatabaseConnection } from './src/config/database.js';

const PORT     = process.env.PORT     || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const start = async () => {
  // 1. Verify database connectivity
  await testDatabaseConnection();

  // 2. Sync models (development only – use migrations in production)
  if (NODE_ENV === 'development') {
    await sequelize.sync();
    console.log('🔄  Database schema synced successfully.');
  }

  // 3. Start HTTP server
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║        DGPAPIS Backend Server is running             ║');
    console.log(`║  URL  : http://localhost:${PORT}                       ║`);
    console.log(`║  Env  : ${NODE_ENV.padEnd(45)}║`);
    console.log(`║  DB   : ${(process.env.DB_NAME || 'dgpapis_db').padEnd(45)}║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  Endpoints:');
    console.log(`  GET  http://localhost:${PORT}/api/health`);
    console.log('');
  });
};

start().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});

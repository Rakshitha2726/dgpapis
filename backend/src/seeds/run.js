/**
 * seeds/run.js
 * ------------
 * Standalone seed runner.
 *
 * Usage:
 *   npm run seed
 *
 * What it does:
 *  1. Connects to the database
 *  2. Syncs all Sequelize models (creates tables if they don't exist)
 *  3. Runs the sample data seeder
 *  4. Disconnects cleanly
 *
 * ⚠️  SAMPLE DATA ONLY — NOT FOR PRODUCTION USE
 */

import dotenv from 'dotenv';
dotenv.config();

// Models must be imported so Sequelize registers them before sync
import '../models/index.js';

import { sequelize, testDatabaseConnection } from '../config/database.js';
import { seedDatabase } from './sampleData.js';

const run = async () => {
  console.log('');
  console.log('🌱  Starting DGPAPIS database seeder…');
  console.log('');

  await testDatabaseConnection();

  // sync({ alter: true }) → creates missing tables, adjusts existing columns
  // Does NOT drop data already in the database.
  console.log('  [SEED] Syncing database schema…');
  await sequelize.sync({ alter: true });
  console.log('  [SEED] Schema sync complete.');
  console.log('');

  await seedDatabase();

  await sequelize.close();
  console.log('  [SEED] Database connection closed. Done.');
};

run().catch((err) => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});

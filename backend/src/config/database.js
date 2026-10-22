/**
 * database.js
 * -----------
 * Initialises the Sequelize ORM instance and exports it for use across models.
 * Reads database credentials from environment variables (set in .env).
 *
 * Usage: import { sequelize } from './config/database.js';
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  NODE_ENV,
} = process.env;

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT) || 5432,
  dialect: 'postgres',

  // Connection pool – sensible defaults for a medium-load API
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },

  // Only log SQL queries in development
  logging: NODE_ENV === 'development' ? console.log : false,

  define: {
    // Use snake_case for auto-generated column names (e.g. createdAt → created_at)
    underscored: true,
    // Automatically add `created_at` and `updated_at` columns
    timestamps: true,
  },
});

/**
 * testDatabaseConnection
 * ----------------------
 * Attempts to authenticate (ping) the database.
 * Called once at server startup.
 */
export const testDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅  Database connection established successfully.');
  } catch (error) {
    console.error('❌  Unable to connect to the database:', error.message);
    process.exit(1); // Exit early – the app cannot run without a DB
  }
};

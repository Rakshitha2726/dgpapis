/**
 * health.js  (route)
 * ------------------
 * GET /api/health
 *
 * A lightweight endpoint that verifies the API server is reachable and
 * optionally checks database connectivity. Used by monitoring tools,
 * load-balancers, and during development to confirm the server is running.
 */

import { Router } from 'express';
import { sequelize } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  // Attempt a lightweight DB ping
  let dbStatus = 'connected';
  try {
    await sequelize.authenticate();
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    success: true,
    message: 'DGPAPIS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: dbStatus,
  });
});

export default router;

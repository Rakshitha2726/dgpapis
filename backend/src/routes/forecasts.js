/**
 * routes/forecasts.js
 * -------------------
 * Express routes for Stage 10: Predictive Governance & Performance Forecasting.
 *
 * Role-Based Access Matrix:
 * ┌──────────────────────────────────────────┬──────────────────┬──────────────┬────────────────────┐
 * │ Endpoint                                 │ admin            │ policymaker  │ department_officer │
 * ├──────────────────────────────────────────┼──────────────────┼──────────────┼────────────────────┤
 * │ GET  /summary                            │ ✅               │ ✅           │ ❌                 │
 * │ GET  /department/:id                     │ ✅               │ ✅           │ own dept only      │
 * │ GET  /my-department                      │ ❌               │ ❌           │ ✅ (own dept)      │
 * │ GET  /kpi/:id                            │ ✅               │ ✅           │ own dept only      │
 * └──────────────────────────────────────────┴──────────────────┴──────────────┴────────────────────┘
 */

import express from 'express';
import {
  getSystemForecastSummary,
  getDepartmentForecast,
  getMyDepartmentForecast,
  getKpiForecast,
} from '../controllers/forecastController.js';
import {
  validateForecastQuery,
  validateForecastParams,
} from '../validators/forecastValidator.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All forecast routes require authentication
router.use(protect);

// ── System-Wide Projected Leaderboard (Admin + Policymaker) ───────────────────
router.get(
  '/summary',
  authorize('admin', 'policymaker'),
  validateForecastQuery,
  getSystemForecastSummary
);

// ── Officer Convenience Endpoint (Own Department Only) ────────────────────────
router.get(
  '/my-department',
  authorize('department_officer'),
  validateForecastQuery,
  getMyDepartmentForecast
);

// ── Department-Specific Trajectory & KPI Breakdown ────────────────────────────
router.get(
  '/department/:id',
  authorize('admin', 'policymaker', 'department_officer'),
  validateForecastParams,
  validateForecastQuery,
  getDepartmentForecast
);

// ── KPI-Specific Trajectory & Model Benchmarks ────────────────────────────────
router.get(
  '/kpi/:id',
  authorize('admin', 'policymaker', 'department_officer'),
  validateForecastParams,
  validateForecastQuery,
  getKpiForecast
);

export default router;

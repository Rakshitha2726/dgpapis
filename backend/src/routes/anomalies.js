/**
 * routes/anomalies.js
 * -------------------
 * Express routes for Stage 9: Automated Anomaly Detection & Data Quality Validation.
 *
 * Role-Based Access Matrix:
 * ┌──────────────────────────────────────────┬──────────────────┬──────────────┬────────────────────┐
 * │ Endpoint                                 │ admin            │ policymaker  │ department_officer │
 * ├──────────────────────────────────────────┼──────────────────┼──────────────┼────────────────────┤
 * │ GET  /summary                            │ ✅               │ ✅           │ ❌                 │
 * │ GET  /department/:id                     │ ✅               │ ✅           │ own dept only      │
 * │ GET  /my-department                      │ ❌               │ ❌           │ ✅ (own dept)      │
 * └──────────────────────────────────────────┴──────────────────┴──────────────┴────────────────────┘
 */

import express from 'express';
import {
  getSystemQualitySummary,
  getDepartmentQualitySummary,
  getMyDepartmentQualitySummary,
} from '../controllers/anomalyController.js';
import { validateAnomalyQuery } from '../validators/anomalyValidator.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All anomaly routes require authentication
router.use(protect);

// ── Cross-Department Summary (Admin + Policymaker) ───────────────────────────
router.get('/summary', authorize('admin', 'policymaker'), validateAnomalyQuery, getSystemQualitySummary);

// ── Officer Convenience Endpoint (Own Department Only) ────────────────────────
router.get('/my-department', authorize('department_officer'), validateAnomalyQuery, getMyDepartmentQualitySummary);

// ── Department-Specific Quality Summary ───────────────────────────────────────
// Officers are strictly checked inside controller to ensure :id matches their assigned department
router.get(
  '/department/:id',
  authorize('admin', 'policymaker', 'department_officer'),
  validateAnomalyQuery,
  getDepartmentQualitySummary
);

export default router;

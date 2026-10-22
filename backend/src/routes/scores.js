/**
 * routes/scores.js
 * -----------------
 * Express routes for the Stage 7 Performance Score & Ranking Engine.
 *
 * Role-Based Access Matrix:
 * ┌──────────────────────────────────────────┬──────────────────┬──────────────┬────────────────────┐
 * │ Endpoint                                 │ admin            │ policymaker  │ department_officer │
 * ├──────────────────────────────────────────┼──────────────────┼──────────────┼────────────────────┤
 * │ POST /calculate                          │ ✅               │ ❌           │ ❌                 │
 * │ POST /calculate-all                      │ ✅               │ ❌           │ ❌                 │
 * │ GET  /department/:id                     │ ✅               │ ✅           │ own dept only      │
 * │ GET  /my-score                           │ ❌               │ ❌           │ ✅ (own dept)      │
 * │ GET  /history/:id                        │ ✅               │ ✅           │ own dept only      │
 * │ GET  /rankings                           │ ✅               │ ✅           │ ✅ (read-only)     │
 * │ GET  /periods                            │ ✅               │ ✅           │ ✅ (read-only)     │
 * └──────────────────────────────────────────┴──────────────────┴──────────────┴────────────────────┘
 */

import express from 'express';
import {
  calculateDepartmentScore,
  calculateAllDepartmentScores,
  getDepartmentScore,
  getMyDepartmentScore,
  getDepartmentScoreHistory,
  getDepartmentRankingsHandler,
  getAvailablePeriods,
} from '../controllers/scoreController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All score routes require authentication
router.use(protect);

// ── Admin-only: Trigger score calculations ────────────────────────────────────
router.post('/calculate',     authorize('admin'), calculateDepartmentScore);
router.post('/calculate-all', authorize('admin'), calculateAllDepartmentScores);

// ── Officer convenience: Own department score ─────────────────────────────────
router.get('/my-score', authorize('department_officer'), getMyDepartmentScore);

// ── Read endpoints: Admin + Policymaker + Officers (own dept) ─────────────────
router.get('/department/:departmentId', authorize('admin', 'policymaker', 'department_officer'), getDepartmentScore);
router.get('/history/:departmentId',    authorize('admin', 'policymaker', 'department_officer'), getDepartmentScoreHistory);
router.get('/rankings',                 authorize('admin', 'policymaker', 'department_officer'), getDepartmentRankingsHandler);
router.get('/periods',                  authorize('admin', 'policymaker', 'department_officer'), getAvailablePeriods);

export default router;

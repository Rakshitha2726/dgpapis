/**
 * routes/dashboard.js
 * -------------------
 * Express routes for Stage 8 Dashboard Integration.
 */

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getAdminDashboardStats,
  getOfficerDashboardSummary,
  getPolicymakerDashboardSummary,
} from '../controllers/dashboardController.js';

const router = express.Router();

// Admin Dashboard Summary (admin only)
router.get('/admin-stats', protect, authorize('admin'), getAdminDashboardStats);

// Officer Dashboard Summary (department_officer only, strictly isolated to assigned department)
router.get('/officer-summary', protect, authorize('department_officer'), getOfficerDashboardSummary);

// Policymaker Dashboard Summary (policymaker, admin - read-only)
router.get('/policymaker-summary', protect, authorize('policymaker', 'admin'), getPolicymakerDashboardSummary);

export default router;

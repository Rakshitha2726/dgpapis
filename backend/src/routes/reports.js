// routes/reports.js
// Route definitions for automated performance report generation (Stage 11)

import express from 'express';
import { getReport } from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validateReportParams, validateReportQuery } from '../validators/reportValidator.js';

const router = express.Router();

// All report routes require authentication
router.use(protect);

// Admin and Policymaker can export reports
router.get('/:departmentId/:year/:month',
  authorize('admin', 'policy_maker'),
  validateReportParams,
  validateReportQuery,
  getReport
);

export default router;

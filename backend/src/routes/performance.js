import express from 'express';
import {
  getDepartmentActiveKpis,
  getPerformanceEntries,
  getPerformanceEntryById,
  createPerformanceEntry,
  updatePerformanceEntry,
} from '../controllers/performanceController.js';
import {
  validateCreatePerformanceEntry,
  validateUpdatePerformanceEntry,
} from '../validators/performanceValidator.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Read routes: Accessible to authenticated users (Officer scoped to dept, Admin & Policymaker read-only)
router.get('/active-kpis', protect, getDepartmentActiveKpis);
router.get('/', protect, getPerformanceEntries);
router.get('/:id', protect, getPerformanceEntryById);

// Mutation routes: STRICTLY guarded for department_officer role ONLY
router.post('/', protect, authorize('department_officer'), validateCreatePerformanceEntry, createPerformanceEntry);
router.put('/:id', protect, authorize('department_officer'), validateUpdatePerformanceEntry, updatePerformanceEntry);

export default router;

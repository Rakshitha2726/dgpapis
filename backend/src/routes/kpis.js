import express from 'express';
import {
  getAllKPIs,
  getKPIById,
  getDepartmentWeightSummary,
  createKPI,
  updateKPI,
  deleteKPI,
  applyIllustrativePresets,
} from '../controllers/kpiController.js';
import {
  validateCreateKPI,
  validateUpdateKPI,
  validateApplyPresets,
} from '../validators/kpiValidator.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Read routes: Accessible to all authenticated users (Admin, Officer, Policymaker)
router.get('/', protect, getAllKPIs);
router.get('/department/:department_id/weight-summary', protect, getDepartmentWeightSummary);
router.get('/:id', protect, getKPIById);

// Write / Mutation routes: Strictly guarded for Admin role only
router.post('/apply-presets', protect, authorize('admin'), validateApplyPresets, applyIllustrativePresets);
router.post('/', protect, authorize('admin'), validateCreateKPI, createKPI);
router.put('/:id', protect, authorize('admin'), validateUpdateKPI, updateKPI);
router.delete('/:id', protect, authorize('admin'), deleteKPI);

export default router;

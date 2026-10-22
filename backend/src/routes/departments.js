import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController.js';
import {
  validateCreateDepartment,
  validateUpdateDepartment,
} from '../validators/departmentValidator.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Read routes: Accessible to all authenticated users (Admin, Officer, Policymaker)
router.get('/', protect, getAllDepartments);
router.get('/:id', protect, getDepartmentById);

// Write / Mutation routes: Strictly guarded for Admin role only
router.post('/', protect, authorize('admin'), validateCreateDepartment, createDepartment);
router.put('/:id', protect, authorize('admin'), validateUpdateDepartment, updateDepartment);
router.delete('/:id', protect, authorize('admin'), deleteDepartment);

export default router;

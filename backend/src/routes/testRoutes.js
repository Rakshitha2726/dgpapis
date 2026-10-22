import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/admin-only', protect, authorize('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome Admin! Access granted to restricted Admin endpoint.',
    user: req.user
  });
});

router.get('/officer-only', protect, authorize('department_officer'), (req, res) => {
  res.json({
    success: true,
    message: `Welcome ${req.user.department ? req.user.department.name : 'Officer'}! Access granted to Officer data entry endpoint.`,
    user: req.user
  });
});

router.get('/policymaker-only', protect, authorize('policymaker'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome Policymaker! Access granted to Senior Officer analytics endpoint.',
    user: req.user
  });
});

export default router;

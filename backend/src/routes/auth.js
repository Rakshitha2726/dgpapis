import express from 'express';
import { login, getMe, logout } from '../controllers/authController.js';
import { validateLogin } from '../validators/authValidator.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', validateLogin, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;

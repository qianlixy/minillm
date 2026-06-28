import { Router } from 'express';
import { loginAdmin, updateAdminProfile, getAdminProfile } from '../controllers/auth.controller.js';
import { authenticateAdminRequest } from '../middleware/admin.middleware.js';

const router = Router();

router.post('/login', loginAdmin);
router.post('/update', authenticateAdminRequest, updateAdminProfile);
router.get('/profile', authenticateAdminRequest, getAdminProfile);

export default router;

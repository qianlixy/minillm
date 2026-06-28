import { Router } from 'express';
import apiRoutes from './api.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// 1. Gateway API Endpoints
router.use('/v1', apiRoutes);

// 2. Auth Endpoints
router.use('/auth', authRoutes);

// 3. Admin / Dashboard Endpoints
// Note: We mount them directly under / to preserve existing client behavior
// For example: /api/config, /api/logs
router.use('/', adminRoutes);

export default router;

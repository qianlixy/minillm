import { Router } from 'express';
import { authenticateAdminRequest } from '../middleware/admin.middleware.js';
import { 
  getProviderConfig, 
  saveProviderConfig, 
  getGatewayKeys, 
  createGatewayKey, 
  revokeGatewayKey, 
  deleteGatewayKey,
  toggleGatewayKeyStatus,
  getLogs, 
  getDashboardStats, 
  testProviderConnection,
  getSettings,
  updateSettings
} from '../controllers/admin.controller.js';

const router = Router();

// Apply auth middleware to all admin endpoints
router.use(authenticateAdminRequest);

router.get('/config', getProviderConfig);
router.post('/config', saveProviderConfig);

router.get('/settings', getSettings);
router.post('/settings', updateSettings);

router.get('/gateway-keys', getGatewayKeys);
router.post('/gateway-keys', createGatewayKey);
router.delete('/gateway-keys/:id/revoke', revokeGatewayKey);
router.delete('/gateway-keys/:id', deleteGatewayKey);
router.post('/gateway-keys/:id/toggle', toggleGatewayKeyStatus);

router.get('/logs', getLogs);
router.get('/stats', getDashboardStats);

router.post('/provider/test', testProviderConnection);

export default router;

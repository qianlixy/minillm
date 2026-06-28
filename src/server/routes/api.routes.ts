import { Router } from 'express';
import { authenticateGatewayRequest } from '../middleware/auth.middleware.js';
import { handleChatCompletion } from '../controllers/chat.controller.js';

const router = Router();

router.post('/:provider/chat/completions', authenticateGatewayRequest, handleChatCompletion);

export default router;

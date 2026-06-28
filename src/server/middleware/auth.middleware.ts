import { Request, Response, NextFunction } from 'express';
import { loadDB } from '../../db/local_store.js';

export const authenticateGatewayRequest = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Missing or malformed Authorization header. Use Bearer token format.',
        type: 'invalid_request_error',
        param: null,
        code: 'unauthorized'
      }
    });
  }

  const token = authHeader.split(' ')[1];
  const db = loadDB();
  const gatewayKey = db.gatewayKeys.find(k => k.token === token);

  if (!gatewayKey) {
    return res.status(401).json({
      error: {
        message: 'Invalid Gateway API key.',
        type: 'invalid_request_error',
        param: null,
        code: 'invalid_api_key'
      }
    });
  }

  if (gatewayKey.status !== 'active') {
    return res.status(401).json({
      error: {
        message: `Gateway API key is ${gatewayKey.status}.`,
        type: 'invalid_request_error',
        param: null,
        code: 'invalid_api_key'
      }
    });
  }

  next();
};

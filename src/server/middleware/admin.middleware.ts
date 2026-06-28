import { Request, Response, NextFunction } from 'express';
import { loadDB } from '../../db/local_store.js';

export const authenticateAdminRequest = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['x-admin-token'] || req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing admin credentials' });
  }

  const token = String(authHeader).replace('Bearer ', '');
  const db = loadDB();
  const expectedToken = `${db.adminUsername}:${db.adminSecret}`;

  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  next();
};
